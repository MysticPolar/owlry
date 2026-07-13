import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import type { IntroKey } from '../../store/types';

/* ============================================================
   First-use owl introductions — the shared card the owls pop up
   in the first time you trigger their thing (peek on the first
   letter, scribe on the first kept line, keeper on the first
   library visit; scout-pro on the office-hours desk). Ported
   1:1 from the standalone's `.pintro` card — the bouncy piPop
   owl, the em-aware typewriter, tap-to-complete-then-dismiss.
   ============================================================ */

interface Seg {
  t: string;
  em?: boolean;
}
interface CardDef {
  owl: string;
  variant?: 'pro';
  acc: string; // css var name
  eb: string;
  say: Seg[];
  btn: string;
}

const s = (t: string): Seg => ({ t });
const e = (t: string): Seg => ({ t, em: true });

const CARDS: Record<IntroKey, CardDef> = {
  peek: {
    owl: 'peek',
    acc: 'teal',
    eb: 'peek · the taster',
    say: [
      s("first taste? that's me — "),
      e('peek'),
      s('. i pull the pages that matter to '),
      e('you'),
      s(", so you never buy blind. this one's already sorted."),
    ],
    btn: 'open it',
  },
  scribe: {
    owl: 'scribe',
    acc: 'quill',
    eb: 'scribe · the rememberer',
    say: [
      s('ohh — you found me! '),
      e('scribe'),
      s(". every line you love, i keep forever. that one's already filed."),
    ],
    btn: 'carry on',
  },
  keeper: {
    owl: 'keeper',
    acc: 'moss',
    eb: 'keeper · the collector',
    say: [
      s('welcome to the shelves — '),
      e('keeper'),
      s(' here. everything you read, save, and finish lives with me. '),
      e('hoarded lovingly, counted twice.'),
    ],
    btn: 'to the shelves',
  },
  proscout: {
    owl: 'scout',
    variant: 'pro',
    acc: 'yellow',
    eb: 'scout pro · office hours',
    say: [
      s('level three — '),
      e('my office is open'),
      s(". the non-fiction desk is yours: bring the crossroads, the can't-decides, the questions with weight."),
    ],
    btn: 'good to know',
  },
  proscoutLocked: {
    owl: 'scout',
    variant: 'pro',
    acc: 'yellow',
    eb: 'scout pro · office hours',
    say: [
      s('that desk is '),
      e('my office'),
      s(' — the non-fiction shelf. bring a real problem and i research it properly: your context, the right book, the right chapter. '),
      e('opens at level three.'),
    ],
    btn: 'noted',
  },
};

/* flatten segments to chars, tag each with its em state */
function chars(say: Seg[]): { ch: string; em: boolean }[] {
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

function Card({ intro }: { intro: IntroKey }) {
  const dismiss = useStore((st) => st.dismissIntro);
  const def = CARDS[intro];
  const seq = useRef(chars(def.say)).current;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [n, setN] = useState(reduce ? seq.length : 0);
  const [on, setOn] = useState(false);
  const typing = n < seq.length;

  // trigger the entrance transition on next frame
  useEffect(() => {
    const r = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(r);
  }, []);

  // typewriter — starts a beat after the card lands (matches the standalone)
  useEffect(() => {
    if (reduce || n >= seq.length) return;
    const startDelay = n === 0 ? 260 : 0;
    const ch = seq[n]?.ch ?? '';
    const step = /[.,!?—…]/.test(ch) ? 160 : ch === ' ' ? 13 : 22;
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
        aria-label={def.eb}
        style={{ ['--acc' as string]: `var(--${def.acc})` }}
      >
        <svg className="owl pi-owl" viewBox="0 0 120 130" aria-hidden="true">
          <use href={`#owl-${def.owl}${def.variant === 'pro' ? '-pro' : ''}`} />
        </svg>
        <div className="pi-eb">{def.eb}</div>
        <div className="pi-say">
          <Typed seq={seq} n={n} />
          {typing && <span className="pi-cur" aria-hidden="true" />}
        </div>
        <button className="pi-btn" onClick={tap}>
          {def.btn}
        </button>
      </div>
    </div>
  );
}

export function IntroCard() {
  const intro = useStore((st) => st.introCard);
  if (!intro) return null;
  return <Card key={intro} intro={intro} />;
}
