import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Guard `import.meta.env` so this module is also safe outside Vite (Node test
// runners, SSR), where it is undefined rather than the Vite env object.
const env = (import.meta.env ?? {}) as Record<string, string | undefined>;

/**
 * supabase-js wants the BARE project URL (https://<ref>.supabase.co). If someone
 * pastes a sub-endpoint instead — the REST URL `…/rest/v1`, or an auth/storage/
 * functions URL, or a trailing slash — `functions.invoke()` builds the wrong
 * path (e.g. `…/rest/v1/functions/v1/owl-chat` → 404) and the live owl silently
 * falls back to the mockup. Normalize those away.
 */
function normalizeProjectUrl(u?: string): string | undefined {
  const trimmed = u?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/(rest|auth|storage|functions|realtime)\/v\d+\/?$/i, '').replace(/\/+$/, '');
}

const url = normalizeProjectUrl(env.VITE_SUPABASE_URL);
const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
const liveOwlBuildEnabled = env.VITE_OWL_LIVE !== 'off';

/**
 * The Supabase client, or `null` when env vars aren't set — in which case the
 * app runs entirely local (IndexedDB), exactly as it does today. The backend
 * lights up only once VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are provided.
 *
 * Shared with the Council Room (src/council), so both apps hold one session on
 * the origin: signing in or out at app.owlry.ai is the same at /council/.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const isBackendConfigured = (): boolean => supabase !== null;

/** const alias of isBackendConfigured() — the OwlChat client/store seams import this name. */
export const isConfigured: boolean = supabase !== null;

/** The build can reach Live Scout. A signed-in session and ink are still required per turn. */
export const isLiveOwlConfigured = (): boolean => supabase !== null && liveOwlBuildEnabled;

/** Council: the build may call the live council (council-chat); VITE_COUNCIL_LIVE=off keeps the scripted one even with a backend */
export const isLiveCouncilConfigured = (): boolean => supabase !== null && env.VITE_COUNCIL_LIVE !== 'off';

/** Council: the signed-in user's id, or null (no backend / no session) */
export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
