/* ============================================================
   owlry — auth API. Thin wrappers over Supabase Auth so the store
   (and the rest of the app) never import supabase-js directly.

   Every call is safe when there's no backend: `authAvailable()` is
   false and the callers fall back to guest mode, so the app keeps
   working entirely offline, exactly as before.
   ============================================================ */
import { supabase } from '../supabase';

export interface AuthProfile {
  id: string;
  email: string;
  name: string;
  avatar: string;
}

/** the outcome codes the owl-auth function returns (mapped to voice in the store) */
export type SignupReason =
  | 'ok'
  | 'bad-input'
  | 'bad-email'
  | 'weak-password'
  | 'bad-code'
  | 'email-taken'
  | 'server'
  | 'no-backend';

/** true only when VITE_SUPABASE_* are set — otherwise accounts are unavailable */
export const authAvailable = (): boolean => supabase !== null;

/** the display name / avatar for a user id (from owlry_profiles; falls back to the email) */
async function fetchProfile(id: string, email: string): Promise<AuthProfile> {
  const fallbackName = email.split('@')[0] || 'reader';
  const fallback: AuthProfile = {
    id,
    email,
    name: fallbackName.slice(0, 24),
    avatar: (fallbackName[0] || 'r').toUpperCase(),
  };
  if (!supabase) return fallback;
  const { data } = await supabase
    .from('owlry_profiles')
    .select('display_name, avatar_char, email')
    .eq('id', id)
    .maybeSingle();
  if (!data) return fallback;
  return {
    id,
    email: data.email ?? email,
    name: data.display_name ?? fallback.name,
    avatar: data.avatar_char ?? fallback.avatar,
  };
}

/** the current signed-in profile, or null (no session / no backend) */
export async function currentProfile(): Promise<AuthProfile | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  return fetchProfile(user.id, user.email ?? '');
}

/** log in with email + password; resolves the profile or throws the raw error */
export async function signIn(email: string, password: string): Promise<AuthProfile> {
  if (!supabase) throw new Error('no-backend');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error || !data.user) throw error ?? new Error('sign-in failed');
  return fetchProfile(data.user.id, data.user.email ?? email);
}

/** invite-gated signup via the owl-auth function (never creates a user client-side) */
export async function signUp(
  code: string,
  email: string,
  password: string,
): Promise<{ ok: boolean; reason: SignupReason }> {
  if (!supabase) return { ok: false, reason: 'no-backend' };
  const { data, error } = await supabase.functions.invoke('owl-auth', {
    body: { action: 'signup', code: code.trim(), email: email.trim().toLowerCase(), password },
  });
  if (error) return { ok: false, reason: 'server' };
  const res = data as { ok?: boolean; reason?: SignupReason };
  return { ok: !!res?.ok, reason: res?.reason ?? 'server' };
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

/** subscribe to session changes (login/logout in another tab, token refresh) */
export function onAuthChange(cb: (profile: AuthProfile | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    const user = session?.user;
    cb(user ? await fetchProfile(user.id, user.email ?? '') : null);
  });
  return () => data.subscription.unsubscribe();
}
