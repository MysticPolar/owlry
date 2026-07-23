import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

/* ============================================================
   Reduced motion — honours BOTH the OS setting and the in-app
   "reduce motion" preference, and reacts live when the OS flips
   mid-session (not only on the next re-render). The single source
   of truth for JS-driven animations (typewriters, curtains,
   confetti); CSS animations are handled by the media-query resets
   in global.css.
   ============================================================ */
export function useReduceMotion(): boolean {
  const pref = useStore((s) => s.prefs.reduceMotion);
  const [osReduce, setOsReduce] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setOsReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return pref || osReduce;
}
