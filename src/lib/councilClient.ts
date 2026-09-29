/* ============================================================
   The council client — the seam between the scripted engine and the live
   council-chat function. The store always creates the scripted session
   first (instant, offline, deterministic), then asks here for the live
   words; when they arrive they overlay the same messages. Any failure —
   no backend, signed out, offline, rate-limited, a bad reply — returns
   null and the script stands. The same posture as the classic app's
   owlClient: the room never goes dark.

   The client re-checks the verbatim-quote rule on what comes back (the
   function enforces it too): a "quote" segment must match one of the
   figure's verified quotes exactly, or it renders as paraphrase.
   ============================================================ */
import { supabase, isLiveCouncilConfigured } from './supabase';
import type { CouncilSession, Message, Segment, LiveOverrides } from '../store/types';
import type { Axis, Category } from '../content/types';
import { figure } from '../content/figures';
import { CATEGORIES, maybeBook } from '../content/books';
import { readingFor } from '../engine/council';
import { getActiveLang, type Lang } from '../i18n';

/** the six axes of the profile radar, as the book cards name them */
const AXES: readonly Axis[] = ['philosophy', 'career', 'health', 'investing', 'relationships', 'literature'];

export type LiveFallbackReason = 'backend-unavailable' | 'sign-in' | 'rate-limited' | 'auth-required' | 'invalid-response' | 'service-unavailable';

/** why the last live request fell back, for the settings screen's honest note */
export let lastFallback: LiveFallbackReason | null = null;

interface WireSegment {
  kind: 'text' | 'quote';
  text: string;
  source: { work: string; loc: string | null } | null;
  /** the function's quote gate matched a quote the model itself recalled — shown as "attributed" */
  attributed?: true;
}
interface WireLine {
  seat: number;
  segments: WireSegment[];
}

export interface OpenResult {
  lines: { seat: number; slot: 'r1' | 'r2'; segments: Segment[] }[];
  overrides: LiveOverrides;
}

/* ---------- dossiers: what the function is told about each seat ---------- */

function dossiers(session: CouncilSession) {
  const recs = readingFor(session);
  return session.seats.map((id, i) => {
    const f = figure(id);
    const b = maybeBook(recs[i]?.bookId);
    return {
      id: f.id,
      name: f.name,
      short: f.short,
      role: f.role,
      label: f.label,
      bio: f.bio,
      works: f.works.map((w) => ({ title: w.title, year: w.year })),
      quotes: f.quotes.map((q) => ({ text: q.text, source: { work: q.source.work, loc: q.source.loc } })),
      bookId: b?.id ?? '',
      bookTitle: b?.title ?? '',
    };
  });
}

/* ---------- the verbatim rule, client side ---------- */

function normalizeQuote(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^["'\s.,;:!?-]+|["'\s.,;:!?-]+$/g, '')
    .trim();
}

function toSegments(line: WireLine, figureId: string): Segment[] | null {
  if (!Array.isArray(line.segments)) return null;
  const quotes = figure(figureId).quotes;
  const out: Segment[] = [];
  for (const s of line.segments) {
    if (!s || typeof s.text !== 'string' || !s.text.trim()) continue;
    const text = s.text.trim();
    if (s.kind === 'quote') {
      const hit = quotes.find((q) => normalizeQuote(q.text) === normalizeQuote(text));
      if (hit) {
        out.push({ kind: 'quote', text: hit.text, source: hit.source, ...(s.attributed ? { attributed: true } : {}) });
        continue;
      }
    }
    out.push({ kind: 'text', text });
  }
  return out.length ? out : null;
}

function reasonFor(error: unknown): LiveFallbackReason {
  if (error instanceof Error && error.message.startsWith('council-chat contract:')) return 'invalid-response';
  const c = (error ?? {}) as { status?: unknown; context?: { status?: unknown } };
  const status = typeof c.context?.status === 'number' ? c.context.status : typeof c.status === 'number' ? c.status : null;
  if (status === 401 || status === 403) return 'auth-required';
  if (status === 429) return 'rate-limited';
  return 'service-unavailable';
}

const devWarn = (...args: unknown[]) => {
  if (import.meta.env?.DEV) console.warn(...args);
};

async function invoke(body: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase!.functions.invoke('council-chat', { body });
  if (error) throw error;
  return data;
}

/** true when a live request is worth making right now (backend + a signed-in session) */
export async function liveCouncilReady(): Promise<boolean> {
  if (!isLiveCouncilConfigured()) {
    lastFallback = 'backend-unavailable';
    return false;
  }
  const { data } = await supabase!.auth.getSession();
  if (!data.session) {
    lastFallback = 'sign-in';
    return false;
  }
  return true;
}

/* ---------- the two calls ---------- */

/** the opening: intros, two rounds, the cards. null → keep the script */
export async function liveOpen(session: CouncilSession): Promise<OpenResult | null> {
  if (!(await liveCouncilReady())) return null;
  try {
    const data = (await invoke({ mode: 'open', question: session.question, area: session.area, seats: dossiers(session), lang: getActiveLang() })) as {
      intros?: unknown;
      round1?: WireLine[];
      round2?: WireLine[];
      takeaways?: { commonGround?: unknown; differences?: unknown; fits?: unknown; nextStep?: unknown };
      reading?: { why?: unknown; bestStart?: unknown }[];
    };
    const lines: OpenResult['lines'] = [];
    for (const [slot, round] of [['r1', data.round1], ['r2', data.round2]] as const) {
      if (!Array.isArray(round)) throw new Error('council-chat contract: missing round');
      for (const seat of [0, 1, 2]) {
        const line = round.find((l) => l && l.seat === seat);
        const segments = line ? toSegments(line, session.seats[seat]) : null;
        if (!segments) throw new Error(`council-chat contract: seat ${seat} has no ${slot}`);
        lines.push({ seat, slot, segments });
      }
    }
    const t = data.takeaways ?? {};
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const differences = Array.isArray(t.differences) ? t.differences.map(str) : [];
    const overrides: LiveOverrides = {
      seats: [...session.seats] as [string, string, string],
      intros: Array.isArray(data.intros) ? data.intros.map(str) : [],
      takeaways: { commonGround: str(t.commonGround), differences, fits: str(t.fits), nextStep: str(t.nextStep) },
      reading: [0, 1, 2].map((i) => ({ why: str(data.reading?.[i]?.why), bestStart: !!data.reading?.[i]?.bestStart })),
    };
    if (!overrides.takeaways.commonGround || !overrides.takeaways.nextStep) throw new Error('council-chat contract: takeaways incomplete');
    lastFallback = null;
    return { lines, overrides };
  } catch (err) {
    lastFallback = reasonFor(err);
    devWarn('[council] live opening failed, keeping the script:', err);
    return null;
  }
}

/** compact history for a later turn: the reader's lines and the figures' current words */
function historyOf(session: CouncilSession, upTo: number) {
  const out: { who: 'user' | number; text: string }[] = [];
  for (const m of session.messages.slice(0, upTo)) {
    if (m.kind === 'user' && m.text) out.push({ who: 'user', text: m.text.slice(0, 700) });
    else if (m.kind === 'figure' && m.seat !== undefined) {
      const text = (m.segments ?? []).map((s) => s.text).join(' ');
      if (text) out.push({ who: m.seat, text: text.slice(0, 700) });
    }
  }
  return out.slice(-12);
}

/** replies to a follow-up / direct question / added context / passage, for the given pending messages */
export async function liveTurn(
  session: CouncilSession,
  user: Message,
  targets: Message[],
): Promise<Record<string, Segment[]> | null> {
  if (!(await liveCouncilReady())) return null;
  const slot = user.userKind === 'context' ? 'context' : user.userKind === 'passage' ? 'passage' : targets.length === 1 && user.target ? 'direct' : 'followup';
  const replySeats = targets.map((m) => m.seat).filter((s): s is number => s !== undefined);
  const userIdx = session.messages.findIndex((m) => m.id === user.id);
  const passage = user.passage ? { bookTitle: maybeBook(user.passage.bookId)?.title ?? 'the book', text: user.passage.text } : undefined;
  try {
    const data = (await invoke({
      mode: 'turn',
      question: session.question,
      area: session.area,
      seats: dossiers(session),
      slot,
      text: user.text ?? '',
      reply_seats: replySeats,
      history: historyOf(session, userIdx < 0 ? session.messages.length : userIdx),
      context: session.context,
      passage,
      lang: getActiveLang(),
    })) as { replies?: WireLine[] };
    if (!Array.isArray(data.replies)) throw new Error('council-chat contract: missing replies');
    const out: Record<string, Segment[]> = {};
    for (const m of targets) {
      const line = data.replies.find((l) => l && l.seat === m.seat);
      const segments = line && m.figureId ? toSegments(line, m.figureId) : null;
      if (segments) out[m.id] = segments;
    }
    if (!Object.keys(out).length) throw new Error('council-chat contract: no usable reply');
    lastFallback = null;
    return out;
  } catch (err) {
    lastFallback = reasonFor(err);
    devWarn('[council] live turn failed, keeping the script:', err);
    return null;
  }
}

/* ---------- minds from the model: cast, figure, book ----------
   The three recall modes of council-chat, for a question the scripted
   catalogue has no council for. They return cards, not lines: the store
   decides what to do with a thinker who is not in src/content (that
   wiring is the next step — see docs/council-backend.md). A card's quotes
   are the model's recollection and carry provenance "model"; when they
   reach the chat they render as "attributed", never as "verbatim". */

export interface MindSeat {
  /** the id the seat would have — equal to a curated figure's id when the model seated one of ours */
  id: string;
  name: string;
  canonicalName: string;
  short: string;
  label: string;
  role: string;
  why: string;
  stance: string;
  book: { title: string; year: string };
}

export interface MindCast {
  title: string;
  seats: [MindSeat, MindSeat, MindSeat];
}

export interface MindQuote {
  text: string;
  lang: 'en' | 'zh' | 'other';
  source: { work: string; loc?: string };
  gloss?: string;
  /** the model's own confidence — "exact" is still not "verified" */
  certainty: 'exact' | 'attributed';
  provenance: 'model';
}

/** a Figure (src/content/types.ts) minus portrait and colour, which the client assigns */
export interface MindFigure {
  id: string;
  canonicalName: string;
  name: string;
  short: string;
  role: string;
  label: string;
  initials: string;
  born: number | null;
  died: number | null;
  bio: string;
  works: { title: string; originalTitle: string; year: string }[];
  quotes: MindQuote[];
  voice: { followUp: string[]; context: string[]; passage: string[]; direct: string[] };
  provenance: 'model';
  lang: Lang;
}

/** a Book minus palette, isbn and text — `guide` becomes a `text` of kind "guide", with the guide note, in the store */
export interface MindBook {
  id: string;
  canonicalTitle: string;
  canonicalAuthor: string;
  authorId: string;
  title: string;
  authorName: string;
  year: number;
  category: Category;
  axes: Axis[];
  tags: string[];
  blurb: string;
  quote: MindQuote | null;
  summary: { gist: string; ideas: string[] };
  start: { label: string; title: string; why: string };
  guide: { heading: string; paragraphs: string[] };
  provenance: 'model';
  lang: Lang;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const texts = (v: unknown): string[] => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);

function mindQuote(v: unknown): MindQuote | null {
  if (!isObj(v) || !isObj(v.source)) return null;
  const t = text(v.text);
  const work = text(v.source.work);
  if (!t || !work) return null;
  const loc = text(v.source.loc);
  const gloss = text(v.gloss);
  return {
    text: t,
    lang: v.lang === 'en' || v.lang === 'zh' ? v.lang : 'other',
    source: loc ? { work, loc } : { work },
    ...(gloss ? { gloss } : {}),
    certainty: v.certainty === 'exact' ? 'exact' : 'attributed',
    provenance: 'model',
  };
}

function mindSeat(v: unknown): MindSeat | null {
  if (!isObj(v) || !text(v.id) || !text(v.name)) return null;
  const book = isObj(v.book) ? v.book : {};
  return {
    id: text(v.id),
    name: text(v.name),
    canonicalName: text(v.canonicalName) || text(v.name),
    short: text(v.short) || text(v.name),
    label: text(v.label),
    role: text(v.role),
    why: text(v.why),
    stance: text(v.stance),
    book: { title: text(book.title), year: text(book.year) },
  };
}

function mindFigure(v: unknown): MindFigure {
  if (!isObj(v) || !text(v.id) || !text(v.name)) throw new Error('council-chat contract: no figure');
  const voice = isObj(v.voice) ? v.voice : {};
  const lang: Lang = v.lang === 'zh' ? 'zh' : 'en';
  return {
    id: text(v.id),
    canonicalName: text(v.canonicalName) || text(v.name),
    name: text(v.name),
    short: text(v.short) || text(v.name),
    role: text(v.role),
    label: text(v.label),
    initials: text(v.initials) || text(v.name).slice(0, 1).toUpperCase(),
    born: typeof v.born === 'number' ? v.born : null,
    died: typeof v.died === 'number' ? v.died : null,
    bio: text(v.bio),
    works: (Array.isArray(v.works) ? v.works : [])
      .filter(isObj)
      .map((w) => ({ title: text(w.title), originalTitle: text(w.originalTitle) || text(w.title), year: text(w.year) }))
      .filter((w) => w.title),
    quotes: (Array.isArray(v.quotes) ? v.quotes : []).map(mindQuote).filter((q): q is MindQuote => q !== null),
    voice: { followUp: texts(voice.followUp), context: texts(voice.context), passage: texts(voice.passage), direct: texts(voice.direct) },
    provenance: 'model',
    lang,
  };
}

function mindBook(v: unknown): MindBook {
  if (!isObj(v) || !text(v.id) || !text(v.title)) throw new Error('council-chat contract: no book');
  const summary = isObj(v.summary) ? v.summary : {};
  const start = isObj(v.start) ? v.start : {};
  const guide = isObj(v.guide) ? v.guide : {};
  const category = CATEGORIES.find((c) => c === v.category) ?? 'Philosophy';
  const axes = (Array.isArray(v.axes) ? v.axes : []).filter((a): a is Axis => AXES.includes(a as Axis));
  return {
    id: text(v.id),
    canonicalTitle: text(v.canonicalTitle) || text(v.title),
    canonicalAuthor: text(v.canonicalAuthor) || text(v.authorName),
    authorId: text(v.authorId),
    title: text(v.title),
    authorName: text(v.authorName),
    year: typeof v.year === 'number' ? v.year : 0,
    category,
    axes: axes.length ? axes : ['philosophy'],
    tags: texts(v.tags),
    blurb: text(v.blurb),
    quote: mindQuote(v.quote),
    summary: { gist: text(summary.gist), ideas: texts(summary.ideas) },
    start: { label: text(start.label), title: text(start.title), why: text(start.why) },
    guide: { heading: text(guide.heading), paragraphs: texts(guide.paragraphs) },
    provenance: 'model',
    lang: v.lang === 'zh' ? 'zh' : 'en',
  };
}

/** a 404 from a recall mode means "not a thinker/book I know", which is an answer, not a failure */
function isUnknown(error: unknown): boolean {
  const c = (error ?? {}) as { context?: { status?: unknown } };
  return c.context?.status === 404;
}

/** three real thinkers for a question, one book each — `known` are the names of our curated figures, `avoid` seats already heard */
export async function liveCast(question: string, area: string, opts: { known?: string[]; avoid?: string[] } = {}): Promise<MindCast | null> {
  if (!(await liveCouncilReady())) return null;
  try {
    const data = (await invoke({ mode: 'cast', question, area, known: opts.known ?? [], avoid: opts.avoid ?? [], lang: getActiveLang() })) as { title?: unknown; seats?: unknown };
    const seats = (Array.isArray(data.seats) ? data.seats : []).map(mindSeat).filter((s): s is MindSeat => s !== null);
    if (seats.length !== 3) throw new Error('council-chat contract: cast needs three seats');
    lastFallback = null;
    return { title: text(data.title), seats: seats as [MindSeat, MindSeat, MindSeat] };
  } catch (err) {
    lastFallback = reasonFor(err);
    devWarn('[council] cast failed:', err);
    return null;
  }
}

/** a thinker's card from the model's knowledge; null when unknown or unreachable. `hint` disambiguates (a cast seat's role) */
export async function liveFigure(name: string, hint = ''): Promise<MindFigure | null> {
  if (!(await liveCouncilReady())) return null;
  try {
    const data = (await invoke({ mode: 'figure', name, hint, lang: getActiveLang() })) as { figure?: unknown };
    const figure = mindFigure(data.figure);
    lastFallback = null;
    return figure;
  } catch (err) {
    if (!isUnknown(err)) lastFallback = reasonFor(err);
    devWarn('[council] figure recall failed:', err);
    return null;
  }
}

/** a book's card and reading guide from the model's knowledge; null when unknown or unreachable */
export async function liveBook(title: string, author: string, hint = ''): Promise<MindBook | null> {
  if (!(await liveCouncilReady())) return null;
  try {
    const data = (await invoke({ mode: 'book', title, author, hint, lang: getActiveLang() })) as { book?: unknown };
    const book = mindBook(data.book);
    lastFallback = null;
    return book;
  } catch (err) {
    if (!isUnknown(err)) lastFallback = reasonFor(err);
    devWarn('[council] book recall failed:', err);
    return null;
  }
}
