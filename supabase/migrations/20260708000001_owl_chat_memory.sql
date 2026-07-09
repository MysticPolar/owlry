-- ============================================================================
--  owlry — chat history + memory schema (Scout & Peek)
--
--  Adds:
--    owlry_chat_messages      — persisted transcript (server-written, user-readable)
--    owlry_user_memory        — long_term profile (jsonb) + topics (jsonb), one row/user
--    owlry_invite_redemptions — audit trail for invite-gated signup
--    owlry_claim_invite()     — atomic invite-code claim RPC
--    owlry_rl_bump()          — rate-limit bump RPC over the existing rate_limit_buckets
--
--  Supersedes supabase/migrations/0001_memory.sql (user_memory/user_data — never
--  applied to the live project; replaced by owlry_-prefixed tables to match this
--  project's naming convention).
--
--  IMPORTANT — two auth systems coexist in this database:
--    (A) Supabase Auth: auth.users + public.profiles (display_name/invited_by/
--        invite_code_used as plain text) — what verify_jwt edge functions use.
--    (B) A legacy custom system: public.users (password_hash, tier, seat
--        numbers, Stripe) + public.sessions/auth_tokens — a SEPARATE table,
--        and invitation_codes.owner_user_id / used_by_user_id are FOREIGN
--        KEYS INTO (B)'s public.users, NOT auth.users.
--  This app's login uses (A). owlry_claim_invite() below therefore touches
--  ONLY invitation_codes.uses_count (never owner_user_id/used_by_user_id —
--  writing an auth.users id into those columns would violate their FK to
--  public.users) and records redemptions in owlry_invite_redemptions, a new
--  table that correctly FKs to auth.users.
-- ============================================================================

-- ── chat transcript ──────────────────────────────────────────────────────
create table if not exists public.owlry_chat_messages (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  who        text not null check (who in ('me', 'owl')),
  kind       text not null check (kind in ('msg', 'letter', 'note')),
  payload    jsonb not null default '{}'::jsonb
             check (octet_length(payload::text) <= 8192),
  created_at timestamptz not null default now()
);

create index if not exists owlry_chat_messages_user_ts
  on public.owlry_chat_messages (user_id, created_at);

alter table public.owlry_chat_messages enable row level security;

create policy "owlry_chat_messages own select" on public.owlry_chat_messages
  for select to authenticated using (auth.uid() = user_id);
-- No insert/update/delete for `authenticated` — edge functions write via the
-- service role, always scoped to a single user_id computed from the caller's JWT.

-- ── memory: one row per user, two layers ────────────────────────────────
create table if not exists public.owlry_user_memory (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  long_term  jsonb not null default '{}'::jsonb
             check (char_length(long_term::text) <= 2000),
  topics     jsonb not null default '[]'::jsonb
             check (char_length(topics::text) <= 1200),
  updated_at timestamptz not null default now()
);

alter table public.owlry_user_memory enable row level security;

-- View + edit + forget in MVP: the user gets full CRUD on their OWN row.
-- (The edge functions write via the service role for the same reasons as above;
-- these policies are what make the client-side Memory view/edit/forget UI work
-- directly against Supabase with no edge function involved.)
create policy "owlry_user_memory own select" on public.owlry_user_memory
  for select to authenticated using (auth.uid() = user_id);
create policy "owlry_user_memory own insert" on public.owlry_user_memory
  for insert to authenticated with check (auth.uid() = user_id);
create policy "owlry_user_memory own update" on public.owlry_user_memory
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owlry_user_memory own delete" on public.owlry_user_memory
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.owlry_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''  -- immutable search_path (now() resolves from pg_catalog); satisfies the linter
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists owlry_user_memory_touch on public.owlry_user_memory;
create trigger owlry_user_memory_touch
  before update on public.owlry_user_memory
  for each row execute function public.owlry_touch_updated_at();

-- ── invite redemption audit ──────────────────────────────────────────────
-- Its own table (see header note) — correctly FKs to auth.users, unlike the
-- legacy invitation_codes.used_by_user_id (which FKs to public.users).
create table if not exists public.owlry_invite_redemptions (
  id          bigint generated always as identity primary key,
  code        text not null,
  user_id     uuid not null references auth.users (id) on delete cascade,
  redeemed_at timestamptz not null default now()
);

alter table public.owlry_invite_redemptions enable row level security;
-- Service-role only — intentionally no policies for anon/authenticated.

-- ── atomic invite claim ──────────────────────────────────────────────────
-- Called by signup-with-invite AFTER the Supabase Auth user is created.
-- Touches ONLY invitation_codes.uses_count — never owner_user_id/used_by_user_id.
create or replace function public.owlry_claim_invite(p_code text, p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  update invitation_codes
     set uses_count = uses_count + 1
   where code = upper(trim(p_code))
     and active
     and uses_count < max_uses
     and (expires_at is null or expires_at > now())
  returning id into v_id;

  if v_id is null then
    return false;
  end if;

  insert into owlry_invite_redemptions (code, user_id) values (upper(trim(p_code)), p_user);
  return true;
end;
$$;

revoke all on function public.owlry_claim_invite(text, uuid) from public, anon, authenticated;

-- ── rate limiting via the existing rate_limit_buckets ────────────────────
-- owlry_rl_bump's ON CONFLICT (bucket_key, window_start) requires a unique
-- constraint/index on exactly those columns. The live table already has that
-- composite PRIMARY KEY (verified by inspection), and a plain
-- `create unique index if not exists` would still add a second, duplicate
-- index (it only checks the NAME) — taxing every write for nothing. So:
-- create the defensive index ONLY if no unique index on that column set
-- exists. Zero-cost against the real schema; self-healing if it ever differs.
do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_class t on t.oid = i.indrelid
    where t.relname = 'rate_limit_buckets'
      and t.relnamespace = 'public'::regnamespace
      and i.indisunique
      and i.indnkeyatts = 2
      and (
        select array_agg(a.attname::text order by a.attname)
        from pg_attribute a
        where a.attrelid = t.oid
          and a.attnum = any (i.indkey)
      ) = array['bucket_key', 'window_start']
  ) then
    create unique index rate_limit_buckets_key_window
      on public.rate_limit_buckets (bucket_key, window_start);
  end if;
end;
$$;

create or replace function public.owlry_rl_bump(p_key text, p_window_start timestamptz, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into rate_limit_buckets (bucket_key, window_start, count)
  values (p_key, p_window_start, 1)
  on conflict (bucket_key, window_start)
  do update set count = rate_limit_buckets.count + 1
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

revoke all on function public.owlry_rl_bump(text, timestamptz, int) from public, anon, authenticated;
