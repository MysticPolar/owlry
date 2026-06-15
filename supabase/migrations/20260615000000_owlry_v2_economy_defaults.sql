-- ============================================================
-- Owlry — new-account economy: fresh readers start at 0 XP (displayed level 0),
-- full ink 100, coins 200. Founder/seeded accounts set their own values.
-- ============================================================

-- column defaults for any new profile
alter table public.owlry_profiles alter column ink     set default 100;
alter table public.owlry_profiles alter column ink_max set default 100;
alter table public.owlry_profiles alter column coins   set default 200;
-- total_xp already defaults to 0

-- Display levels 0-indexed (a brand-new reader is "Level 0"). The internal level
-- curve is unchanged, so XP thresholds, level-up bonuses and ink refills all
-- behave exactly as before — only the displayed number shifts down by one.
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
