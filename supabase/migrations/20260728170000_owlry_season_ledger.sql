-- ============================================================
-- Owlry — the season ledger.  (docs/gamification-design.md)
--
-- "A Season at the Theatre, on the House Ledger": the guard suite inside
-- owlry_perform_action, config alignment, the resting-line ink model, the
-- dark-night streak, ticket stubs, seasons, and the lobby-stand catalogue.
-- Ships BEFORE any client call site exists — the deployed RPC previously
-- applied deltas unconditionally.
--
-- Every guard evaluates a client-stamped meta.occurred_at (clamped to
-- <= now() and >= the newest accepted event) so the offline queue can flush
-- a day of reading in one burst. All day/hour logic derives from
-- owlry_profiles.tz_offset_minutes (minutes EAST of UTC; the client sends
-- -new Date().getTimezoneOffset()).
-- ============================================================

-- ---------- schema additions ----------
alter table public.owlry_profiles
  add column if not exists tz_offset_minutes integer not null default 0,
  add column if not exists dark_night_at     date,
  add column if not exists last_occurred_at  timestamptz;

-- idempotent replay: one ledger row per (user, idem key)
create unique index if not exists owlry_activity_idem
  on public.owlry_activity (user_id, (meta->>'idem'))
  where meta ? 'idem';

-- one stub per (user, id, n) — n distinguishes repeatable stubs (encore ×N)
create unique index if not exists owlry_activity_stub
  on public.owlry_activity (user_id, (meta->>'id'), (coalesce(meta->>'n','')))
  where type = 'stub';

-- ---------- the lobby stand ----------
create table if not exists public.owlry_stand_catalog (
  sku     text primary key,
  kind    text not null check (kind in ('stationery','marquee','cushion','bottle')),
  price   integer not null,
  season  integer,                      -- null = evergreen; else only that season
  enabled boolean not null default true
);
alter table public.owlry_stand_catalog enable row level security;
drop policy if exists owlry_stand_catalog_read on public.owlry_stand_catalog;
create policy owlry_stand_catalog_read on public.owlry_stand_catalog
  for select to authenticated using (true);
grant select on public.owlry_stand_catalog to authenticated;

insert into public.owlry_stand_catalog (sku, kind, price, season) values
  ('bottle-small',    'bottle',  5,   null),  -- 5 coins -> 10 ink, once a day
  ('marquee-letters', 'marquee', 80,  null),
  ('cushion-velvet',  'cushion', 120, null)
on conflict (sku) do nothing;

-- stationery is the rotating good: one design per programme, so the shelf is
-- never quite the same twice. Seeded three years out; a new season is one row.
insert into public.owlry_stand_catalog (sku, kind, price, season)
select 'stationery-s' || n, 'stationery', 40, n from generate_series(0, 11) as n
on conflict (sku) do nothing;

-- ---------- config alignment ----------
insert into public.owlry_economy_config (key, num) values
  ('ink_regen_minutes', 30),          -- was 6: regen alone funded 240 LLM calls/day
  ('ink_rest_line',     60),          -- regen seeps only up to here
  ('season_epoch',      1767225600),  -- 2026-01-01T00:00:00Z, epoch seconds
  ('season_days',       90),          -- a season is a calendar quarter
  ('daily_xp_cap',      150),         -- global ceiling; grants past it are withheld
  ('bottle_ink',        10)
on conflict (key) do update set num = excluded.num;

update public.owlry_action_config set xp = 4                      where action = 'turn_page';
update public.owlry_action_config set xp = 0, ink = -5, coins = 0 where action = 'preview';
update public.owlry_action_config set ink = 10                    where action = 'checkin';
insert into public.owlry_action_config (action, xp, ink, coins) values
  ('quote_keep', 5,  0,  0),
  ('purchase',   0,  0,  0),
  ('onboard',    20, 10, 0)
on conflict (action) do update
  set xp = excluded.xp, ink = excluded.ink, coins = excluded.coins;

alter table public.owlry_profiles alter column ink_max set default 120;
update public.owlry_profiles set ink_max = 120 where ink_max < 120;

-- ---------- helpers ----------
create or replace function public.owlry_season_id(p_at timestamptz)
returns integer language sql stable set search_path = public, pg_temp as $$
  select floor((extract(epoch from p_at) - owlry_cfg('season_epoch', 1767225600))
               / (owlry_cfg('season_days', 90) * 86400))::integer;
$$;

create or replace function public.owlry_local_day(p_at timestamptz, p_tz integer)
returns date language sql immutable as $$
  select ((p_at + make_interval(mins => coalesce(p_tz, 0))) at time zone 'utc')::date;
$$;

create or replace function public.owlry_local_hour(p_at timestamptz, p_tz integer)
returns integer language sql immutable as $$
  select extract(hour from ((p_at + make_interval(mins => coalesce(p_tz, 0))) at time zone 'utc'))::integer;
$$;

-- regen now seeps only up to the resting line — pages and mornings fill past it
create or replace function public.owlry_ensure_profile(p_uid uuid)
returns public.owlry_profiles
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  prof public.owlry_profiles;
  mins_per numeric;
  rest integer;
  gained integer;
begin
  insert into public.owlry_profiles (user_id) values (p_uid)
  on conflict (user_id) do nothing;

  select * into prof from public.owlry_profiles where user_id = p_uid;

  mins_per := owlry_cfg('ink_regen_minutes', 30);
  rest := least(prof.ink_max, floor(owlry_cfg('ink_rest_line', 60))::integer);
  if prof.ink < rest and mins_per > 0 then
    gained := floor(extract(epoch from (now() - prof.ink_updated_at)) / 60 / mins_per);
    if gained > 0 then
      prof.ink := least(rest, prof.ink + gained);
      prof.ink_updated_at := case when prof.ink >= rest
        then now() else prof.ink_updated_at + (gained * mins_per) * interval '1 minute' end;
      update public.owlry_profiles
        set ink = prof.ink, ink_updated_at = prof.ink_updated_at, updated_at = now()
        where user_id = p_uid;
    end if;
  elsif prof.ink >= rest then
    -- park the clock so a later dip below the line doesn't backfill hours of regen
    update public.owlry_profiles set ink_updated_at = now() where user_id = p_uid;
  end if;

  return prof;
end;
$$;

-- ---------- read models (v2) ----------
-- 1-indexed display level again (supersedes v2_economy_defaults), flagged so the
-- client shim can tell which server it is talking to. ink_done derives from the
-- ledger; season rides along for the stand and the album.
create or replace function public.owlry_profile_json(prof public.owlry_profiles)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'schema_v', 2,
    'total_xp', prof.total_xp,
    'level', owlry_level_for_xp(prof.total_xp),
    'xp_into_level', prof.total_xp - owlry_cumulative_xp(owlry_level_for_xp(prof.total_xp)),
    'xp_for_next', owlry_cumulative_xp(owlry_level_for_xp(prof.total_xp) + 1)
                   - owlry_cumulative_xp(owlry_level_for_xp(prof.total_xp)),
    'ink', prof.ink, 'ink_max', prof.ink_max,
    'ink_rest', least(prof.ink_max, floor(owlry_cfg('ink_rest_line', 60))::integer),
    'coins', prof.coins, 'streak', prof.streak, 'username', prof.username,
    'ink_done', exists (select 1 from public.owlry_activity a
                        where a.user_id = prof.user_id and a.type = 'well_full'),
    'season', owlry_season_id(now())
  );
$$;
revoke all on function public.owlry_profile_json(public.owlry_profiles) from public, anon, authenticated;

create or replace function public.owlry_stubs_json(p_uid uuid)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  select coalesce((select jsonb_agg(jsonb_build_object(
           'id', a.meta->>'id',
           'n', nullif(a.meta->>'n','')::integer,
           'at', a.created_at,
           'season', owlry_season_id(a.created_at)
         ) order by a.created_at)
         from public.owlry_activity a where a.user_id = p_uid and a.type = 'stub'), '[]'::jsonb);
$$;
revoke all on function public.owlry_stubs_json(uuid) from public, anon, authenticated;

-- owned lobby-stand goods (consumables like the bottle excluded)
create or replace function public.owlry_goods_json(p_uid uuid)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  select coalesce((select jsonb_agg(distinct a.meta->>'sku')
         from public.owlry_activity a
         join public.owlry_stand_catalog c on c.sku = a.meta->>'sku'
         where a.user_id = p_uid and a.type = 'purchase' and c.kind <> 'bottle'), '[]'::jsonb);
$$;
revoke all on function public.owlry_goods_json(uuid) from public, anon, authenticated;

create or replace function public.owlry_snapshot_json(p_uid uuid)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'profile',  owlry_profile_json(p),
    'library',  owlry_library_json(p_uid),
    'radar',    owlry_radar_json(p_uid),
    'calendar', owlry_calendar_json(p_uid),
    'stats',    owlry_stats_json(p_uid),
    'quotes',   owlry_quotes_json(p_uid),
    'stubs',    owlry_stubs_json(p_uid),
    'goods',    owlry_goods_json(p_uid)
  )
  from public.owlry_profiles p where p.user_id = p_uid;
$$;
revoke all on function public.owlry_snapshot_json(uuid) from public, anon, authenticated;

-- ---------- the guarded core ----------
-- All economy writes funnel through here. Called by the authenticated wrapper
-- below and by the service-role preview functions (owl-peek edge function).
-- NOTE: no plpgsql variable may be named `meta` or `season` — they would
-- shadow the owlry_activity / owlry_stand_catalog columns inside subqueries.
create or replace function public.owlry_perform_action_core(
  p_uid uuid, p_action text, p_book_id text default null, p_meta jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  prof public.owlry_profiles;
  cfg public.owlry_action_config;
  v_meta jsonb := coalesce(p_meta, '{}'::jsonb);
  occurred timestamptz;
  tzoff integer;
  lday date;
  lday_txt text;
  d_xp integer; d_ink integer; d_coins integer;
  granted_xp integer := 0; granted_ink integer := 0; granted_coins integer := 0;
  withheld text := null;
  xp_today integer;
  cap integer;
  rest integer;
  new_ink integer; new_coins integer; new_total bigint;
  lvl_before integer; lvl_after integer; leveled boolean := false;
  bonus_coins integer := 0;
  new_streak integer; streak_row boolean := false; dark_kept boolean := false;
  v_season integer;
  full_house boolean := false;
  good public.owlry_stand_catalog;
  q_hash text;
  step_n integer;
begin
  if p_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  perform owlry_ensure_profile(p_uid);
  -- take the row lock before reading balances: without it two overlapping calls
  -- both read the same purse, both pass their price check, and both write their
  -- own absolute total — one purse, two goods
  select * into prof from public.owlry_profiles where user_id = p_uid for update;
  rest := least(prof.ink_max, floor(owlry_cfg('ink_rest_line', 60))::integer);

  -- duplicate replay: the whole event already landed — grant nothing, change nothing
  if v_meta ? 'idem' and exists (select 1 from public.owlry_activity a
        where a.user_id = p_uid and a.meta->>'idem' = v_meta->>'idem') then
    return owlry_snapshot_json(p_uid) || jsonb_build_object('ok', true,
      'granted', jsonb_build_object('xp',0,'ink',0,'coins',0), 'withheld', 'duplicate');
  end if;

  select * into cfg from public.owlry_action_config where action = p_action and enabled;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'unknown_action');
  end if;

  -- client-stamped time, clamped monotone: never future, never before the
  -- newest accepted event (the offline queue replays FIFO)
  -- the zone is client-supplied, so it is clamped to a real one: an unclamped
  -- offset shifts the "local day" arbitrarily and hands back every day-scoped
  -- cap (ceiling, streak, checkin) on demand
  tzoff := greatest(-840, least(840,
    coalesce(nullif(v_meta->>'tz','')::integer, prof.tz_offset_minutes, 0)));
  -- and the stamp is bounded on BOTH sides. Upper: never the future. Lower:
  -- never more than two days back, and never behind the last accepted event —
  -- the offline queue needs a little slack, not a time machine. Without the
  -- floor, a fresh account could walk a fabricated stamp forward one fake day
  -- at a time and mint a fresh set of daily caps for each one.
  occurred := least(now(), coalesce(nullif(v_meta->>'occurred_at','')::timestamptz, now()));
  occurred := greatest(occurred,
    greatest(now() - interval '48 hours', coalesce(prof.last_occurred_at, now() - interval '48 hours')));
  lday := owlry_local_day(occurred, tzoff);
  lday_txt := lday::text;
  v_meta := v_meta || jsonb_build_object('occurred_at', occurred, 'day', lday_txt);
  v_season := owlry_season_id(occurred);

  d_xp := cfg.xp; d_ink := cfg.ink; d_coins := cfg.coins;

  -- ---------- per-action guards ----------
  if p_action = 'turn_page' then
    step_n := nullif(v_meta->>'step','')::integer;
    if step_n is null or step_n < 1 or step_n > 20 then
      -- no ink either: a bogus step used to still pay +2, which made an
      -- unlimited well out of a malformed request
      d_xp := 0; d_ink := 0; withheld := 'unverified';
    elsif exists (select 1 from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'turn_page' and a.book_id = p_book_id
            and a.meta->>'step' = step_n::text) then
      -- ink is deduped on the step being SEEN, not on it having paid XP, so a
      -- book returns at most 20 steps' worth of ink to the desk, ever
      d_xp := 0; d_ink := 0; withheld := 'duplicate';
    elsif exists (select 1 from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'turn_page' and a.xp_delta > 0
            and (a.meta->>'occurred_at')::timestamptz > occurred - interval '60 seconds') then
      d_xp := 0; withheld := 'rate_limited';                 -- ink still refills
    elsif (select count(*) from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'turn_page' and a.xp_delta > 0
            and a.meta->>'day' = lday_txt) >= 60 then
      d_xp := 0; withheld := 'rate_limited';
    end if;

  elsif p_action = 'open' then
    if exists (select 1 from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'open' and a.book_id = p_book_id and a.xp_delta > 0) then
      d_xp := 0; withheld := 'duplicate';
    elsif (select count(*) from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'open' and a.xp_delta > 0
            and a.meta->>'day' = lday_txt) >= 3 then
      d_xp := 0; withheld := 'rate_limited';
    end if;

  elsif p_action = 'finish' then
    if exists (select 1 from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'finish' and a.book_id = p_book_id and a.xp_delta > 0) then
      d_xp := 0; d_coins := 0; withheld := 'duplicate';      -- Keeper still counts it
    elsif (select count(distinct a.meta->>'step') from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'turn_page' and a.book_id = p_book_id
            and a.xp_delta > 0
            and (a.meta->>'step') ~ '^[0-9]+$'
            and (a.meta->>'step')::int between 1 and 20) < 19
       or not exists (select 1 from public.owlry_activity a
          where a.user_id = p_uid and a.type in ('open','turn_page') and a.book_id = p_book_id
            and (a.meta->>'occurred_at')::timestamptz <= occurred - interval '20 minutes') then
      d_xp := 0; d_coins := 0; withheld := 'unverified';     -- library write still lands
    end if;

  elsif p_action = 'save' then
    if exists (select 1 from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'save' and a.book_id = p_book_id and a.xp_delta > 0) then
      d_xp := 0; withheld := 'duplicate';
    end if;

  elsif p_action = 'chat' then
    if prof.ink + d_ink < 0 then
      return owlry_snapshot_json(p_uid) || jsonb_build_object('ok', false,
        'granted', jsonb_build_object('xp',0,'ink',0,'coins',0), 'withheld', 'insufficient_ink');
    end if;
    if (select count(*) from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'chat' and a.xp_delta > 0
            and a.meta->>'day' = lday_txt) >= 6 then
      d_xp := 0; withheld := 'rate_limited';                 -- ink still spends
    end if;

  elsif p_action = 'preview' then
    -- the LLM throttle: with the coin cost gone, the cap binds, not ink
    if (select count(*) from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'preview' and a.ink_delta < 0
            and a.meta->>'day' = lday_txt) >= 6 then
      return owlry_snapshot_json(p_uid) || jsonb_build_object('ok', false,
        'granted', jsonb_build_object('xp',0,'ink',0,'coins',0), 'withheld', 'rate_limited');
    end if;
    if prof.ink + d_ink < 0 then
      return owlry_snapshot_json(p_uid) || jsonb_build_object('ok', false,
        'granted', jsonb_build_object('xp',0,'ink',0,'coins',0), 'withheld', 'insufficient_ink');
    end if;

  elsif p_action = 'quote_keep' then
    -- when the line itself is present the fingerprint is OURS; a caller-supplied
    -- hash is only trusted for the text-less path, or dedupe is advisory
    q_hash := case when v_meta ? 'text' then md5(v_meta->>'text')
                   else coalesce(v_meta->>'hash', md5('')) end;
    if exists (select 1 from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'quote_keep' and a.meta->>'hash' = q_hash) then
      return owlry_snapshot_json(p_uid) || jsonb_build_object('ok', true,
        'granted', jsonb_build_object('xp',0,'ink',0,'coins',0), 'withheld', 'duplicate');
    end if;
    v_meta := v_meta || jsonb_build_object('hash', q_hash);
    if (select count(*) from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'quote_keep' and a.xp_delta > 0
            and a.meta->>'day' = lday_txt) >= 5 then
      d_xp := 0; withheld := 'rate_limited';                 -- kept silently
    end if;
    if v_meta ? 'text' and p_book_id is not null then
      insert into public.owlry_quotes (user_id, book_id, text)
      values (p_uid, p_book_id, v_meta->>'text');
      v_meta := v_meta - 'text';                              -- ledger keeps the hash, not the prose
    end if;

  elsif p_action = 'checkin' then
    if exists (select 1 from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'checkin' and a.meta->>'day' = lday_txt) then
      return owlry_snapshot_json(p_uid) || jsonb_build_object('ok', true,
        'granted', jsonb_build_object('xp',0,'ink',0,'coins',0), 'withheld', 'duplicate');
    end if;

  elsif p_action = 'onboard' then
    if exists (select 1 from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'onboard') then
      return owlry_snapshot_json(p_uid) || jsonb_build_object('ok', true,
        'granted', jsonb_build_object('xp',0,'ink',0,'coins',0), 'withheld', 'duplicate');
    end if;

  elsif p_action = 'purchase' then
    select * into good from public.owlry_stand_catalog c
      where c.sku = v_meta->>'sku' and c.enabled
        and (c.season is null or c.season = v_season);
    if not found then
      return jsonb_build_object('ok', false, 'reason', 'unknown_action');
    end if;
    if good.kind <> 'bottle' and exists (select 1 from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'purchase' and a.meta->>'sku' = good.sku) then
      return owlry_snapshot_json(p_uid) || jsonb_build_object('ok', true,
        'granted', jsonb_build_object('xp',0,'ink',0,'coins',0), 'withheld', 'duplicate');
    end if;
    if good.kind = 'bottle' and exists (select 1 from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'purchase' and a.meta->>'sku' = good.sku
            and a.meta->>'day' = lday_txt) then
      return owlry_snapshot_json(p_uid) || jsonb_build_object('ok', false,
        'granted', jsonb_build_object('xp',0,'ink',0,'coins',0), 'withheld', 'rate_limited');
    end if;
    if prof.coins < good.price then
      return owlry_snapshot_json(p_uid) || jsonb_build_object('ok', false,
        'granted', jsonb_build_object('xp',0,'ink',0,'coins',0), 'withheld', 'insufficient_coins');
    end if;
    d_coins := -good.price;
    if good.kind = 'bottle' then d_ink := floor(owlry_cfg('bottle_ink', 10))::integer; end if;
    v_meta := v_meta || jsonb_build_object('season', v_season, 'kind', good.kind, 'price', good.price);
  end if;

  -- ---------- a full house: a matinée act and an evening act, same day ----------
  -- decided BEFORE the ceiling and the level maths, so the bonus obeys the cap
  -- and can carry a reader across a row like any other XP
  if d_xp > 0 and not exists (select 1 from public.owlry_activity a
        where a.user_id = p_uid and a.type = 'full_house' and a.meta->>'day' = lday_txt) then
    if (owlry_local_hour(occurred, tzoff) >= 18
        and exists (select 1 from public.owlry_activity a
          where a.user_id = p_uid and a.xp_delta > 0 and a.meta->>'day' = lday_txt
            and owlry_local_hour((a.meta->>'occurred_at')::timestamptz, tzoff) < 18))
     or (owlry_local_hour(occurred, tzoff) < 18
        and exists (select 1 from public.owlry_activity a
          where a.user_id = p_uid and a.xp_delta > 0 and a.meta->>'day' = lday_txt
            and owlry_local_hour((a.meta->>'occurred_at')::timestamptz, tzoff) >= 18)) then
      full_house := true;
      d_xp := d_xp + 5;
    end if;
  end if;

  -- ---------- the global daily XP ceiling (withheld, not banked) ----------
  if d_xp > 0 then
    cap := floor(owlry_cfg('daily_xp_cap', 150))::integer;
    xp_today := coalesce((select sum(a.xp_delta) from public.owlry_activity a
        where a.user_id = p_uid and a.xp_delta > 0 and a.meta->>'day' = lday_txt), 0);
    if xp_today + d_xp > cap then
      d_xp := greatest(0, cap - xp_today);
      if d_xp = 0 then withheld := coalesce(withheld, 'rate_limited'); end if;
    end if;
  end if;

  -- ---------- apply ----------
  new_total := prof.total_xp + d_xp;
  new_ink   := least(prof.ink_max, greatest(0, prof.ink + d_ink));
  new_coins := prof.coins + d_coins;

  lvl_before := owlry_level_for_xp(prof.total_xp);
  lvl_after  := owlry_level_for_xp(new_total);
  if lvl_after > lvl_before then
    leveled := true;
    -- the level faucet stops at the front row (LV13); refill tops to the
    -- resting line, not the cap (a full-cap refill was 24 free peeks a level)
    bonus_coins := bonus_coins + 50 * greatest(0, least(lvl_after, 13) - least(lvl_before, 13));
    new_ink := greatest(new_ink, rest);
  end if;

  -- ---------- streak: local days, the dark night ----------
  new_streak := prof.streak;
  if d_xp > 0 and (prof.last_active is null or prof.last_active < lday) then
    if prof.last_active = lday - 1 then
      new_streak := prof.streak + 1;
    elsif prof.last_active = lday - 2
      and (prof.dark_night_at is null or prof.dark_night_at < lday - 7) then
      -- the first missed day in any rolling 7 is auto-kept, free
      new_streak := prof.streak + 1;
      dark_kept := true;
    else
      new_streak := 1;
    end if;
    streak_row := true;
    if new_streak > 0 and new_streak % 7 = 0 and new_streak > prof.streak then
      bonus_coins := bonus_coins + floor(owlry_cfg('streak_bonus_coins', 30))::integer;
    end if;
  end if;

  -- ---------- the once-ever full well (+50, ledger-latched) ----------
  if new_ink >= prof.ink_max and not exists (select 1 from public.owlry_activity a
        where a.user_id = p_uid and a.type = 'well_full') then
    bonus_coins := bonus_coins + 50;
    insert into public.owlry_activity (user_id, type, coin_delta, meta)
    values (p_uid, 'well_full', 50, jsonb_build_object('day', lday_txt));
  end if;

  new_coins := new_coins + bonus_coins;

  update public.owlry_profiles set
    total_xp = new_total, ink = new_ink,
    ink_updated_at = case when new_ink >= rest then now() else ink_updated_at end,
    coins = new_coins, streak = new_streak,
    last_active = case when d_xp > 0 then lday else last_active end,
    dark_night_at = case when dark_kept then lday - 1 else dark_night_at end,
    tz_offset_minutes = tzoff,
    last_occurred_at = occurred,
    updated_at = now()
  where user_id = p_uid;

  granted_xp := d_xp; granted_ink := new_ink - prof.ink; granted_coins := d_coins + bonus_coins;

  -- ---------- library side effects (always land — never lose user data) ----------
  if p_action in ('open','turn_page') then
    insert into public.owlry_user_books (user_id, book_id, started_at, last_read_at, pages_read)
    values (p_uid, p_book_id, occurred, occurred, greatest(0, coalesce((v_meta->>'page')::int, 1) - 1))
    on conflict (user_id, book_id) do update set
      started_at  = coalesce(public.owlry_user_books.started_at, excluded.started_at),
      finished_at = case when (excluded.pages_read > 0) then null else public.owlry_user_books.finished_at end,
      last_read_at = excluded.last_read_at,
      pages_read  = greatest(public.owlry_user_books.pages_read, excluded.pages_read),
      updated_at  = now();
  elsif p_action = 'finish' then
    insert into public.owlry_user_books (user_id, book_id, started_at, finished_at, pages_read, last_read_at)
    values (p_uid, p_book_id, occurred, occurred, coalesce((v_meta->>'pages')::int, 0), occurred)
    on conflict (user_id, book_id) do update set
      finished_at = excluded.finished_at,
      pages_read  = greatest(public.owlry_user_books.pages_read, excluded.pages_read),
      last_read_at = excluded.last_read_at, updated_at = now();
  elsif p_action = 'save' then
    insert into public.owlry_user_books (user_id, book_id, saved) values (p_uid, p_book_id, true)
    on conflict (user_id, book_id) do update set saved = true, updated_at = now();
  elsif p_action = 'unsave' then
    update public.owlry_user_books set saved = false, updated_at = now()
      where user_id = p_uid and book_id = p_book_id;
  end if;

  -- ---------- ledger ----------
  insert into public.owlry_activity (user_id, type, book_id, xp_delta, ink_delta, coin_delta, meta)
  values (p_uid, p_action, p_book_id, granted_xp, granted_ink, granted_coins, v_meta);

  if leveled and least(lvl_after, 13) > least(lvl_before, 13) then
    insert into public.owlry_activity (user_id, type, coin_delta, meta)
    values (p_uid, 'levelup',
      50 * (least(lvl_after, 13) - least(lvl_before, 13)),
      jsonb_build_object('level', lvl_after, 'day', lday_txt));
  end if;
  if streak_row and new_streak <> prof.streak then
    insert into public.owlry_activity (user_id, type, meta)
    values (p_uid, 'streak', jsonb_build_object(
      'streak', new_streak, 'dark_night', dark_kept, 'day', lday_txt));
  end if;

  -- the full house's XP already rode in on the row above; this is just the
  -- once-a-day marker the guard reads
  if full_house then
    insert into public.owlry_activity (user_id, type, xp_delta, meta)
    values (p_uid, 'full_house', 0, jsonb_build_object('day', lday_txt));
  end if;

  -- ---------- stubs (delta-granting; unique index absorbs races) ----------
  perform owlry_grant_stubs(p_uid, p_action, occurred, tzoff, lday, new_streak, new_total);

  return owlry_snapshot_json(p_uid) || jsonb_build_object(
    'ok', true,
    'granted', jsonb_build_object('xp', granted_xp, 'ink', granted_ink, 'coins', granted_coins),
    'withheld', withheld,
    'leveled_up', leveled);
end;
$$;
revoke all on function public.owlry_perform_action_core(uuid, text, text, jsonb) from public, anon, authenticated;

-- ---------- stub grants ----------
create or replace function public.owlry_grant_stubs(
  p_uid uuid, p_action text, p_at timestamptz, p_tz integer, p_day date,
  p_streak integer, p_total bigint)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  span numeric;
  gap integer;
  i integer;
begin
  if p_action = 'onboard' then
    insert into public.owlry_activity (user_id, type, meta)
    values (p_uid, 'stub', jsonb_build_object('id', 'opening_night', 'day', p_day::text))
    on conflict do nothing;
  end if;

  if p_action = 'finish' then
    insert into public.owlry_activity (user_id, type, meta)
    select p_uid, 'stub', jsonb_build_object('id', 'first_finish', 'day', p_day::text)
    where exists (select 1 from public.owlry_activity a
                  where a.user_id = p_uid and a.type = 'finish' and a.xp_delta > 0)
    on conflict do nothing;

    insert into public.owlry_activity (user_id, type, meta)
    select p_uid, 'stub', jsonb_build_object('id', 'twenty_books', 'day', p_day::text)
    where (select count(*) from public.owlry_user_books b
           where b.user_id = p_uid and b.finished_at is not null) >= 20
    on conflict do nothing;
  end if;

  if p_streak >= 7 then
    insert into public.owlry_activity (user_id, type, meta)
    values (p_uid, 'stub', jsonb_build_object('id', 'seven_nights', 'day', p_day::text))
    on conflict do nothing;
  end if;

  if owlry_local_hour(p_at, p_tz) >= 22 then
    insert into public.owlry_activity (user_id, type, meta)
    values (p_uid, 'stub', jsonb_build_object('id', 'night_owl', 'day', p_day::text))
    on conflict do nothing;
  end if;

  -- marathon: first and last XP-bearing rows of the local day >= 1h apart
  select extract(epoch from (max((a.meta->>'occurred_at')::timestamptz)
                           - min((a.meta->>'occurred_at')::timestamptz)))
    into span
    from public.owlry_activity a
    where a.user_id = p_uid and a.xp_delta > 0 and a.meta->>'day' = p_day::text;
  if span >= 3600 then
    insert into public.owlry_activity (user_id, type, meta)
    values (p_uid, 'stub', jsonb_build_object('id', 'marathon', 'day', p_day::text))
    on conflict do nothing;
  end if;

  -- returning patron: first active day after a gap of >= 14 days
  select p_day - max((a.meta->>'day')::date) into gap
    from public.owlry_activity a
    where a.user_id = p_uid and a.xp_delta > 0 and a.meta ? 'day'
      and a.meta->>'day' < p_day::text;
  if gap >= 14 then
    insert into public.owlry_activity (user_id, type, meta)
    values (p_uid, 'stub', jsonb_build_object('id', 'returning_patron', 'day', p_day::text))
    on conflict do nothing;
  end if;

  -- full well stub mirrors the ledger latch
  insert into public.owlry_activity (user_id, type, meta)
  select p_uid, 'stub', jsonb_build_object('id', 'full_well', 'day', p_day::text)
  where exists (select 1 from public.owlry_activity a
                where a.user_id = p_uid and a.type = 'well_full')
  on conflict do nothing;

  -- encore stars: one per 1,000 XP past the front row (LV13 = 9,000)
  if p_total > 9000 then
    for i in 1 .. floor((p_total - 9000) / 1000)::integer loop
      insert into public.owlry_activity (user_id, type, meta)
      values (p_uid, 'stub', jsonb_build_object('id', 'encore', 'n', i::text, 'day', p_day::text))
      on conflict do nothing;
    end loop;
  end if;
end;
$$;
revoke all on function public.owlry_grant_stubs(uuid, text, timestamptz, integer, date, integer, bigint) from public, anon, authenticated;

-- ---------- API wrappers ----------
create or replace function public.owlry_perform_action(
  p_action text, p_book_id text default null, p_meta jsonb default '{}'::jsonb)
returns jsonb language sql security definer set search_path = public, pg_temp as $$
  select public.owlry_perform_action_core(auth.uid(), p_action, p_book_id, p_meta);
$$;
revoke all on function public.owlry_perform_action(text, text, jsonb) from public, anon;
grant execute on function public.owlry_perform_action(text, text, jsonb) to authenticated;

-- quote_keep through the guarded core; the standalone RPC becomes a thin alias
-- so old clients keep working, but there is one write path
create or replace function public.owlry_save_quote(p_book_id text, p_text text)
returns jsonb language sql security definer set search_path = public, pg_temp as $$
  select public.owlry_perform_action_core(auth.uid(), 'quote_keep', p_book_id,
    jsonb_build_object('text', p_text));
$$;
revoke all on function public.owlry_save_quote(text, text) from public, anon;
grant execute on function public.owlry_save_quote(text, text) to authenticated;

-- ---------- service-role entry points for the owl-peek edge function ----------
create or replace function public.owlry_spend_preview(p_uid uuid, p_book_id text, p_meta jsonb default '{}'::jsonb)
returns jsonb language sql security definer set search_path = public, pg_temp as $$
  select public.owlry_perform_action_core(p_uid, 'preview', p_book_id, p_meta);
$$;
revoke all on function public.owlry_spend_preview(uuid, text, jsonb) from public, anon, authenticated;
-- the edge function calls these with the service role; the grant has to be
-- explicit, because REVOKE ... FROM public above strips the default EXECUTE
grant execute on function public.owlry_spend_preview(uuid, text, jsonb) to service_role;

-- compensating entry when generation fails after the spend
create or replace function public.owlry_refund_preview(p_uid uuid, p_book_id text, p_idem text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare cost integer;
begin
  select abs(c.ink) into cost from public.owlry_action_config c where c.action = 'preview';
  update public.owlry_profiles
    set ink = least(ink_max, ink + coalesce(cost, 5)), updated_at = now()
    where user_id = p_uid;
  insert into public.owlry_activity (user_id, type, book_id, ink_delta, meta)
  values (p_uid, 'preview', p_book_id, coalesce(cost, 5),
    jsonb_build_object('refund', true)
      || case when p_idem is null then '{}'::jsonb
              else jsonb_build_object('idem', p_idem || '-refund') end);
end;
$$;
revoke all on function public.owlry_refund_preview(uuid, text, text) from public, anon, authenticated;
grant execute on function public.owlry_refund_preview(uuid, text, text) to service_role;
