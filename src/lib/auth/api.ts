/* ============================================================
   Auth API — thin wrappers over Supabase Auth so the stores and screens
   never import supabase-js directly. Same shape as the classic app's
   src/lib/auth/api.ts; the profile now comes from owlry_council_profiles
   (handle, name, bio) and sign-up goes through the council-signup
   function, which creates the account server-side, auto-confirms it and
   claims the handle.

   Every call is safe with no backend: `authAvailable()` is false and the
   screens keep the on-device mock account.
   ============================================================ */
import { supabase } from '../supabase';

export interface AuthProfile {
  id: string;
  email: string;
  name: string;
  handle: string;
  bio: string;
}

export type AuthReason =
  | 'ok'
  | 'bad-input'
  | 'bad-email'
  | 'weak-password'
  | 'bad-code'
  | 'email-taken'
  | 'bad-credentials'
  | 'unconfirmed'
  | 'rate-limited'
  | 'server'
  | 'no-backend';

export const authAvailable = (): boolean => supabase !== null;

function handleFrom(name: string, email: string): string {
  const base = (name || email.split('@')[0] || 'reader').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  return base.length >= 2 ? base.slice(0, 24) : 'reader';
}

/** the Council profile row for a user; created on the spot (claiming a handle) when an
    account from the classic app signs in here for the first time */
export async function fetchProfile(id: string, email: string, hint?: { name?: string; handle?: string }): Promise<AuthProfile> {
  const fallbackName = (hint?.name || email.split('@')[0] || 'Reader').slice(0, 40);
  const fallback: AuthProfile = { id, email, name: fallbackName, handle: hint?.handle || handleFrom(fallbackName, email), bio: '' };
  if (!supabase) return fallback;
  const { data } = await supabase.from('owlry_council_profiles').select('handle, name, bio').eq('user_id', id).maybeSingle();
  if (data) return { id, email, name: String(data.name), handle: String(data.handle), bio: String(data.bio ?? '') };
  const { data: handle, error } = await supabase.rpc('owlry_council_claim_handle', { p_user: id, p_handle: fallback.handle, p_name: fallback.name });
  if (error || typeof handle !== 'string') return fallback;
  return { ...fallback, handle };
}

/** the current signed-in profile, or null (no session / no backend) */
export async function currentProfile(): Promise<AuthProfile | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  return fetchProfile(user.id, user.email ?? '', { name: user.user_metadata?.display_name });
}

export async function signIn(email: string, password: string): Promise<AuthProfile> {
  if (!supabase) throw new Error('no-backend');
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.user) throw error ?? new Error('sign-in failed');
  return fetchProfile(data.user.id, data.user.email ?? email, { name: data.user.user_metadata?.display_name });
}

/** map a raw sign-in error to a reason the screen can voice */
export function signInReason(err: unknown): AuthReason {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (msg === 'no-backend') return 'no-backend';
  if (msg.includes('invalid') || msg.includes('credentials')) return 'bad-credentials';
  if (msg.includes('confirm')) return 'unconfirmed';
  if (msg.includes('rate') || msg.includes('too many')) return 'rate-limited';
  return 'server';
}

/** account creation via the council-signup function (never client-side auth.signUp — see the function's header) */
export async function signUp(input: { name: string; email: string; password: string; inviteCode?: string; handle?: string }): Promise<{ ok: boolean; reason: AuthReason; handle?: string }> {
  if (!supabase) return { ok: false, reason: 'no-backend' };
  const { data, error } = await supabase.functions.invoke('council-signup', {
    body: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      invite_code: input.inviteCode?.trim() || undefined,
      handle: input.handle || undefined,
    },
  });
  const body = data as { ok?: boolean; code?: string; handle?: string } | null;
  if (!error && body?.ok === true) return { ok: true, reason: 'ok', handle: body.handle };

  // on a 4xx the FunctionsHttpError carries the Response on .context
  let code = body?.code ?? '';
  if (!code && error) {
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') code = ((await ctx.json()) as { code?: string })?.code ?? '';
    } catch {
      /* not JSON — generic reason below */
    }
  }
  const known: AuthReason[] = ['bad-input', 'bad-email', 'weak-password', 'bad-code', 'email-taken', 'rate-limited', 'server'];
  return { ok: false, reason: known.includes(code as AuthReason) ? (code as AuthReason) : 'server' };
}

/** OAuth (Apple / Google) — only works once the provider is enabled in the Supabase dashboard */
export async function signInWithProvider(provider: 'apple' | 'google'): Promise<void> {
  if (!supabase) throw new Error('no-backend');
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: location.href } });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

/** update the public half of the profile; returns the reason on failure (handle taken, mostly) */
export async function saveProfile(id: string, p: { name: string; handle: string; bio: string }): Promise<'ok' | 'handle-taken' | 'server' | 'no-backend'> {
  if (!supabase) return 'no-backend';
  const { error } = await supabase.from('owlry_council_profiles').update({ name: p.name, handle: p.handle, bio: p.bio }).eq('user_id', id);
  if (!error) return 'ok';
  return error.code === '23505' ? 'handle-taken' : 'server';
}

/** subscribe to session changes (login/logout in another tab, token refresh) */
export function onAuthChange(cb: (profile: AuthProfile | null) => void): () => void {
  if (!supabase) return () => {};
  let active = true;
  let generation = 0;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const mine = ++generation;
    const user = session?.user;
    if (!user) {
      cb(null);
      return;
    }
    void fetchProfile(user.id, user.email ?? '', { name: user.user_metadata?.display_name }).then((profile) => {
      if (active && generation === mine) cb(profile);
    });
  });
  return () => {
    active = false;
    generation += 1;
    data.subscription.unsubscribe();
  };
}
