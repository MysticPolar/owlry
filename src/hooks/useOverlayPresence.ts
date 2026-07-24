import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react';

/* ============================================================
   Overlay presence — symmetric enter/exit for conditionally-
   rendered overlays.

   The overlays render `if (!open) return null`, which unmounts them the
   instant they close — their CSS exit transitions never play (enter animates,
   exit teleports). This hook keeps the component MOUNTED while the exit
   transition runs, driving the existing `.on` class both ways:

     const { mounted, shown, dismissedRef } = useOverlayPresence(open, { ref, duration });
     if (!mounted) return null;
     <div ref={ref} className={`overlay${shown ? ' on' : ''}`}>

   - open→true: mount, then flip `shown` inside a DOUBLE rAF so the closed-state
     styles commit first (otherwise the enter transition never plays — Safari
     coalesces a single rAF with the mount paint).
   - open→false: drop `shown` immediately (starts the CSS exit), then unmount:
     · dismissedRef set (a gesture already animated the card off) → next frame;
     · computed transitionDuration is 0 (reduced-motion resets) → ~50ms timer;
     · else `transitionend` on the container itself, with a duration+100ms
       fallback in case the event is swallowed (hidden tab, interruption).
   - open flips true again mid-exit: the unmount is cancelled and `shown`
     returns — the CSS transition reverses from its live value (interruptible).
   - No `ref` given → pure timer mode (for overlays whose transitioned element
     is a child, e.g. the intro card).
   ============================================================ */
export function useOverlayPresence(
  open: boolean,
  opts: { ref?: RefObject<HTMLElement | null>; duration?: number } = {},
): { mounted: boolean; shown: boolean; dismissedRef: MutableRefObject<boolean> } {
  const { ref, duration = 360 } = opts;
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const dismissedRef = useRef(false);
  const timers = useRef<{ raf: number[]; timer: number }>({ raf: [], timer: 0 });

  useEffect(() => {
    const t = timers.current;
    const clear = () => {
      t.raf.forEach((id) => cancelAnimationFrame(id));
      t.raf = [];
      window.clearTimeout(t.timer);
    };
    clear();

    if (open) {
      setMounted(true);
      // double rAF: the closed-state frame must paint before .on lands. rAF is
      // paused in hidden documents, so a timer fallback guarantees the overlay
      // still shows if it opens while the page isn't visible.
      const show = () => {
        clear();
        setShown(true);
      };
      t.raf.push(
        requestAnimationFrame(() => {
          t.raf.push(requestAnimationFrame(show));
        }),
      );
      t.timer = window.setTimeout(show, 120);
      return clear;
    }

    // closing — start the CSS exit, then unmount when it has played out
    setShown(false);
    const unmount = () => setMounted(false);

    if (dismissedRef.current) {
      // a gesture already animated the card off-screen — nothing left to show
      dismissedRef.current = false;
      t.raf.push(requestAnimationFrame(unmount));
      return clear;
    }

    const el = ref?.current;
    const transitionMs = el ? parseFloat(getComputedStyle(el).transitionDuration || '0') * 1000 : NaN;

    if (el && transitionMs > 0) {
      const onEnd = (e: TransitionEvent) => {
        if (e.target !== el) return;
        el.removeEventListener('transitionend', onEnd);
        unmount();
      };
      el.addEventListener('transitionend', onEnd);
      t.timer = window.setTimeout(() => {
        el.removeEventListener('transitionend', onEnd);
        unmount();
      }, duration + 100);
      return () => {
        el.removeEventListener('transitionend', onEnd);
        clear();
      };
    }

    // no element (timer mode) or transitions nuked (reduced motion): the
    // short timer is what unmounts the overlay at all — keep it snappy
    t.timer = window.setTimeout(unmount, el ? 50 : duration + 100);
    return clear;
  }, [open, ref, duration]);

  return { mounted, shown, dismissedRef };
}
