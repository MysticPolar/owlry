import { useEffect, type MutableRefObject, type RefObject } from 'react';
import { springTo } from '../lib/spring';

/* ============================================================
   Swipe-down-to-dismiss for a slide-up overlay — v2, fluid.

   Drag from the header (`grabRef`) and the card follows 1:1; past 130px it
   rubber-bands progressively. Release hands the gesture's velocity to a
   spring (no seam between finger and animation), and the commit decision is
   velocity-first, Apple-style:
     · flicking up cancels — even past the distance threshold;
     · flicking down commits — even before it;
     · otherwise momentum is projected forward and the projected resting
       point decides.
   A closing card can be re-grabbed mid-spring and resumes 1:1 from its live
   on-screen position. Only engages when the scroll body is at the top.
   Touch-only by design — pointer/mouse users have the button + Esc.
   No-op under reduced motion.
   ============================================================ */
export function usePullDismiss(opts: {
  enabled: boolean;
  onClose: () => void;
  cardRef: RefObject<HTMLElement | null>;
  grabRef: RefObject<HTMLElement | null>;
  scrollRef?: RefObject<HTMLElement | null>;
  reduce?: boolean;
  /** presence handshake: set before onClose so useOverlayPresence knows the
      card is already off-screen and unmounts next frame (no double exit) */
  dismissedRef?: MutableRefObject<boolean>;
}) {
  const { enabled, onClose, cardRef, grabRef, scrollRef, reduce, dismissedRef } = opts;

  useEffect(() => {
    if (!enabled || reduce) return;
    const grab = grabRef.current;
    const card = cardRef.current;
    if (!grab || !card) return;

    const THRESHOLD = 90; // px — the positional commit line (when velocity is ambiguous)
    const FLICK = 500; // px/s — a flick's velocity decides on its own
    const LINEAR = 130; // px of 1:1 travel before the rubber-band engages
    const RUBBER = 0.55; // rubber-band constant (Apple's sample-code value)

    let startY = 0;
    let dy = 0; // raw finger travel (pre-damping)
    let visual = 0; // on-screen offset actually applied
    let dragging = false;
    let cancelSpring: (() => void) | null = null;
    const samples: { y: number; t: number }[] = []; // ~100ms velocity window

    const dim = () => card.offsetHeight || 600;

    const rubber = (raw: number) => {
      if (raw <= LINEAR) return raw;
      const o = raw - LINEAR;
      const d = dim();
      return LINEAR + (o * d * RUBBER) / (d + RUBBER * o);
    };
    // inverse of rubber() past the linear zone — reseeds the raw dy on re-grab
    const unrubber = (vis: number) => {
      if (vis <= LINEAR) return vis;
      const v = vis - LINEAR;
      const d = dim();
      if (v >= d) return LINEAR + d * 4; // asymptote guard
      return LINEAR + (v * d) / (RUBBER * (d - v));
    };

    /** Apple's momentum projection (exponential decay, rate .998) */
    const project = (v: number) => ((v / 1000) * 0.998) / (1 - 0.998);

    const releaseVelocity = () => {
      const now = samples[samples.length - 1];
      // oldest sample still inside the 100ms window
      const first = samples.find((s) => now.t - s.t <= 100) ?? samples[0];
      if (!now || !first || now.t === first.t) return 0;
      return ((now.y - first.y) / (now.t - first.t)) * 1000; // px/s, + = down
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      if (cancelSpring) {
        // re-grab a card mid-spring: resume 1:1 from its live on-screen value
        cancelSpring();
        cancelSpring = null;
        const cur = new DOMMatrix(getComputedStyle(card).transform === 'none' ? '' : getComputedStyle(card).transform).m42;
        visual = Math.max(0, cur);
        dy = unrubber(visual);
        startY = e.touches[0].clientY - dy;
      } else {
        const sc = scrollRef?.current;
        if (sc && sc.scrollTop > 2) return; // let the body scroll first
        startY = e.touches[0].clientY;
        dy = 0;
        visual = 0;
      }
      samples.length = 0;
      samples.push({ y: e.touches[0].clientY, t: e.timeStamp });
      dragging = true;
      card.style.transition = 'none';
    };

    const onMove = (e: TouchEvent) => {
      if (!dragging) return;
      const y = e.touches[0].clientY;
      samples.push({ y, t: e.timeStamp });
      while (samples.length > 2 && e.timeStamp - samples[0].t > 100) samples.shift();
      dy = Math.max(0, y - startY); // upward clamped: a full-bleed panel has no headroom
      visual = rubber(dy);
      card.style.transform = visual > 0 ? `translateY(${visual}px)` : '';
    };

    const finish = () => {
      if (!dragging) return;
      dragging = false;
      const v = releaseVelocity();

      // velocity sign beats position; ambiguous velocity → momentum projection
      const commit =
        v <= -FLICK ? false : v >= FLICK ? true : visual + project(v) > THRESHOLD;

      if (commit) {
        cancelSpring = springTo({
          from: visual,
          to: dim(),
          velocity: v, // the animation continues at the finger's speed
          damping: 1,
          response: 0.3,
          onUpdate: (val) => {
            card.style.transform = `translateY(${val}px)`;
          },
          onComplete: () => {
            cancelSpring = null;
            if (dismissedRef) dismissedRef.current = true;
            onClose(); // presence unmounts next frame; cleanup clears styles
          },
        });
      } else {
        // spring back with the same velocity handoff (damping 1: an overshoot
        // past 0 would expose the panel's bottom seam)
        cancelSpring = springTo({
          from: visual,
          to: 0,
          velocity: v,
          damping: 1,
          response: 0.3,
          onUpdate: (val) => {
            card.style.transform = val > 0.5 ? `translateY(${val}px)` : '';
          },
          onComplete: () => {
            cancelSpring = null;
            card.style.transform = '';
            card.style.transition = '';
          },
        });
      }
    };

    grab.addEventListener('touchstart', onStart, { passive: true });
    grab.addEventListener('touchmove', onMove, { passive: true });
    grab.addEventListener('touchend', finish);
    grab.addEventListener('touchcancel', finish);
    return () => {
      grab.removeEventListener('touchstart', onStart);
      grab.removeEventListener('touchmove', onMove);
      grab.removeEventListener('touchend', finish);
      grab.removeEventListener('touchcancel', finish);
      if (cancelSpring) cancelSpring();
      card.style.transform = '';
      card.style.transition = '';
    };
  }, [enabled, onClose, cardRef, grabRef, scrollRef, reduce, dismissedRef]);
}
