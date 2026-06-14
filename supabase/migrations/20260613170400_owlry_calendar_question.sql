-- ============================================================
-- Owlry — calendar read-model: also surface the latest "asked" question per
-- day (from chat activity meta.q), so the profile calendar can show
-- "YOU ASKED …" alongside "YOU PREVIEWED …". Idempotent create-or-replace;
-- privileges and the revoke from the functions migration are preserved.
-- ============================================================
create or replace function public.owlry_calendar_json(p_uid uuid, p_days int default 35)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'day', day,
           'owl_posts', owl_posts,
           'previewed_book', previewed_book,
           'asked', asked
         ) order by day desc), '[]'::jsonb)
  from (
    select (created_at at time zone 'utc')::date as day,
           count(*) as owl_posts,
           (array_agg(book_id order by created_at desc)
              filter (where type='preview' and book_id is not null))[1] as previewed_book,
           (array_agg(meta->>'q' order by created_at desc)
              filter (where type='chat' and coalesce(meta->>'q','') <> ''))[1] as asked
    from public.owlry_activity
    where user_id = p_uid and type in ('preview','chat')
      and created_at >= now() - make_interval(days => p_days)
    group by 1
  ) t;
$$;
