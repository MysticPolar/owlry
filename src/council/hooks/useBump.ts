import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A one-shot "bump" flag for an icon that just changed state (a bookmark
 * filling, a heart lighting up): true for `ms` after `bump()` is called.
 * Put the pop animation on it, so the icon moves when it is toggled and
 * not every time the screen mounts.
 */
export function useBump(ms = 380): [boolean, () => void] {
  const [on, setOn] = useState(false);
  const timer = useRef<number | null>(null);
  const bump = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setOn(false);
    // next frame, so a bump during a bump restarts the animation
    requestAnimationFrame(() => {
      setOn(true);
      timer.current = window.setTimeout(() => setOn(false), ms);
    });
  }, [ms]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return [on, bump];
}
