-- Owlry Council Room — schema v2 (on-demand minds)
-- Tables: council_minds (cache of forged persona cards), council_sessions, council_turns, council_summaries
-- Writes happen from the edge function with the service role; users only read their own rows.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Persona cards. One row per great mind, forged by the model on first use and
-- cached forever. Nothing here is hand-written for the MVP.
-- ---------------------------------------------------------------------------
create table if not exists public.council_minds (
  slug        text primary key,                       -- 'marcus-aurelius', 'sean-ellis'
  name        text not null,                          -- as shown on the bubble
  lived       text,                                   -- '121–180' | '1955–2011' | 'living'
  field       text,
  lens        text not null,                          -- what this mind looks at first
  card        jsonb not null,                         -- {school, lens, core_ideas[], claims_for[], claims_against[], blind_spots[], voice{}}
  books       jsonb not null default '[]'::jsonb,     -- [{title, author, year, read_free, buy}] — links verified in code
  active      boolean not null default true,          -- set false to bench a mind without deleting its history
  uses        int not null default 0,                 -- incremented per session; drives the monthly review of the head
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Names that must never be cast, checked in code before the model screen.
create table if not exists public.council_denylist (
  name        text primary key,
  reason      text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- One row per council session (one reader question).
-- ---------------------------------------------------------------------------
create table if not exists public.council_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  question    text not null,
  situation   text,
  category    text,                                   -- menu hint: health | career | investing | relationships | literature | other
  kind        text,                                   -- decision | diagnosis | strategy | meaning | habit | relationship | craft
  axis        text,                                   -- the tension inside the question, from the cast
  seats       jsonb not null,                         -- [{seat, slug, name, lived, lens, why, intro, books}]
  status      text not null default 'running'
              check (status in ('running', 'done', 'error')),
  turn_count  int not null default 0,
  skipped_at_turn int,                                -- set by the client when the reader skips to the summary
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists council_sessions_user_idx on public.council_sessions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Every bubble, including the reader's replies (speaker = 'reader').
-- ---------------------------------------------------------------------------
create table if not exists public.council_turns (
  id          bigserial primary key,
  session_id  uuid not null references public.council_sessions (id) on delete cascade,
  turn        int not null,                           -- 1..n, monotonic within a session
  speaker     text not null,                          -- mind slug or 'reader'
  cycle       text,                                   -- positions | pressure | application | reply
  text        text not null,                          -- visible text (hidden tail stripped)
  position    text,                                   -- parsed from the hidden tail
  move        text check (move in ('hold', 'shift', 'concede')),
  open        text,                                   -- unresolved point, or null when 'none'
  usage       jsonb,                                  -- token usage from the model call (check cache_read_input_tokens here)
  latency_ms  int,                                    -- wall time of the model call
  created_at  timestamptz not null default now(),
  unique (session_id, turn)
);

create index if not exists council_turns_session_idx on public.council_turns (session_id, turn);

-- ---------------------------------------------------------------------------
-- Five-section summary, one per session (replaced if re-summarized).
-- ---------------------------------------------------------------------------
create table if not exists public.council_summaries (
  session_id  uuid primary key references public.council_sessions (id) on delete cascade,
  summary     jsonb not null,                         -- {title, agree[], differ[], fits, next_step, books[]}
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row level security. Users read their own sessions/turns/summaries and the
-- active minds; all inserts/updates come from the edge function (service role).
-- ---------------------------------------------------------------------------
alter table public.council_minds     enable row level security;
alter table public.council_denylist  enable row level security;
alter table public.council_sessions  enable row level security;
alter table public.council_turns     enable row level security;
alter table public.council_summaries enable row level security;

drop policy if exists "minds: authenticated read active" on public.council_minds;
create policy "minds: authenticated read active"
  on public.council_minds for select
  to authenticated
  using (active);

drop policy if exists "sessions: owner read" on public.council_sessions;
create policy "sessions: owner read"
  on public.council_sessions for select
  to authenticated
  using (user_id = auth.uid());

-- The client may update exactly one column on its own sessions: skipped_at_turn.
drop policy if exists "sessions: owner marks skip" on public.council_sessions;
create policy "sessions: owner marks skip"
  on public.council_sessions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
revoke update on public.council_sessions from authenticated;
grant update (skipped_at_turn) on public.council_sessions to authenticated;

drop policy if exists "turns: owner read" on public.council_turns;
create policy "turns: owner read"
  on public.council_turns for select
  to authenticated
  using (exists (
    select 1 from public.council_sessions s
    where s.id = council_turns.session_id and s.user_id = auth.uid()
  ));

drop policy if exists "summaries: owner read" on public.council_summaries;
create policy "summaries: owner read"
  on public.council_summaries for select
  to authenticated
  using (exists (
    select 1 from public.council_sessions s
    where s.id = council_summaries.session_id and s.user_id = auth.uid()
  ));

-- updated_at maintenance
create or replace function public.council_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists council_minds_touch on public.council_minds;
create trigger council_minds_touch before update on public.council_minds
  for each row execute function public.council_touch_updated_at();

drop trigger if exists council_sessions_touch on public.council_sessions;
create trigger council_sessions_touch before update on public.council_sessions
  for each row execute function public.council_touch_updated_at();

-- Count uses per mind whenever a session is created
create or replace function public.council_count_uses()
returns trigger language plpgsql as $$
begin
  update public.council_minds
     set uses = uses + 1
   where slug in (select jsonb_array_elements(new.seats) ->> 'slug');
  return new;
end $$;

drop trigger if exists council_sessions_count_uses on public.council_sessions;
create trigger council_sessions_count_uses after insert on public.council_sessions
  for each row execute function public.council_count_uses();
