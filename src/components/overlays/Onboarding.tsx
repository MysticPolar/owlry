import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { useClock } from '../../hooks/useClock';
import { Icon } from '../Icon';
import { type CastOwlName } from '../CastOwl';
import { CurtainCloth, type CurtainHandle } from './CurtainCloth';
import { Confetti, type ConfettiHandle } from './Confetti';
import { getBook } from '../../lib/bookRegistry';
import { applyAction, derive } from '../../lib/economy/engine';
import { rowFromLevel } from '../../lib/economy/curve';
import { Wordmark } from '../Wordmark';
import { useT } from '../../i18n/react';
import type { Dict } from '../../i18n/react';
import type { BookRef } from '../../content/types';

/* ============================================================
   OPENING NIGHT — the full five-act arrival.
   1 · landing  — curtain rises on the marquee + the five owls
   2 · playbill — five swipe slides, one owl each
   3 · the door — invite code (or peek in as guest), then "Dear ___," the name
   4 · the curtain — read better, at owlry.  → raise → enter
   5 · the flight — scout's origin story, the first ask, the ink
       drop, the level-up + welcome bundle → land at the desk.
   Replayable from settings (skips the door + name).
   ============================================================ */

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** the onboarding namespace of the active dictionary */
type OnbT = Dict['onboarding'];

interface Slide {
  owl: CastOwlName;
  job: string;
  rot: number;
  head: ReactNode;
  body: ReactNode;
}

const buildSlides = (t: OnbT): Slide[] => [
  {
    owl: 'scout',
    job: t.cast.scout.job,
    rot: -5,
    head: (
      <>
        {t.cast.scout.head}
        <span className="hdot">.</span>
      </>
    ),
    body: (
      <>
        {t.cast.scout.body}{' '}
        <em>{t.cast.scout.em}</em>
      </>
    ),
  },
  {
    owl: 'peek',
    job: t.cast.peek.job,
    rot: 0,
    head: (
      <>
        {t.cast.peek.head}
        <span className="hdot">.</span>
      </>
    ),
    body: (
      <>
        {t.cast.peek.bodyA}
        <em>{t.cast.peek.bodyAEm}</em>
        {t.cast.peek.bodyB}{' '}
        <em>{t.cast.peek.em}</em>
      </>
    ),
  },
  {
    owl: 'scribe',
    job: t.cast.scribe.job,
    rot: 4,
    head: (
      <>
        {t.cast.scribe.head}
        <span className="hdot">.</span>
      </>
    ),
    body: (
      <>
        {t.cast.scribe.body}{' '}
        <em>{t.cast.scribe.em}</em>
      </>
    ),
  },
  {
    owl: 'keeper',
    job: t.cast.keeper.job,
    rot: 0,
    head: (
      <>
        {t.cast.keeper.head}
        <span className="hdot">.</span>
      </>
    ),
    body: (
      <>
        {t.cast.keeper.body}{' '}
        <em>{t.cast.keeper.em}</em>
      </>
    ),
  },
  {
    owl: 'mirror',
    job: t.cast.mirror.job,
    rot: 3,
    head: (
      <>
        {t.cast.mirror.head}
        <span className="hdot">.</span>
      </>
    ),
    body: (
      <>
        {t.cast.mirror.body}{' '}
        <em>{t.cast.mirror.em}</em>
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
  const t = useT();
  useEffect(() => {
    const tm = setTimeout(onEnter, reduced() ? 350 : 1700);
    return () => clearTimeout(tm);
  }, [onEnter]);
  return (
    <button className="ob-splash" onClick={onEnter} aria-label={t.onboarding.splash.aria}>
      <div className="ob-sp-mark d">
        <Wordmark decorative />
      </div>
      <div className="ob-sp-sub">{t.onboarding.splash.sub}</div>
    </button>
  );
}

/* ---------- act 2 · the playbill deck ---------- */
function Playbill({ onDone }: { onDone: () => void }) {
  const t = useT();
  const slides = buildSlides(t.onboarding);
  const deckRef = useRef<HTMLDivElement>(null);
  const ghostRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [live, setLive] = useState<boolean[]>(() => slides.map((_, i) => i === 0));
  const last = current === slides.length - 1;

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
    goTo(Math.max(0, Math.min(slides.length - 1, Math.round(deck.scrollLeft / deck.clientWidth))));
  };

  return (
    <div className="ob-playbill">
      <div className="ob-topbar">
        <span className="ob-mark d">
          <Wordmark />
        </span>
      </div>

      <div
        className="ob-deck"
        ref={deckRef}
        tabIndex={0}
        aria-label={t.onboarding.cast.deckAria}
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
          if (e.key === 'ArrowRight') goTo(Math.min(current + 1, slides.length - 1));
          if (e.key === 'ArrowLeft') goTo(Math.max(current - 1, 0));
        }}
      >
        {slides.map((s, i) => (
          <section
            key={s.owl}
            className={`ob-slide${live[i] ? ' live' : ''}`}
            data-owl={s.owl}
            aria-label={t.onboarding.cast.slideAria(i + 1, slides.length, s.owl)}
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
        <div className="ob-dots" role="tablist" aria-label={t.onboarding.cast.dotsAria}>
          {slides.map((s, i) => (
            <button
              key={s.owl}
              role="tab"
              aria-selected={i === current}
              aria-label={t.onboarding.cast.dotAria(i + 1, s.owl)}
              className={`ob-dot${i === current ? ' on' : ''}`}
              style={{ '--dc': `var(--${OWL_ACCENT[s.owl]})` } as CSSProperties}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        <button
          className={`ob-next${last ? ' last' : ''}`}
          aria-label={last ? t.onboarding.cast.enterAria : t.onboarding.cast.nextAria}
          onClick={() => (last ? onDone() : goTo(current + 1))}
        >
          <span className="lbl">{t.onboarding.cast.enter}</span>
          <Icon name="ti-arrow-right" />
        </button>
      </div>
    </div>
  );
}

/* ---------- act 3a · the door — invite only (against the closed velvet) ---------- */
function InvitePlaque({
  onEnter,
  onPeek,
  clothRef,
}: {
  onEnter: () => void;
  onPeek: () => void;
  clothRef: React.RefObject<CurtainHandle>;
}) {
  const t = useT();
  const o = t.onboarding;
  const showToast = useStore((s) => s.showToast);
  const [code, setCode] = useState('');
  const [err, setErr] = useState(false);
  const [granted, setGranted] = useState(false);
  const [shaking, setShaking] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const tm = setTimeout(() => ref.current?.focus(), 340);
    return () => clearTimeout(tm);
  }, []);
  // the eyes look at the plaque while the reader types the code (lookAtPlaque)
  const lookAtInput = () => {
    const el = ref.current;
    const gate = el?.closest('.ob-gate');
    if (!el || !gate || !clothRef.current) return;
    const r = el.getBoundingClientRect();
    const a = gate.getBoundingClientRect();
    clothRef.current.lookAt((r.left - a.left + r.width / 2) / a.width, (r.top - a.top + r.height / 2) / a.height);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // demo: any non-empty code is on the list (production redeems the invite)
    if (!code.trim()) {
      setErr(true);
      setShaking(false);
      requestAnimationFrame(() => setShaking(true));
      ref.current?.focus();
      return;
    }
    setErr(false);
    setGranted(true);
    setTimeout(onEnter, reduced() ? 100 : 440);
  };
  return (
    <div className={`ob-plaque ob-inv${granted ? ' granted' : ''}${err ? ' err' : ''}`}>
      <p className="ob-pline">
        {o.gate.line1}
        <br />
        {o.gate.line2}
        <span className="gdot">.</span>
      </p>
      <form onSubmit={submit}>
        <input
          ref={ref}
          className={`ob-codein${shaking ? ' shake' : ''}`}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setErr(false);
          }}
          onFocus={lookAtInput}
          onAnimationEnd={() => setShaking(false)}
          placeholder={o.gate.codePlaceholder}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label={o.gate.codeAria}
          disabled={granted}
        />
        <button className="gbtn" type="submit" disabled={granted}>
          {o.gate.enter}
        </button>
      </form>
      <div className="ob-gerr">{o.gate.err}</div>
      <div className="ob-microline">
        {o.gate.noInvite}{' '}
        <button type="button" disabled={granted} onClick={() => showToast('ti-external-link', o.gate.waitlistToast)}>
          {o.gate.waitlist}
        </button>{' '}
        <span className="ob-or">{o.gate.or}</span>{' '}
        <button type="button" disabled={granted} onClick={onPeek}>
          {o.gate.guest}
        </button>
      </div>
    </div>
  );
}

/* ---------- act 3b · the name (against the closed velvet, eyes watching) ---------- */
function NamePlaque({ onDone, clothRef }: { onDone: () => void; clothRef: React.RefObject<CurtainHandle> }) {
  const t = useT();
  const o = t.onboarding;
  const setPref = useStore((s) => s.setPref);
  const [name, setName] = useState('');
  const [sealed, setSealed] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const tm = setTimeout(() => ref.current?.focus(), 320);
    return () => clearTimeout(tm);
  }, []);
  const clean = name.replace(/\s+/g, ' ').trimStart();
  // the eyes look at the plaque while you write your name (the mockup's lookAtPlaque)
  const lookAtInput = () => {
    const el = ref.current;
    const gate = el?.closest('.ob-gate');
    if (!el || !gate || !clothRef.current) return;
    const r = el.getBoundingClientRect();
    const a = gate.getBoundingClientRect();
    clothRef.current.lookAt((r.left - a.left + r.width / 2) / a.width, (r.top - a.top + r.height / 2) / a.height);
  };
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
      <p className="ob-qline">{o.name.q}</p>
      <div className="ob-dear">
        <em>{o.name.dear}</em> <span className="ob-dearname">{clean}</span>
        {!sealed && <span className="ob-cur" />}
        {clean && o.name.comma}
      </div>
      <form onSubmit={submit}>
        <input
          ref={ref}
          className="ob-namein"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            lookAtInput();
          }}
          onFocus={lookAtInput}
          placeholder={o.name.placeholder}
          maxLength={18}
          autoComplete="given-name"
          spellCheck={false}
          aria-label={o.name.aria}
          disabled={sealed}
        />
        <button className="gbtn" type="submit" ref={btnRef} disabled={sealed}>
          {sealed ? o.name.sealedFor(clean) : o.name.thatsMe}
        </button>
      </form>
      <p className="ob-dearnote">{o.name.note}</p>
    </div>
  );
}

/* ---------- act 4 · the curtain rises (canvas cloth) ---------- */
function CurtainReveal({ onEnter }: { onEnter: () => void }) {
  const t = useT();
  const rv = t.onboarding.reveal;
  const [open, setOpen] = useState(false);
  const [entering, setEntering] = useState(false);
  const { time } = useClock();
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
        <p className="ob-kick">{rv.kick}</p>
        <h1 className="ob-marq">
          <span>{rv.marq1}</span>
          <span>{rv.marq2}</span>
        </h1>
        <div className="ob-at">
          <em>{rv.at}</em> <Wordmark />
        </div>
      </div>
      <div className="ob-aura" aria-hidden="true" />
      <span className="ob-glint" aria-hidden="true">
        ✦
      </span>
      <div className="ob-ground" aria-hidden="true">
        {GROUND.map((o) => (
          <svg key={o} className={`owl o-${o}`} viewBox="0 0 120 130">
            <use href={`#owl-${o}`} />
          </svg>
        ))}
      </div>
      <div className="ob-seatrow">
        <button className="btn ob-seatbtn" onClick={enter}>
          {rv.enter} <Icon name="ti-arrow-right" />
        </button>
      </div>
      <div className="ob-showline" aria-hidden="true">
        {rv.eveningShow} · {time}
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
        aria-label={rv.raiseAria}
        aria-hidden={open}
      >
        <span className="ob-house-txt">
          <span className="ob-house-mark d">
            <Wordmark />
          </span>
          <span className="ob-house-show">{rv.eveningShow}</span>
          <span className="ob-house-seat">{rv.seat}</span>
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
const buildAsks = (t: OnbT): Ask[] => [
  { k: 'focus', label: t.flight.asks.focus.label, guide: 'deep', why: t.flight.asks.focus.why },
  { k: 'habit', label: t.flight.asks.habit.label, guide: 'atomic', why: t.flight.asks.habit.why },
  { k: 'heart', label: t.flight.asks.heart.label, guide: 'pema', why: t.flight.asks.heart.why },
  { k: 'rest', label: t.flight.asks.rest.label, guide: 'wws', why: t.flight.asks.rest.why },
  { k: 'decide', label: t.flight.asks.decide.label, guide: 'frankl', why: t.flight.asks.decide.why },
];

interface Step {
  text: string;
  node: ReactNode;
  fx?: 'ink' | 'level';
  last?: boolean;
}
const buildSteps = (name: string, t: OnbT): Step[] => {
  const S = t.flight.steps;
  return [
    {
      text: S.s1.pre + name + S.s1.post,
      node: (
        <>
          {S.s1.pre}
          <em>{name}</em>
          {S.s1.post}
        </>
      ),
    },
    { text: S.s2, node: <>{S.s2}</> },
    { text: S.s3.text, node: <>{S.s3.node}</> },
    { text: S.s4.text, node: <>{S.s4.node}</> },
    {
      text: S.s5.pre + S.s5.em + S.s5.post,
      node: (
        <>
          {S.s5.pre}
          <em>{S.s5.em}</em>
          {S.s5.post}
        </>
      ),
      fx: 'ink',
    },
    {
      text: S.s6.pre + S.s6.em + S.s6.post,
      node: (
        <>
          {S.s6.pre}
          <em>{S.s6.em}</em>
          {S.s6.post}
        </>
      ),
      fx: 'level',
    },
    { text: S.s7.text, node: <>{S.s7.node}</>, last: true },
  ];
};

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

/* ---------- act 5's numbers, borrowed from the ledger ----------
   the welcome grant is real: finishOnboarding calls econ('onboard'), and that
   is the ONLY place the +xp and the ink are actually paid. so the act asks the
   same engine what that grant will do — a dry run on a copy of the state,
   committed nowhere — and choreographs the reader's true before and after.
   a replayed opening night (the stub is already in the album) is granted
   nothing, and the act shows nothing rather than a second welcome. */
interface FlightNums {
  lv0: number;
  xp0: number; // 0..100 — the bar's fill before the grant
  ink0: number;
  lv1: number;
  xp1: number;
  ink1: number;
  row1: number;
  gainXp: number;
  gainInk: number;
  leveled: boolean;
}
const flightNums = (): FlightNums => {
  const s = useStore.getState(); // the store carries every EconomyState field
  const res = applyAction(s, 'onboard');
  const after = derive(res.next.totalXp);
  const pct = (xp: number, max: number) => Math.round((xp / Math.max(1, max)) * 100);
  return {
    lv0: s.lv,
    xp0: pct(s.xp, s.xpMax),
    ink0: s.ink,
    lv1: after.lv,
    xp1: pct(after.xp, after.xpMax),
    ink1: res.next.ink,
    row1: rowFromLevel(after.lv),
    gainXp: Math.max(0, res.granted.xp),
    gainInk: Math.max(0, res.granted.ink),
    leveled: res.leveled,
  };
};

function Flight({ name, onFinish }: { name: string; onFinish: (ask: Ask) => void }) {
  const t = useT();
  const o = t.onboarding;
  const steps = useRef(buildSteps(name || o.flight.friend, o)).current;
  const asks = buildAsks(o);
  const [step, setStep] = useState(0);
  const [reveal, setReveal] = useState(0); // bump → finish the current line early
  const [typed, setTyped] = useState(false);
  const [inkOn, setInkOn] = useState(false);
  const [lvOn, setLvOn] = useState(false);
  // the HUDs read the reader's real well and real seat — see flightNums.
  // read once, on mount: the act's numbers must not shift mid-choreography
  const [nums] = useState(flightNums);
  const [ink, setInk] = useState(0);
  const [lv, setLv] = useState(nums.lv0);
  const [xp, setXp] = useState(nums.xp0); // 0..100
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
      setTimeout(() => setInk(nums.ink0), reduced() ? 1 : 500);
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
        <em>{ask.label}</em>
        {o.flight.sayNoMore}
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
    // …and the count holds: the house pays for the first letter (nothing
    // charges it), so the drop is scout's pen, not the reader's well.

    // scout dashes off to the shelves…
    setTimeout(() => {
      setLine(<em>{o.flight.offToShelves}</em>);
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
    // 2 · xp flies from the letter to the level bar, then fills it. a bar that
    //     will cross tops out first; one that won't goes straight to its mark
    const filled = nums.leveled ? 100 : nums.xp1;
    const t2 = setTimeout(() => {
      const f = xpflyRef.current;
      const lvh = lvHudRef.current;
      const L = letterRef.current;
      const cont = flightRef.current;
      if (f && lvh && L && cont && !R && nums.gainXp > 0) {
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
          setXp(filled);
        };
      } else {
        setXp(filled);
      }
    }, R ? 10 : 650);
    // 3 · the seat is named — the banner drops (stage 1) + a burst on it
    const t3 = setTimeout(() => {
      setLv(nums.lv1);
      setXp(nums.xp1);
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
    // 4 · the welcome bundle joins (stage 2) — ink rains into the real well
    let iv: ReturnType<typeof setInterval> | undefined;
    const t4 = setTimeout(() => {
      setBanner(2);
      if (nums.ink1 <= nums.ink0) {
        setInk(nums.ink1); // nothing to pour — a replayed opening night
        return;
      }
      let k = nums.ink0;
      iv = setInterval(() => {
        k += 1;
        setInk(k);
        if (k >= nums.ink1) clearInterval(iv);
      }, R ? 1 : 90);
    }, R ? 30 : 3150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearInterval(iv);
    };
  }, [mode]);

  const skip = () => {
    setStep(steps.length - 1);
    setLine(steps[steps.length - 1].node); // show the last line whole, not mid-type
    setTyped(true);
    setInkOn(true);
    setLvOn(true);
    setInk(nums.ink0);
  };

  return (
    <div className={`ob-flight${mode === 'done' ? ' celebrating' : ''}`} ref={flightRef}>
      <div className="ob-glow" aria-hidden="true" />
      <span className="ob-drop" ref={dropRef} aria-hidden="true">
        <Icon name="ti-inkdrop" />
      </span>
      <span className="ob-xpfly" ref={xpflyRef} aria-hidden="true">
        {o.flight.xpFly(nums.gainXp)}
      </span>
      <Confetti ref={confettiRef} />


      {/* the two HUDs — ink (right) and level (left) */}
      <div
        className={`ob-hud ob-lvhud${lvOn ? ' on' : ''}${banner ? ' flash' : ''}`}
        aria-label={o.flight.levelAria}
        ref={lvHudRef}
      >
        <span className="ob-lv d">{o.flight.lv(lv)}</span>
        <span className="ob-track">
          <span className="ob-fill" style={{ width: `${xp}%` }} />
        </span>
      </div>
      <div
        className={`ob-hud ob-inkhud${inkOn ? ' on' : ''}${ink === 0 && inkOn ? ' empty' : ''}`}
        aria-label={o.flight.inkAria}
        ref={inkHudRef}
      >
        <Icon name="ti-inkdrop" />
        <span className="ob-inkn d">{ink}</span>
      </div>

      {mode === 'story' && !onLast && (
        <button className="ob-skipper" onClick={skip}>
          {o.flight.skip}
        </button>
      )}

      <div className="ob-scoutwrap" aria-hidden="true">
        <svg key={hopN} className={`owl ob-scout${scoutDash ? ' dash' : ''}`} viewBox="0 0 120 130">
          <use href="#owl-scout" />
        </svg>
      </div>

      {mode !== 'done' && (
        <div
          className={`ob-say-plaque${mode === 'story' && onLast ? ' ob-q' : ''}`}
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
          <div className="ob-who">{o.flight.who}</div>
          <div className="ob-say">
            {line ?? <Typed step={s} revealKey={reveal} onDone={() => setTyped(true)} />}
          </div>
          {mode === 'story' && onLast && typed ? null : (
            <div className="ob-tapnote">{mode === 'story' ? o.flight.tapNote : ''}</div>
          )}
        </div>
      )}

      {mode === 'story' && onLast && typed && (
        <div className="ob-askchips">
          {asks.map((a) => (
            <button key={a.k} className="ob-chip" onClick={() => pick(a)}>
              {a.label}
            </button>
          ))}
        </div>
      )}

      {mode === 'done' && picked && (
        <div className="ob-letter on" ref={letterRef}>
          <span className={`ob-stamp${stamp ? ' on' : ''}`}>{o.flight.stamp}</span>
          <div className="ob-pk">{o.flight.postLine((name || o.flight.you).toLowerCase())}</div>
          <div className="ob-lt">{getBook(picked.guide)?.t ?? o.flight.firstBookFallback}</div>
          <div className="ob-la">{getBook(picked.guide)?.a ?? ''}</div>
          <p className="ob-lw">{picked.why}</p>
          <div className="ob-lsign">{o.flight.sign}</div>
        </div>
      )}

      {/* the seat + welcome bundle banner. the bundle only speaks when it has
          something to give — a replayed opening night is granted nothing */}
      {banner > 0 && (
        <div className={`ob-banner${banner >= 1 ? ' on' : ''}${banner >= 2 ? ' stage2' : ''}`} role="status">
          <div className="ob-blv d">{o.flight.bannerSeat(nums.lv1, nums.row1)}</div>
          <div className="ob-bsub">{o.flight.bannerSub}</div>
          <div className="ob-bbundle">
            {nums.gainInk > 0 && (
              <>
                <div className="ob-bbig">{o.flight.bundleLine}</div>
                <div className="ob-bink d">
                  <Icon name="ti-inkdrop" /> {o.flight.bundleInk(nums.gainInk)}
                </div>
              </>
            )}
            <br />
            <button className="ob-bcont" onClick={() => picked && onFinish(picked)}>
              {o.flight.cont}
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
  const t = useT();
  const show = useStore((s) => s.showOnboarding);
  const onboarded = useStore((s) => !!s.prefs.onboarded);
  const name = useStore((s) => s.prefs.name ?? '');
  const finish = useStore((s) => s.finishOnboarding);
  const setTab = useStore((s) => s.setTab);
  const [phase, setPhase] = useState<Phase>('landing');
  const gateCloth = useRef<CurtainHandle>(null);

  useEffect(() => {
    if (show) setPhase('landing');
  }, [show]);

  if (!show) return null;

  const afterDeck = () => {
    // opening night is invite-gated now (no login/signup); a replay from
    // settings (already onboarded) skips the door + name to the curtain
    setPhase(onboarded ? 'curtain' : 'gate');
  };

  // "peek in as guest" — straight into the mocked app: SEED (lv 7, books, ink)
  // on a fresh install, or the level-1 state after a settings reset
  const peekAsGuest = () => {
    finish();
    setTab('today');
  };

  // act i (the cast) plays in the matinée; the gate onward is the evening show
  const day = phase === 'landing' || phase === 'playbill';

  return (
    <div
      className="onboard"
      data-onbnight={day ? undefined : '1'}
      role="dialog"
      aria-modal="true"
      aria-label={t.onboarding.dialogAria}
    >
      {phase === 'landing' && <Splash onEnter={() => setPhase('playbill')} />}
      {phase === 'playbill' && <Playbill onDone={afterDeck} />}
      {/* act 3 · the door (invite) + the name share one closed velvet curtain,
          the crest above and the eyes watching through the folds */}
      {(phase === 'gate' || phase === 'name') && (
        <div className="ob-gate">
          <CurtainCloth ref={gateCloth} motes={60} />
          <div className="ob-valance" aria-hidden="true" />
          <div className="ob-plaquewrap">
            <div className="ob-crest d">
              <Wordmark />
            </div>
            {phase === 'gate' && (
              <InvitePlaque onEnter={() => setPhase('name')} onPeek={peekAsGuest} clothRef={gateCloth} />
            )}
            {phase === 'name' && <NamePlaque onDone={() => setPhase('curtain')} clothRef={gateCloth} />}
          </div>
        </div>
      )}
      {phase === 'curtain' && <CurtainReveal onEnter={() => setPhase('flight')} />}
      {phase === 'flight' && <Flight name={name} onFinish={(ask) => finish({ label: ask.label, guide: ask.guide })} />}
    </div>
  );
}
