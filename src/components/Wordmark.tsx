/* ============================================================
   The owlry logotype — Anton, converted to outlines.

   Anton ships a single weight with no variable axis, so it cannot respond
   to text scaling, and its tight sidebearings break below ~24px. It was
   only ever used for a fixed set of fixed strings. That is artwork, not
   type — so it lives here as paths and the webfont is gone.

   THIS IS THE ONLY PLACE THE WORDMARK EXISTS. Nothing else may reference
   Anton. The brass period is part of the mark (it used to be re-coloured
   by three separate CSS rules).

   Sizing is inherited, not configured: the viewBox wraps the real ink, so
   `height: 0.9814em` (see `.owl-wm` in playbill.css) renders
   identically to the Anton text it replaces. Drop it inside the element
   that already carries the font-size and every existing size/skew rule
   keeps working untouched. Width follows the aspect ratio (2.5889);
   the vertical-align offset seats the glyph baseline on the text baseline.

   The period colour comes from `--wm-dot` so the brass (Playbill) and
   yellow (onboarding) variants stay theme-driven.
   ============================================================ */

export function Wordmark({
  className = '',
  decorative = false,
}: {
  /** extra classes; the caller's own rule controls size/skew/colour */
  className?: string;
  /** true when an ancestor already labels the mark (avoids double announcement) */
  decorative?: boolean;
}) {
  return (
    <svg
      className={`owl-wm${className ? ' ' + className : ''}`}
      viewBox="60 -1760 5204 2010"
      {...(decorative
        ? { 'aria-hidden': true as const }
        : { role: 'img' as const, 'aria-label': 'owlry' })}
      focusable="false"
    >
      <path fill="currentColor" d="M508.0 16.0Q60.0 16.0 60.0 -449.0V-1051.0Q60.0 -1263.0 179.0 -1389.5Q298.0 -1516.0 508.0 -1516.0Q719.0 -1516.0 838.0 -1389.5Q957.0 -1263.0 957.0 -1051.0V-449.0Q957.0 16.0 508.0 16.0ZM508.0 -260.0Q553.0 -260.0 572.5 -292.5Q592.0 -325.0 592.0 -375.0V-1108.0Q592.0 -1239.0 508.0 -1239.0Q424.0 -1239.0 424.0 -1108.0V-375.0Q424.0 -325.0 443.5 -292.5Q463.0 -260.0 508.0 -260.0ZM1307.4 0.0 1126.4 -1500.0H1433.4L1532.4 -694.0L1619.4 -1500.0H1962.4L2065.4 -694.0L2148.4 -1500.0H2456.4L2273.4 0.0H1896.4L1788.4 -851.0L1694.4 0.0ZM2637.9 0.0V-1760.0H3001.9V0.0ZM3207.3 0.0V-1500.0H3571.3V-1333.0Q3597.3 -1420.0 3663.3 -1469.0Q3729.3 -1518.0 3829.3 -1518.0V-1219.0Q3785.3 -1219.0 3724.3 -1209.5Q3663.3 -1200.0 3617.3 -1183.5Q3571.3 -1167.0 3571.3 -1147.0V0.0ZM3949.8 250.0V23.0H4121.8Q4160.8 23.0 4160.8 -4.0Q4160.8 -18.0 4157.8 -33.0L3922.8 -1500.0H4265.8L4365.8 -396.0L4483.8 -1500.0H4828.8L4550.8 78.0Q4535.8 163.0 4493.3 206.5Q4450.8 250.0 4353.8 250.0Z" />
      <path className="owl-wm-dot" d="M4905.8 -1.0V-299.0H5263.8V-1.0Z" />
    </svg>
  );
}
