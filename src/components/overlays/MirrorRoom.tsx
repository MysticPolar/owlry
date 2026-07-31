import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { chainsInner } from '../../lib/chains';
import { rowFromLevel } from '../../lib/economy/curve';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useModalFocus } from '../../hooks/useModalFocus';
import { useT } from '../../i18n/react';
import { Icon } from '../Icon';

/* ============================================================
   The locked room — where the profile pill leads until level 5.
   Mirror's tone, a level-of-5 stepper, and the reader chart kept
   sealed behind bundled chains. At level 5 the chains fall, the
   chart clears, and it hands off to the real profile. Ported from
   the standalone's `.mroom`. Mirror's lines live in the dict
   (settings.mirrorRoom), one segment array per mood.
   ============================================================ */

interface Seg {
  t: string;
  em?: boolean;
}

function chars(say: Seg[]): { ch: string; em: boolean }[] {
  const out: { ch: string; em: boolean }[] = [];
  for (const seg of say) for (const ch of seg.t) out.push({ ch, em: !!seg.em });
  return out;
}
function Typed({ seq, n }: { seq: { ch: string; em: boolean }[]; n: number }) {
  const nodes: React.ReactNode[] = [];
  let buf = '';
  let emOpen = false;
  const flush = (key: number) => {
    if (!buf) return;
    nodes.push(emOpen ? <em key={key}>{buf}</em> : buf);
    buf = '';
  };
  for (let k = 0; k < n && k < seq.length; k++) {
    if (seq[k].em !== emOpen) {
      flush(k);
      emOpen = seq[k].em;
    }
    buf += seq[k].ch;
  }
  flush(n);
  return <>{nodes}</>;
}

function Room({ freed }: { freed: boolean }) {
  const setTab = useStore((s) => s.setTab);
  const openSettings = useStore((s) => s.openSettings);
  const lv = useStore((s) => s.lv);
  const t = useT().settings.mirrorRoom;
  const reduce = useReduceMotion();
  const say = useMemo(() => chars(freed ? t.freedSay : t.lockedSay), [t, freed]);
  const [n, setN] = useState(reduce ? say.length : 0);

  useEffect(() => {
    if (reduce || n >= say.length) return;
    const startDelay = n === 0 ? 300 : 0;
    const ch = say[n]?.ch ?? '';
    const step = /[.,!?—…]/.test(ch) ? 160 : ch === ' ' ? 13 : 22;
    const t = setTimeout(() => setN((x) => x + 1), n === 0 ? startDelay : step);
    return () => clearTimeout(t);
  }, [n, say, reduce]);

  // once freed, the room hands off to the real profile after a beat
  useEffect(() => {
    if (!freed) return;
    const t = setTimeout(() => setTab('profile'), reduce ? 300 : 1900);
    return () => clearTimeout(t);
  }, [freed, setTab, reduce]);

  const diamonds = [0, 1, 2, 3, 4];
  const roomRef = useRef<HTMLElement>(null);
  // a level-lock takeover — focus moves in and stays until it's earned away
  // (no Esc; the only way out is the gear or levelling up)
  useModalFocus(true, null, roomRef);

  return (
    <section
      className={`mroom on${freed ? ' freed' : ''}`}
      aria-label={t.ariaRoom}
      role="dialog"
      aria-modal="true"
      ref={roomRef}
      tabIndex={-1}
    >
      <button className="iconbtn lite mr-gear" aria-label={t.ariaSettings} onClick={openSettings}>
        <Icon name="ti-settings" />
      </button>
      <div className="mr-eb">{t.eyebrow} · {freed ? t.stateOpen : t.stateLocked}</div>
      <svg className="owl mr-owl" viewBox="0 0 120 130" aria-hidden="true">
        <use href="#owl-mirror" />
      </svg>
      <div className="mr-say">
        <Typed seq={say} n={n} />
        {n < say.length && <span className="mr-cur" aria-hidden="true" />}
      </div>
      <div className="mr-lvrow" aria-hidden="true">
        {diamonds.map((i) => (
          <span key={i} className={`mr-dia${i === 4 ? ' goal' : ''}${i < lv ? ' on' : ''}`} />
        ))}
      </div>
      {/* the stepper fills as the level climbs; the label names the seat, which
          counts the other way — rows are numbered from the stage (row = 14 − LV) */}
      <div className="mr-lab">{t.rowOf(rowFromLevel(lv), rowFromLevel(5))}</div>
      <div className="mr-card">
        <div className="cap">{t.chartCap} · {freed ? t.chartYours : t.chartSealed}</div>
        <svg className="mr-radar" viewBox="0 0 300 244" role="img" aria-label={t.ariaRadar}>
          {/* decorative pentagon — five life pillars */}
          <polygon className="ringp" points="150,30 237.5,94 204.1,196 95.9,196 62.5,94" />
          <polygon className="ring" points="150,61 208.5,104 186.1,172 113.9,172 91.5,104" />
          <polygon className="ring" points="150,91 179.5,114 166.1,148 133.9,148 120.5,114" />
          <line className="axis" x1="150" y1="122" x2="150" y2="30" />
          <line className="axis" x1="150" y1="122" x2="237.5" y2="94" />
          <line className="axis" x1="150" y1="122" x2="204.1" y2="196" />
          <line className="axis" x1="150" y1="122" x2="95.9" y2="196" />
          <line className="axis" x1="150" y1="122" x2="62.5" y2="94" />
          <polygon className="shape" points="150,55 210,100 190,170 110,170 90,100" />
          <text className="lab" x="150" y="16" textAnchor="middle">{t.radar.health}</text>
          <text className="lab" x="248" y="90" textAnchor="start">{t.radar.wealth}</text>
          <text className="lab" x="220" y="214" textAnchor="middle">{t.radar.love}</text>
          <text className="lab" x="80" y="214" textAnchor="middle">{t.radar.happiness}</text>
          <text className="lab" x="52" y="90" textAnchor="end">{t.radar.wonder}</text>
        </svg>
        <svg
          className={`card-chains${freed ? ' broken' : ''}`}
          viewBox="0 0 280 200"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: chainsInner(280, 200, 6.4, 26, 76, 138) }}
        />
      </div>
    </section>
  );
}

export function MirrorRoom() {
  const open = useStore((s) => s.mirrorRoomOpen);
  const lv = useStore((s) => s.lv);
  if (!open) return null;
  return <Room key={lv >= 5 ? 'freed' : 'locked'} freed={lv >= 5} />;
}
