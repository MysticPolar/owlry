/* ============================================================
   owlry — authentication.

   Model (chosen with the user): no locking screen. Every visitor gets a
   silent anonymous Supabase session so the economy works immediately; a
   separate Settings page lets them attach/sign into an EMAIL account. Linking
   an email to the anonymous user converts it in place — the same auth.users id,
   so all owlry_* progress carries over with no migration. The email is the
   identity shared with the landing page.

   Requires (Supabase dashboard, one-time): Anonymous sign-ins enabled, and the
   Email provider enabled for magic-link / OTP.
   ============================================================ */
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface Account {
  userId: string;
  email: string | null;
  /** true until an email is linked — i.e. a device-only guest identity */
  isGuest: boolean;
}

function toAccount(user: User | null): Account | null {
  if (!user) return null;
  const email = user.email ?? null;
  return { userId: user.id, email, isGuest: !email };
}

/**
 * Return the current account, signing in anonymously if there's no session yet.
 * Resolves to null if the backend isn't configured or anonymous sign-in fails
 * (e.g. the provider isn't enabled) — the caller then stays local-only.
 */
export async function ensureSession(): Promise<Account | null> {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  let user = sessionData.session?.user ?? null;
  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn('[owlry] anonymous sign-in unavailable:', error.message);
      return null;
    }
    user = data.user;
  }
  return toAccount(user);
}

/** Link an email to the current (anonymous) user — converts it in place; data
 *  is kept. Sends a confirmation link to the address. */
export async function linkEmail(email: string) {
  if (!supabase) throw new Error('backend not configured');
  return supabase.auth.updateUser({ email });
}

/** Email a magic-link / OTP to sign into an EXISTING account (a different
 *  identity than the current guest — used on a new device). */
export async function signInWithEmail(email: string) {
  if (!supabase) throw new Error('backend not configured');
  return supabase.auth.signInWithOtp({ email });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Subscribe to auth-state changes; returns an unsubscribe function. */
export function onAuthChange(cb: (account: Account | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(toAccount(session?.user ?? null));
  });
  return () => data.subscription.unsubscribe();
}
