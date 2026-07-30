-- ============================================================
-- Owlry — thirty-six levels, thirteen rows.  (docs/gamification-design.md §4)
--
-- The house keeps its thirteen rows; what changes is how often a seat moves.
-- A reader now climbs THIRTY-SIX levels to reach the front, and the seat
-- shifts forward every third one: row = 13 − ⌊LV/3⌋. LV1–2 sit in row 13, so
-- "everyone starts in the back row" stays literally true, and LV36 alone holds
-- row 1. The summit is unmoved — LV36 is 9,000 XP, exactly where LV13 used to
-- be — so nobody's lifetime total is re-priced by this migration. The same
-- ledger, relabelled with finer gradations.
--
-- The first four levels are the learning curve rather than the game: LV2 costs
-- 32 XP, LV5 costs 90. A reader's first deliberate act moves their seat off the
-- back wall and the whole meta layer opens inside one session.
--
-- Brass is now priced per LEVEL by the ROW that level lands in, so the seats
-- near the stage pay better and one action crossing several levels pays each of
-- them at its own rate. Lifetime LV2→LV36 comes to 3,120 coins.
--
-- And the stand gets its second consumable: a peek slip, 30 coins for one more
-- letter from the desk today, three a day at most. It is the sink the milestone
-- faucets have been missing — the first thing brass buys that comes back.
--
-- These are the SAME numbers as src/lib/economy/curve.ts and config.ts.
-- Keep them in step. (ECONOMY_VERSION 3; CURVE_VERSION deliberately stays 2 —
-- see the note in config.ts, it marks storage, not shape.)
-- ============================================================

-- ---------- the curve ----------
-- CAREFUL: `create or replace function` replaces the WHOLE definition,
-- configuration parameters included, so the `set search_path` that
-- 20260614091136_owlry_harden.sql applied by ALTER is dropped on the floor
-- unless it is written inline here. It is written inline here. Both stay
-- `immutable` — owlry_profile_json is a stable read model that leans on them
-- being stable, and the planner is welcome to fold them.

-- XP needed to *reach* level L, by the table (index = L). The steps, by band:
-- the learning curve (32/6/17/35), then +100 a level through row 11, +140,
-- +180, +220, +260, +300, +340, +380, +420, +460, and +510 to the front row.
create or replace function public.owlry_cumulative_xp(p_level integer)
returns bigint language sql immutable set search_path = public, pg_temp as $$
  select case
    when coalesce(p_level, 1) <= 1 then 0::bigint
    -- past the front row the climb keeps the encore cadence: 1,000 XP a level,
    -- which is the same 1,000 that buys an encore star. The bar and the album
    -- quote the same number on purpose.
    when p_level > 36 then 9000::bigint + (p_level - 36)::bigint * 1000
    else (array[
      0, 32, 38, 55, 90,          -- LV1–5   the learning curve
      190, 290, 390,              -- LV6–8   +100
      530, 670, 810,              -- LV9–11  +140
      990, 1170, 1350,            -- LV12–14 +180
      1570, 1790, 2010,           -- LV15–17 +220
      2270, 2530, 2790,           -- LV18–20 +260
      3090, 3390, 3690,           -- LV21–23 +300
      4030, 4370, 4710,           -- LV24–26 +340
      5090, 5470, 5850,           -- LV27–29 +380
      6270, 6690, 7110,           -- LV30–32 +420
      7570, 8030, 8490,           -- LV33–35 +460
      9000                        -- LV36    +510 — the front row, the old cap
    ])[p_level]::bigint
  end;
$$;

-- the inverse: the level a lifetime total buys (1-indexed, uncapped — the
-- display clamps at 36 and spends the remainder on encore stars)
create or replace function public.owlry_level_for_xp(p_total bigint)
returns integer language sql immutable set search_path = public, pg_temp as $$
  select case
    when greatest(coalesce(p_total, 0), 0) >= 9000
      then 36 + ((greatest(coalesce(p_total, 0), 0) - 9000) / 1000)::integer
    else coalesce((
      select max(c.lv)::integer
        from unnest(array[
          0, 32, 38, 55, 90,
          190, 290, 390,
          530, 670, 810,
          990, 1170, 1350,
          1570, 1790, 2010,
          2270, 2530, 2790,
          3090, 3390, 3690,
          4030, 4370, 4710,
          5090, 5470, 5850,
          6270, 6690, 7110,
          7570, 8030, 8490,
          9000
        ]) with ordinality as c(need, lv)
       where c.need <= greatest(coalesce(p_total, 0), 0)), 1)
  end;
$$;

-- the seat, and what landing on it pays. Brass ramps to row 8, holds at 100
-- through row 3, and the last two rows pay double — the climb gets richer as
-- it gets slower. Nothing is paid past the front row: LV37 and up are encore
-- levels, and an encore is a star, not a wage.
create or replace function public.owlry_level_coins(p_level integer)
returns integer language sql immutable set search_path = public, pg_temp as $$
  select case
    -- LV1 is where everyone starts, so nothing is ever "landed on" there.
    -- Past the summit the clamp below reports row 1, which is what the client's
    -- levelUpCoins(lv) also returns — the two helpers agree at every input, and
    -- neither is relied on to clamp for the other. Both call sites additionally
    -- bound the loop at 36, so an encore level is never actually paid.
    when coalesce(p_level, 1) < 2 then 0
    --                row: 1    2    3    4    5    6    7    8   9  10  11  12  13
    else (array[200, 200, 100, 100, 100, 100, 100, 100, 70, 50, 30, 20, 10])[
           greatest(1, 13 - (least(greatest(p_level, 1), 36) / 3))]
  end;
$$;

-- internal helpers, locked down like the rest of them
revoke all on function public.owlry_cumulative_xp(integer) from public, anon, authenticated;
revoke all on function public.owlry_level_for_xp(bigint)   from public, anon, authenticated;
revoke all on function public.owlry_level_coins(integer)   from public, anon, authenticated;

-- ---------- a new account opens in the back row too ----------
-- The live defaults (ink 100, coins 200, set by owlry_v2_economy_defaults when
-- levels were slow and there was nothing to spend brass on) now contradict the
-- client, whose SEED is a true fresh start: ink 10, coins 0. That matters more
-- than it looks, because `mergeProgress` merges both by MAX — so the server's
-- float always wins, and a reader who just spent their first session earning
-- ten coins a level would sign up and jump to 200. Two hundred is more than the
-- whole LV2→LV9 payroll, and it buys six peek slips at LV1, before a page is
-- read. The learning curve and the slip sink both only mean something if a new
-- purse starts empty.
--
-- DEFAULTS ONLY — no backfill. Existing purses were honestly earned (or honestly
-- migrated) and re-pricing them here would be theft.
alter table public.owlry_profiles alter column ink   set default 10;
alter table public.owlry_profiles alter column coins set default 0;
-- ink_max already defaults to 120 (season ledger); left alone.

-- ---------- the lobby stand takes a second consumable ----------
-- The `kind` check was written inline in the create table, so Postgres named it
-- itself. Find whatever it is actually called rather than trusting the usual
-- convention — this file has to run against a live database whose migration
-- history does not match the repo's.
do $$
declare c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'owlry_stand_catalog'
       and con.contype = 'c'
       -- match the ENUMERATED-kind check specifically, not merely any check
       -- that mentions the column: a future cross-column rule like
       -- `price > 0 or kind = 'slip'` must not be silently swept up here
       and pg_get_constraintdef(con.oid) ilike '%kind%'
       and pg_get_constraintdef(con.oid) ilike '%stationery%'
  loop
    execute format('alter table public.owlry_stand_catalog drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.owlry_stand_catalog
  add constraint owlry_stand_catalog_kind_check
  check (kind in ('stationery', 'marquee', 'cushion', 'bottle', 'slip'));

-- 30 coins for one more letter from the desk today. It grants no ink and no
-- XP — it buys the desk's attention and nothing else — and it is never owned.
insert into public.owlry_stand_catalog (sku, kind, price, season) values
  ('peek-slip', 'slip', 30, null)
on conflict (sku) do nothing;

-- ---------- owned goods ----------
-- consumables are bought again and again, so they are never owned: the bottle
-- was already excluded and the slip joins it.
create or replace function public.owlry_goods_json(p_uid uuid)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  select coalesce((select jsonb_agg(distinct a.meta->>'sku')
         from public.owlry_activity a
         join public.owlry_stand_catalog c on c.sku = a.meta->>'sku'
         where a.user_id = p_uid and a.type = 'purchase'
           and c.kind not in ('bottle', 'slip')), '[]'::jsonb);
$$;
revoke all on function public.owlry_goods_json(uuid) from public, anon, authenticated;

-- ---------- the guarded core ----------
-- Re-issued whole because `create or replace` takes nothing less. Four edits
-- against 20260728170000_owlry_season_ledger.sql, and four only:
--   1. level-up brass is summed per level from owlry_level_coins;
--   2. every level cap of 13 becomes 36;
--   3. the preview ceiling is 6 plus today's peek slips;
--   4. the purchase branch knows a slip from a keepsake.
-- Everything else below is the season ledger's body, verbatim.
--
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
  level_coins integer := 0;
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
    -- the LLM throttle: with the coin cost gone, the cap binds, not ink. A peek
    -- slip bought at the stand raises TODAY's ceiling by one — the only thing
    -- brass can buy that the free economy also grants, and it is bounded three
    -- a day at the till, so six letters becomes nine and never more.
    if (select count(*) from public.owlry_activity a
          where a.user_id = p_uid and a.type = 'preview' and a.ink_delta < 0
            and a.meta->>'day' = lday_txt)
       >= 6 + (select count(*) from public.owlry_activity a
                 join public.owlry_stand_catalog c on c.sku = a.meta->>'sku'
               where a.user_id = p_uid and a.type = 'purchase' and c.kind = 'slip'
                 and a.meta->>'day' = lday_txt) then
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
    -- consumables are bought again and again; everything else is owned once
    if good.kind not in ('bottle', 'slip') and exists (select 1 from public.owlry_activity a
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
    -- three slips a local day, counted across every slip on the shelf: the
    -- ceiling they raise has to stay a ceiling
    if good.kind = 'slip' and (select count(*) from public.owlry_activity a
          join public.owlry_stand_catalog c on c.sku = a.meta->>'sku'
          where a.user_id = p_uid and a.type = 'purchase' and c.kind = 'slip'
            and a.meta->>'day' = lday_txt) >= 3 then
      return owlry_snapshot_json(p_uid) || jsonb_build_object('ok', false,
        'granted', jsonb_build_object('xp',0,'ink',0,'coins',0), 'withheld', 'rate_limited');
    end if;
    if prof.coins < good.price then
      return owlry_snapshot_json(p_uid) || jsonb_build_object('ok', false,
        'granted', jsonb_build_object('xp',0,'ink',0,'coins',0), 'withheld', 'insufficient_coins');
    end if;
    d_coins := -good.price;
    -- the bottle pours; the slip pours nothing. No ink, no XP — a slip is a
    -- word with the desk, and the preview guard above is where it is spent.
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
    -- The level faucet stops at the front row (LV36); the refill tops to the
    -- resting line, not the cap (a full-cap refill was 24 free peeks a level).
    -- Brass is priced per LEVEL, by the row that level sits in, so one action
    -- that crosses several levels pays each of them at its own rate — a finish
    -- early in the learning curve can clear three at once, and should be paid
    -- for three. generate_series is empty once lvl_before is already 36, which
    -- is how the encore levels quietly pay nothing.
    level_coins := coalesce((select sum(owlry_level_coins(l))
      from generate_series(least(lvl_before, 36) + 1, least(lvl_after, 36)) as l), 0)::integer;
    bonus_coins := bonus_coins + level_coins;
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

  if leveled and least(lvl_after, 36) > least(lvl_before, 36) then
    insert into public.owlry_activity (user_id, type, coin_delta, meta)
    values (p_uid, 'levelup', level_coins,
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

-- ============================================================
-- Two margin notes, left deliberately as notes.
--
-- owlry_grant_stubs: its encore loop still reads
--     if p_total > 9000 then ... floor((p_total - 9000) / 1000) ...
-- and that literal is still exactly right — it is just no longer LV13's
-- summit. 9,000 is now owlry_cumulative_xp(36), the front row, and one encore
-- star per 1,000 XP past it is unchanged. The comment beside it in
-- 20260728170000_owlry_season_ledger.sql says "LV13 = 9,000"; read it as
-- "LV36 = 9,000". The function is not re-issued here on purpose: nothing in it
-- computes differently under the new curve, and re-typing eighty lines of
-- working stub grants to fix a sentence is a bad trade.
--
-- owlry_migrate_balance: its clamps stay at 1400 and 8000 because they were
-- always in XP, never in levels — the pre-ledger blob is converted with the OLD
-- quadratic (50L² + 50L − 100) and then held down. What moved is only what
-- those numbers are NEAR: 1,400 XP used to be the LV5 equivalent and now lands
-- around LV13; 8,000 used to be just under LV12 and now sits in row 2. Neither
-- clamp is re-numbered, and neither should be: the function is guarded by
-- migrate_deadline and only ever ran over accounts that existed before the
-- ledger did. Re-pricing an ancient blob on today's table would hand those
-- readers a different lifetime total than the one already granted them, which
-- is the exact trap src/lib/economy/curve.ts's legacyTotalXp is frozen to
-- avoid. Read the comment there as "the evidence cap" and "the hard ceiling",
-- in XP, and leave the arithmetic alone.
-- ============================================================
