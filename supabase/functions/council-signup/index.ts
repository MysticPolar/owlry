// ═══════════════════════════════════════════════════════════════
// council-signup — account creation for The Council Room.
//
// A sibling of signup-with-invite with the same reasons for existing:
// this project has no SMTP configured, so a client-side auth.signUp()
// would leave the reader waiting for a confirmation email that never
// comes. The account is created server-side (service role) and
// auto-confirmed, and the Council profile (handle, name) is claimed in
// the same request via owlry_council_claim_handle.
//
// Invite codes: the classic app is a closed beta gated by
// invitation_codes. The Council honours the same ledger. Whether a code
// is REQUIRED is a deploy-time switch — secret COUNCIL_INVITE_REQUIRED
// ("true" by default; set "false" to open the doors). A code that is
// given is always validated and claimed (owlry_claim_invite), whatever
// the switch says.
//
// Abuse guard: this endpoint is public, so it is rate-limited per client
// IP (5/hour) through the shared owlry_rl_bump RPC, on top of the invite
// gate.
//
// POST body:
//   { email, password, name?, handle?, invite_code? }
// Response: 200 { ok: true, user_id, handle }
//           4xx { error, code }   code ∈ bad-input | bad-email | weak-password |
//                                  bad-code | email-taken | rate-limited | server
// ═══════════════════════════════════════════════════════════════
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

function admin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const fail = (status: number, code: string, error: string) => jsonResponse({ error, code }, status);

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') ?? '';
  return fwd.split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'unknown';
}

function hourStart(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours())).toISOString();
}

/** a handle from the name or the email's local part — the RPC de-duplicates */
function suggestHandle(name: string, email: string): string {
  const base = (name || email.split('@')[0] || 'reader').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  return base.length >= 2 ? base.slice(0, 24) : 'reader';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return fail(405, 'server', 'Method not allowed');

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return fail(400, 'bad-input', 'Invalid JSON');
  }

  const email = String(payload.email ?? '').trim().toLowerCase();
  const password = typeof payload.password === 'string' ? payload.password : '';
  const name = String(payload.name ?? '').trim().slice(0, 40);
  const handle = String(payload.handle ?? '').trim().slice(0, 30);
  const inviteCode = String(payload.invite_code ?? '').trim().toUpperCase();
  const inviteRequired = (Deno.env.get('COUNCIL_INVITE_REQUIRED') ?? 'true').toLowerCase() !== 'false';

  if (!isEmail(email)) return fail(400, 'bad-email', 'A valid email is required');
  if (password.length < 8) return fail(400, 'weak-password', 'Password must be at least 8 characters');
  if (inviteRequired && !inviteCode) return fail(400, 'bad-code', 'An invite code is required while the Council is in beta');

  const sb = admin();

  // ── per-IP rate limit: 5 signups an hour ──
  const { data: allowed } = await sb.rpc('owlry_rl_bump', { p_key: `council-signup:${clientIp(req)}`, p_window_start: hourStart(), p_max: 5 });
  if (allowed === false) return fail(429, 'rate-limited', 'Too many sign-ups from this address. Try again in an hour.');

  // ── pre-check the invite for a clear error before creating anything ──
  if (inviteCode) {
    const { data: code, error: codeErr } = await sb
      .from('invitation_codes')
      .select('code, max_uses, uses_count, active, expires_at')
      .eq('code', inviteCode)
      .maybeSingle();
    if (codeErr) return fail(500, 'server', 'Database error');
    if (!code) return fail(404, 'bad-code', 'Invite code not found');
    if (!code.active) return fail(403, 'bad-code', 'Invite code has been revoked');
    if (code.expires_at && new Date(code.expires_at).getTime() < Date.now()) return fail(403, 'bad-code', 'Invite code has expired');
    if (code.uses_count >= code.max_uses) return fail(403, 'bad-code', 'Invite code has already been used');
  }

  // ── create the auth user, auto-confirmed (no SMTP on this project) ──
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name, invite_code: inviteCode || null, app: 'council' },
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes('already') || m.includes('registered') || m.includes('exists')) return fail(409, 'email-taken', 'That email already has an account');
    if (m.includes('password')) return fail(400, 'weak-password', error.message);
    return fail(400, 'bad-input', error.message);
  }
  const userId = data.user!.id;

  const rollback = async (status: number, code: string, reason: string) => {
    try {
      await sb.auth.admin.deleteUser(userId);
    } catch (e) {
      console.error('[council-signup] rollback deleteUser failed', e);
    }
    return fail(status, code, reason);
  };

  // ── claim the invite atomically (only uses_count is touched — see the classic function) ──
  if (inviteCode) {
    const { data: claimed, error: claimErr } = await sb.rpc('owlry_claim_invite', { p_code: inviteCode, p_user: userId });
    if (claimErr || claimed !== true) return rollback(409, 'bad-code', 'Invite code was just claimed by someone else. Please try a different code.');
  }

  // ── the Council profile: handle + name ──
  const { data: claimedHandle, error: handleErr } = await sb.rpc('owlry_council_claim_handle', {
    p_user: userId,
    p_handle: handle || suggestHandle(name, email),
    p_name: name || email.split('@')[0],
  });
  if (handleErr) {
    console.error('[council-signup] handle claim failed', handleErr.message);
    return rollback(500, 'server', 'Could not create the profile. Please try again.');
  }

  // ── the classic profile row too, so the same account works in the old app (non-critical) ──
  const { error: profErr } = await sb.from('profiles').insert({ id: userId, email, display_name: name || null, invited_by: null, invite_code_used: inviteCode || null });
  if (profErr) console.error('[council-signup] classic profile insert failed', profErr.message);

  return jsonResponse({ ok: true, user_id: userId, handle: claimedHandle });
});
