-- ============================================================
-- Owlry — five life pillars (health|wealth|love|happiness|wonder).
-- Replaces the six-shelf radar (relationship|career|mindset|fiction).
-- ============================================================

-- 1) drop old check so we can rewrite dimension values
alter table public.owlry_book_dimensions
  drop constraint if exists owlry_book_dimensions_dimension_check;

-- 2) remap existing rows (old six → new five)
update public.owlry_book_dimensions set dimension = 'wonder'
  where dimension = 'fiction';
update public.owlry_book_dimensions set dimension = 'happiness'
  where dimension = 'mindset';
update public.owlry_book_dimensions set dimension = 'wealth'
  where dimension = 'career';
update public.owlry_book_dimensions set dimension = 'love'
  where dimension = 'relationship';
-- health + wealth already valid; anything else → wonder
update public.owlry_book_dimensions set dimension = 'wonder'
  where dimension not in ('health','wealth','love','happiness','wonder');

-- 3) install five-pillar check
alter table public.owlry_book_dimensions
  add constraint owlry_book_dimensions_dimension_check
  check (dimension in ('health','wealth','love','happiness','wonder'));

-- 4) catalog seed (idempotent) — explicit pillars so demos don't depend on Google
insert into public.owlry_book_dimensions (book_id, dimension) values
  ('wws','health'),
  ('deep','wealth'),('bird','wealth'),
  ('beach','love'),
  ('medit','happiness'),('frankl','happiness'),('pema','happiness'),
  ('atomic','happiness'),('gentle','happiness'),
  ('remains','happiness'),('oldman','happiness'),('circe','happiness'),('goldfinch','happiness'),
  ('snow','wonder'),('piranesi','wonder'),('pachinko','wonder'),('tranq','wonder'),
  ('cuckoo','wonder'),('rose','wonder'),('hail','wonder'),('sleep','wonder'),
  ('kindred','wonder'),('none','wonder'),('spqr','wonder')
on conflict (book_id) do update set dimension = excluded.dimension;

-- 5) reading balance: engagement per pillar, capped at 100
create or replace function public.owlry_radar_json(p_uid uuid)
returns jsonb language sql stable as $$
  with dims(dimension) as (
    values ('health'),('wealth'),('love'),('happiness'),('wonder')
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

alter function public.owlry_radar_json(uuid) set search_path = public, pg_temp;
