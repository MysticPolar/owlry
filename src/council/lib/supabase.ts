/* ============================================================
   The Supabase client — the one place supabase-js is constructed.

   `supabase` is null until VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are
   set, and every backend seam (auth, sync, social, the live council)
   checks for that null and falls back to the local prototype — so the app
   works exactly as before with no backend, and lights up feature by
   feature once the keys are provided. Same contract as the classic app's
   src/lib/supabase.ts.
   ============================================================ */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = (import.meta.env ?? {}) as Record<string, string | undefined>;

/** supabase-js wants the BARE project URL; a pasted REST/auth/functions URL is normalised away */
function normalizeProjectUrl(u?: string): string | undefined {
  const trimmed = u?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/(rest|auth|storage|functions|realtime)\/v\d+\/?$/i, '').replace(/\/+$/, '');
}

const url = normalizeProjectUrl(env.VITE_SUPABASE_URL);
const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'owlry-council-auth' },
      })
    : null;

export const isBackendConfigured = (): boolean => supabase !== null;

/** the build may call the live council (council-chat); VITE_COUNCIL_LIVE=off keeps the scripted one even with a backend */
export const isLiveCouncilConfigured = (): boolean => supabase !== null && env.VITE_COUNCIL_LIVE !== 'off';

/** the signed-in user's id, or null (no backend / no session) */
export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
