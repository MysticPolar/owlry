/* ============================================================
   owlry — cloud progress store (Supabase).

   One row per user in `owlry_progress` (a jsonb blob of the durable
   PersistedState). Pull on login, merge-and-push on change. A monotonic
   revision makes each write compare-and-swap: when two devices race, the
   loser re-reads and merges instead of replacing the winner's progress.
   RLS lets a user read/write only their own row. Safe no-ops with no
   backend / no session, so the offline path is never affected.
   ============================================================ */
import { supabase } from '../supabase';
import type { PersistedState } from '../../store/types';
import { normalizePersisted } from '../../store/normalize';
import { mergeProgress } from './mergeProgress';

export const cloudAvailable = (): boolean => supabase !== null;
const MAX_WRITE_ATTEMPTS = 12;

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
}

/** the signed-in user's cloud progress, or null (no backend / no session / no row) */
export async function cloudPull(expectedUserId?: string): Promise<PersistedState | null> {
  if (!supabase) return null;
  const uid = await currentUserId();
  if (!uid) {
    if (expectedUserId) throw new Error('Signed out before progress could download.');
    return null;
  }
  if (expectedUserId && uid !== expectedUserId) {
    throw new Error('The signed-in account changed before progress could download.');
  }
  const { data, error } = await supabase
    .from('owlry_progress')
    .select('state')
    .eq('user_id', uid)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (expectedUserId && await currentUserId() !== expectedUserId) {
    throw new Error('The signed-in account changed while progress was downloading.');
  }
  return normalizePersisted(data.state);
}

const isInsertConflict = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    code?: string;
    status?: number;
    statusCode?: string;
  };
  return (
    candidate.code === '23505'
    || candidate.status === 409
    || candidate.statusCode === '409'
  );
};

/**
 * Merge and persist the signed-in user's progress.
 *
 * This deliberately does not use a whole-row upsert. The revision predicate
 * means only one writer can advance a row from N → N+1. A competing writer
 * observes zero updated rows, re-reads revision N+1, merges both states, and
 * retries. The returned state is the exact merged value committed to cloud.
 */
export async function cloudPush(
  state: PersistedState,
  expectedUserId?: string,
): Promise<PersistedState | null> {
  if (!supabase) return null;
  const uid = await currentUserId();
  if (!uid) {
    if (expectedUserId) throw new Error('Signed out before progress could sync.');
    return null;
  }
  if (expectedUserId && uid !== expectedUserId) {
    throw new Error('The signed-in account changed before progress could sync.');
  }

  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    if (expectedUserId && await currentUserId() !== expectedUserId) {
      throw new Error('The signed-in account changed while progress was syncing.');
    }

    const { data: row, error: readError } = await supabase
      .from('owlry_progress')
      .select('state, revision')
      .eq('user_id', uid)
      .maybeSingle();
    if (readError) throw readError;

    if (!row) {
      const { error: insertError } = await supabase
        .from('owlry_progress')
        .insert({
          user_id: uid,
          state,
          revision: 1,
          updated_at: new Date().toISOString(),
        });
      if (!insertError) {
        if (expectedUserId && await currentUserId() !== expectedUserId) {
          throw new Error('The signed-in account changed while progress was syncing.');
        }
        return state;
      }
      if (isInsertConflict(insertError)) continue;
      throw insertError;
    }

    const revision = Number(row.revision);
    if (!Number.isSafeInteger(revision) || revision < 0) {
      throw new Error('Cloud progress has an invalid sync revision.');
    }
    const merged = mergeProgress(normalizePersisted(row.state), state);
    const { data: updated, error: updateError } = await supabase
      .from('owlry_progress')
      .update({
        state: merged,
        revision: revision + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', uid)
      .eq('revision', revision)
      .select('revision')
      .maybeSingle();
    if (updateError) throw updateError;
    if (updated) {
      if (expectedUserId && await currentUserId() !== expectedUserId) {
        throw new Error('The signed-in account changed while progress was syncing.');
      }
      return merged;
    }
  }

  throw new Error('Cloud progress stayed busy; it will retry on the next change.');
}
