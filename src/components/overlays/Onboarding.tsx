import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../store/useAuth';
import { Icon } from '../Icon';
import { CastOwl, type CastOwlName } from '../CastOwl';
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

/* ---------- act 1 · the landing ---------- */
function Landing({ onEnter }: { onEnter: () => void }) {
  const [curtain, setCurtain] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setCurtain(false), reduced() ? 250 : 2200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="ob-landing">
      <div className="ob-glow" aria-hidden="true" />
      <div className="ob-marquee d">
        <span>
          owlry<span className="gdot">.</span>
        </span>
        <span className="ob-tag">READ BETTER.</span>
        <span className="ob-prod">a wakeup! human production</span>
      </div>
      <div className="ob-cast" aria-label="The company — five owls">
        {SLIDES.map((s, i) => (
          <div className="ob-seat" style={{ animationDelay: `${1.35 + i * 0.12}s` }} key={s.owl}>
            <CastOwl owl={s.owl} cls="mini" />
            <span className="ob-seat-name">{s.owl}</span>
          </div>
        ))}
      </div>
      <button className="btn ob-enter" onClick={onEnter}>
        take your seat <Icon name="ti-arrow-right" />
      </button>
      {curtain && (
        <div className="ob-curtain" aria-hidden="true">
          <div className="ob-velvet" />
          <div className="ob-fringe" />
        </div>
      )}
    </div>
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

/* ---------- act 3b · the name (against the closed curtain) ---------- */
function NameCard({ onDone }: { onDone: () => void }) {
  const setPref = useStore((s) => s.setPref);
  const [name, setName] = useState('');
  const ref = useRef<HTMLInputElement>(null);
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
    onDone();
  };
  return (
    <div className="ob-gate">
      <div className="ob-drape" aria-hidden="true" />
      <div className="ob-plaque">
        <div className="ob-crest d">
          owlry<span className="gdot">.</span>
        </div>
        <p className="ob-qline">how should the owls address you?</p>
        <div className="ob-dear">
          <em>Dear</em> <span className="ob-dearname">{clean}</span>
          <span className="ob-cur" />
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
          />
          <button className="gbtn" type="submit">
            that&rsquo;s me
          </button>
        </form>
        <p className="ob-dearnote">every letter you receive opens this way</p>
      </div>
    </div>
  );
}

/* ---------- act 4 · the curtain rises ---------- */
function CurtainReveal({ onEnter }: { onEnter: () => void }) {
  const [raising, setRaising] = useState(false);
  const [open, setOpen] = useState(false);
  const raise = () => {
    if (raising) return;
    setRaising(true);
    setTimeout(() => setOpen(true), reduced() ? 250 : 950);
  };
  const FLOCK: CastOwlName[] = ['scout', 'keeper', 'mirror', 'scribe', 'peek'];
  return (
    <div className={`ob-reveal${open ? ' open' : ''}`}>
      <div className="ob-glow" aria-hidden="true" />
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
      <div className="ob-flock" aria-hidden="true">
        {FLOCK.map((o) => (
          <svg key={o} className={`owl o-${o}`} viewBox="0 0 120 130">
            <use href={`#owl-${o}`} />
          </svg>
        ))}
      </div>
      <div className="ob-seatrow">
        <button className="btn ob-seatbtn" onClick={onEnter}>
          enter <Icon name="ti-arrow-right" />
        </button>
      </div>
      {!open && (
        <button
          className={`ob-house${raising ? ' rising' : ''}`}
          onClick={raise}
          aria-label="Raise the curtain"
        >
          <div className="ob-velvet" />
          <div className="ob-fringe" />
          <span className="ob-house-txt">
            <span className="ob-house-mark d">
              owlry<span className="gdot">.</span>
            </span>
            <span className="ob-house-show">the evening show</span>
            <span className="ob-house-seat">now seating — tap to raise the curtain</span>
          </span>
        </button>
      )}
    </div>
  );
}

/* ---------- act 5 · scout's first flight ---------- */
interface Ask {
  k: string;
  label: string;
  guide: BookRef;
}
const ASKS: Ask[] = [
  { k: 'focus', label: "can't focus lately", guide: 'deep' },
  { k: 'habit', label: 'new manager, no manual', guide: 'atomic' },
  { k: 'heart', label: 'heartbreak', guide: 'pema' },
  { k: 'rest', label: 'rainy sunday', guide: 'wws' },
  { k: 'decide', label: 'before a big decision', guide: 'frankl' },
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
    const b = BOOKS[ask.guide as keyof typeof BOOKS];
    // the drop leaves the vial
    void b;
    setTimeout(() => setInk(0), reduced() ? 1 : 650);
    setTimeout(() => setLine(<em>…off to the shelves…</em>), reduced() ? 1 : 1050);
    // the letter lands (rendered from live state below) + the celebration begins
    setTimeout(() => setMode('done'), reduced() ? 60 : 2100);
  };

  // the one celebration timeline, once the letter has landed
  useEffect(() => {
    if (mode !== 'done') return;
    const R = reduced();
    const t1 = setTimeout(() => setStamp(true), R ? 1 : 250);
    const t2 = setTimeout(() => {
      setXp(96);
    }, R ? 10 : 650);
    const t3 = setTimeout(() => {
      setLv(2);
      setXp(14);
      setBanner(1);
    }, R ? 20 : 2050);
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
    <div className={`ob-flight${mode === 'done' ? ' celebrating' : ''}`}>
      <div className="ob-glow" aria-hidden="true" />

      {/* the two HUDs — ink (right) and level (left) */}
      <div className={`ob-hud ob-lvhud${lvOn ? ' on' : ''}${banner ? ' flash' : ''}`} aria-label="Level">
        <span className="ob-lv d">lv {lv}</span>
        <span className="ob-track">
          <span className="ob-fill" style={{ width: `${xp}%` }} />
        </span>
      </div>
      <div className={`ob-hud ob-inkhud${inkOn ? ' on' : ''}${ink === 0 && inkOn ? ' empty' : ''}`} aria-label="Ink">
        <Icon name="ti-pencil" />
        <span className="ob-inkn d">{ink}</span>
      </div>

      {mode === 'story' && !onLast && (
        <button className="ob-skipper" onClick={skip}>
          skip intro ›
        </button>
      )}

      <div className="ob-scoutwrap" aria-hidden="true">
        <svg className={`owl ob-scout${mode !== 'story' ? ' flew' : ''}`} viewBox="0 0 120 130">
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
        <div className="ob-letter on">
          <span className={`ob-stamp${stamp ? ' on' : ''}`}>first ask</span>
          <div className="ob-pk">owl post · nº 1 · for {(name || 'you').toLowerCase()}</div>
          <div className="ob-lt">{BOOKS[picked.guide as keyof typeof BOOKS]?.t ?? 'your first book'}</div>
          <div className="ob-la">{BOOKS[picked.guide as keyof typeof BOOKS]?.a ?? ''}</div>
          <p className="ob-lw">{BOOKS[picked.guide as keyof typeof BOOKS]?.q ?? ''}</p>
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
              <Icon name="ti-pencil" /> +10 ink
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

  return (
    <div className="onboard" role="dialog" aria-modal="true" aria-label="Opening night">
      {phase === 'landing' && <Landing onEnter={() => setPhase('playbill')} />}
      {phase === 'playbill' && <Playbill onDone={afterDeck} />}
      {phase === 'gate' && <div className="ob-gate"><div className="ob-drape" aria-hidden="true" /></div>}
      {phase === 'name' && <NameCard onDone={() => setPhase('curtain')} />}
      {phase === 'curtain' && <CurtainReveal onEnter={() => setPhase('flight')} />}
      {phase === 'flight' && <Flight name={name} onFinish={(ask) => finish({ label: ask.label, guide: ask.guide })} />}
    </div>
  );
}
