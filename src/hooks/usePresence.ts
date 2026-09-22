import { useEffect, useState } from 'react';
import { useReduceMotion } from './useReduceMotion';

/**
 * Keeps something mounted for `ms` after `open` turns false, so it can play
 * an exit animation before it unmounts. `closing` is true during that window;
 * put the exit animation on it. Under "reduce motion" the window is zero.
 */
export function usePresence(open: boolean, ms: number): { mounted: boolean; closing: boolean } {
  const reduce = useReduceMotion();
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), reduce ? 0 : ms);
    return () => clearTimeout(t);
  }, [open, ms, reduce]);
  return { mounted, closing: mounted && !open };
}
