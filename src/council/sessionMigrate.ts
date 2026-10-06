/* ============================================================
   One-time move of a Council sign-in onto the shared session.

   The Council used its own auth storage key ('owlry-council-auth'); it now
   shares Owlry's client (src/lib/supabase.ts), whose key is supabase-js's
   default, sb-<project ref>-auth-token. A reader who was signed in to the
   Council keeps that session: it is copied across once, unless an Owlry
   session is already there (then that one wins — one session per origin).

   Must be the FIRST import of main.tsx: the shared client is created when
   its module is evaluated, and reads storage from then on. Safe to delete
   once nobody can still hold the old key.
   ============================================================ */
const OLD_KEY = 'owlry-council-auth';

try {
  const saved = localStorage.getItem(OLD_KEY);
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (saved !== null && url) {
    const key = `sb-${new URL(url).hostname.split('.')[0]}-auth-token`;
    if (localStorage.getItem(key) === null) localStorage.setItem(key, saved);
    localStorage.removeItem(OLD_KEY);
  }
} catch {
  /* storage unavailable or a malformed URL — the reader just signs in again */
}

export {};
