/* ============================================================
   owlry — the LIVE owl engine (client side).

   Talks to the `owl-chat` Supabase edge function (which runs Claude
   Haiku server-side) and maps its open-world reply onto the chat's
   structured message nodes. There is no catalog behind these books,
   so titles render as styled `rec` mentions rather than clickable
   catalog chips.

   Every call here can THROW (function missing, offline, upstream
   error). The store catches that and falls back to the simulated
   mockup brain, so the chat always answers.
   ============================================================ */
import { supabase } from '../supabase';
import type { LocalWeather } from '../weather';
import type { MsgNode, OwlMessage } from '../owlBrain';
import type { ChatItem } from '../../store/types';

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

/** The structured reply shape the edge function returns. */
interface OwlReplyPayload {
  say: string;
  letter: { title: string; author: string } | null;
  picks: { title: string; author: string; note?: string }[];
  chips: string[];
}

export interface LiveReply {
  msgs: OwlMessage[];
  chips: string[];
  /** every book named in the reply (letter + picks, deduped) — one letter card each */
  books: { title: string; author: string; note?: string }[];
}

const OPENER: Turn = { role: 'user', text: '(a visitor sits down at the post desk.)' };

/** the visible text of one chat message, for replay back to the model */
function flatten(nodes: OwlMessage): string {
  return nodes.map((n) => (n.t === 'rec' ? n.title : n.v)).join('');
}

/** Build the conversation turns to send for a reply, from the chat log. */
export function buildReplyTurns(messages: ChatItem[]): Turn[] {
  const turns: Turn[] = [];
  for (const m of messages) {
    if (m.kind !== 'msg') continue; // skip typing + letter cards
    const text = flatten(m.nodes).trim();
    if (!text) continue;
    turns.push({ role: m.who === 'me' ? 'user' : 'assistant', text });
  }
  // the first turn must be the visitor; the greeting is an owl turn, so open with a stub
  if (!turns.length || turns[0].role !== 'user') turns.unshift(OPENER);
  return turns;
}

/** Build the single opening turn that asks the owl to greet, with real context. */
export function greetTurns(dayPart: string, weather: LocalWeather | null): Turn[] {
  const wx = weather
    ? `; weather: ${weather.conditions}${weather.tempC != null ? `, ${weather.tempC}°C` : ''}`
    : '';
  return [
    {
      role: 'user',
      text: `(a visitor sits down at the post desk. open with a greeting. local context for the greeting only — time of day: ${dayPart}${wx}.)`,
    },
  ];
}

const isAlnum = (c: string | undefined) => !!c && /[a-z0-9]/i.test(c);

/**
 * Weave the book titles the owl named back into its prose as `rec` nodes, so
 * they pick up the mockup's book styling. Falls back to plain text for any
 * title that isn't found verbatim. Matches on word boundaries to avoid wrapping
 * a title that happens to be a substring of another word.
 */
function wrapTitles(say: string, recs: { title: string; author: string; note?: string }[]): OwlMessage {
  const named = recs.filter((r) => r.title && r.title.trim());
  if (!named.length) return [{ t: 'text', v: say }];
  const sorted = [...named].sort((a, b) => b.title.length - a.title.length);
  const lower = say.toLowerCase();
  const nodes: MsgNode[] = [];
  let i = 0;
  while (i < say.length) {
    let hit: { title: string; author: string; note?: string } | null = null;
    for (const r of sorted) {
      const tl = r.title.toLowerCase();
      if (
        lower.startsWith(tl, i) &&
        !isAlnum(say[i - 1]) &&
        !isAlnum(say[i + r.title.length])
      ) {
        hit = r;
        break;
      }
    }
    if (hit) {
      nodes.push({ t: 'rec', title: say.slice(i, i + hit.title.length), author: hit.author, note: hit.note });
      i += hit.title.length;
    } else {
      const last = nodes[nodes.length - 1];
      if (last && last.t === 'text') last.v += say[i];
      else nodes.push({ t: 'text', v: say[i] });
      i += 1;
    }
  }
  return nodes;
}

function payloadToReply(p: OwlReplyPayload): LiveReply {
  const recs = [
    ...(p.letter ? [{ title: p.letter.title, author: p.letter.author }] : []),
    ...(Array.isArray(p.picks) ? p.picks : []),
  ];
  const nodes = wrapTitles(p.say || '', recs);
  // every named book, deduped by title — each becomes a letter card in the chat
  const seen = new Set<string>();
  const books = recs.filter((r) => {
    const k = (r.title || '').trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { msgs: [nodes], chips: Array.isArray(p.chips) ? p.chips : [], books };
}

/**
 * Call the live owl. Throws if the backend isn't reachable or errors — the
 * caller falls back to the simulated brain. `desk` selects scout's mode:
 * 'fiction' (default) or 'pro' (office hours — non-fiction, goal-driven).
 */
export async function callLiveOwl(turns: Turn[], desk: 'fiction' | 'pro' = 'fiction'): Promise<LiveReply> {
  if (!supabase) throw new Error('owl-chat: backend not configured');
  const { data, error } = await supabase.functions.invoke('owl-chat', { body: { turns, desk } });
  if (error || !data) throw error ?? new Error('owl-chat: empty response');
  return payloadToReply(data as OwlReplyPayload);
}

/* ============================================================
   Reading letters for open-world books — generated lazily, only
   when the reader taps a letter card. Shaped like the catalog's
   GUIDES letters so the paper overlay renders both the same way.
   ============================================================ */
export interface GeneratedInsight {
  t: string;
  r: string;
  ex: string;
  q?: { t: string; by: string };
}
export interface GeneratedLetter {
  res: string;
  pages?: number;
  chap: string;
  core: string;
  ins: GeneratedInsight[];
  close: string;
  take: string[];
  ask: string[];
  fr: { title: string; author: string; why: string }[];
}

function guardLetter(d: Partial<GeneratedLetter>): GeneratedLetter {
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  const ins = (Array.isArray(d.ins) ? d.ins : [])
    .filter((i) => i && typeof i.t === 'string')
    .slice(0, 3)
    .map((i) => ({
      t: str(i.t),
      r: str(i.r),
      ex: str(i.ex),
      ...(i.q && typeof i.q.t === 'string' ? { q: { t: str(i.q.t), by: str(i.q.by) } } : {}),
    }));
  if (!str(d.core) || !ins.length) throw new Error('owl-letter: malformed letter');
  return {
    res: str(d.res),
    pages: typeof d.pages === 'number' && d.pages > 0 ? Math.round(d.pages) : undefined,
    chap: str(d.chap),
    core: str(d.core),
    ins,
    close: str(d.close),
    take: (Array.isArray(d.take) ? d.take : []).filter((t): t is string => typeof t === 'string').slice(0, 2),
    ask: (Array.isArray(d.ask) ? d.ask : []).filter((t): t is string => typeof t === 'string').slice(0, 2),
    fr: (Array.isArray(d.fr) ? d.fr : [])
      .filter((f) => f && typeof f.title === 'string' && f.title.trim())
      .slice(0, 3)
      .map((f) => ({ title: str(f.title), author: str(f.author), why: str(f.why) })),
  };
}

/** Generate a reading letter for one recommended book (one model call, cached by the store). */
export async function generateRecLetter(title: string, author: string, context?: string): Promise<GeneratedLetter> {
  if (!supabase) throw new Error('owl-letter: backend not configured');
  const { data, error } = await supabase.functions.invoke('owl-chat', {
    body: { letterFor: { title, author }, context: context ?? '' },
  });
  if (error || !data) throw error ?? new Error('owl-letter: empty response');
  return guardLetter(data as Partial<GeneratedLetter>);
}
