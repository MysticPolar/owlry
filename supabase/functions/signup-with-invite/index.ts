// ═══════════════════════════════════════════════════════════════
// signup-with-invite v4 — closed-beta signup gated by invite code
//
// Fixes the v3 schema drift: v3 read/wrote phantom tables
// (`invite_codes`, `invite_redemptions`) that don't exist in this
// project. The real table is `invitation_codes` — but its
// `owner_user_id` / `used_by_user_id` columns are foreign keys into
// `public.users` (a SEPARATE, legacy custom-auth table), NOT
// `auth.users` (what this app's Supabase-Auth signup creates). This
// function therefore never writes those two columns — it validates
// against `invitation_codes` and atomically claims a use via the
// `owlry_claim_invite` RPC (which touches only `uses_count` and
// records the redemption in `owlry_invite_redemptions`, a new table
// that correctly FKs to `auth.users`). See the migration file for
// the full rationale.
//
// POST body (contract unchanged from v3):
//   {
//     email: string,
//     display_name?: string,
//     invite_code: string,
//     method: "password" | "magic_link",
//     password?: string,         // required if method === "password"
//     redirect_to?: string,      // optional magic-link return URL
//   }
//
// Response: 200 { ok: true, user_id, method, requires_email_confirm }
//           4xx { error }
//
// Atomicity: the invite is claimed via a security-definer RPC AFTER the
// auth user is created; on claim failure the just-created auth user is
// deleted (compensating rollback) and a 409 is returned.
// ═══════════════════════════════════════════════════════════════

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

function admin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// this file's call sites use the (status, body) order carried over from v3 —
// adapt to _shared/cors.ts's (body, status) signature rather than rewrite every call.
function json(status: number, body: unknown) {
  return jsonResponse(body, status);
}

function normCode(s: unknown): string {
  return String(s ?? '').trim().toUpperCase();
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'Invalid JSON' });
  }

  const email = String(payload.email ?? '').trim().toLowerCase();
  const displayName = String(payload.display_name ?? '').trim();
  const inviteCode = normCode(payload.invite_code);
  const method = payload.method === 'magic_link' ? 'magic_link' : 'password';
  const password = payload.password as string | undefined;
  const redirectTo = (payload.redirect_to as string | undefined) || undefined;

  if (!isEmail(email)) return json(400, { error: 'Valid email is required' });
  if (!inviteCode) return json(400, { error: 'Invite code is required' });
  if (method === 'password' && (!password || password.length < 8)) {
    return json(400, { error: 'Password must be at least 8 characters' });
  }

  const sb = admin();

  // 1. Fast pre-check against the REAL table (invitation_codes) for a clear error
  //    before we go create an auth user. The atomic claim below is what actually
  //    prevents a race between two concurrent signups on the same code.
  const { data: code, error: codeErr } = await sb
    .from('invitation_codes')
    .select('code, max_uses, uses_count, active, expires_at')
    .eq('code', inviteCode)
    .maybeSingle();

  if (codeErr) return json(500, { error: 'Database error' });
  if (!code) return json(404, { error: 'Invite code not found' });
  if (!code.active) return json(403, { error: 'Invite code has been revoked' });
  if (code.expires_at && new Date(code.expires_at).getTime() < Date.now()) {
    return json(403, { error: 'Invite code has expired' });
  }
  if (code.uses_count >= code.max_uses) {
    return json(403, { error: 'Invite code has already been used' });
  }

  // 2. Create the Supabase Auth user (password or magic-link invite).
  //    The invite code IS the verification for this closed beta, so the
  //    password path is auto-confirmed (email_confirm: true) — the reader
  //    can sign in immediately, with no confirmation email round-trip (this
  //    project has no SMTP configured, so an unconfirmed user would be stuck).
  let userId: string | null = null;
  if (method === 'password') {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, invite_code: inviteCode },
    });
    if (error) return json(400, { error: error.message });
    userId = data.user!.id;
  } else {
    const { data, error } = await sb.auth.admin.inviteUserByEmail(email, {
      data: { display_name: displayName, invite_code: inviteCode },
      redirectTo,
    });
    if (error) return json(400, { error: error.message });
    userId = data.user!.id;
  }

  const rollback = async (reason: string) => {
    try {
      if (userId) await sb.auth.admin.deleteUser(userId);
    } catch (e) {
      console.error('[signup-with-invite] rollback deleteUser failed', e);
    }
    return json(409, { error: reason });
  };

  // 3. Atomically claim the invite. Touches ONLY invitation_codes.uses_count and
  //    inserts into owlry_invite_redemptions (never owner_user_id/used_by_user_id —
  //    see the header note on the id-space mismatch).
  const { data: claimed, error: claimErr } = await sb.rpc('owlry_claim_invite', { p_code: inviteCode, p_user: userId });
  if (claimErr || claimed !== true) {
    return rollback('Invite code was just claimed by someone else. Please try a different code.');
  }

  // 4. Record the profile (non-critical — log and continue on failure).
  //    `invited_by` is intentionally left null: invitation_codes.owner_user_id
  //    references the legacy public.users table, not auth.users, so there is no
  //    safe auth.users id to attribute this signup to via that column.
  const { error: profErr } = await sb.from('profiles').insert({
    id: userId,
    email,
    display_name: displayName || null,
    invited_by: null,
    invite_code_used: inviteCode,
  });
  if (profErr) {
    console.error('[signup-with-invite] profile insert failed', profErr.message);
  }

  return json(200, {
    ok: true,
    user_id: userId,
    method,
    // password signups are auto-confirmed above; only the magic-link path
    // needs the reader to act on an email before they can sign in.
    requires_email_confirm: method === 'magic_link',
  });
});
