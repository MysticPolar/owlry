-- Compare-and-swap fence for concurrent progress sync.
--
-- Clients read state + revision, merge locally, then update only when the
-- observed revision still matches. A racing client re-reads and merges again,
-- so whole-state JSON writes cannot erase another device's shelves or exact
-- reading positions.

alter table public.owlry_progress
  add column if not exists revision bigint not null default 0;

comment on column public.owlry_progress.revision is
  'Monotonic compare-and-swap revision used to merge concurrent client progress writes.';

-- Older installed PWAs update the whole `state` without sending `revision`.
-- An omitted revision arrives as OLD.revision (or the insert default during an
-- upsert), while current clients explicitly send N + 1. Preserve the server
-- state for a legacy write rather than accepting a stale whole-state overwrite;
-- the old PWA retains its offline owner cache, which the upgraded client later
-- merges through the revision-aware path.
create or replace function public.owlry_bump_progress_revision()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Any update that does not explicitly advance the compare-and-swap token is
  -- a legacy/stale whole-row write. Preserve the current state even when the
  -- incoming payload happens to be byte-identical: allowing its default
  -- revision through would roll the fence backward and reopen lost updates.
  if new.revision <= old.revision then
    new.state := old.state;
    new.revision := old.revision + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists owlry_progress_revision_fence on public.owlry_progress;
create trigger owlry_progress_revision_fence
before update on public.owlry_progress
for each row execute function public.owlry_bump_progress_revision();
