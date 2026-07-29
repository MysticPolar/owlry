/* ============================================================
   owlry — the seat map (docs/gamification-design.md §4).

   Levels are seats. The house has thirteen rows, numbered from the
   stage: row = 14 − LV. LV1 is row 13 — the back row, so "everyone
   starts in the back row" is literally true — and LV7 is row 7 from
   the front, exactly as the story bible has it. LV13 is the front
   row and the cap; past it, every 1,000 XP stamps an encore star.

   These are the SAME formulas as owlry_cumulative_xp /
   owlry_level_for_xp in Postgres. Keep them in step.
   ============================================================ */

/** the house has thirteen rows; LV13 is the front row and the cap */
export const ROWS = 13;
export const LV_CAP = ROWS;
/** one encore star per this much XP past the front row */
export const ENCORE_STEP = 1000;

/** XP needed to *reach* level L: L2=200, L3=500, L5=1400, L13=9000 */
export const cumulativeXp = (lv: number): number => 50 * lv * lv + 50 * lv - 100;

/** the level a lifetime XP total buys (1-indexed, uncapped — display clamps) */
export const levelForXp = (total: number): number =>
  Math.max(1, Math.floor((-50 + Math.sqrt(2500 + 200 * (100 + Math.max(0, total)))) / 100));

/** XP banked inside the current level (what the bar fills with) */
export const xpIntoLevel = (total: number): number =>
  Math.max(0, total) - cumulativeXp(levelForXp(total));

/** XP the current level costs end to end (what the bar's width means) */
export const xpForNext = (total: number): number => {
  const lv = levelForXp(total);
  return cumulativeXp(lv + 1) - cumulativeXp(lv);
};

/** the seat: row 13 (back) at LV1 … row 1 (front) at LV13 and beyond */
export const rowFromLevel = (lv: number): number => Math.max(1, ROWS + 1 - Math.min(lv, LV_CAP));

/** encore stars: the reading goes on after the seat stops moving */
export const encoreStars = (total: number): number =>
  total > cumulativeXp(LV_CAP) ? Math.floor((total - cumulativeXp(LV_CAP)) / ENCORE_STEP) : 0;

/** progress toward the next encore star, 0..1 (only meaningful past LV13) */
export const encoreProgress = (total: number): number => {
  const past = total - cumulativeXp(LV_CAP);
  return past <= 0 ? 0 : (past % ENCORE_STEP) / ENCORE_STEP;
};

/** the old client curve was a flat 400/level; convert an old (lv, xp) to lifetime XP */
export const legacyTotalXp = (lv: number, xp: number): number =>
  cumulativeXp(Math.max(1, lv)) + Math.max(0, xp);
