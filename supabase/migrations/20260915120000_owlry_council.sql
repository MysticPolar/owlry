-- ============================================================
-- owlry — The Council Room backend.
--
-- ADDITIVE & NAMESPACED: every object is public.owlry_council_* and this
-- migration reads/alters NOTHING that already exists. It sits beside the
-- classic owlry tables on the same project and shares the same identity
-- (auth.users), the same rate limiter (owlry_rl_bump) and the same invite
-- ledger (owlry_claim_invite) — the Council is the same product with a new
-- entry point, so a reader's account works in both.
--
-- What lives where (mirrors the classic backend's split):
--   owlry_council_state     one jsonb row per reader — interests, shelves,
--                           reading progress, bookmarks, highlights, prefs.
--                           Same compare-and-swap `revision` fence as
--                           owlry_progress (src/lib/sync/cloud.ts).
--   owlry_council_sessions  one row per council conversation — seats,
--                           transcript, takeaways. Client-owned (the
--                           scripted engine writes these too), last write
--                           per session wins by updated_at.
--   owlry_council_profiles  the public half of a reader: handle, name, bio.
--                           Readable by every signed-in reader (the feed
--                           needs it), writable by its owner only.
--   owlry_council_posts     the social feed: a passage, a book, and what it
--                           changed for you. Readable by all signed-in
--                           readers; insert/delete by the author.
--   owlry_council_likes     (post, reader) pairs; likes are counted, never
--                           stored on the post, so nobody can mint them.
--   owlry_council_follows   (reader, handle) pairs.
--
-- The council-chat edge function writes nothing here: it generates lines
-- and the client persists them into its own session row. Rate limiting
-- goes through the shared owlry_rl_bump RPC, service role only.
-- ============================================================

-- ---------- per-reader state (jsonb + revision CAS) ----------
create table if not exists public.owlry_council_state (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  state      jsonb       not null,
  revision   bigint      not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
comment on column public.owlry_council_state.revision is
  'Monotonic compare-and-swap revision used to merge concurrent client writes (see owlry_progress).';

alter table public.owlry_council_state enable row level security;

drop policy if exists owlry_council_state_rw_own on public.owlry_council_state;
create policy owlry_council_state_rw_own
  on public.owlry_council_state for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The fence: an update that does not explicitly advance `revision` is a
-- stale whole-row write and keeps the server's state (same rule as
-- owlry_bump_progress_revision, which this reuses verbatim).
drop trigger if exists owlry_council_state_revision_fence on public.owlry_council_state;
create trigger owlry_council_state_revision_fence
  before update on public.owlry_council_state
  for each row execute function public.owlry_bump_progress_revision();

-- ---------- council sessions ----------
create table if not exists public.owlry_council_sessions (
  id         text        primary key,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  script_id  text        not null,
  question   text        not null check (char_length(question) <= 600),
  title      text        not null,
  area       text        not null,
  seats      jsonb       not null default '[]'::jsonb,
  stage      text        not null default 'convening'
             check (stage in ('convening', 'introduced', 'live', 'summarized')),
  saved      boolean     not null default false,
  source     text        not null default 'scripted' check (source in ('scripted', 'live')),
  -- messages, replacements, context, follow-up count, live overrides
  payload    jsonb       not null default '{}'::jsonb
             check (octet_length(payload::text) <= 262144),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists owlry_council_sessions_user_time
  on public.owlry_council_sessions (user_id, updated_at desc);

alter table public.owlry_council_sessions enable row level security;

drop policy if exists owlry_council_sessions_rw_own on public.owlry_council_sessions;
create policy owlry_council_sessions_rw_own
  on public.owlry_council_sessions for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------- public profiles ----------
create table if not exists public.owlry_council_profiles (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  handle     text        not null unique
             check (handle ~ '^[a-z0-9][a-z0-9._]{1,29}$'),
  name       text        not null check (char_length(name) between 1 and 40),
  bio        text        not null default '' check (char_length(bio) <= 160),
  color      text        not null default '#FFD100' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.owlry_council_profiles enable row level security;

drop policy if exists owlry_council_profiles_read   on public.owlry_council_profiles;
drop policy if exists owlry_council_profiles_insert on public.owlry_council_profiles;
drop policy if exists owlry_council_profiles_update on public.owlry_council_profiles;
create policy owlry_council_profiles_read
  on public.owlry_council_profiles for select to authenticated using (true);
create policy owlry_council_profiles_insert
  on public.owlry_council_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy owlry_council_profiles_update
  on public.owlry_council_profiles for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists owlry_council_profiles_touch on public.owlry_council_profiles;
create trigger owlry_council_profiles_touch
  before update on public.owlry_council_profiles
  for each row execute function public.owlry_touch_updated_at();

drop trigger if exists owlry_council_sessions_touch on public.owlry_council_sessions;
create trigger owlry_council_sessions_touch
  before update on public.owlry_council_sessions
  for each row execute function public.owlry_touch_updated_at();

-- ---------- the feed ----------
create table if not exists public.owlry_council_posts (
  id          text        primary key,
  user_id     uuid        not null references public.owlry_council_profiles (user_id) on delete cascade,
  quote       text        not null check (char_length(quote) between 1 and 600),
  book_id     text,
  attribution text        not null default '' check (char_length(attribution) <= 160),
  caption     text        not null default '' check (char_length(caption) <= 600),
  prompt      text,
  created_at  timestamptz not null default now()
);

create index if not exists owlry_council_posts_time on public.owlry_council_posts (created_at desc);
create index if not exists owlry_council_posts_user on public.owlry_council_posts (user_id, created_at desc);

alter table public.owlry_council_posts enable row level security;

drop policy if exists owlry_council_posts_read   on public.owlry_council_posts;
drop policy if exists owlry_council_posts_insert on public.owlry_council_posts;
drop policy if exists owlry_council_posts_delete on public.owlry_council_posts;
create policy owlry_council_posts_read
  on public.owlry_council_posts for select to authenticated using (true);
create policy owlry_council_posts_insert
  on public.owlry_council_posts for insert to authenticated with check (auth.uid() = user_id);
create policy owlry_council_posts_delete
  on public.owlry_council_posts for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.owlry_council_likes (
  post_id    text        not null references public.owlry_council_posts (id) on delete cascade,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.owlry_council_likes enable row level security;

drop policy if exists owlry_council_likes_read   on public.owlry_council_likes;
drop policy if exists owlry_council_likes_insert on public.owlry_council_likes;
drop policy if exists owlry_council_likes_delete on public.owlry_council_likes;
create policy owlry_council_likes_read
  on public.owlry_council_likes for select to authenticated using (true);
create policy owlry_council_likes_insert
  on public.owlry_council_likes for insert to authenticated with check (auth.uid() = user_id);
create policy owlry_council_likes_delete
  on public.owlry_council_likes for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.owlry_council_follows (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  handle     text        not null,
  created_at timestamptz not null default now(),
  primary key (user_id, handle)
);

alter table public.owlry_council_follows enable row level security;

drop policy if exists owlry_council_follows_rw_own on public.owlry_council_follows;
create policy owlry_council_follows_rw_own
  on public.owlry_council_follows for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- grants (RLS still applies on top) ----------
grant select, insert, update, delete on
  public.owlry_council_state,
  public.owlry_council_sessions,
  public.owlry_council_follows
to authenticated;
grant select, insert, update on public.owlry_council_profiles to authenticated;
grant select, insert, delete on public.owlry_council_posts, public.owlry_council_likes to authenticated;

-- ---------- a reader's handle, claimed once ----------
-- council-signup (service role) calls this after creating the auth user; the
-- client calls it too when a guest's local profile is first attached to an
-- account. Picks the requested handle, or the same with a numeric suffix.
create or replace function public.owlry_council_claim_handle(p_user uuid, p_handle text, p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base   text;
  v_handle text;
  v_n      int := 0;
begin
  -- a reader may only claim for themselves; the service role (council-signup) for anyone
  if p_user is null or (p_user is distinct from auth.uid() and auth.role() is distinct from 'service_role') then
    raise exception 'not allowed';
  end if;
  v_base := lower(regexp_replace(coalesce(p_handle, ''), '[^a-z0-9._]+', '.', 'g'));
  v_base := trim(both '.' from v_base);
  if char_length(v_base) < 2 then v_base := 'reader'; end if;
  v_base := left(v_base, 24);
  v_handle := v_base;
  loop
    begin
      insert into owlry_council_profiles (user_id, handle, name)
      values (p_user, v_handle, left(coalesce(nullif(trim(p_name), ''), 'Reader'), 40))
      on conflict (user_id) do update set name = excluded.name, handle = excluded.handle;
      return v_handle;
    exception when unique_violation then
      v_n := v_n + 1;
      v_handle := v_base || v_n::text;
      if v_n > 50 then raise exception 'could not claim a handle'; end if;
    end;
  end loop;
end;
$$;

revoke all on function public.owlry_council_claim_handle(uuid, text, text) from public, anon;
grant execute on function public.owlry_council_claim_handle(uuid, text, text) to authenticated, service_role;
