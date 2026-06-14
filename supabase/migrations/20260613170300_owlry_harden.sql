-- ============================================================
-- Owlry backend — hardening (clears Supabase security advisors on owlry_* objects).
--   1. Pin search_path on the language-sql helpers (the plpgsql ones already pin it).
--   2. Revoke the implicit PUBLIC/anon EXECUTE on the 3 API entry points so only
--      the `authenticated` role can invoke them (they already self-check auth.uid(),
--      so this is defense-in-depth, not a behavior change).
-- Idempotent and additive.
-- ============================================================

-- 1. non-mutable search_path on the helper functions
alter function public.owlry_cfg(text, numeric)               set search_path = public, pg_temp;
alter function public.owlry_cumulative_xp(integer)           set search_path = public, pg_temp;
alter function public.owlry_level_for_xp(bigint)             set search_path = public, pg_temp;
alter function public.owlry_profile_json(public.owlry_profiles) set search_path = public, pg_temp;
alter function public.owlry_library_json(uuid)               set search_path = public, pg_temp;
alter function public.owlry_radar_json(uuid)                 set search_path = public, pg_temp;
alter function public.owlry_calendar_json(uuid, integer)     set search_path = public, pg_temp;
alter function public.owlry_stats_json(uuid)                 set search_path = public, pg_temp;
alter function public.owlry_quotes_json(uuid)                set search_path = public, pg_temp;
alter function public.owlry_snapshot_json(uuid)              set search_path = public, pg_temp;

-- 2. lock the entry points to authenticated only (drop the implicit PUBLIC grant)
revoke execute on function
  public.owlry_get_snapshot(),
  public.owlry_perform_action(text, text, jsonb),
  public.owlry_save_quote(text, text)
from public, anon;
