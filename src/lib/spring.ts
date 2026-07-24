/* ============================================================
   A tiny damped spring for gesture handoffs — no dependency.

   Apple-style parameters (Designing Fluid Interfaces):
   - damping: 1.0 = critically damped (no overshoot); < 1 bounces.
   - response: seconds to approach the target — NOT a duration;
     the settle time emerges from the physics.
   - velocity: the gesture's release velocity in units/second, so the
     animation continues at the finger's exact speed (no seam).

   Semi-implicit Euler on requestAnimationFrame; dt clamped so a
   background-throttled frame can't explode the integration.
   ============================================================ */
export function springTo(opts: {
  from: number;
  to: number;
  /** initial velocity in units/sec (e.g. px/s from the gesture) */
  velocity?: number;
  /** damping ratio: 1 = no overshoot (default), <1 = bouncy */
  damping?: number;
  /** responsiveness in seconds (Apple's "response"), default .3 */
  response?: number;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}): () => void {
  const { from, to, velocity = 0, damping = 1, response = 0.3, onUpdate, onComplete } = opts;
  const omega = (2 * Math.PI) / Math.max(0.05, response); // natural frequency
  const k = omega * omega; // stiffness (mass 1)
  const c = 2 * damping * omega; // damping coefficient

  let x = from;
  let v = velocity;
  let last = performance.now();
  let raf = 0;
  let done = false;

  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.064);
    last = now;
    const a = -k * (x - to) - c * v;
    v += a * dt;
    x += v * dt;
    if (Math.abs(x - to) < 0.5 && Math.abs(v) < 10) {
      done = true;
      onUpdate(to); // snap the last half-pixel
      onComplete?.();
      return;
    }
    onUpdate(x);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  return () => {
    if (!done) cancelAnimationFrame(raf);
    done = true;
  };
}
