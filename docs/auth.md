# Auth — invite-gated accounts

Owlry accounts are **optional** and **invite-gated**. The theatre still opens
for everyone (guest mode, local-first, fully offline); signing in adds a real
account. This is the same posture as the live owl: with no backend configured,
the app behaves exactly as it always has.

- **Sign up** = invitation code + email + password (the code is verified
  server-side; you can't create an account without a valid one).
- **Log in** = email + password.
- **Guest** = the current local demo profile (“Mira”), shared by everyone who
  doesn’t sign in. No account, no network needed.

## How it fits together

| Piece | Where | Role |
|---|---|---|
| Login / signup page | `src/components/overlays/Auth.tsx` | The “members’ door” — Keeper presides. |
| Auth state | `src/store/useAuth.ts` | `status` (`loading` / `guest` / `authed`), the current user, and the login/signup/logout actions. Kept separate from the game-loop store. |
| Supabase calls | `src/lib/auth/api.ts` | Thin wrappers over Supabase Auth; safe no-ops when there’s no backend. |
| Invite-gated signup | `supabase/functions/owl-auth/index.ts` | Verifies + claims the code, creates the user with the **service role**, seeds the profile. |
| Tables | `supabase/migrations/0001_owlry_auth.sql` | `owlry_invites`, `owlry_profiles` (additive, `owlry_*`, RLS on). |

**Why signup runs server-side.** A browser can’t be trusted to check an
invitation code — anyone could skip the check and call Supabase signup directly.
So `owl-auth` does it with the service-role key: it atomically claims the code
(`UPDATE … WHERE consumed = false`, so a code can never be spent twice), then
creates the user. Login is plain client-side `signInWithPassword` — only signup
needs the gate.

## One-time setup

You need the same Supabase project the live owl uses. All of this is additive
and namespaced `owlry_*`, so it won’t touch anything else in the project.

1. **Run the migration** — creates `owlry_invites` + `owlry_profiles` with RLS.
   Paste `supabase/migrations/0001_owlry_auth.sql` into the Supabase **SQL
   editor** and run it (or `supabase db push` if you use the CLI locally).

2. **Deploy the function** — Actions → **Deploy edge functions
   (owl-chat + owl-auth)** → *Run workflow*. (It now deploys both.) No secrets to
   add: Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into
   every function automatically.

3. **Close public signups** so the invite gate is the only way in:
   Dashboard → **Authentication → Providers → Email** → turn **off**
   “Allow new users to sign up”. Leave the Email provider itself **enabled**
   (that’s what password login uses). “Confirm email” can stay **off** — the
   function creates users with `email_confirm: true` so accounts work
   immediately without SMTP. Turn it on later if you want verified addresses
   (then also flip `email_confirm` to `false` in `owl-auth`).

4. **Point the app at the backend** (already done for the live owl): the build
   needs `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. With these unset, the
   login page shows “accounts need a backend” and guest still works.

5. **Add invitation codes.** The migration seeds three starters
   (`OWLERY-2026`, `NIGHT-POST`, `FIRST-FLIGHT`). Add your own any time:

   ```sql
   insert into public.owlry_invites (code, note) values ('YOUR-CODE', 'who it is for');
   ```

   See who’s used what:

   ```sql
   select code, consumed, consumed_at, consumed_by from public.owlry_invites order by created_at;
   ```

## Security notes

- The **service-role key never leaves the function** (Supabase injects it
  server-side; it’s never in the browser bundle or Git).
- `owlry_invites` has **RLS on with no policies** — the anon/authenticated
  client can’t read codes or claim them; only the function (service role)
  bypasses RLS. The gate is real, not cosmetic.
- `owlry_profiles` — a signed-in user can read/update **only their own** row.

## Not built yet (follow-ups)

- **Cross-device sync of progress** — accounts currently establish identity
  (name, email, avatar); reading progress still lives in local IndexedDB. Syncing
  XP / shelves / progress to the account is the next step (it needs its own
  `owlry_*` table + RLS and a repository swap in `src/store/persistence.ts`).
- **Password reset** and **email confirmation** flows.
- **Social sign-in** (Google/Apple), if wanted, layers onto the same store.
