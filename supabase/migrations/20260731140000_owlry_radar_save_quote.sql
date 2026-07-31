-- ============================================================
-- Radar score: +1 per saved book, +1 per kept quote (by book pillar).
-- Unsave / delete quote removes those points (derived, not ledgered).
-- ============================================================

create or replace function public.owlry_radar_json(p_uid uuid)
returns jsonb language sql stable as $$
  with dims(dimension) as (
    values ('health'),('wealth'),('love'),('happiness'),('wonder')
  ),
  eng as (
    select dimension, sum(pts)::numeric as score
    from (
      -- one point while the book stays on the shelf
      select bd.dimension, 1::numeric as pts
      from public.owlry_user_books ub
      join public.owlry_book_dimensions bd on bd.book_id = ub.book_id
      where ub.user_id = p_uid and ub.saved is true

      union all

      -- one point per kept quote (gone when the quote row is deleted)
      select bd.dimension, 1::numeric as pts
      from public.owlry_quotes q
      join public.owlry_book_dimensions bd on bd.book_id = q.book_id
      where q.user_id = p_uid
    ) x
    group by dimension
  )
  select jsonb_agg(jsonb_build_object(
           'dimension', d.dimension, 'value', least(100, coalesce(e.score, 0))::int
         ) order by d.dimension)
  from dims d left join eng e on e.dimension = d.dimension;
$$;

alter function public.owlry_radar_json(uuid) set search_path = public, pg_temp;
