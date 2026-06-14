import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* import.meta.env is a Vite feature; guard it so this module is import-safe in
   plain Node (the tsx smoke tests load it transitively via the store). */
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
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
