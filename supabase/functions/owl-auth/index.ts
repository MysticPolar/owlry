// ============================================================
// owlry — owl-auth edge function (Deno / Supabase).
//
// Invite-gated signup. The browser can't be trusted to check an
// invitation code (anyone could skip the check and sign up direct),
// so signup runs here with the SERVICE ROLE key (server-side only):
// verify + claim the
// code, create the auth user, seed the profile — all server-side.
//
// Login is NOT here: the client logs in with the anon key via
// supabase.auth.signInWithPassword once an account exists.
//
// Deploy:   supabase functions deploy owl-auth
// Secrets:  none to set — Supabase injects SUPABASE_URL and
//           SUPABASE_SERVICE_ROLE_KEY into every edge function.
// Dashboard: turn OFF public sign-ups (Authentication → Providers →
//           Email → "Allow new users to sign up") so this function
//           is the only way in. See docs/auth.md.
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/** user-facing outcomes; the client maps these to the owl's voice */
type Reason =
  | 'ok'
  | 'bad-input'
  | 'bad-email'
  | 'weak-password'
  | 'bad-code'
  | 'email-taken'
  | 'server';

const out = (ok: boolean, reason: Reason, extra: Record<string, unknown> = {}) =>
  jsonResponse({ ok, reason, ...extra }, 200);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ ok: false, reason: 'bad-input' }, 405);

  let body: { action?: string; code?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return out(false, 'bad-input');
  }

  if (body.action !== 'signup') return out(false, 'bad-input');

  // codes are case-insensitive: normalize to upper-case (stored codes are too)
  const code = (body.code ?? '').trim().toUpperCase();
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';

  // ---- validate before touching the database ----
  if (!code || !email || !password) return out(false, 'bad-input');
  if (!EMAIL_RE.test(email)) return out(false, 'bad-email');
  if (password.length < MIN_PASSWORD) return out(false, 'weak-password');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    console.error('owl-auth: missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    return out(false, 'server');
  }
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // ---- claim the invite atomically ---------------------------------------
  // The UPDATE ... WHERE consumed = false is the lock: only one caller can flip
  // a given code from false→true, so a code can never be spent twice even under
  // a race. We reserve it first, then create the user; if that fails we release.
  const { data: claimed, error: claimErr } = await admin
    .from('owlry_invites')
    .update({ consumed: true, consumed_at: new Date().toISOString() })
    .eq('code', code)
    .eq('consumed', false)
    .select('code');

  if (claimErr) {
    console.error('owl-auth: invite claim failed', claimErr.message);
    return out(false, 'server');
  }
  if (!claimed || claimed.length === 0) return out(false, 'bad-code');

  const release = async () => {
    await admin
      .from('owlry_invites')
      .update({ consumed: false, consumed_at: null })
      .eq('code', code);
  };

  // ---- create the auth user ----------------------------------------------
  // email_confirm: true trusts the invite and skips the confirmation email, so
  // the account works immediately without SMTP configured. Flip to false (and
  // configure email) if you'd rather verify addresses. See docs/auth.md.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr || !created?.user) {
    await release(); // the code wasn't used — give it back
    const msg = (createErr?.message ?? '').toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return out(false, 'email-taken');
    }
    console.error('owl-auth: createUser failed', createErr?.message);
    return out(false, 'server');
  }

  const user = created.user;

  // ---- seed the profile + stamp the invite -------------------------------
  const localPart = email.split('@')[0] ?? 'reader';
  const displayName = localPart.slice(0, 24) || 'reader';
  const avatarChar = (localPart[0] ?? 'r').toUpperCase();

  const { error: profileErr } = await admin.from('owlry_profiles').insert({
    id: user.id,
    email,
    display_name: displayName,
    avatar_char: avatarChar,
  });
  if (profileErr) {
    // non-fatal: the account exists and can sign in; the profile can be
    // re-created lazily on next load. Just log it.
    console.error('owl-auth: profile insert failed', profileErr.message);
  }

  await admin.from('owlry_invites').update({ consumed_by: user.id }).eq('code', code);

  return out(true, 'ok', { email });
});
