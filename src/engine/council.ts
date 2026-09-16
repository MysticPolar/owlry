/* ============================================================
   The simulated council. Pure functions from scripts + session state to
   transcripts; the store calls these and persists the result.

   Every figure message stores which scripted slot it came from and what
   it replied to, so the whole transcript can be regenerated when a seat
   is replaced — the new thinker answers the same question, the others'
   "{1}, you're wrong about…" lines pick up the new name.

   To swap in a live model later: replace the bodies of `figureLines`
   with a call and keep the message shape.
   ============================================================ */
import { uid } from '../app/ids';
import type { CouncilSession, Message, Segment, Slot } from '../store/types';
import type { Area, CouncilScript, SeatScript, AltScript } from '../content/types';
import { council, matchCouncil } from '../content/councils';
import { figure } from '../content/figures';
import { maybeBook } from '../content/books';
import { fmt, getActiveLang } from '../i18n';
import { UI } from '../i18n/ui';

type SeatLike = SeatScript | AltScript;

interface Vars {
  q?: string;
  ctx?: string;
  passage?: string;
  book?: string;
}

/* ---------- scripts ---------- */

/** the script for whoever currently sits in a seat — the primary or one of the alternates */
export function seatScript(script: CouncilScript, seat: number, figureId: string): SeatLike {
  const primary = script.seats[seat];
  if (primary.figureId === figureId) return primary;
  const alt = script.alternates[seat].find((a) => a.figureId === figureId);
  if (alt) return alt;
  // a figure with no script for this seat (should not happen): borrow the primary's shape, speak in their own voice
  const f = figure(figureId);
  const bookId = f.works.find((w) => w.bookId)?.bookId ?? primary.bookId;
  return {
    figureId,
    why: f.bio,
    bookId,
    bookWhy: `The work this perspective is drawn from.`,
    r1: [{ kind: 'text', text: f.voice.followUp[0] }],
    r2: [{ kind: 'text', text: f.voice.followUp[1] ?? f.voice.followUp[0] }],
    differs: f.label,
  };
}

export function scriptFor(session: CouncilSession): CouncilScript {
  return council(session.scriptId);
}

/** who could take this seat next: unseated alternates, then the original if they were replaced */
export function candidatesFor(session: CouncilSession, seat: number): string[] {
  const script = scriptFor(session);
  const ids = [...script.alternates[seat].map((a) => a.figureId), script.seats[seat].figureId];
  return ids.filter((id) => !session.seats.includes(id));
}

/* ---------- text ---------- */

export function fill(text: string, seats: readonly string[], vars: Vars = {}): string {
  return text
    .replace(/\{(\d)\}/g, (_, i) => figure(seats[Number(i)]).short)
    .replace(/\{q\}/g, vars.q ?? '')
    .replace(/\{ctx\}/g, vars.ctx ?? '')
    .replace(/\{passage\}/g, vars.passage ?? '')
    .replace(/\{book\}/g, vars.book ?? '');
}

function fillSegments(segs: Segment[], seats: readonly string[], vars: Vars): Segment[] {
  return segs.map((s) => (s.kind === 'text' ? { ...s, text: fill(s.text, seats, vars) } : s));
}

const shorten = (s: string, n = 160) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

/** the lines a seat speaks for a given slot — scripted when we have them, the figure's generic voice otherwise */
function figureLines(script: CouncilScript, seats: readonly string[], seat: number, slot: Slot, variant: number, vars: Vars): Segment[] {
  const fid = seats[seat];
  const ss = seatScript(script, seat, fid);
  const v = figure(fid).voice;
  const pick = (arr: string[]) => [{ kind: 'text', text: arr[variant % Math.max(1, arr.length)] } as Segment];
  let segs: Segment[];
  switch (slot) {
    case 'r1':
      segs = ss.r1;
      break;
    case 'r2':
      segs = ss.r2;
      break;
    case 'f1':
      segs = ss.f1 ?? pick(v.followUp);
      break;
    case 'f2':
      segs = ss.f2 ?? pick(v.followUp);
      break;
    case 'ctx':
      segs = ss.ctx ?? pick(v.context);
      break;
    case 'direct':
      segs = ss.direct && ss.direct.length ? ss.direct[variant % ss.direct.length] : pick(v.direct);
      break;
    case 'passage':
      segs = pick(v.passage);
      break;
    default:
      segs = pick(v.followUp);
  }
  return fillSegments(segs, seats, vars);
}

function varsFor(m: Message): Vars {
  if (m.slot === 'passage' && m.passage) {
    return { passage: shorten(m.passage.text), book: maybeBook(m.passage.bookId)?.title ?? 'the book' };
  }
  // the council quotes your words back rather than splicing them in raw
  if (m.slot === 'ctx') return { ctx: `“${m.replyTo ?? ''}”` };
  return { q: m.replyTo ?? '' };
}

function figureMsg(seats: readonly string[], seat: number, slot: Slot, variant: number, vars: Vars, extra: Partial<Message> = {}): Message {
  return {
    id: uid('m'),
    kind: 'figure',
    ts: Date.now(),
    figureId: seats[seat],
    seat,
    slot,
    variant,
    segments: [], // filled by rebuild()
    ...extra,
    ...(vars.q !== undefined ? { replyTo: vars.q } : {}),
    ...(vars.ctx !== undefined ? { replyTo: vars.ctx } : {}),
  };
}

/** recompute every figure message's words from the scripts — the single place transcripts are generated */
export function rebuild(session: CouncilSession): CouncilSession {
  const script = scriptFor(session);
  const messages = session.messages.map((m) => {
    if (m.kind !== 'figure' || m.seat === undefined || !m.slot) return m;
    const figureId = session.seats[m.seat];
    // live words belong to the thinker who said them — a replaced seat falls back to the script
    const live = m.live && m.figureId === figureId ? m.live : undefined;
    const scripted = figureLines(script, session.seats, m.seat, m.slot, m.variant ?? 0, varsFor(m));
    return { ...m, figureId, live, segments: live ?? scripted };
  });
  return { ...session, messages };
}

/* ---------- sessions ---------- */

export function createSession(question: string, areas: Area[], councilId?: string): CouncilSession {
  const script = councilId ? council(councilId) : matchCouncil(question, areas);
  const seats = script.seats.map((s) => s.figureId) as [string, string, string];
  const now = Date.now();
  const q = question.trim();
  const messages: Message[] = [
    { id: uid('m'), kind: 'user', userKind: 'question', text: q, ts: now },
    ...seats.map((_, i) => figureMsg(seats, i, 'r1', 0, {})),
    ...seats.map((_, i) => figureMsg(seats, i, 'r2', 0, {})),
    { id: uid('m'), kind: 'takeaways', ts: now },
    { id: uid('m'), kind: 'reading', ts: now },
  ];
  return rebuild({
    id: uid('c'),
    scriptId: script.id,
    question: q,
    title: script.title,
    area: script.area,
    seats,
    replaced: [],
    messages,
    revealed: 1,
    context: [],
    stage: 'convening',
    followUps: 0,
    createdAt: now,
    updatedAt: now,
    saved: false,
  });
}

function withMessages(session: CouncilSession, added: Message[]): CouncilSession {
  return rebuild({ ...session, messages: [...session.messages, ...added], updatedAt: Date.now() });
}

/** a follow-up to the whole council (scripted rounds, then generic voice) or to one figure */
export function followUp(session: CouncilSession, text: string, target?: string): CouncilSession {
  const q = text.trim();
  const user: Message = { id: uid('m'), kind: 'user', userKind: 'followup', text: q, target, ts: Date.now() };
  if (target && session.seats.includes(target)) {
    const seat = session.seats.indexOf(target);
    const variant = session.messages.filter((m) => m.kind === 'figure' && m.slot === 'direct' && m.seat === seat).length;
    return withMessages(session, [user, figureMsg(session.seats, seat, 'direct', variant, { q })]);
  }
  const n = session.followUps;
  const slot: Slot = n === 0 ? 'f1' : n === 1 ? 'f2' : 'generic';
  const order = [0, 1, 2].map((i) => (i + n) % 3);
  const replies = order.map((seat) => figureMsg(session.seats, seat, slot, Math.floor(n / 1), { q }));
  return withMessages({ ...session, followUps: n + 1 }, [user, ...replies]);
}

/** the user adds a constraint or some context; the council adapts */
export function addContext(session: CouncilSession, text: string): CouncilSession {
  const ctx = text.trim();
  const user: Message = { id: uid('m'), kind: 'user', userKind: 'context', text: ctx, ts: Date.now() };
  const n = session.context.length;
  const order = [0, 1, 2].map((i) => (i + n + 1) % 3);
  const replies = order.map((seat) => figureMsg(session.seats, seat, 'ctx', n, { ctx }));
  return withMessages({ ...session, context: [...session.context, ctx] }, [user, ...replies]);
}

/** a highlighted passage brought back from the reader */
export function bringPassage(session: CouncilSession, bookId: string, passage: string): CouncilSession {
  const text = passage.trim();
  const user: Message = {
    id: uid('m'),
    kind: 'user',
    userKind: 'passage',
    text,
    passage: { bookId, text },
    ts: Date.now(),
  };
  const bk = maybeBook(bookId);
  const authorSeat = bk ? session.seats.indexOf(bk.authorId) : -1;
  const first = authorSeat >= 0 ? authorSeat : 0;
  const second = (first + 1) % 3;
  const n = session.messages.filter((m) => m.userKind === 'passage').length;
  const replies = [first, second].map((seat) => figureMsg(session.seats, seat, 'passage', n, {}, { passage: { bookId, text } }));
  return withMessages(session, [user, ...replies]);
}

/** replace whoever is in `seat` with the next relevant thinker; the transcript is regenerated */
export function replaceSeat(session: CouncilSession, seat: number, toFigureId?: string): CouncilSession {
  const from = session.seats[seat];
  const to = toFigureId ?? candidatesFor(session, seat)[0];
  if (!to || to === from) return session;
  const seats = [...session.seats] as [string, string, string];
  seats[seat] = to;
  const sys: Message = {
    id: uid('m'),
    kind: 'system',
    sys: 'replace',
    text: fmt(UI[getActiveLang()].chat.sysReplace, { to: figure(to).name, from: figure(from).name }),
    figures: { from, to },
    ts: Date.now(),
  };
  // announce at the current point of the conversation, before any un-revealed lines and the cards
  const at = Math.min(session.revealed, firstCardIndex(session.messages));
  const messages = [...session.messages];
  messages.splice(at, 0, sys);
  return rebuild({
    ...session,
    seats,
    messages,
    revealed: session.revealed >= at ? session.revealed + 1 : session.revealed,
    replaced: [...session.replaced, { seat, from, to, ts: Date.now() }],
    updatedAt: Date.now(),
  });
}

export function undoReplace(session: CouncilSession): CouncilSession {
  const last = session.replaced[session.replaced.length - 1];
  if (!last) return session;
  const seats = [...session.seats] as [string, string, string];
  seats[last.seat] = last.from;
  // drop the latest "joins the council" notice
  let idx = -1;
  for (let i = session.messages.length - 1; i >= 0; i--) {
    if (session.messages[i].kind === 'system' && session.messages[i].sys === 'replace') {
      idx = i;
      break;
    }
  }
  const messages = session.messages.filter((_, i) => i !== idx);
  return rebuild({
    ...session,
    seats,
    messages,
    revealed: idx >= 0 && idx < session.revealed ? session.revealed - 1 : session.revealed,
    replaced: session.replaced.slice(0, -1),
    updatedAt: Date.now(),
  });
}

function firstCardIndex(messages: Message[]): number {
  const i = messages.findIndex((m) => m.kind === 'takeaways');
  return i < 0 ? messages.length : i;
}

/* ---------- derived views ---------- */

export interface Takeaways {
  commonGround: string;
  differences: { figureId: string; text: string }[];
  fits: string;
  nextStep: string;
  context: string[];
}

/** the live council's cards, if it wrote them for exactly these seats */
export function liveFor(session: CouncilSession) {
  const l = session.live;
  return l && l.seats.every((id, i) => id === session.seats[i]) ? l : undefined;
}

export function takeawaysFor(session: CouncilSession): Takeaways {
  const script = scriptFor(session);
  const seats = session.seats;
  const live = liveFor(session);
  if (live) {
    return {
      commonGround: live.takeaways.commonGround,
      differences: seats.map((fid, i) => ({ figureId: fid, text: live.takeaways.differences[i] || seatScript(script, i, fid).differs })),
      fits: live.takeaways.fits,
      nextStep: live.takeaways.nextStep,
      context: session.context,
    };
  }
  return {
    commonGround: fill(script.takeaways.commonGround, seats),
    differences: seats.map((fid, i) => ({ figureId: fid, text: seatScript(script, i, fid).differs })),
    fits: fill(script.takeaways.fits, seats),
    nextStep: fill(script.takeaways.nextStep, seats),
    context: session.context,
  };
}

export interface ReadingRec {
  bookId: string;
  figureId: string;
  why: string;
  bestStart: boolean;
}

export function readingFor(session: CouncilSession): ReadingRec[] {
  const script = scriptFor(session);
  const live = liveFor(session);
  const recs = session.seats.map((fid, i) => {
    const ss = seatScript(script, i, fid);
    const l = live?.reading[i];
    return { bookId: ss.bookId, figureId: fid, why: l?.why || ss.bookWhy, bestStart: live ? !!l?.bestStart : !!ss.bestStart };
  });
  if (!recs.some((r) => r.bestStart)) recs[0].bestStart = true;
  return recs;
}

export function introsFor(session: CouncilSession): { figureId: string; why: string }[] {
  const script = scriptFor(session);
  const live = liveFor(session);
  return session.seats.map((fid, i) => ({ figureId: fid, why: live?.intros[i] || seatScript(script, i, fid).why }));
}

/** the figure messages that are waiting for the live council, newest turn only: everything after the last user message */
export function latestFigureMessages(session: CouncilSession): Message[] {
  let last = -1;
  for (let i = session.messages.length - 1; i >= 0; i--) {
    if (session.messages[i].kind === 'user') {
      last = i;
      break;
    }
  }
  return session.messages.slice(last + 1).filter((m) => m.kind === 'figure');
}

/** how long the typing indicator shows before a message lands: quick, scaled by length, never sluggish */
export function typingDelay(m: Message): number {
  if (m.kind !== 'figure') return m.kind === 'system' ? 250 : 450;
  const len = (m.segments ?? []).reduce((n, s) => n + s.text.length, 0);
  return Math.min(1500, 500 + len * 3);
}
