import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

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
