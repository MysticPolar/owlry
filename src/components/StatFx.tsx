import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useReduceMotion } from '../hooks/useReduceMotion';

/* ============================================================
   The numbers, moving.

   Every reward already funnels through the store's econ() choke
   point, which publishes what just changed as `statFx`. These two
   read that and give the change a body: a small figure that lifts
   off the chip it belongs to, and a pop on the seat when the row
   moves. Deltas only — the chips hold the totals themselves.

   Silent under reduced motion (OS or in-app): the number still
   changes, it just doesn't perform.
   ============================================================ */

type Stat = 'xp' | 'ink' | 'coins';

interface Floater {
  k: number;
  v: number;
}

/** the figure that lifts off a chip — "+4", "−5", "+25" */
export function StatDelta({ stat }: { stat: Stat }) {
  const fx = useStore((s) => s.statFx);
  const reduce = useReduceMotion();
  const [items, setItems] = useState<Floater[]>([]);
  const seen = useRef(0);

  useEffect(() => {
    if (!fx || reduce || fx.n === seen.current) return;
    seen.current = fx.n;
    const v = fx[stat];
    if (!v) return;
    setItems((xs) => [...xs, { k: fx.n, v }]);
    // the element outlives its animation by a hair, then leaves on its own
    const t = setTimeout(() => setItems((xs) => xs.filter((x) => x.k !== fx.n)), 1000);
    return () => clearTimeout(t);
  }, [fx, stat, reduce]);

  if (!items.length) return null;
  return (
    <>
      {items.map((it) => (
        <span key={it.k} className={`pb-fx ${stat}`} aria-hidden="true">
          {it.v > 0 ? '+' : '−'}
          {Math.abs(it.v)}
        </span>
      ))}
    </>
  );
}

/** true for a beat after the seat moves, so the chip can pop */
export function useLevelFlash(): boolean {
  const fx = useStore((s) => s.statFx);
  const reduce = useReduceMotion();
  const [on, setOn] = useState(false);
  const seen = useRef(0);

  useEffect(() => {
    if (!fx || reduce || fx.n === seen.current) return;
    seen.current = fx.n;
    if (!fx.lv) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 620);
    return () => clearTimeout(t);
  }, [fx, reduce]);

  return on;
}
