import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../store/useAuth';
import { Icon } from '../Icon';
import { type CastOwlName } from '../CastOwl';
import { CurtainCloth, type CurtainHandle } from './CurtainCloth';
import { Confetti, type ConfettiHandle } from './Confetti';
import { BOOKS } from '../../content/books';
import type { BookRef } from '../../content/types';

/* ============================================================
   OPENING NIGHT — the full five-act arrival.
   1 · landing  — curtain rises on the marquee + the five owls
   2 · playbill — five swipe slides, one owl each
   3 · the door — invite/login (Auth), then "Dear ___," the name
   4 · the curtain — read better, at owlry.  → raise → enter
   5 · the flight — scout's origin story, the first ask, the ink
       drop, the level-up + welcome bundle → land at the desk.
   Replayable from settings (skips the door + name).
   ============================================================ */

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Slide {
  owl: CastOwlName;
  job: string;
  rot: number;
  head: ReactNode;
  body: ReactNode;
}

const SLIDES: Slide[] = [
  {
    owl: 'scout',
    job: 'the finder',
    rot: -5,
    head: (
      <>
        the right book finds you<span className="dot">.</span>
      </>
    ),
    body: (
      <>
        tell scout what&rsquo;s going on — a problem, a mood, a rainy sunday.{' '}
        <em>she always brings back one too many.</em>
      </>
    ),
  },
  {
    owl: 'peek',
    job: 'the taster',
    rot: 0,
    head: (
      <>
        taste before you commit<span className="dot">.</span>
      </>
    ),
    body: (
      <>
        a peek opens the right chapter first — the pages that matter to <em>you</em>.{' '}
        <em>peek has never finished a book. that&rsquo;s the point.</em>
      </>
    ),
  },
  {
    owl: 'scribe',
    job: 'the rememberer',
    rot: 4,
    head: (
      <>
        never lose a line<span className="dot">.</span>
      </>
    ),
    body: (
      <>
        keep a line once — scribe files it forever, word for word. <em>page 118 is not page 117.</em>
      </>
    ),
  },
  {
    owl: 'keeper',
    job: 'the collector',
    rot: 0,
    head: (
      <>
        your shelf remembers<span className="dot">.</span>
      </>
    ),
    body: (
      <>
        every book, every streak, your whole reading life — <em>shelved lovingly, counted twice.</em>
      </>
    ),
  },
  {
    owl: 'mirror',
    job: 'the reflection',
    rot: 3,
    head: (
      <>
        meet your reading self<span className="dot">.</span>
      </>
    ),
    body: (
      <>
        mirror charts your reading identity, and it levels as you read. <em>six shelves of you.</em>
      </>
    ),
  },
];

const OWL_ACCENT: Record<CastOwlName, string> = {
  scout: 'ember',
  peek: 'teal',
  scribe: 'quill',
  keeper: 'moss',
  mirror: 'violet',
};

/* ---------- act 1a · the splash (day / matinée) ---------- */
function Splash({ onEnter }: { onEnter: () => void }) {
  useEffect(() => {
    const t = setTimeout(onEnter, reduced() ? 350 : 1700);
    return () => clearTimeout(t);
  }, [onEnter]);
  return (
    <button className="ob-splash" onClick={onEnter} aria-label="Owlry — a wakeup! human production">
      <div className="ob-sp-mark d">
        owlry<span className="gdot">.</span>
      </div>
      <div className="ob-sp-sub">a wakeup! human production</div>
    </button>
  );
}

/* ---------- act 2 · the playbill deck ---------- */
function Playbill({ onDone }: { onDone: () => void }) {
  const deckRef = useRef<HTMLDivElement>(null);
  const ghostRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [live, setLive] = useState<boolean[]>(() => SLIDES.map((_, i) => i === 0));
  const last = current === SLIDES.length - 1;

  const goTo = (i: number) => {
    const deck = deckRef.current;
    if (!deck) return;
    deck.scrollTo({ left: i * deck.clientWidth, behavior: reduced() ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;
    const slides = Array.from(deck.querySelectorAll('.ob-slide'));
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          const i = slides.indexOf(e.target);
          if (i < 0) return;
          if (e.intersectionRatio >= 0.6) {
            setLive((l) => (l[i] ? l : l.map((v, k) => (k === i ? true : v))));
            setCurrent(i);
          } else if (e.intersectionRatio <= 0.15) {
            setLive((l) => (l[i] ? l.map((v, k) => (k === i ? false : v)) : l));
          }
        }),
      { root: deck, threshold: [0.15, 0.6] },
    );
    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const raf = useRef<number | null>(null);
  const onScroll = () => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      const deck = deckRef.current;
      if (deck) {
        const w = deck.clientWidth;
        const x = deck.scrollLeft;
        ghostRefs.current.forEach((g, i) => {
          if (g) g.style.transform = `translate(calc(-50% + ${(i * w - x) * -0.16}px), -50%)`;
        });
      }
      raf.current = null;
    });
  };

  const drag = useRef<{ x: number; left: number } | null>(null);
  const endDrag = () => {
    const deck = deckRef.current;
    if (!drag.current || !deck) return;
    drag.current = null;
    deck.classList.remove('dragging');
    deck.style.scrollSnapType = '';
    goTo(Math.max(0, Math.min(SLIDES.length - 1, Math.round(deck.scrollLeft / deck.clientWidth))));
  };

  return (
    <div className="ob-playbill">
      <div className="ob-topbar">
        <span className="ob-mark d">
          owlry<span className="gdot">.</span>
        </span>
        <button className="ob-skip" onClick={onDone}>
          skip
        </button>
      </div>

      <div
        className="ob-deck"
        ref={deckRef}
        tabIndex={0}
        aria-label="Meet the cast — swipe through five owls"
        onScroll={onScroll}
        onPointerDown={(e) => {
          const deck = deckRef.current;
          if (e.pointerType !== 'mouse' || !deck) return;
          drag.current = { x: e.clientX, left: deck.scrollLeft };
          deck.classList.add('dragging');
          deck.style.scrollSnapType = 'none';
          deck.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const deck = deckRef.current;
          if (!drag.current || !deck) return;
          deck.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') goTo(Math.min(current + 1, SLIDES.length - 1));
          if (e.key === 'ArrowLeft') goTo(Math.max(current - 1, 0));
        }}
      >
        {SLIDES.map((s, i) => (
          <section
            key={s.owl}
            className={`ob-slide${live[i] ? ' live' : ''}`}
            data-owl={s.owl}
            aria-label={`${i + 1} of ${SLIDES.length} — ${s.owl}`}
          >
            <span
              className="ob-ghost"
              aria-hidden="true"
              ref={(el) => {
                ghostRefs.current[i] = el;
              }}
            >
              {s.owl}
            </span>
            <div className="ob-shead">
              <span className="ob-num d">{String(i + 1).padStart(2, '0')}</span>
              <span className="ob-oname">
                {s.owl} · {s.job}
              </span>
            </div>
            <div className="ob-perch" style={{ '--rot': `${s.rot}deg` } as CSSProperties}>
              <svg className="owl big" viewBox="0 0 120 130" aria-hidden="true">
                <use href={`#owl-${s.owl}`} />
              </svg>
            </div>
            <h2 className="ob-val d">{s.head}</h2>
            <p className="ob-body">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="ob-botbar">
        <div className="ob-dots" role="tablist" aria-label="Slides">
          {SLIDES.map((s, i) => (
            <button
              key={s.owl}
              role="tab"
              aria-selected={i === current}
              aria-label={`Go to slide ${i + 1} — ${s.owl}`}
              className={`ob-dot${i === current ? ' on' : ''}`}
              style={{ '--dc': `var(--${OWL_ACCENT[s.owl]})` } as CSSProperties}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <button
          className={`ob-next${last ? ' last' : ''}`}
          aria-label={last ? 'Enter the owlery' : 'Next'}
          onClick={() => (last ? onDone() : goTo(current + 1))}
        >
          <span className="lbl">enter the owlery</span>
          <Icon name="ti-arrow-right" />
        </button>
      </div>
    </div>
  );
}

/* ---------- act 3b · the name (against the closed velvet, eyes watching) ---------- */
function NamePlaque({ onDone, clothRef }: { onDone: () => void; clothRef: React.RefObject<CurtainHandle> }) {
  const setPref = useStore((s) => s.setPref);
  const [name, setName] = useState('');
  const [sealed, setSealed] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 320);
    return () => clearTimeout(t);
  }, []);
  const clean = name.replace(/\s+/g, ' ').trimStart();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = clean.trim();
    if (!n) {
      ref.current?.focus();
      return;
    }
    setPref('name', n.slice(0, 18));
    setSealed(true);
    // sparks off the button, in the curtain's coordinate space
    const btn = btnRef.current;
    const gate = btn?.closest('.ob-gate');
    if (btn && gate && clothRef.current) {
      const r = btn.getBoundingClientRect();
      const a = gate.getBoundingClientRect();
      clothRef.current.burst(r.left - a.left + r.width / 2, r.top - a.top + 4, 26);
    }
    setTimeout(onDone, reduced() ? 200 : 1200);
  };
  return (
    <div className="ob-plaque">
      <div className="ob-crest d">
        owlry<span className="gdot">.</span>
      </div>
      <p className="ob-qline">how should the owls address you?</p>
      <div className="ob-dear">
        <em>Dear</em> <span className="ob-dearname">{clean}</span>
        {!sealed && <span className="ob-cur" />}
        {clean && ','}
      </div>
      <form onSubmit={submit}>
        <input
          ref={ref}
          className="ob-namein"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="your name"
          maxLength={18}
          autoComplete="given-name"
          spellCheck={false}
          aria-label="Your name"
          disabled={sealed}
        />
        <button className="gbtn" type="submit" ref={btnRef} disabled={sealed}>
          {sealed ? `sealed for ${clean}` : "that’s me"}
        </button>
      </form>
      <p className="ob-dearnote">every letter you receive opens this way</p>
    </div>
  );
}

/* ---------- act 4 · the curtain rises (canvas cloth) ---------- */
function CurtainReveal({ onEnter }: { onEnter: () => void }) {
  const [open, setOpen] = useState(false);
  const [entering, setEntering] = useState(false);
  const clothRef = useRef<CurtainHandle>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const GROUND: CastOwlName[] = ['scout', 'keeper', 'mirror', 'scribe'];

  const enter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (entering) return;
    setEntering(true);
    const btn = e.currentTarget;
    const root = rootRef.current;
    if (btn && root && clothRef.current) {
      const r = btn.getBoundingClientRect();
      const a = root.getBoundingClientRect();
      clothRef.current.burst(r.left - a.left + r.width / 2, r.top - a.top + 6, 30);
    }
    setTimeout(onEnter, reduced() ? 200 : 950);
  };

  return (
    <div className={`ob-reveal${open ? ' open' : ''}`} ref={rootRef}>
      {/* the velvet cloth, spring physics + eyes + beam + dust — parts to reveal the house */}
      <CurtainCloth ref={clothRef} motes={88} autoRaiseMs={reduced() ? 700 : 2600} onRaise={() => setOpen(true)} />

      {/* the house behind the cloth, revealed as it parts */}
      <div className="ob-bill">
        <p className="ob-kick">tonight &amp; every night</p>
        <h1 className="ob-marq">
          <span>read</span>
          <span>better</span>
        </h1>
        <div className="ob-at">
          <em>at</em> owlry<span className="gdot">.</span>
        </div>
      </div>
      <div className="ob-ground" aria-hidden="true">
        {GROUND.map((o) => (
          <svg key={o} className={`owl o-${o}`} viewBox="0 0 120 130">
            <use href={`#owl-${o}`} />
          </svg>
        ))}
      </div>
      <div className="ob-seatrow">
        <button className="btn ob-seatbtn" onClick={enter}>
          enter <Icon name="ti-arrow-right" />
        </button>
      </div>

      {/* peek dangles on a rope, and the pelmet — both in front of the cloth */}
      <div className="ob-rope" aria-hidden="true">
        <span className="ob-rope-line" />
        <svg className="owl o-peek" viewBox="0 0 120 130">
          <use href="#owl-peek" />
        </svg>
      </div>
      <div className="ob-valance" aria-hidden="true" />

      {/* the closed-curtain invitation + tap target; fades out as it rises */}
      <button
        className="ob-house"
        onClick={() => clothRef.current?.raise()}
        aria-label="Raise the curtain"
        aria-hidden={open}
      >
        <span className="ob-house-txt">
          <span className="ob-house-mark d">
            owlry<span className="gdot">.</span>
          </span>
          <span className="ob-house-show">the evening show</span>
          <span className="ob-house-seat">now seating — tap to raise the curtain</span>
        </span>
      </button>
    </div>
  );
}

/* ---------- act 5 · scout's first flight ---------- */
interface Ask {
  k: string;
  label: string;
  guide: BookRef;
  why: string; // peek's note — why this book, for this ask
}
const ASKS: Ask[] = [
  {
    k: 'focus',
    label: "can't focus lately",
    guide: 'deep',
    why: "you said you can't hold a thought lately. this one argues your attention is a muscle the world keeps poking — and shows how to guard it.",
  },
  {
    k: 'habit',
    label: 'new manager, no manual',
    guide: 'atomic',
    why: "new role, no handbook — so build the systems that do the managing. clear's case: you don't rise to your goals, you fall to your habits.",
  },
  {
    k: 'heart',
    label: 'heartbreak',
    guide: 'pema',
    why: "heartbreak. this one won't rush you past it — pema's advice is to stop running and let the ground be gone a while. gentler than it sounds.",
  },
  {
    k: 'rest',
    label: 'rainy sunday',
    guide: 'wws',
    why: 'a rainy sunday earns a slow read. walker on why the sleeping third of your life quietly runs the waking two — and how to get it back.',
  },
  {
    k: 'decide',
    label: 'before a big decision',
    guide: 'frankl',
    why: "before a big decision, the biggest question: what's it for? frankl found the one thing that survives when everything else is taken.",
  },
];

interface Step {
  text: string;
  node: ReactNode;
  fx?: 'ink' | 'level';
  last?: boolean;
}
const buildSteps = (name: string): Step[] => [
  { text: `dear ${name} — you made it in.`, node: <>dear <em>{name}</em> — you made it in.</> },
  {
    text: `this hall was a theatre once. red curtains, full houses.`,
    node: <>this hall was a theatre once. red curtains, full houses.</>,
  },
  {
    text: `now it's a mailroom — owls, carrying the right words to readers all over the world.`,
    node: <>now it&rsquo;s a mailroom — owls, carrying the right words to readers all over the world.</>,
  },
  { text: `you'll want to know two things.`, node: <>you&rsquo;ll want to know two things.</> },
  {
    text: `we write with ink. every ask, every peek costs a drop. here — one drop, on me.`,
    node: (
      <>
        we write with <em>ink</em>. every ask, every peek costs a drop. here — one drop, on me.
      </>
    ),
    fx: 'ink',
  },
  {
    text: `and you? you grow. every ask, every page — level up, and more of the owlery opens.`,
    node: (
      <>
        and you? you grow. every ask, every page — <em>level up</em>, and more of the owlery opens.
      </>
    ),
    fx: 'level',
  },
  { text: `right — your turn. what's going on?`, node: <>right — your turn. what&rsquo;s going on?</>, last: true },
];

function Typed({ step, revealKey, onDone }: { step: Step; revealKey: number; onDone: () => void }) {
  const [n, setN] = useState(0);
  const doneRef = useRef(false);
  // revealKey bumps when the reader taps to finish the line early
  useEffect(() => {
    if (revealKey > 0) setN(step.text.length);
  }, [revealKey, step.text.length]);
  useEffect(() => {
    doneRef.current = false;
    setN(reduced() ? step.text.length : 0);
  }, [step]);
  useEffect(() => {
    if (n >= step.text.length) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
      return;
    }
    const ch = step.text[n];
    const d = /[.,!?—…]/.test(ch) ? 150 : ch === ' ' ? 14 : 22;
    const t = setTimeout(() => setN((x) => x + 1), d);
    return () => clearTimeout(t);
  }, [n, step, onDone]);
  const full = n >= step.text.length;
  return (
    <>
      {full ? step.node : step.text.slice(0, n)}
      {!full && <span className="ob-tcur" aria-hidden="true" />}
    </>
  );
}

function Flight({ name, onFinish }: { name: string; onFinish: (ask: Ask) => void }) {
  const steps = useRef(buildSteps(name || 'friend')).current;
  const [step, setStep] = useState(0);
  const [reveal, setReveal] = useState(0); // bump → finish the current line early
  const [typed, setTyped] = useState(false);
  const [inkOn, setInkOn] = useState(false);
  const [lvOn, setLvOn] = useState(false);
  const [ink, setInk] = useState(0);
  const [lv, setLv] = useState(1);
  const [xp, setXp] = useState(0); // 0..100
  const [mode, setMode] = useState<'story' | 'delivering' | 'done'>('story');
  const [picked, setPicked] = useState<Ask | null>(null);
  const [line, setLine] = useState<ReactNode>(null); // overrides step text during the ask
  const [stamp, setStamp] = useState(false);
  const [banner, setBanner] = useState<0 | 1 | 2>(0);
  const [scoutDash, setScoutDash] = useState(false); // scout dashes off to the shelves
  const [hopN, setHopN] = useState(0); // bump → scout hops (svg remounts, replays obHop)

  const flightRef = useRef<HTMLDivElement>(null);
  const inkHudRef = useRef<HTMLDivElement>(null);
  const lvHudRef = useRef<HTMLDivElement>(null);
  const letterRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLSpanElement>(null);
  const xpflyRef = useRef<HTMLSpanElement>(null);
  const confettiRef = useRef<ConfettiHandle>(null);

  const s = steps[step];
  const onLast = step === steps.length - 1;

  const runFx = (fx?: 'ink' | 'level') => {
    if (fx === 'ink') {
      setInkOn(true);
      setTimeout(() => setInk(1), reduced() ? 1 : 500);
    } else if (fx === 'level') {
      setLvOn(true);
    }
  };

  const tap = () => {
    if (mode !== 'story') return;
    if (!typed) {
      setReveal((r) => r + 1); // finish the line
      return;
    }
    if (onLast) return; // last line shows chips; wait for a pick
    const next = step + 1;
    setStep(next);
    setTyped(false);
    runFx(steps[next].fx);
  };

  const pick = (ask: Ask) => {
    if (mode !== 'story') return;
    setPicked(ask);
    setMode('delivering');
    setLine(
      <>
        <em>{ask.label}</em> — say no more.
      </>,
    );
    // the ink spends itself: a drop leaves the vial and arcs down (WAAPI, 1:1)
    const drop = dropRef.current;
    const hud = inkHudRef.current;
    const cont = flightRef.current;
    if (drop && hud && cont && !reduced()) {
      const h = hud.getBoundingClientRect();
      const a = cont.getBoundingClientRect();
      drop.style.display = 'block';
      drop.style.left = `${h.left - a.left + h.width / 2}px`;
      drop.style.top = `${h.top - a.top + h.height}px`;
      const anim = drop.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: 'translate(-70px,180px) scale(1.25)', opacity: 1, offset: 0.7 },
          { transform: 'translate(-90px,260px) scale(.4)', opacity: 0 },
        ],
        { duration: 800, easing: 'cubic-bezier(.4,0,.7,1)' },
      );
      anim.onfinish = () => {
        drop.style.display = 'none';
      };
    }
    setTimeout(() => setInk(0), reduced() ? 1 : 650);
    // scout dashes off to the shelves…
    setTimeout(() => {
      setLine(<em>…off to the shelves…</em>);
      setScoutDash(true);
    }, reduced() ? 1 : 1050);
    // …then hops back, and the letter lands + the celebration begins
    setTimeout(
      () => {
        setScoutDash(false);
        setHopN((n) => n + 1);
        setMode('done');
      },
      reduced() ? 60 : 2100,
    );
  };

  // the one celebration timeline, once the letter has landed
  useEffect(() => {
    if (mode !== 'done') return;
    const R = reduced();
    // 1 · the stamp slams + a confetti burst at the stamp corner
    const t1 = setTimeout(() => {
      setStamp(true);
      const L = letterRef.current;
      const cont = flightRef.current;
      if (L && cont) {
        const lr = L.getBoundingClientRect();
        const a = cont.getBoundingClientRect();
        confettiRef.current?.burst(lr.left - a.left + lr.width - 30, lr.top - a.top + 20, 34, true);
      }
    }, R ? 1 : 250);
    // 2 · xp flies from the letter to the level bar, then fills it
    const t2 = setTimeout(() => {
      const f = xpflyRef.current;
      const lvh = lvHudRef.current;
      const L = letterRef.current;
      const cont = flightRef.current;
      if (f && lvh && L && cont && !R) {
        const lr = L.getBoundingClientRect();
        const hr = lvh.getBoundingClientRect();
        const a = cont.getBoundingClientRect();
        const cx = lr.left - a.left + lr.width / 2;
        const cy = lr.top - a.top + 20;
        f.style.display = 'block';
        f.style.left = `${cx}px`;
        f.style.top = `${cy + 30}px`;
        const dx = hr.left - a.left + hr.width / 2 - cx;
        const dy = hr.top - a.top + hr.height / 2 - (cy + 30);
        const anim = f.animate(
          [
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
            { transform: `translate(${dx}px,${dy}px) scale(.55)`, opacity: 0.2 },
          ],
          { duration: 750, easing: 'cubic-bezier(.3,0,.6,1)' },
        );
        anim.onfinish = () => {
          f.style.display = 'none';
          setXp(96);
        };
      } else {
        setXp(96);
      }
    }, R ? 10 : 650);
    // 3 · level up — the banner drops (stage 1) + a burst on it
    const t3 = setTimeout(() => {
      setLv(2);
      setXp(14);
      setBanner(1);
      setTimeout(() => {
        const banner = document.querySelector('.ob-banner');
        const cont = flightRef.current;
        if (banner && cont) {
          const br = banner.getBoundingClientRect();
          const a = cont.getBoundingClientRect();
          confettiRef.current?.burst(br.left - a.left + br.width / 2, br.top - a.top + 40, 26, true);
        }
      }, 60);
    }, R ? 20 : 2050);
    // 4 · the welcome bundle joins (stage 2) — ink rains in
    const t4 = setTimeout(() => {
      setBanner(2);
      let k = 0;
      const iv = setInterval(() => {
        k += 1;
        setInk(k);
        if (k >= 10) clearInterval(iv);
      }, R ? 1 : 90);
    }, R ? 30 : 3150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [mode]);

  const skip = () => {
    setStep(steps.length - 1);
    setTyped(true);
    setInkOn(true);
    setLvOn(true);
    setInk(1);
  };

  return (
    <div className={`ob-flight${mode === 'done' ? ' celebrating' : ''}`} ref={flightRef}>
      <div className="ob-glow" aria-hidden="true" />
      <span className="ob-drop" ref={dropRef} aria-hidden="true">
        <Icon name="ti-inkdrop" />
      </span>
      <span className="ob-xpfly" ref={xpflyRef} aria-hidden="true">
        +20 xp
      </span>
      <Confetti ref={confettiRef} />


      {/* the two HUDs — ink (right) and level (left) */}
      <div className={`ob-hud ob-lvhud${lvOn ? ' on' : ''}${banner ? ' flash' : ''}`} aria-label="Level" ref={lvHudRef}>
        <span className="ob-lv d">lv {lv}</span>
        <span className="ob-track">
          <span className="ob-fill" style={{ width: `${xp}%` }} />
        </span>
      </div>
      <div
        className={`ob-hud ob-inkhud${inkOn ? ' on' : ''}${ink === 0 && inkOn ? ' empty' : ''}`}
        aria-label="Ink"
        ref={inkHudRef}
      >
        <Icon name="ti-inkdrop" />
        <span className="ob-inkn d">{ink}</span>
      </div>

      {mode === 'story' && !onLast && (
        <button className="ob-skipper" onClick={skip}>
          skip intro ›
        </button>
      )}

      <div className="ob-scoutwrap" aria-hidden="true">
        <svg key={hopN} className={`owl ob-scout${scoutDash ? ' dash' : ''}`} viewBox="0 0 120 130">
          <use href="#owl-scout" />
        </svg>
      </div>

      {mode !== 'done' && (
        <div
          className="ob-say-plaque"
          role="button"
          tabIndex={0}
          onClick={tap}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              tap();
            }
          }}
        >
          <div className="ob-who">scout · the finder</div>
          <div className="ob-say">
            {line ?? <Typed step={s} revealKey={reveal} onDone={() => setTyped(true)} />}
          </div>
          {mode === 'story' && onLast && typed ? null : (
            <div className="ob-tapnote">{mode === 'story' ? 'tap to continue' : ''}</div>
          )}
        </div>
      )}

      {mode === 'story' && onLast && typed && (
        <div className="ob-askchips">
          {ASKS.map((a) => (
            <button key={a.k} className="ob-chip" onClick={() => pick(a)}>
              {a.label}
            </button>
          ))}
        </div>
      )}

      {mode === 'done' && picked && (
        <div className="ob-letter on" ref={letterRef}>
          <span className={`ob-stamp${stamp ? ' on' : ''}`}>first ask</span>
          <div className="ob-pk">owl post · nº 1 · for {(name || 'you').toLowerCase()}</div>
          <div className="ob-lt">{BOOKS[picked.guide as keyof typeof BOOKS]?.t ?? 'your first book'}</div>
          <div className="ob-la">{BOOKS[picked.guide as keyof typeof BOOKS]?.a ?? ''}</div>
          <p className="ob-lw">{picked.why}</p>
          <div className="ob-lsign">— scout, first post</div>
        </div>
      )}

      {/* the level-up + welcome bundle banner */}
      {banner > 0 && (
        <div className={`ob-banner${banner >= 1 ? ' on' : ''}${banner >= 2 ? ' stage2' : ''}`} role="status">
          <div className="ob-blv d">level 2</div>
          <div className="ob-bsub">the owlery stirs</div>
          <div className="ob-bbundle">
            <div className="ob-bbig">welcome bundle — your first ten questions are on us.</div>
            <div className="ob-bink d">
              <Icon name="ti-inkdrop" /> +10 ink
            </div>
            <button className="ob-bcont" onClick={() => picked && onFinish(picked)}>
              continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- the show ---------- */
type Phase = 'landing' | 'playbill' | 'gate' | 'name' | 'curtain' | 'flight';

export function Onboarding() {
  const show = useStore((s) => s.showOnboarding);
  const onboarded = useStore((s) => !!s.prefs.onboarded);
  const name = useStore((s) => s.prefs.name ?? '');
  const finish = useStore((s) => s.finishOnboarding);
  const openAuth = useAuth((s) => s.openAuth);
  const authOpen = useAuth((s) => s.authOpen);
  const authed = useAuth((s) => s.status === 'authed');
  const [phase, setPhase] = useState<Phase>('landing');
  const gateCloth = useRef<CurtainHandle>(null);

  useEffect(() => {
    if (show) setPhase('landing');
  }, [show]);

  // the door → the name: once auth closes (signed in, or "peek in as a guest")
  useEffect(() => {
    if (phase === 'gate' && !authOpen) setPhase('name');
  }, [phase, authOpen]);

  if (!show) return null;

  const afterDeck = () => {
    if (onboarded) {
      setPhase('curtain'); // a replay from settings — skip the door + name
    } else if (authed) {
      setPhase('name');
    } else {
      openAuth('signup');
      setPhase('gate');
    }
  };

  // act i (the cast) plays in the matinée; the gate onward is the evening show
  const day = phase === 'landing' || phase === 'playbill';

  return (
    <div
      className="onboard"
      data-onbnight={day ? undefined : '1'}
      role="dialog"
      aria-modal="true"
      aria-label="Opening night"
    >
      {phase === 'landing' && <Splash onEnter={() => setPhase('playbill')} />}
      {phase === 'playbill' && <Playbill onDone={afterDeck} />}
      {/* act 3 · the door + the name share one closed velvet curtain (eyes watching) */}
      {(phase === 'gate' || phase === 'name') && (
        <div className="ob-gate">
          <CurtainCloth ref={gateCloth} motes={60} />
          <div className="ob-valance" aria-hidden="true" />
          {phase === 'name' && <NamePlaque onDone={() => setPhase('curtain')} clothRef={gateCloth} />}
        </div>
      )}
      {phase === 'curtain' && <CurtainReveal onEnter={() => setPhase('flight')} />}
      {phase === 'flight' && <Flight name={name} onFinish={(ask) => finish({ label: ask.label, guide: ask.guide })} />}
    </div>
  );
}
