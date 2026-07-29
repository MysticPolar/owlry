/* Typed wrappers over the owlry_* RPC entry points. */
import { supabase } from '../supabase';
import type { ActionResult, EconomyAction, Snapshot } from './types';

function client() {
  if (!supabase) {
    throw new Error('Supabase not configured (set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
  }
  return supabase;
}

/** Profile + library + radar + calendar + stats + quotes + stubs for first paint.
    Also ratchets owlry_migrate_balance — late-arriving device evidence still counts. */
export async function getSnapshot(): Promise<Snapshot> {
  const { data, error } = await client().rpc('owlry_get_snapshot');
  if (error) throw error;
  return data as Snapshot;
}

/**
 * The one guarded economy mutation. The server validates the cost, applies its
 * guard suite (per-book dedupe, daily caps, the 60s step floor, the global daily
 * ceiling), grants what survives, recomputes the level, updates the library,
 * streak and stubs, writes the ledger, and returns fresh balances.
 *
 * The result is reconciled against `granted` — NEVER against what was asked for.
 * A guard refusal is a partial success: `ok` stays true, the library write lands,
 * and `withheld` says which grant didn't.
 *
 * meta carries action context: { page, step } for turn_page, { pages } for finish,
 * { hash } for quote_keep, { sku } for purchase, plus occurred_at / tz / idem.
 */
export async function performAction(
  action: EconomyAction,
  bookId?: string | null,
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
