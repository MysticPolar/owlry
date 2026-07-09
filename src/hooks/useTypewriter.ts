import { useEffect, useRef, useState } from 'react';

/**
 * Reveals `total` characters over ~`durationMs`, the "typewriter" feel for the
 * reading letter as it's written. Returns how many characters are currently
 * shown, whether it's done, and a skip() to jump to the end (tap to skip).
 * Disabled (or prefers-reduced-motion) → everything shown immediately.
 */
export function useTypewriter(
  total: number,
  opts: { enabled?: boolean; durationMs?: number } = {},
): { shown: number; done: boolean; skip: () => void } {
  const { enabled = true, durationMs = 4500 } = opts;
  const reduce =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animate = enabled && !reduce && total > 0;

  const [shown, setShown] = useState(animate ? 0 : total);
  const skipRef = useRef(false);

  useEffect(() => {
    if (!animate) {
      setShown(total);
      return;
    }
    skipRef.current = false;
    setShown(0);
    const perTick = Math.max(6, Math.ceil(total / (durationMs / 16)));
    let cur = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (skipRef.current) return setShown(total);
      cur = Math.min(total, cur + perTick);
      setShown(cur);
      if (cur < total) timer = setTimeout(tick, 16);
    };
    timer = setTimeout(tick, 16);
    return () => clearTimeout(timer);
  }, [total, animate, durationMs]);

  return { shown, done: shown >= total, skip: () => { skipRef.current = true; setShown(total); } };
}
