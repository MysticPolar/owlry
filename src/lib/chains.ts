/* ============================================================
   Bundled chains — the sagging runs of tangent-following links
   (with a padlock) that wrap the profile pill and the sealed
   reader-chart until level 5. Ported 1:1 from the standalone's
   runLinks() / bundleSVG(). Returns the SVG inner content so the
   caller owns the <svg> element (and its .broken class).
   ============================================================ */

function runLinks(x0: number, y0: number, x1: number, y1: number, sag: number, rx: number): string {
  const L = Math.hypot(x1 - x0, y1 - y0) + Math.abs(sag) * 1.6;
  const n = Math.max(6, Math.round(L / (rx * 1.55)));
  const pt = (t: number): [number, number] => [
    x0 + (x1 - x0) * t,
    y0 + (y1 - y0) * t + sag * 4 * t * (1 - t),
  ];
  let out = '';
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const [cx, cy] = pt(t);
    const [ax, ay] = pt(Math.min(1, t + 0.04));
    const [bx, by] = pt(Math.max(0, t - 0.04));
    const ang = (Math.atan2(ay - by, ax - bx) * 180) / Math.PI + (i % 2 ? 90 : 0);
    out += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${rx}" ry="${(rx * 0.6).toFixed(1)}" transform="rotate(${ang.toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
  }
  return out;
}

/** the inner markup of a chain bundle (groups + padlock) for an <svg viewBox="0 0 w h"> */
export function chainsInner(
  w: number,
  h: number,
  rx: number,
  lockS: number,
  lockX: number,
  lockY: number,
): string {
  const back = runLinks(w * 0.14, -2, w * 0.86, h + 2, 0, rx * 0.82); // a loop passing behind
  const runA = runLinks(-3, h * 0.32, w + 3, h * 0.26, h * 0.34, rx); // main wrap, sagging
  const runB = runLinks(-3, h * 0.58, w + 3, h * 0.7, h * 0.26, rx); // second wrap
  const lock = `<g class="plock" transform="translate(${lockX} ${lockY}) rotate(-8)"><rect x="${-lockS * 0.5}" y="0" width="${lockS}" height="${lockS * 0.82}" rx="${lockS * 0.16}"/><path d="M${-lockS * 0.28},0 v-${lockS * 0.3} a${lockS * 0.28},${lockS * 0.28} 0 0 1 ${lockS * 0.56},0 v${lockS * 0.3}"/></g>`;
  return `<g class="shadowlinks" transform="translate(.8 1)">${back}${runA}${runB}</g><g class="cB">${back}</g><g class="cA">${runA}</g><g class="cB">${runB}</g>${lock}`;
}
