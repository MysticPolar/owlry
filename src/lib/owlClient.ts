/* ============================================================
   owlry — the owl client (the swap seam, now backed by Supabase).

   Two seams:
   • fetchOwlTurn() — the turn: bubble + book pick + chips (NO letter).
   • fetchLetter()  — fired only when the reader taps the card; returns
                      the reading letter (generated once, then cached).

   When a backend is configured (src/lib/supabase.ts) it calls the
   live edge functions (owl-chat / owl-peek); otherwise — and on ANY
   failure — it falls back to the offline brain / catalog, so the
   chat always works and the rendered output matches the mockup.

   History and memory are no longer sent by the client: owl-chat
   loads both server-side (scoped to the caller's own rows via their
   JWT), which is also why TurnContext no longer carries a history
   array — the offline brain never read it either.
   ============================================================ */
import { respond } from './owlBrain';
import type { OwlReply, OwlSession } from './owlBrain';
import type { BookRef, Guide } from '../content/types';
import type { WeatherKey } from '../content/weather';
import { getBook, getGuide } from './bookRegistry';
import type { DynamicRegistryScope } from './bookRegistry';
import { getActiveLang } from '../i18n';
import { validateLetter, registerLetter } from './owlContract';
import { validateChatV2, mapChatV2 } from './owlWireV2';
import { supabase } from './supabase';

export interface TurnContext {
  session: OwlSession;
  wxKey: WeatherKey;
  /** which of Scout's two desks is active — passed to owl-chat as a hint (Call A). */
  desk?: 'all' | 'pro';
}

// guard for non-Vite runtimes (tsx/node test scripts), where import.meta.env is absent
const ENV = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const devWarn = (...args: unknown[]) => {
  if (ENV?.DEV) console.warn(...args);
};

/** the reader's local day, YYYY-MM-DD — drives dated short-term memory + history grouping */
function localDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ---------- the turn (offline brain or live Scout) ---------- */

export interface TurnResult {
  reply: OwlReply;
  session: OwlSession;
  /** true only when the live Scout (edge function) actually answered — the store
      meters ink on this, so a silent offline fallback is never charged. */
  live: boolean;
}

function offlineTurn(text: string, ctx: TurnContext): TurnResult {
  const session: OwlSession = { ...ctx.session, wxKey: ctx.wxKey, usedGuides: [...ctx.session.usedGuides] };
  return { reply: respond(text, session), session, live: false };
}

async function liveTurn(
  text: string,
  ctx: TurnContext,
  registryScope?: DynamicRegistryScope,
): Promise<TurnResult> {
  const { data, error } = await supabase!.functions.invoke('owl-chat', {
    body: { message: text, client_day: localDay(), desk: ctx.desk, lang: getActiveLang() },
  });
  if (error) throw error;
  const v = validateChatV2(data);
  if (!v.ok) throw new Error(`owl-chat contract: ${v.errors.join('; ')}`);
  return {
    reply: mapChatV2(v.res, registryScope),
    session: ctx.session,
    live: true,
  };
}

/**
 * Resolve one owl turn (bubble + book pick + chips; no letter). Pass
 * `opts.offline` to force the offline brain (e.g. when the inkwell is dry, so
 * the live owl is never called — and never charged).
 */
export async function fetchOwlTurn(
  text: string,
  ctx: TurnContext,
  opts?: {
    offline?: boolean;
    registryScope?: DynamicRegistryScope;
  },
): Promise<TurnResult> {
  if (!supabase || opts?.offline) return offlineTurn(text, ctx);
  try {
    return await liveTurn(text, ctx, opts?.registryScope);
  } catch (err) {
    devWarn('[owl] live turn failed, using offline brain:', err);
    return offlineTurn(text, ctx);
  }
}

/* ---------- the letter (generated once, on tap) ---------- */

/** what came of asking for a letter. `refused` is the desk saying "not now" —
    a dry well or a day's worth of letters already written — and is never an
    error: the caller soft-holds and nothing was charged. */
export type LetterOutcome =
  | { kind: 'ready'; guide: Guide }
  | { kind: 'refused'; why: 'insufficient_ink' | 'rate_limited' }
  | { kind: 'failed' };

async function liveLetter(
  ref: BookRef,
  registryScope?: DynamicRegistryScope,
): Promise<LetterOutcome> {
  const b = getBook(ref); // title/author let the backend rebuild context on a cold cache miss
  const { data, error } = await supabase!.functions.invoke('owl-peek', {
    body: { slug: ref, title: b?.t, author: b?.a, lang: getActiveLang() },
  });
  if (error) throw error;
  const refused = (data as { refused?: string } | null)?.refused;
  if (refused === 'insufficient_ink' || refused === 'rate_limited') return { kind: 'refused', why: refused };
  const v = validateLetter((data as { letter?: unknown } | null)?.letter);
  if (!v.ok) throw new Error(`owl-peek contract: ${v.errors.join('; ')}`);
  const guide = registerLetter(ref, v.letter, registryScope);
  return guide ? { kind: 'ready', guide } : { kind: 'failed' };
}

/**
 * Resolve the reading letter for a book ref. Returns immediately if it's already
 * been generated (catalog GUIDES, or a previously-fetched live letter) — so it is
 * generated at most ONCE. Offline / on failure, falls back to whatever the registry
 * holds (catalog letters render exactly as the mockup).
 */
export async function fetchLetter(
  ref: BookRef,
  opts?: { registryScope?: DynamicRegistryScope },
): Promise<LetterOutcome> {
  const existing = getGuide(ref);
  if (existing) return { kind: 'ready', guide: existing }; // generate-once
  if (!supabase) return { kind: 'failed' };
  try {
    return await liveLetter(ref, opts?.registryScope);
  } catch (err) {
    devWarn('[owl] live letter failed:', err);
    const fallback = getGuide(ref);
    return fallback ? { kind: 'ready', guide: fallback } : { kind: 'failed' };
  }
}
