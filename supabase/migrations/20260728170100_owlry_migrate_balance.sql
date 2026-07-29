-- ============================================================
-- Owlry — balance migration from the client blob (docs/gamification-design.md §9).
--
-- Converts the old client-authoritative economy (owlry_progress.state) into
-- ledger truth, ONCE, at deploy, over the rows as they stand at that moment.
-- The blob is client-writable, so it is only credible as a record of the era
-- before this ledger existed: a lazy re-evaluation would let any account PATCH
-- its own row to {lv:12, coins:300} and call the snapshot to mint it. The
-- trade is that evidence still sitting unsynced on a second device is not
-- picked up later — that reader keeps whatever their synced blob showed.
--
-- Evidence filter: the demo SEED dressed every guest as LV7 / 240 coins /
-- streak 12. Conversion is capped at the LV5 equivalent (1,400 XP) unless the
-- blob holds reading beyond demo data: a finish not in the seed's
-- (oldman, none), or pagesRead above the seeded goldfinch:463 / pachinko:118 /
-- tranq:224. The fake streak is never imported — the flame relights at 1, and
-- the old number is stamped into the album as a keepsake stub.
-- ============================================================

alter table public.owlry_profiles
  add column if not exists migrated_at   timestamptz,
  add column if not exists evidence_hash text;

create or replace function public.owlry_migrate_balance(p_uid uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  prof public.owlry_profiles;
  blob jsonb;
  ev_hash text;
  first_run boolean;
  has_evidence boolean;
  b_lv integer; b_xp integer; b_coins integer; b_ink integer; b_streak integer;
  candidate bigint;
begin
  select * into prof from public.owlry_profiles where user_id = p_uid;
  if not found then return; end if;

  select state into blob from public.owlry_progress where user_id = p_uid;
  if blob is null then
    -- nothing to import; close the door so we don't re-check forever
    if prof.migrated_at is null then
      update public.owlry_profiles set migrated_at = now() where user_id = p_uid;
    end if;
    return;
  end if;

  -- ONCE, AND ONLY FOR WHAT WAS ALREADY THERE.
  --
  -- owlry_progress.state is client-writable by design (its RLS lets the owner
  -- write anything), so it is only trustworthy as a record of the era before
  -- this ledger existed. The original draft re-evaluated it on every snapshot
  -- to catch evidence arriving late from a second device; that also meant any
  -- account could PATCH its own blob to {lv:12, coins:300} and call the
  -- snapshot to mint it. So: no ratchet, and nothing imported for a profile
  -- created after the deadline this migration stamps at deploy time.
  if prof.migrated_at is not null then return; end if;

  if prof.created_at > to_timestamp(owlry_cfg('migrate_deadline', 0)) then
    update public.owlry_profiles set migrated_at = now() where user_id = p_uid;
    return;
  end if;

  ev_hash := md5(coalesce(blob->>'lv','') || '|' || coalesce(blob->>'xp','') || '|'
              || coalesce((blob->'finishedIds')::text, '[]') || '|'
              || coalesce((blob->'pagesRead')::text, '{}'));
  first_run := true;
  b_lv     := coalesce(nullif(blob->>'lv','')::integer, 1);
  b_xp     := coalesce(nullif(blob->>'xp','')::integer, 0);
  b_coins  := coalesce(nullif(blob->>'coins','')::integer, 0);
  b_ink    := coalesce(nullif(blob->>'ink','')::integer, 0);
  b_streak := coalesce(nullif(blob->>'streak','')::integer, 0);

  has_evidence :=
    exists (select 1 from jsonb_array_elements(coalesce(blob->'finishedIds','[]'::jsonb)) e
            where jsonb_typeof(e.value) = 'string'
              and e.value #>> '{}' not in ('oldman','none'))
    or exists (select 1 from jsonb_each_text(coalesce(blob->'pagesRead','{}'::jsonb)) p(k, v)
            where v ~ '^[0-9]+$'
              and v::numeric > case p.k
                    when 'goldfinch' then 463
                    when 'pachinko'  then 118
                    when 'tranq'     then 224
                    else 0 end);

  -- old client curve was flat 400/level within-level xp; grandfather the
  -- straight conversion, evidence-capped, hard-clamped at ~LV12
  candidate := (50::bigint * b_lv * b_lv + 50 * b_lv - 100) + greatest(0, b_xp);
  if not has_evidence then candidate := least(candidate, 1400); end if;   -- LV5 equivalent
  candidate := least(candidate, 8000);

  if candidate > prof.total_xp then
    update public.owlry_profiles set total_xp = candidate where user_id = p_uid;
  end if;

  if first_run then
    -- spendables import exactly once; never re-ratcheted
    update public.owlry_profiles set
      coins = greatest(coins, least(b_coins, 300)),
      ink   = least(ink_max, greatest(ink, least(b_ink, 120)))
      where user_id = p_uid;

    -- audit row: the old blob's economy, in meta, for the record
    insert into public.owlry_activity (user_id, type, xp_delta, meta)
    values (p_uid, 'migrate', 0, jsonb_build_object(
      'lv', b_lv, 'xp', b_xp, 'coins', b_coins, 'ink', b_ink, 'streak', b_streak,
      'evidence', has_evidence, 'granted_total_xp', greatest(candidate, prof.total_xp),
      'finishedIds', coalesce(blob->'finishedIds','[]'::jsonb),
      'pagesRead', coalesce(blob->'pagesRead','{}'::jsonb)));

    -- the full-well latch carries over without paying twice
    if (blob->>'inkDone') = 'true' and not exists
       (select 1 from public.owlry_activity a where a.user_id = p_uid and a.type = 'well_full') then
      insert into public.owlry_activity (user_id, type, coin_delta, meta)
      values (p_uid, 'well_full', 0, jsonb_build_object('migrated', true));
      insert into public.owlry_activity (user_id, type, meta)
      values (p_uid, 'stub', jsonb_build_object('id', 'full_well', 'migrated', true))
      on conflict do nothing;
    end if;

    -- BACKFILL THE LIBRARY. Every legacy reader's shelves live only in the blob
    -- (owlry_user_books was never written, because performAction had no call
    -- sites). The snapshot reports the library authoritatively, so without this
    -- the first sign-in would hand back an empty shelf — and then persist it.
    insert into public.owlry_user_books (user_id, book_id, saved, updated_at)
    select p_uid, e.value #>> '{}', true, now()
      from jsonb_array_elements(coalesce(blob->'savedIds','[]'::jsonb)) e
     where jsonb_typeof(e.value) = 'string'
    on conflict (user_id, book_id) do update set saved = true, updated_at = now();

    insert into public.owlry_user_books (user_id, book_id, started_at, last_read_at, updated_at)
    select p_uid, e.value #>> '{}', now(), now(), now()
      from jsonb_array_elements(coalesce(blob->'readingIds','[]'::jsonb)) e
     where jsonb_typeof(e.value) = 'string'
    on conflict (user_id, book_id) do update
      set started_at = coalesce(public.owlry_user_books.started_at, now()), updated_at = now();

    insert into public.owlry_user_books (user_id, book_id, started_at, finished_at, updated_at)
    select p_uid, e.value #>> '{}', now(), now(), now()
      from jsonb_array_elements(coalesce(blob->'finishedIds','[]'::jsonb)) e
     where jsonb_typeof(e.value) = 'string'
    on conflict (user_id, book_id) do update
      set finished_at = coalesce(public.owlry_user_books.finished_at, now()), updated_at = now();

    insert into public.owlry_user_books (user_id, book_id, pages_read, updated_at)
    select p_uid, k, greatest(0, floor(v::numeric)::int), now()
      from jsonb_each_text(coalesce(blob->'pagesRead','{}'::jsonb)) as t(k, v)
     where v ~ '^[0-9]+$'
    on conflict (user_id, book_id) do update
      set pages_read = greatest(public.owlry_user_books.pages_read, excluded.pages_read),
          updated_at = now();

    -- the demo flame becomes a keepsake, never a starting balance
    if b_streak > 0 then
      insert into public.owlry_activity (user_id, type, meta)
      values (p_uid, 'stub', jsonb_build_object(
        'id', 'last_season_flame', 'n', '', 'streak', b_streak, 'migrated', true))
      on conflict do nothing;
    end if;
  end if;

  update public.owlry_profiles
    set migrated_at = coalesce(migrated_at, now()), evidence_hash = ev_hash
    where user_id = p_uid;
end;
$$;
revoke all on function public.owlry_migrate_balance(uuid) from public, anon, authenticated;

-- ratchet on every snapshot: late-arriving device evidence still counts
create or replace function public.owlry_get_snapshot()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return jsonb_build_object('ok', false, 'reason', 'not_authenticated'); end if;
  perform owlry_ensure_profile(uid);
  perform owlry_migrate_balance(uid);
  return owlry_snapshot_json(uid) || jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.owlry_get_snapshot() from public, anon;
grant execute on function public.owlry_get_snapshot() to authenticated;

-- ---------- the deadline, and the one-shot run ----------
-- Everything present at deploy is legacy and gets migrated now. Anything
-- created afterwards has no legacy to honour and is stamped as migrated.
insert into public.owlry_economy_config (key, num)
values ('migrate_deadline', extract(epoch from now()))
on conflict (key) do update set num = excluded.num;

do $$
declare u uuid;
begin
  for u in select user_id from public.owlry_progress loop
    perform owlry_ensure_profile(u);
    perform owlry_migrate_balance(u);
  end loop;
end;
$$;
