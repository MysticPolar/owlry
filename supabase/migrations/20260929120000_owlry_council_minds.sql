-- ============================================================
-- owlry — The Council Room: the minds cache (docs/council-backend.md).
--
-- council-chat's recall modes ("figure", "book") ask Gemini what it knows
-- about a real thinker or a real book. The answer is cached here, so a mind
-- is recalled once per language and every reader gets the same card — and
-- the same attributed quotes, which is what makes the verbatim gate
-- consistent across sessions. Additive; nothing that exists is touched.
--
-- Written only by the service role (the function, after it has checked the
-- card); readable by any signed-in reader. `key` is the request key the
-- function derives from the name or the title (see _shared/council/minds.ts),
-- not the model's canonical name — the same card may sit under both.
-- ============================================================
create table if not exists public.owlry_council_minds (
  kind       text        not null check (kind in ('figure', 'book')),
  key        text        not null check (char_length(key) between 1 and 160),
  lang       text        not null check (lang in ('en', 'zh')),
  payload    jsonb       not null check (octet_length(payload::text) <= 65536),
  model      text        not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (kind, key, lang)
);
comment on table public.owlry_council_minds is
  'Cards council-chat recalled from the model for thinkers and books outside the curated catalogue; one per (kind, request key, language).';

alter table public.owlry_council_minds enable row level security;

drop policy if exists owlry_council_minds_read on public.owlry_council_minds;
create policy owlry_council_minds_read
  on public.owlry_council_minds for select to authenticated using (true);

grant select on public.owlry_council_minds to authenticated;

drop trigger if exists owlry_council_minds_touch on public.owlry_council_minds;
create trigger owlry_council_minds_touch
  before update on public.owlry_council_minds
  for each row execute function public.owlry_touch_updated_at();
