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
  return { msgs: [nodes], chips: Array.isArray(p.chips) ? p.chips : [] };
}

/**
 * Call the live owl. Throws if the backend isn't reachable or errors — the
 * caller falls back to the simulated brain.
 */
export async function callLiveOwl(turns: Turn[]): Promise<LiveReply> {
  if (!supabase) throw new Error('owl-chat: backend not configured');
  const { data, error } = await supabase.functions.invoke('owl-chat', { body: { turns } });
  if (error || !data) throw error ?? new Error('owl-chat: empty response');
  return payloadToReply(data as OwlReplyPayload);
}
