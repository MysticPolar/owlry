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

/** the display name / avatar for a user id. Reads public.profiles — the table
    signup-with-invite writes (id, display_name, email). (The economy profile,
    owlry_profiles, is keyed by user_id and holds no name.) Falls back to the email. */
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
    .from('profiles')
    .select('display_name, email')
    .eq('id', id)
    .maybeSingle();
  if (!data) return fallback;
  const name = ((data.display_name as string | null) ?? fallback.name).slice(0, 24);
  return {
    id,
    email: (data.email as string | null) ?? email,
    name,
    avatar: (name[0] || 'r').toUpperCase(),
  };
}

/** the current signed-in profile, or null (no session / no backend) */
export async function currentProfile(): Promise<AuthProfile | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  const profile = await fetchProfile(user.id, user.email ?? '');
  const latest = await supabase.auth.getSession();
  return latest.data.session?.user.id === user.id ? profile : null;
}

/** log in with email + password; resolves the profile or throws the raw error */
export async function signIn(email: string, password: string): Promise<AuthProfile> {
  if (!supabase) throw new Error('no-backend');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error || !data.user) throw error ?? new Error('sign-in failed');
  const profile = await fetchProfile(data.user.id, data.user.email ?? email);
  const latest = await supabase.auth.getSession();
  if (latest.data.session?.user.id !== data.user.id) {
    throw new Error('auth-session-changed');
  }
  return profile;
}

/** map a signup-with-invite error string to a voice reason (order matters:
    "invite code has already been used" contains both 'code' and 'already'). */
function reasonFromMessage(msg: string): SignupReason {
  const m = msg.toLowerCase();
  if (!m) return 'server';
  if (m.includes('code') || m.includes('invite')) return 'bad-code';
  if (m.includes('already') || m.includes('registered') || m.includes('exists')) return 'email-taken';
  if (m.includes('password')) return 'weak-password';
  if (m.includes('email')) return 'bad-email';
  return 'server';
}

/** invite-gated signup via the signup-with-invite function (creates the auth
    user server-side, claims the invite, auto-confirms email — the caller then
    signs straight in). Never creates a user client-side. */
export async function signUp(
  code: string,
  email: string,
  password: string,
): Promise<{ ok: boolean; reason: SignupReason }> {
  if (!supabase) return { ok: false, reason: 'no-backend' };
  const { data, error } = await supabase.functions.invoke('signup-with-invite', {
    body: { invite_code: code.trim(), email: email.trim().toLowerCase(), password, method: 'password' },
  });
  if (!error && (data as { ok?: boolean } | null)?.ok === true) return { ok: true, reason: 'ok' };

  // find the error message: on a 2xx-with-body it's in data.error; on a 4xx the
  // thrown FunctionsHttpError carries the Response on .context
  let msg = (data as { error?: string } | null)?.error ?? '';
  if (!msg && error) {
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = (await ctx.json()) as { error?: string };
        msg = body?.error ?? '';
      }
    } catch {
      /* body already consumed or not JSON — fall through to the generic reason */
    }
    if (!msg) msg = error.message ?? '';
  }
  return { ok: false, reason: reasonFromMessage(msg) };
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

/** subscribe to session changes (login/logout in another tab, token refresh) */
export function onAuthChange(cb: (profile: AuthProfile | null) => void): () => void {
  if (!supabase) return () => {};
  let active = true;
  let generation = 0;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const eventGeneration = ++generation;
    const user = session?.user;
    if (!user) {
      cb(null);
      return;
    }
    void fetchProfile(user.id, user.email ?? '').then((profile) => {
      if (active && generation === eventGeneration) cb(profile);
    });
  });
  return () => {
    active = false;
    generation += 1;
    data.subscription.unsubscribe();
  };
}
