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
import { figure } from '../content/figures';
import { maybeBook } from '../content/books';
import { readingFor } from '../engine/council';

export type LiveFallbackReason = 'backend-unavailable' | 'sign-in' | 'rate-limited' | 'auth-required' | 'invalid-response' | 'service-unavailable';

/** why the last live request fell back, for the settings screen's honest note */
export let lastFallback: LiveFallbackReason | null = null;

interface WireSegment {
  kind: 'text' | 'quote';
  text: string;
  source: { work: string; loc: string | null } | null;
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
        out.push({ kind: 'quote', text: hit.text, source: hit.source });
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
    const data = (await invoke({ mode: 'open', question: session.question, area: session.area, seats: dossiers(session), lang: 'en' })) as {
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
      lang: 'en',
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
