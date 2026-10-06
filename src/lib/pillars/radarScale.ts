/* ============================================================
   owlry — stepped radar scale for reading-balance.

   Absolute pillar scores (0–100) are drawn against a ceiling that
   steps up with the current peak, so early shelves fill the chart
   without hugging the outer ring, and growth stays readable.
   ============================================================ */

/** Outer-ring value for each scale step (backend radar caps at 100). */
export const RADAR_CEILINGS = [5, 10, 20, 35, 50, 75, 100] as const;

/**
 * Pick the drawing ceiling for a peak score.
 * Uses the smallest step strictly above the peak so the strongest
 * pillar sits inside the frame (headroom to grow) until 100.
 */
export function radarCeiling(peak: number): number {
  const p = Math.max(0, Number.isFinite(peak) ? peak : 0);
  if (p <= 0) return RADAR_CEILINGS[0];
  for (const c of RADAR_CEILINGS) {
    if (p < c) return c;
  }
  return RADAR_CEILINGS[RADAR_CEILINGS.length - 1];
}

/** Fraction of chart radius for an absolute score on the active ceiling. */
export function radarFraction(value: number, ceiling: number): number {
  if (ceiling <= 0 || value <= 0) return 0;
  return Math.min(1, value / ceiling);
}
