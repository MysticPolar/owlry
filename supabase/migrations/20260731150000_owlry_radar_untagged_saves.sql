-- ============================================================
-- Untagged Scout/open-world saves were invisible to the radar JOIN.
-- 1) Count them as wonder until classified.
-- 2) On save/quote, ensure a dimension row exists (default wonder).
-- 3) RPC so the client can classify (may upgrade a wonder default).
-- ============================================================

-- Radar: left join so untagged books still score (as wonder)
create or replace function public.owlry_radar_json(p_uid uuid)
returns jsonb language sql stable as $$
  with dims(dimension) as (
    values ('health'),('wealth'),('love'),('happiness'),('wonder')
  ),
  eng as (
    select dimension, sum(pts)::numeric as score
    from (
      select coalesce(bd.dimension, 'wonder') as dimension, 1::numeric as pts
      from public.owlry_user_books ub
      left join public.owlry_book_dimensions bd on bd.book_id = ub.book_id
      where ub.user_id = p_uid and ub.saved is true

      union all

      select coalesce(bd.dimension, 'wonder') as dimension, 1::numeric as pts
      from public.owlry_quotes q
      left join public.owlry_book_dimensions bd on bd.book_id = q.book_id
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

-- Insert a tag; upgrade wonder defaults when the client has a better pillar.
-- Never clobber a non-wonder catalog / prior classification.
create or replace function public.owlry_ensure_book_dimension(
  p_book_id text,
  p_dimension text default 'wonder'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  dim text := coalesce(nullif(trim(p_dimension), ''), 'wonder');
begin
  if p_book_id is null or length(trim(p_book_id)) = 0 then
    return;
  end if;
  if dim not in ('health', 'wealth', 'love', 'happiness', 'wonder') then
    dim := 'wonder';
  end if;
  insert into public.owlry_book_dimensions (book_id, dimension)
  values (trim(p_book_id), dim)
  on conflict (book_id) do update
    set dimension = excluded.dimension
  where owlry_book_dimensions.dimension = 'wonder'
    and excluded.dimension is distinct from 'wonder';
end;
$$;

revoke all on function public.owlry_ensure_book_dimension(text, text) from public, anon;
grant execute on function public.owlry_ensure_book_dimension(text, text) to authenticated;

-- Auto-tag on first save (wonder) so radar moves even before the client classifies
create or replace function public.owlry_tag_book_on_save()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.saved is true then
    perform public.owlry_ensure_book_dimension(new.book_id, 'wonder');
  end if;
  return new;
end;
$$;

drop trigger if exists owlry_user_books_tag_dim on public.owlry_user_books;
create trigger owlry_user_books_tag_dim
  after insert or update of saved on public.owlry_user_books
  for each row
  when (new.saved is true)
  execute function public.owlry_tag_book_on_save();

create or replace function public.owlry_tag_book_on_quote()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.owlry_ensure_book_dimension(new.book_id, 'wonder');
  return new;
end;
$$;

drop trigger if exists owlry_quotes_tag_dim on public.owlry_quotes;
create trigger owlry_quotes_tag_dim
  after insert on public.owlry_quotes
  for each row
  execute function public.owlry_tag_book_on_quote();

-- Backfill: existing saved / quoted open-world books → wonder so radar lights up now
insert into public.owlry_book_dimensions (book_id, dimension)
select distinct book_id, 'wonder'
from (
  select book_id from public.owlry_user_books where saved is true
  union
  select book_id from public.owlry_quotes
) s
where book_id is not null
  and book_id <> ''
  and not exists (
    select 1 from public.owlry_book_dimensions d where d.book_id = s.book_id
  )
on conflict (book_id) do nothing;
