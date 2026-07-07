/* ============================================================
   owlry — cloud progress store (Supabase).

   One row per user in `owlry_progress` (a jsonb blob of the durable
   PersistedState). Pull on login, push on change. RLS lets a user
   read/write only their own row. Safe no-ops with no backend / no
   session, so the offline path is never affected.
   ============================================================ */
import { supabase } from '../supabase';
import type { PersistedState } from '../../store/types';

export const cloudAvailable = (): boolean => supabase !== null;

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** the signed-in user's cloud progress, or null (no backend / no session / no row) */
export async function cloudPull(): Promise<PersistedState | null> {
  if (!supabase) return null;
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from('owlry_progress')
    .select('state')
    .eq('user_id', uid)
    .maybeSingle();
  if (error || !data?.state) return null;
  return data.state as PersistedState;
}

/** upsert the signed-in user's progress; throws so the caller can flag sync errors */
export async function cloudPush(state: PersistedState): Promise<void> {
  if (!supabase) return;
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase
    .from('owlry_progress')
    .upsert(
      { user_id: uid, state, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw error;
}
