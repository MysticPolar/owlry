/* ============================================================
   owlry — the Supabase client (the auth + backend seam).

   `supabase` is null whenever VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
   aren't configured — the ENTIRE app (login gate, history, memory,
   live owl calls) treats a null client as "not configured" and stays
   in today's fully offline mode, byte-identical to the mockup. This
   is the single flag every other seam checks.
   ============================================================ */
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// guard for non-Vite runtimes (tsx/node test scripts), where import.meta.env is absent
const ENV = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const URL = ENV?.VITE_SUPABASE_URL;
const ANON_KEY = ENV?.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null = URL && ANON_KEY ? createClient(URL, ANON_KEY) : null;

/** true whenever the app has a backend configured (auth wall, history, memory all gate on this) */
export const isConfigured = supabase !== null;
