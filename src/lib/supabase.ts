import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Guard `import.meta.env` so this module is also safe outside Vite (Node test
// runners, SSR), where it is undefined rather than the Vite env object.
const env = (import.meta.env ?? {}) as Record<string, string | undefined>;
const url = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

/**
 * The Supabase client, or `null` when env vars aren't set — in which case the
 * app runs entirely local (IndexedDB), exactly as it does today. The backend
 * lights up only once VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are provided.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const isBackendConfigured = (): boolean => supabase !== null;
