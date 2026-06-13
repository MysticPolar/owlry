-- ============================================================
-- Owlry backend — seed config (idempotent; safe to re-run to retune).
-- ============================================================

-- ---------- global tunables ----------
insert into public.owlry_economy_config (key, num) values
  ('ink_regen_minutes', 6),     -- energy regen: +1 ink every N minutes (≈120 ink in 12h)
  ('streak_bonus_coins', 30),   -- coins awarded every 7-day streak milestone
  ('minutes_per_page', 0.75)    -- estimate for "time reading" stat
on conflict (key) do update set num = excluded.num;

-- ---------- per-action economy (negative ink/coins = spend) ----------
-- Preview is the premium action: most XP, and the only thing that spends coins
-- (and also spends ink). Chat spends ink. Reading earns ink.
insert into public.owlry_action_config (action, xp, ink, coins) values
  ('chat',       3, -1,   0),
  ('open',       8,  0,   0),
  ('turn_page',  1,  2,   0),
  ('preview',   25, -5, -10),
  ('finish',    60,  0,  25),
  ('save',       5,  0,   0),
  ('unsave',     0,  0,   0),
  ('checkin',   10, 20,   0)
on conflict (action) do update set
  xp = excluded.xp, ink = excluded.ink, coins = excluded.coins, enabled = true;

-- ---------- radar dimension tags (the "six shelves of you") ----------
-- wealth + relationship intentionally have no books yet — that's the
-- unbalanced-reader story the radar tells ("wealth could use a chapter").
insert into public.owlry_book_dimensions (book_id, dimension) values
  ('snow','fiction'),('piranesi','fiction'),('goldfinch','fiction'),('pachinko','fiction'),
  ('tranq','fiction'),('cuckoo','fiction'),('rose','fiction'),('hail','fiction'),
  ('circe','fiction'),('sleep','fiction'),('kindred','fiction'),('remains','fiction'),
  ('beach','fiction'),('oldman','fiction'),('none','fiction'),
  ('medit','mindset'),('frankl','mindset'),('pema','mindset'),('atomic','mindset'),
  ('gentle','mindset'),('spqr','mindset'),
  ('deep','career'),('bird','career'),
  ('wws','health')
on conflict (book_id) do update set dimension = excluded.dimension;
