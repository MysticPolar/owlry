import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../store/useAuth';
import { Icon } from '../Icon';
import { CastOwl, type CastOwlName } from '../CastOwl';

/* ============================================================
   OPENING NIGHT — the onboarding, renovated as "the playbill".
   1 · landing: the curtain rises on the marquee + the five owls.
   2 · the deck: five swipe slides, one owl each, in the order
       you'll meet them — scout → peek → scribe → keeper → mirror.
   3 · the members' door: the deck ends at the real auth page
       (invite signup / login / peek in as a guest).
   Skippable from the deck; replayable from settings.
   ============================================================ */

interface Slide {
  owl: CastOwlName;
  job: string;
  rot: number; // perch tilt, degrees
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
        keep a line once — scribe files it forever, word for word.{' '}
        <em>page 118 is not page 117.</em>
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
        every book, every streak, your whole reading life —{' '}
        <em>shelved lovingly, counted twice.</em>
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
        mirror charts your reading identity, and it levels as you read.{' '}
        <em>six shelves of you.</em>
      </>
    ),
  },
];

/* ---------- act 1 · the landing ---------- */
function Landing({ onEnter }: { onEnter: () => void }) {
  const [curtain, setCurtain] = useState(true);

  // the curtain rises on its own; the timed unmount is what makes
  // reduced-motion work (the media query kills the rise animation)
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setCurtain(false), reduce ? 250 : 2200);
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

/* ---------- act 2 · the playbill deck (five owls, one per slide) ---------- */
function Playbill({ onDone }: { onDone: () => void }) {
  const deckRef = useRef<HTMLDivElement>(null);
  const ghostRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [live, setLive] = useState<boolean[]>(() => SLIDES.map((_, i) => i === 0));
  const last = current === SLIDES.length - 1;

  const goTo = (i: number) => {
    const deck = deckRef.current;
    if (!deck) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    deck.scrollTo({ left: i * deck.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  };

  // which slide is on stage (and which owls have made their entrance)
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

  // ghost-name parallax as the deck scrolls
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

  // mouse drag-to-swipe (touch is native)
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

const OWL_ACCENT: Record<CastOwlName, string> = {
  scout: 'ember',
  peek: 'teal',
  scribe: 'quill',
  keeper: 'moss',
  mirror: 'violet',
};

/* ---------- the show ---------- */
export function Onboarding() {
  const show = useStore((s) => s.showOnboarding);
  const finish = useStore((s) => s.finishOnboarding);
  const openAuth = useAuth((s) => s.openAuth);
  const authed = useAuth((s) => s.status === 'authed');
  const [phase, setPhase] = useState<'landing' | 'playbill'>('landing');

  // reset the show each time it opens (first run, or replayed from settings)
  useEffect(() => {
    if (show) setPhase('landing');
  }, [show]);

  if (!show) return null;

  // the deck ends at the members' door — unless this is a signed-in replay
  const done = () => {
    finish();
    if (!authed) openAuth('signup');
  };

  return (
    <div className="onboard" role="dialog" aria-modal="true" aria-label="Opening night">
      {phase === 'landing' ? <Landing onEnter={() => setPhase('playbill')} /> : <Playbill onDone={done} />}
    </div>
  );
}
