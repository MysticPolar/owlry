-- ============================================================
-- Owlry backend — v2 economy defaults (RECONSTRUCTED FROM LIVE AUDIT).
--
-- Live version 20260615095737, missing from the repo. Two changes confirmed
-- live: (1) new-profile defaults became ink 100 / ink_max 100 / coins 200
-- (repo had 60 / 120 / 40); (2) owlry_profile_json reports a 0-INDEXED display
-- level: greatest(0, level - 1). The internal curve is unchanged.
-- Reconstructed 2026-07-28; re-verify against live before any db push.
-- The season-ledger migration (20260728170000) supersedes both changes:
-- ink_max returns to 120 and the display level returns to 1-indexed with a
-- schema_v flag.
-- ============================================================

alter table public.owlry_profiles alter column ink     set default 100;
alter table public.owlry_profiles alter column ink_max set default 100;
alter table public.owlry_profiles alter column coins   set default 200;

create or replace function public.owlry_profile_json(prof public.owlry_profiles)
returns jsonb language sql stable set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'total_xp', prof.total_xp,
    'level', greatest(0, owlry_level_for_xp(prof.total_xp) - 1),
    'xp_into_level', prof.total_xp - owlry_cumulative_xp(owlry_level_for_xp(prof.total_xp)),
    'xp_for_next', owlry_cumulative_xp(owlry_level_for_xp(prof.total_xp) + 1)
                   - owlry_cumulative_xp(owlry_level_for_xp(prof.total_xp)),
    'ink', prof.ink, 'ink_max', prof.ink_max,
    'coins', prof.coins, 'streak', prof.streak, 'username', prof.username
  );
$$;

revoke all on function public.owlry_profile_json(public.owlry_profiles) from public, anon, authenticated;
