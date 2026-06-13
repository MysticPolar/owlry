-- ============================================================
-- Owlry backend — functions (server-authoritative economy + read models).
-- All economy writes happen here, in security-definer functions that derive
-- the user from auth.uid(). Internal helpers are revoked from API roles at the
-- bottom so only the three entry points (perform_action, get_snapshot,
-- save_quote) are callable over the API.
-- ============================================================

-- ---------- pure helpers ----------
create or replace function public.owlry_cfg(p_key text, p_default numeric)
returns numeric language sql stable as $$
  select coalesce((select num from public.owlry_economy_config where key = p_key), p_default);
$$;

-- XP needed to *reach* level L (quadratic curve): L2=200, L3=500, L4=900, L5=1400 …
create or replace function public.owlry_cumulative_xp(p_level integer)
returns bigint language sql immutable as $$
  select (50::bigint * p_level * p_level + 50 * p_level - 100);
$$;

create or replace function public.owlry_level_for_xp(p_total bigint)
returns integer language sql immutable as $$
  select greatest(1, floor((-50 + sqrt(2500 + 200 * (100 + p_total))) / 100))::integer;
$$;

-- ---------- ensure profile + energy-style ink regen ----------
create or replace function public.owlry_ensure_profile(p_uid uuid)
returns public.owlry_profiles
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  prof public.owlry_profiles;
  mins_per numeric;
  gained integer;
begin
  insert into public.owlry_profiles (user_id) values (p_uid)
  on conflict (user_id) do nothing;

  select * into prof from public.owlry_profiles where user_id = p_uid;

  mins_per := owlry_cfg('ink_regen_minutes', 6);   -- +1 ink per N minutes, up to ink_max
  if prof.ink < prof.ink_max and mins_per > 0 then
    gained := floor(extract(epoch from (now() - prof.ink_updated_at)) / 60 / mins_per);
    if gained > 0 then
      prof.ink := least(prof.ink_max, prof.ink + gained);
      prof.ink_updated_at := case when prof.ink >= prof.ink_max
        then now() else prof.ink_updated_at + (gained * mins_per) * interval '1 minute' end;
      update public.owlry_profiles
        set ink = prof.ink, ink_updated_at = prof.ink_updated_at, updated_at = now()
        where user_id = p_uid;
    end if;
  end if;

  return prof;
end;
$$;

-- ---------- read models (jsonb) ----------
create or replace function public.owlry_profile_json(prof public.owlry_profiles)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'total_xp', prof.total_xp,
    'level', owlry_level_for_xp(prof.total_xp),
    'xp_into_level', prof.total_xp - owlry_cumulative_xp(owlry_level_for_xp(prof.total_xp)),
    'xp_for_next', owlry_cumulative_xp(owlry_level_for_xp(prof.total_xp) + 1)
                   - owlry_cumulative_xp(owlry_level_for_xp(prof.total_xp)),
    'ink', prof.ink, 'ink_max', prof.ink_max,
    'coins', prof.coins, 'streak', prof.streak, 'username', prof.username
  );
$$;

create or replace function public.owlry_library_json(p_uid uuid)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'saved',    coalesce((select jsonb_agg(book_id order by updated_at desc)
                  from public.owlry_user_books where user_id=p_uid and saved), '[]'::jsonb),
    'reading',  coalesce((select jsonb_agg(book_id order by last_read_at desc nulls last)
                  from public.owlry_user_books where user_id=p_uid and finished_at is null and started_at is not null), '[]'::jsonb),
    'finished', coalesce((select jsonb_agg(book_id order by finished_at desc)
                  from public.owlry_user_books where user_id=p_uid and finished_at is not null), '[]'::jsonb),
    'pagesRead', coalesce((select jsonb_object_agg(book_id, pages_read)
                  from public.owlry_user_books where user_id=p_uid and pages_read > 0), '{}'::jsonb)
  );
$$;

-- "reading balance": engagement per radar dimension, capped at 100
create or replace function public.owlry_radar_json(p_uid uuid)
returns jsonb language sql stable as $$
  with dims(dimension) as (
    values ('health'),('wealth'),('relationship'),('career'),('mindset'),('fiction')
  ),
  eng as (
    select bd.dimension,
           sum( case when ub.finished_at is not null then 15 else 0 end
              + case when ub.finished_at is null and ub.started_at is not null then 5 else 0 end
              + floor(ub.pages_read / 40.0) )::numeric as score
    from public.owlry_user_books ub
    join public.owlry_book_dimensions bd on bd.book_id = ub.book_id
    where ub.user_id = p_uid
    group by bd.dimension
  )
  select jsonb_agg(jsonb_build_object(
           'dimension', d.dimension, 'value', least(100, coalesce(e.score, 0))::int
         ) order by d.dimension)
  from dims d left join eng e on e.dimension = d.dimension;
$$;

create or replace function public.owlry_calendar_json(p_uid uuid, p_days int default 35)
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'day', day, 'owl_posts', owl_posts, 'previewed_book', previewed_book
         ) order by day desc), '[]'::jsonb)
  from (
    select (created_at at time zone 'utc')::date as day,
           count(*) as owl_posts,
           (array_agg(book_id order by created_at desc)
              filter (where type='preview' and book_id is not null))[1] as previewed_book
    from public.owlry_activity
    where user_id = p_uid and type in ('preview','chat')
      and created_at >= now() - make_interval(days => p_days)
    group by 1
  ) t;
$$;

create or replace function public.owlry_stats_json(p_uid uuid)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'books_read',   (select count(*) from public.owlry_user_books where user_id=p_uid and finished_at is not null),
    'pages_turned', (select coalesce(sum(pages_read),0) from public.owlry_user_books where user_id=p_uid),
    'highlights',   (select count(*) from public.owlry_quotes where user_id=p_uid),
    'reading_minutes', (select coalesce(round(sum(pages_read) * owlry_cfg('minutes_per_page', 0.75)),0)
                        from public.owlry_user_books where user_id=p_uid)
  );
$$;

create or replace function public.owlry_quotes_json(p_uid uuid)
returns jsonb language sql stable as $$
  select coalesce((select jsonb_agg(jsonb_build_object('id',id,'book',book_id,'text',text,'kept_at',kept_at)
            order by kept_at desc) from public.owlry_quotes where user_id=p_uid), '[]'::jsonb);
$$;

create or replace function public.owlry_snapshot_json(p_uid uuid)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'profile',  owlry_profile_json(p),
    'library',  owlry_library_json(p_uid),
    'radar',    owlry_radar_json(p_uid),
    'calendar', owlry_calendar_json(p_uid),
    'stats',    owlry_stats_json(p_uid),
    'quotes',   owlry_quotes_json(p_uid)
  )
  from public.owlry_profiles p where p.user_id = p_uid;
$$;

-- ---------- API entry points ----------
create or replace function public.owlry_get_snapshot()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'not_authenticated'); end if;
  perform owlry_ensure_profile(uid);
  return owlry_snapshot_json(uid) || jsonb_build_object('ok', true);
end;
$$;

create or replace function public.owlry_save_quote(p_book_id text, p_text text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'not_authenticated'); end if;
  perform owlry_ensure_profile(uid);
  insert into public.owlry_quotes (user_id, book_id, text) values (uid, p_book_id, p_text);
  return owlry_snapshot_json(uid) || jsonb_build_object('ok', true);
end;
$$;

-- the one guarded economy mutation
create or replace function public.owlry_perform_action(
  p_action text, p_book_id text default null, p_meta jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  prof public.owlry_profiles;
  cfg public.owlry_action_config;
  d_xp integer; d_ink integer; d_coins integer;
  new_ink integer; new_coins integer; new_total bigint;
  lvl_before integer; lvl_after integer; leveled boolean := false;
  today date := (now() at time zone 'utc')::date;
  bonus_coins integer := 0;
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'not_authenticated'); end if;

  prof := owlry_ensure_profile(uid);

  select * into cfg from public.owlry_action_config where action = p_action and enabled;
  if not found then return jsonb_build_object('ok', false, 'reason', 'unknown_action'); end if;

  d_xp := cfg.xp; d_ink := cfg.ink; d_coins := cfg.coins;

  -- spend gates: preview spends ink AND coins; chat spends ink
  if prof.ink   + d_ink   < 0 then return owlry_snapshot_json(uid) || jsonb_build_object('ok', false, 'reason', 'insufficient_ink');   end if;
  if prof.coins + d_coins < 0 then return owlry_snapshot_json(uid) || jsonb_build_object('ok', false, 'reason', 'insufficient_coins'); end if;

  new_total := prof.total_xp + d_xp;
  new_ink   := least(prof.ink_max, greatest(0, prof.ink + d_ink));
  new_coins := prof.coins + d_coins;

  lvl_before := owlry_level_for_xp(prof.total_xp);
  lvl_after  := owlry_level_for_xp(new_total);
  if lvl_after > lvl_before then
    leveled := true;
    new_ink := prof.ink_max;                              -- refill on level up
    bonus_coins := bonus_coins + 50 * (lvl_after - lvl_before);
  end if;

  -- daily streak (+ milestone coins every 7 days)
  if prof.last_active is null or prof.last_active < today then
    prof.streak := case when prof.last_active = today - 1 then prof.streak + 1 else 1 end;
    if prof.streak % 7 = 0 then
      bonus_coins := bonus_coins + floor(owlry_cfg('streak_bonus_coins', 30))::integer;
    end if;
  end if;
  new_coins := new_coins + bonus_coins;

  update public.owlry_profiles set
    total_xp = new_total, ink = new_ink,
    ink_updated_at = case when new_ink >= ink_max then now() else ink_updated_at end,
    coins = new_coins, streak = prof.streak, last_active = today, updated_at = now()
  where user_id = uid;

  -- library side effects
  if p_action in ('open','turn_page') then
    insert into public.owlry_user_books (user_id, book_id, started_at, last_read_at, pages_read)
    values (uid, p_book_id, now(), now(), greatest(0, coalesce((p_meta->>'page')::int, 1) - 1))
    on conflict (user_id, book_id) do update set
      started_at  = coalesce(public.owlry_user_books.started_at, now()),
      finished_at = case when (p_meta ? 'page') then null else public.owlry_user_books.finished_at end,
      last_read_at = now(),
      pages_read  = greatest(public.owlry_user_books.pages_read, coalesce((p_meta->>'page')::int, 1) - 1),
      updated_at  = now();
  elsif p_action = 'finish' then
    insert into public.owlry_user_books (user_id, book_id, started_at, finished_at, pages_read, last_read_at)
    values (uid, p_book_id, now(), now(), coalesce((p_meta->>'pages')::int, 0), now())
    on conflict (user_id, book_id) do update set
      finished_at = now(),
      pages_read  = coalesce((p_meta->>'pages')::int, public.owlry_user_books.pages_read),
      last_read_at = now(), updated_at = now();
  elsif p_action = 'save' then
    insert into public.owlry_user_books (user_id, book_id, saved) values (uid, p_book_id, true)
    on conflict (user_id, book_id) do update set saved = true, updated_at = now();
  elsif p_action = 'unsave' then
    update public.owlry_user_books set saved = false, updated_at = now()
      where user_id = uid and book_id = p_book_id;
  end if;

  -- ledger
  insert into public.owlry_activity (user_id, type, book_id, xp_delta, ink_delta, coin_delta, meta)
  values (uid, p_action, p_book_id, d_xp, new_ink - prof.ink, d_coins + bonus_coins, coalesce(p_meta, '{}'::jsonb));
  if leveled then
    insert into public.owlry_activity (user_id, type, coin_delta, meta)
    values (uid, 'levelup', 50 * (lvl_after - lvl_before), jsonb_build_object('level', lvl_after));
  end if;

  return owlry_snapshot_json(uid) || jsonb_build_object('ok', true, 'leveled_up', leveled);
end;
$$;

-- ---------- lock down: only the 3 entry points are API-callable ----------
revoke all on function
  public.owlry_cfg(text, numeric),
  public.owlry_cumulative_xp(integer),
  public.owlry_level_for_xp(bigint),
  public.owlry_ensure_profile(uuid),
  public.owlry_profile_json(public.owlry_profiles),
  public.owlry_library_json(uuid),
  public.owlry_radar_json(uuid),
  public.owlry_calendar_json(uuid, int),
  public.owlry_stats_json(uuid),
  public.owlry_quotes_json(uuid),
  public.owlry_snapshot_json(uuid)
from public, anon, authenticated;

grant execute on function
  public.owlry_perform_action(text, text, jsonb),
  public.owlry_get_snapshot(),
  public.owlry_save_quote(text, text)
to authenticated;
