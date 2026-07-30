import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { rowFromLevel, seatMovesAt } from '../lib/economy/curve';
import { Icon } from './Icon';

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

/** the receipt: Keeper on the left, the night's deltas after — numbers only.
    One line per econ() burst ("+60 ⚡ +25 🪙 −5 💧"), and on a level-up a gold
    stamp — ROW when the seat actually moved, LV when it didn't.
    No sentences; the deltas are the sentence. */
export function EconStrip() {
  const fx = useStore((s) => s.statFx);
  const lv = useStore((s) => s.lv);
  const reduce = useReduceMotion();
  const [shown, setShown] = useState<typeof fx>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!fx || reduce) return;
    setShown(fx);
    setOn(true);
    const t = setTimeout(() => setOn(false), 1600);
    // once the fade completes, leave no stale node behind
    const t2 = setTimeout(() => setShown(null), 1850);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [fx, reduce]);

  if (!shown) return null;
  const part = (v: number, cls: string, glyph: string) =>
    v !== 0 && (
      <span className={`d ${cls}`}>
        {v > 0 ? '+' : '−'}
        {Math.abs(v)}
        <Icon name={glyph} />
      </span>
    );
  return (
    <div className={`pb-econ ${on ? 'on' : ''}`} aria-hidden="true">
      {/* whichever owl's desk this happened at — scout finds, peek tastes,
          scribe remembers, keeper keeps the shelves */}
      <svg className="owl" viewBox="0 0 120 130" key={shown.n}>
        <use href={`#owl-${shown.owl}`} />
      </svg>
      {part(shown.xp, 'xp', 'ti-bolt')}
      {part(shown.coins, 'coins', 'ti-coin')}
      {part(shown.ink, 'ink', 'ti-inkdrop')}
      {shown.lv && (
        /* a seat only moves every third level — on the other two the stamp
           would name a row they were already sitting in, so it names the
           level instead. Numbers either way; no sentence to translate. */
        <span className="d row" key={`r${shown.n}`}>
          <Icon name="ti-crown" />
          {seatMovesAt(lv) ? `ROW ${rowFromLevel(lv)}` : `LV ${lv}`}
        </span>
      )}
    </div>
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
