import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';
import { chainsInner } from '../../lib/chains';
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
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  return (
    <section className={`mroom on${freed ? ' freed' : ''}`} aria-label={t.ariaRoom}>
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
      <div className="mr-lab">{t.lvOf(Math.min(lv, 5))}</div>
      <div className="mr-card">
        <div className="cap">{t.chartCap} · {freed ? t.chartYours : t.chartSealed}</div>
        <svg className="mr-radar" viewBox="0 0 300 244" role="img" aria-label={t.ariaRadar}>
          <polygon className="ringp" points="150,26 229.7,72 229.7,164 150,210 70.3,164 70.3,72" />
          <polygon className="ring" points="150,57 202.8,87.5 202.8,148.5 150,179 97.2,148.5 97.2,87.5" />
          <polygon className="ring" points="150,87 176.8,102.5 176.8,133.5 150,149 123.2,133.5 123.2,102.5" />
          <line className="axis" x1="150" y1="118" x2="150" y2="26" />
          <line className="axis" x1="150" y1="118" x2="229.7" y2="72" />
          <line className="axis" x1="150" y1="118" x2="229.7" y2="164" />
          <line className="axis" x1="150" y1="118" x2="150" y2="210" />
          <line className="axis" x1="150" y1="118" x2="70.3" y2="164" />
          <line className="axis" x1="150" y1="118" x2="70.3" y2="72" />
          <polygon className="shape" points="150,61 188.3,95.9 206.6,150.7 150,187.9 82.3,157.1 75.1,74.8" />
          <text className="lab" x="150" y="14" textAnchor="middle">{t.radar.health}</text>
          <text className="lab" x="238" y="66" textAnchor="start">{t.radar.wealth}</text>
          <text className="lab" x="240" y="176" textAnchor="start">{t.radar.relation}</text>
          <text className="lab" x="150" y="228" textAnchor="middle">{t.radar.career}</text>
          <text className="lab" x="62" y="176" textAnchor="end">{t.radar.mindset}</text>
          <text className="lab" x="62" y="66" textAnchor="end">{t.radar.fiction}</text>
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
