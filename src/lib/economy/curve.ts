/* ============================================================
   owlry — the seat map (docs/gamification-design.md §4).

   Thirty-six levels, thirteen rows, one seat map. The house still
   has thirteen rows numbered from the stage, but a seat now moves
   every THIRD level: row = 13 − ⌊LV/3⌋. LV1–2 sit in row 13 (the
   back row, so "everyone starts in the back row" stays literally
   true) and LV36 alone holds row 1, the front.

   The first four levels are the learning curve, not the game:
   LV2 costs 32 XP, LV5 costs 90. A reader's first deliberate act
   moves their seat off the back wall, and the whole meta layer
   (the stand at LV2, the pro desk at LV3, the mirror at LV5) opens
   inside the first session. The climb proper starts at LV6.

   The cumulative cap is unchanged: LV36 is 9,000 XP, exactly where
   LV13 used to be. Past it, every 1,000 XP is one more level AND
   one encore star — the two cadences are the same number on
   purpose, so the bar and the album never disagree.

   These are the SAME numbers as owlry_cumulative_xp /
   owlry_level_for_xp in Postgres. Keep them in step.
   ============================================================ */

/** the house has thirteen rows; a seat moves every third level */
export const ROWS = 13;
/** LV36 is the front row and the last paid level */
export const LV_CAP = 36;
/** one encore star — and one honorary level — per this much XP past the cap */
export const ENCORE_STEP = 1000;

/** XP needed to *reach* level L, indexed L−1. The steps, by band:
    the learning curve (32/6/17/35), then +100 a level through row 11,
    +140, +180, +220, +260, +300, +340, +380, +420, +460, and +510 to the front. */
const CURVE: readonly number[] = [
  0, 32, 38, 55, 90, //          LV1–5   the learning curve
  190, 290, 390, //              LV6–8   +100
  530, 670, 810, //              LV9–11  +140
  990, 1170, 1350, //            LV12–14 +180
  1570, 1790, 2010, //           LV15–17 +220
  2270, 2530, 2790, //           LV18–20 +260
  3090, 3390, 3690, //           LV21–23 +300
  4030, 4370, 4710, //           LV24–26 +340
  5090, 5470, 5850, //           LV27–29 +380
  6270, 6690, 7110, //           LV30–32 +420
  7570, 8030, 8490, //           LV33–35 +460
  9000, //                       LV36    +510 — the front row, the old cap
];

/** XP needed to *reach* level L. Past the cap, levels keep the encore cadence. */
export const cumulativeXp = (lv: number): number =>
  lv <= 1 ? 0 : lv > LV_CAP ? CURVE[LV_CAP - 1] + (lv - LV_CAP) * ENCORE_STEP : CURVE[lv - 1];

/** the level a lifetime XP total buys (1-indexed, uncapped — display clamps) */
export const levelForXp = (total: number): number => {
  const t = Math.max(0, total);
  const summit = CURVE[LV_CAP - 1];
  if (t >= summit) return LV_CAP + Math.floor((t - summit) / ENCORE_STEP);
  // CURVE[lv] is the cost of reaching lv+1 — walk while the next one is paid for
  let lv = 1;
  while (lv < LV_CAP && CURVE[lv] <= t) lv += 1;
  return lv;
};

/** XP banked inside the current level (what the bar fills with) */
export const xpIntoLevel = (total: number): number =>
  Math.max(0, total) - cumulativeXp(levelForXp(total));

/** XP the current level costs end to end (what the bar's width means) */
export const xpForNext = (total: number): number => {
  const lv = levelForXp(total);
  return cumulativeXp(lv + 1) - cumulativeXp(lv);
};

/** the seat: row 13 (back) at LV1–2 … row 1 (front) at LV36 and beyond */
export const rowFromLevel = (lv: number): number =>
  Math.max(1, ROWS - Math.floor(Math.min(Math.max(lv, 1), LV_CAP) / 3));

/** does crossing INTO this level move the seat? true on LV3, 6, 9 … 36 */
export const seatMovesAt = (lv: number): boolean => rowFromLevel(lv) < rowFromLevel(lv - 1);

/** encore stars: the reading goes on after the seat stops moving */
export const encoreStars = (total: number): number =>
  total > cumulativeXp(LV_CAP) ? Math.floor((total - cumulativeXp(LV_CAP)) / ENCORE_STEP) : 0;

/** progress toward the next encore star, 0..1 (only meaningful past LV36) */
export const encoreProgress = (total: number): number => {
  const past = total - cumulativeXp(LV_CAP);
  return past <= 0 ? 0 : (past % ENCORE_STEP) / ENCORE_STEP;
};

/** The pre-ledger client curve was a flat 400/level; this converts an old
    (lv, xp) to lifetime XP.

    FROZEN ON PURPOSE. This is the curveV-2 grandfathering deal, and the SAME
    arithmetic owlry_migrate_balance already paid out server-side — so it must
    keep quoting the OLD quadratic (50L² + 50L − 100) rather than delegating to
    `cumulativeXp`. Re-pricing an ancient blob on the table above would hand a
    reader a different lifetime total than the ledger already granted them. */
export const legacyTotalXp = (lv: number, xp: number): number => {
  const l = Math.max(1, lv);
  return 50 * l * l + 50 * l - 100 + Math.max(0, xp);
};
