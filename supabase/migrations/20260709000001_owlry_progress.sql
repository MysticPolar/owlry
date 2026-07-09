-- ============================================================
-- owlry — cross-device progress sync.
--
-- ADDITIVE ONLY, namespaced owlry_*. One row per account holding the
-- durable game-loop state as jsonb. Consumed by src/lib/sync/cloud.ts
-- (cloudPull/cloudPush): select('state').eq('user_id', uid) + upsert on
-- user_id. Renamed from the branch's 0002_owlry_progress.sql to sort after
-- the memory migration (20260708000001); the obsolete owlry_invites/owl-auth
-- migration (0001_owlry_auth.sql) was dropped in the merge.
-- ============================================================

create table if not exists public.owlry_progress (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  state      jsonb       not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.owlry_progress enable row level security;

-- a signed-in user may read + write ONLY their own progress row
drop policy if exists owlry_progress_rw_own on public.owlry_progress;
create policy owlry_progress_rw_own
  on public.owlry_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
