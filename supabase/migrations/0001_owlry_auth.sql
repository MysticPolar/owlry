-- ============================================================
-- owlry — auth: invite-gated accounts.
--
-- ADDITIVE ONLY. Everything is namespaced `owlry_*` so it never
-- collides with anything else living in this Supabase project
-- (e.g. the waitlist). Run once:  supabase db push  (or paste into
-- the SQL editor). See docs/auth.md for the full setup.
-- ============================================================

-- ---- invitation codes -------------------------------------------------------
-- Signup is gated by these. ONLY the `owl-auth` edge function (service role)
-- ever reads or writes this table, so RLS is on with NO policies — the anon /
-- authenticated client can't see codes or claim them; the service role bypasses
-- RLS. This is what makes the invite gate real rather than cosmetic.
create table if not exists public.owlry_invites (
  code         text primary key,
  note         text,
  consumed     boolean     not null default false,
  consumed_by  uuid        references auth.users (id) on delete set null,
  consumed_at  timestamptz,
  created_at   timestamptz not null default now()
);
alter table public.owlry_invites enable row level security;

-- ---- profiles ---------------------------------------------------------------
-- One row per account: the display name + owl avatar shown in the app. The
-- owl-auth function creates the row at signup; the signed-in user may read and
-- update only their own.
create table if not exists public.owlry_profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text        not null default 'reader',
  avatar_char  text        not null default 'M',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.owlry_profiles enable row level security;

drop policy if exists owlry_profiles_select_own on public.owlry_profiles;
create policy owlry_profiles_select_own
  on public.owlry_profiles for select
  using (auth.uid() = id);

drop policy if exists owlry_profiles_update_own on public.owlry_profiles;
create policy owlry_profiles_update_own
  on public.owlry_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---- starter invitation codes ----------------------------------------------
-- Change or delete these before a real launch; add your own with:
--   insert into public.owlry_invites (code, note) values ('YOUR-CODE', 'note');
insert into public.owlry_invites (code, note) values
  ('OWLERY-2026',  'starter batch'),
  ('NIGHT-POST',   'starter batch'),
  ('FIRST-FLIGHT', 'starter batch')
on conflict (code) do nothing;
