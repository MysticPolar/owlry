-- ============================================================
-- Owlry backend — hardening (RECONSTRUCTED FROM LIVE AUDIT).
--
-- This migration exists on the LIVE project (version 20260614091136) but was
-- missing from the repo. Reconstructed 2026-07-28 from a read-only audit of the
-- live database: search_path pinned on the sql helpers, and the three API
-- entry points revoked from public/anon so only authenticated + service_role
-- may call them. Re-verify against live (pg_get_functiondef / ACLs) before
-- using this file in any `db push` — live migration timestamps do not match
-- the repo's; treat the live DB as source of truth.
-- ============================================================

alter function public.owlry_cfg(text, numeric)                    set search_path = public, pg_temp;
alter function public.owlry_cumulative_xp(integer)                set search_path = public, pg_temp;
alter function public.owlry_level_for_xp(bigint)                  set search_path = public, pg_temp;
alter function public.owlry_profile_json(public.owlry_profiles)   set search_path = public, pg_temp;
alter function public.owlry_library_json(uuid)                    set search_path = public, pg_temp;
alter function public.owlry_radar_json(uuid)                      set search_path = public, pg_temp;
alter function public.owlry_calendar_json(uuid, int)              set search_path = public, pg_temp;
alter function public.owlry_stats_json(uuid)                      set search_path = public, pg_temp;
alter function public.owlry_quotes_json(uuid)                     set search_path = public, pg_temp;
alter function public.owlry_snapshot_json(uuid)                   set search_path = public, pg_temp;

revoke execute on function public.owlry_perform_action(text, text, jsonb) from public, anon;
revoke execute on function public.owlry_get_snapshot()                    from public, anon;
revoke execute on function public.owlry_save_quote(text, text)            from public, anon;
