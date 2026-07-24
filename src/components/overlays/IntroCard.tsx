import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useOverlayPresence } from '../../hooks/useOverlayPresence';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import { useT } from '../../i18n/react';
import type { IntroSeg } from '../../i18n/dicts/today';
import type { IntroKey } from '../../store/types';

/* ============================================================
   First-use owl introductions — the shared card the owls pop up
   in the first time you trigger their thing (peek on the first
   letter, scribe on the first kept line, keeper on the first
   library visit; scout-pro on the office-hours desk). Ported
   1:1 from the standalone's `.pintro` card — the bouncy piPop
   owl, the em-aware typewriter, tap-to-complete-then-dismiss.
   The words (eb / say / btn) live in the i18n dict, namespace
   `today.intro`; only the art + accent stay here.
   ============================================================ */

interface CardArt {
  owl: string;
  variant?: 'pro';
  acc: string; // css var name
}

const CARDS: Record<IntroKey, CardArt> = {
  peek: { owl: 'peek', acc: 'teal' },
  scribe: { owl: 'scribe', acc: 'quill' },
  keeper: { owl: 'keeper', acc: 'moss' },
  proscout: { owl: 'scout', variant: 'pro', acc: 'yellow' },
  proscoutLocked: { owl: 'scout', variant: 'pro', acc: 'yellow' },
  // mirror is the quiet, mystical one — the reflection that has been watching
  // from behind the glass all along. one calm reveal; never a question.
  mirror: { owl: 'mirror', acc: 'violet' },
};

/* flatten segments to chars, tag each with its em state */
function chars(say: IntroSeg[]): { ch: string; em: boolean }[] {
  const out: { ch: string; em: boolean }[] = [];
  for (const seg of say) for (const ch of seg.t) out.push({ ch, em: !!seg.em });
  return out;
}

/** renders the typed prefix of `seq`, grouping em runs into <em> */
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

function Card({ intro, on }: { intro: IntroKey; on: boolean }) {
  const dismiss = useStore((st) => st.dismissIntro);
  const def = CARDS[intro];
  const txt = useT().today.intro[intro];
  const seq = useMemo(() => chars(txt.say), [txt]);
  const reduce = useReduceMotion();
  const [n, setN] = useState(reduce ? seq.length : 0);
  const typing = n < seq.length;

  // typewriter — starts a beat after the card lands (matches the standalone)
  useEffect(() => {
    if (reduce || n >= seq.length) return;
    const startDelay = n === 0 ? 260 : 0;
    const ch = seq[n]?.ch ?? '';
    const step = /[.,!?—…。，！？；：、]/.test(ch) ? 160 : ch === ' ' ? 13 : 22;
    const t = setTimeout(() => setN((x) => x + 1), n === 0 ? startDelay : step);
    return () => clearTimeout(t);
  }, [n, seq, reduce]);

  const tap = () => {
    if (typing) setN(seq.length); // first tap completes the line
    else dismiss(); // then dismisses (peek opens its letter)
  };

  return (
    <div className={`pintro${on ? ' on' : ''}`}>
      <div className="pintro-scrim" onClick={tap} />
      <div
        className="pintro-card"
        role="dialog"
        aria-modal="true"
        aria-label={txt.eb}
        style={{ ['--acc' as string]: `var(--${def.acc})` }}
      >
        <svg className="owl pi-owl" viewBox="0 0 120 130" aria-hidden="true">
          <use href={`#owl-${def.owl}${def.variant === 'pro' ? '-pro' : ''}`} />
        </svg>
        <div className="pi-eb">{txt.eb}</div>
        <div className="pi-say">
          <Typed seq={seq} n={n} />
          {typing && <span className="pi-cur" aria-hidden="true" />}
        </div>
        <button className="pi-btn" onClick={tap}>
          {txt.btn}
        </button>
      </div>
    </div>
  );
}

export function IntroCard() {
  const intro = useStore((st) => st.introCard);
  // timer-mode presence (the transitioned .pintro-card is a child, no ref):
  // the card now plays its reverse transitions out instead of blinking away
  const { mounted, shown } = useOverlayPresence(Boolean(intro), { duration: 420 });
  const held = useRef(intro);
  if (intro) held.current = intro;
  const key = intro ?? (mounted ? held.current : null);
  if (!mounted || !key) return null;
  return <Card key={key} intro={key} on={shown} />;
}
