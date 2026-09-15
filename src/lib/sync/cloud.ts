/* ============================================================
   Cloud state (Supabase) — one row per reader in owlry_council_state.

   Pull on login, merge-and-push on change. The row's monotonic `revision`
   makes each write compare-and-swap: when two devices race, the loser
   re-reads and merges instead of replacing the winner. Verbatim port of
   the classic app's cloudPull/cloudPush against the Council's table.
   Safe no-ops with no backend / no session.
   ============================================================ */
import { supabase, currentUserId } from '../supabase';
import { mergeState } from './merge';
import { normalizeCloudState, type CloudState } from './types';

const TABLE = 'owlry_council_state';
const MAX_WRITE_ATTEMPTS = 12;

export async function cloudPull(expectedUserId: string): Promise<CloudState | null> {
  if (!supabase) return null;
  const uid = await currentUserId();
  if (uid !== expectedUserId) throw new Error('The signed-in account changed before state could download.');
  const { data, error } = await supabase.from(TABLE).select('state').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  return data ? normalizeCloudState(data.state) : null;
}

const isInsertConflict = (error: unknown): boolean => {
  const c = (error ?? {}) as { code?: string; status?: number };
  return c.code === '23505' || c.status === 409;
};

/** merge and persist; resolves to the exact merged value committed to the cloud */
export async function cloudPush(state: CloudState, expectedUserId: string): Promise<CloudState | null> {
  if (!supabase) return null;
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    if ((await currentUserId()) !== expectedUserId) throw new Error('The signed-in account changed while state was syncing.');
    const { data: row, error: readError } = await supabase.from(TABLE).select('state, revision').eq('user_id', expectedUserId).maybeSingle();
    if (readError) throw readError;

    if (!row) {
      const { error: insertError } = await supabase.from(TABLE).insert({ user_id: expectedUserId, state, revision: 1, updated_at: new Date().toISOString() });
      if (!insertError) return state;
      if (isInsertConflict(insertError)) continue;
      throw insertError;
    }

    const revision = Number(row.revision);
    if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Cloud state has an invalid sync revision.');
    const remote = normalizeCloudState(row.state);
    const merged = remote ? mergeState(state, remote) : state;
    const { data: updated, error: updateError } = await supabase
      .from(TABLE)
      .update({ state: merged, revision: revision + 1, updated_at: new Date().toISOString() })
      .eq('user_id', expectedUserId)
      .eq('revision', revision)
      .select('revision')
      .maybeSingle();
    if (updateError) throw updateError;
    if (updated) return merged;
  }
  throw new Error('Cloud state stayed busy; it will retry on the next change.');
}
