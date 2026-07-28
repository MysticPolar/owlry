/* Typed wrappers over the three owlry_* RPC entry points. */
import { supabase } from '../supabase';
import type { BookId, BookRef } from '../../content/types';
import type { ActionResult, EconomyAction, Snapshot } from './types';

function client() {
  if (!supabase) {
    throw new Error('Supabase not configured (set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  }
  return supabase;
}

/** Profile + library + radar + calendar + stats + quotes for first paint. */
export async function getSnapshot(): Promise<Snapshot> {
  const { data, error } = await client().rpc('owlry_get_snapshot');
  if (error) throw error;
  return data as Snapshot;
}

/**
 * The one guarded economy mutation. The server validates costs (preview spends
 * ink + coins, chat spends ink), grants XP, recomputes level, updates the
 * library + streak, logs the activity, and returns fresh balances.
 *
 * meta carries action context, e.g. { page } for turn_page, { pages } for finish.
 */
export async function performAction(
  action: EconomyAction,
  bookId?: BookId | null,
  meta: Record<string, unknown> = {},
): Promise<ActionResult> {
  const { data, error } = await client().rpc('owlry_perform_action', {
    p_action: action,
    p_book_id: bookId ?? null,
    p_meta: meta,
  });
  if (error) throw error;
  return data as ActionResult;
}

// registry key, not the catalog union — open-world (live-owl) books keep quotes too
export async function saveQuote(bookId: BookRef, text: string): Promise<Snapshot> {
  const { data, error } = await client().rpc('owlry_save_quote', { p_book_id: bookId, p_text: text });
  if (error) throw error;
  return data as Snapshot;
}
