-- ============================================================
-- Owlry backend — core schema.
--
-- ADDITIVE & NAMESPACED: every object is prefixed public.owlry_* and this
-- migration reads/alters NOTHING that already exists. Safe to run on the
-- shared database that also hosts the landing page + waitlist.
--
-- Identity: reuses the project's Supabase Auth (auth.users). No new auth.
-- Economy is server-authoritative: clients may only SELECT their own rows;
-- all writes go through the security-definer RPCs in the functions migration.
-- ============================================================

-- ---------- tunable config (data, not code) ----------
create table if not exists public.owlry_economy_config (
  key text primary key,
  num numeric not null
);

create table if not exists public.owlry_action_config (
  action  text primary key,
  xp      integer not null default 0,
  ink     integer not null default 0,   -- negative = spend, positive = earn
  coins   integer not null default 0,
  enabled boolean not null default true
);

create table if not exists public.owlry_book_dimensions (
  book_id   text primary key,
  dimension text not null
    check (dimension in ('health','wealth','relationship','career','mindset','fiction'))
);

-- ---------- per-user state ----------
create table if not exists public.owlry_profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  username       text,
  total_xp       bigint  not null default 0,    -- lifetime XP; level is derived
  ink            integer not null default 60,
  ink_max        integer not null default 120,
  ink_updated_at timestamptz not null default now(),   -- for energy-style regen
  coins          integer not null default 40,
  streak         integer not null default 0,
  last_active    date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- saved / reading / finished are independent concepts (a book can be saved
-- AND in progress), so we model them as flags + progress rather than one status.
create table if not exists public.owlry_user_books (
  user_id      uuid not null references auth.users(id) on delete cascade,
  book_id      text not null,
  saved        boolean not null default false,
  started_at   timestamptz,                 -- non-null & finished_at null => "reading"
  finished_at  timestamptz,                 -- non-null => "finished"
  pages_read   integer not null default 0,
  last_read_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, book_id)
);

-- append-only ledger — source of truth for the economy + calendar + radar + stats
create table if not exists public.owlry_activity (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null,    -- chat|preview|open|turn_page|finish|save|unsave|checkin|levelup|streak|purchase
  book_id    text,
  xp_delta   integer not null default 0,
  ink_delta  integer not null default 0,
  coin_delta integer not null default 0,
  meta       jsonb   not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.owlry_quotes (
  id      bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null,
  text    text not null,
  kept_at timestamptz not null default now()
);

-- ---------- indexes ----------
create index if not exists owlry_activity_user_time  on public.owlry_activity   (user_id, created_at desc);
create index if not exists owlry_activity_user_type  on public.owlry_activity   (user_id, type);
create index if not exists owlry_user_books_user     on public.owlry_user_books (user_id);
create index if not exists owlry_quotes_user         on public.owlry_quotes     (user_id, kept_at desc);

-- ---------- Row-Level Security ----------
-- Clients get READ access to their own rows only; all writes happen inside the
-- security-definer RPCs (which run as the table owner and bypass RLS), so a
-- client can never mint XP/coins or write arbitrary balances.
alter table public.owlry_profiles        enable row level security;
alter table public.owlry_user_books      enable row level security;
alter table public.owlry_activity        enable row level security;
alter table public.owlry_quotes          enable row level security;
alter table public.owlry_action_config   enable row level security;
alter table public.owlry_economy_config  enable row level security;
alter table public.owlry_book_dimensions enable row level security;

drop policy if exists owlry_profiles_read   on public.owlry_profiles;
drop policy if exists owlry_user_books_read on public.owlry_user_books;
drop policy if exists owlry_activity_read   on public.owlry_activity;
drop policy if exists owlry_quotes_read     on public.owlry_quotes;

create policy owlry_profiles_read   on public.owlry_profiles   for select to authenticated using (auth.uid() = user_id);
create policy owlry_user_books_read on public.owlry_user_books for select to authenticated using (auth.uid() = user_id);
create policy owlry_activity_read   on public.owlry_activity   for select to authenticated using (auth.uid() = user_id);
create policy owlry_quotes_read     on public.owlry_quotes     for select to authenticated using (auth.uid() = user_id);

-- reference/config tables are world-readable to signed-in users (no client writes)
drop policy if exists owlry_action_config_read   on public.owlry_action_config;
drop policy if exists owlry_economy_config_read  on public.owlry_economy_config;
drop policy if exists owlry_book_dimensions_read on public.owlry_book_dimensions;

create policy owlry_action_config_read   on public.owlry_action_config   for select to authenticated using (true);
create policy owlry_economy_config_read  on public.owlry_economy_config  for select to authenticated using (true);
create policy owlry_book_dimensions_read on public.owlry_book_dimensions for select to authenticated using (true);

-- ---------- grants (RLS still applies on top) ----------
grant select on
  public.owlry_profiles, public.owlry_user_books, public.owlry_activity,
  public.owlry_quotes, public.owlry_action_config, public.owlry_economy_config,
  public.owlry_book_dimensions
to authenticated;
