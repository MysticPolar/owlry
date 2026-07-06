import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import type { GuideId } from '../../content/types';
import { BOOKS } from '../../content/books';
import { Icon } from '../Icon';
import { CastOwl } from '../CastOwl';

/* ============================================================
   OPENING NIGHT — the onboarding show. One continuous scene:
   curtain → two playbill pages (the loop, the economy) → scout
   swoops in and asks the one question → the first letter arrives
   → mirror & the growing radar → open your letter, you're in.
   Skippable at every beat; replayable from settings.
   ============================================================ */

type Scene = 'curtain' | 'loop' | 'economy' | 'scout' | 'ask' | 'letter' | 'mirror';

/** the one question's four directions → a first letter each (offline-safe) */
const MOODS: [string, GuideId][] = [
  ['rest', 'wws'],
  ['need focus', 'deep'],
  ['heartache', 'pema'],
  ['overwhelmed', 'bird'],
];

const SCOUT_LINES = [
  'evening. i’m scout — the postmaster.',
  'this was a theatre once. now it sorts the world’s unread mail — every book is a letter that hasn’t found its reader.',
];

/** types a line once, with a caret; calls onDone when finished */
function TypeOnce({ text, speed = 26, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const [n, setN] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(text.length);
      if (!done.current) {
        done.current = true;
        onDone?.();
      }
      return;
    }
    if (n >= text.length) {
      if (!done.current) {
        done.current = true;
        onDone?.();
      }
      return;
    }
    const t = setTimeout(() => setN((x) => x + 1), speed);
    return () => clearTimeout(t);
  }, [n, text, speed, onDone]);
  return (
    <span>
      {text.slice(0, n)}
      {n < text.length && <span className="l-caret" aria-hidden="true" />}
    </span>
  );
}

/** the identity radar, growing — mirror's act */
function GrowingRadar() {
  const pts = (r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      return `${60 + r * Math.cos(a)},${62 + r * Math.sin(a)}`;
    }).join(' ');
  return (
    <svg viewBox="0 0 120 124" className="ob-radar" aria-hidden="true">
      {[44, 33, 22, 11].map((r) => (
        <polygon key={r} points={pts(r)} fill="none" stroke="var(--line2)" strokeWidth="1" />
      ))}
      <polygon
        className="ob-radar-poly"
        points="60,24 95,44 88,84 60,98 34,80 28,42"
        fill="var(--radarFill)"
        stroke="var(--violet)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {['60,24', '95,44', '88,84', '60,98', '34,80', '28,42'].map((p, i) => {
        const [x, y] = p.split(',').map(Number);
        return <rect key={i} className="ob-radar-dot" x={x - 2.6} y={y - 2.6} width="5.2" height="5.2" fill="var(--yellow)" transform={`rotate(45 ${x} ${y})`} />;
      })}
    </svg>
  );
}

export function Onboarding() {
  const show = useStore((s) => s.showOnboarding);
  const finish = useStore((s) => s.finishOnboarding);
  const [scene, setScene] = useState<Scene>('curtain');
  const [scoutLine, setScoutLine] = useState(0);
  const [pick, setPick] = useState<GuideId | null>(null);

  // reset the show each time it opens
  useEffect(() => {
    if (show) {
      setScene('curtain');
      setScoutLine(0);
      setPick(null);
    }
  }, [show]);

  // the curtain rises on its own
  useEffect(() => {
    if (!show || scene !== 'curtain') return;
    const t = setTimeout(() => setScene('loop'), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 250 : 2100);
    return () => clearTimeout(t);
  }, [show, scene]);

  if (!show) return null;

  const skip = () => finish();

  return (
    <div className="onboard" role="dialog" aria-modal="true" aria-label="Opening night">
      {/* the house light, always burning */}
      <div className="ob-glow" aria-hidden="true" />

      {scene !== 'curtain' && (
        <button className="ob-skip" onClick={skip}>
          skip to the desk <Icon name="ti-arrow-right" />
        </button>
      )}

      {/* ACT I — the curtain rises */}
      {scene === 'curtain' && (
        <>
          <div className="ob-marquee d">
            <span>
              owlry<span className="gdot">.</span>
            </span>
            <span className="ob-tag">READ BETTER.</span>
          </div>
          <div className="ob-curtain" aria-hidden="true">
            <div className="ob-velvet" />
            <div className="ob-fringe" />
          </div>
        </>
      )}

      {/* PLAYBILL i — the loop */}
      {scene === 'loop' && (
        <div className="ob-card l-swap">
          <div className="l-kick">THE PROGRAMME · No 1</div>
          <div className="ob-h d">how the owlery works</div>
          <div className="ob-row">
            <span className="stamp"><Icon name="ti-feather" /></span>
            <span><b className="d">ASK</b> — tell scout what’s going on.</span>
          </div>
          <div className="ob-row">
            <span className="stamp"><Icon name="ti-mail-opened" /></span>
            <span><b className="d">PEEK</b> — open the letter it sorts you: the right book, the right chapter.</span>
          </div>
          <div className="ob-row">
            <span className="stamp"><Icon name="ti-radar-2" /></span>
            <span><b className="d">GROW</b> — save what stays with you; your reading identity takes shape.</span>
          </div>
          <button className="btn ob-next" onClick={() => setScene('economy')}>
            NEXT <Icon name="ti-arrow-right" />
          </button>
        </div>
      )}

      {/* PLAYBILL ii — ink & xp */}
      {scene === 'economy' && (
        <div className="ob-card l-swap">
          <div className="l-kick">THE PROGRAMME · No 2</div>
          <div className="ob-h d">the house economy</div>
          <div className="ob-row">
            <span className="stamp"><Icon name="ti-pencil" /></span>
            <span>asks and peeks spend <b className="d">INK</b>.</span>
          </div>
          <div className="ob-row">
            <span className="stamp"><Icon name="ti-sparkles" /></span>
            <span>every ask and peek pays back in <b className="d">XP</b> — your seat moves closer to the stage.</span>
          </div>
          <div className="ob-row">
            <span className="stamp"><Icon name="ti-book-2" /></span>
            <span>reading pages <b className="d">refills the well</b>. the loop feeds itself.</span>
          </div>
          <button className="btn ob-next" onClick={() => setScene('scout')}>
            MEET THE POSTMASTER <Icon name="ti-arrow-right" />
          </button>
        </div>
      )}

      {/* ACT II & III — scout swoops in, asks the one question */}
      {(scene === 'scout' || scene === 'ask') && (
        <div className="ob-stage">
          <div className="ob-owl">
            <CastOwl owl="scout" cls="hero" />
          </div>
          <div className="ob-lines">
            {SCOUT_LINES.slice(0, scoutLine + 1).map((l, i) => (
              <div className="msg owl" key={i}>
                {i === scoutLine && scene === 'scout' ? (
                  <TypeOnce
                    text={l}
                    onDone={() => {
                      if (scoutLine < SCOUT_LINES.length - 1) setTimeout(() => setScoutLine((x) => x + 1), 500);
                      else setTimeout(() => setScene('ask'), 500);
                    }}
                  />
                ) : (
                  l
                )}
              </div>
            ))}
            {scene === 'ask' && (
              <div className="msg owl">
                <TypeOnce text="so — what’s going on with you tonight?" />
              </div>
            )}
          </div>
          {scene === 'ask' && (
            <div className="chips ob-chips">
              {MOODS.map(([label, g]) => (
                <button
                  key={g}
                  className="chip"
                  onClick={() => {
                    setPick(g);
                    setScene('letter');
                  }}
                >
                  {label.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ACT IV — the first letter arrives */}
      {scene === 'letter' && pick && (
        <div className="ob-stage">
          <div className="ob-owl">
            <CastOwl owl="scout" cls="hero" />
          </div>
          <div className="ob-lines">
            <div className="msg owl">sorted. your first letter — don’t open it quite yet.</div>
            <div className="lettercard ob-letter">
              <span className="stamp">
                <Icon name="ti-feather" />
              </span>
              <span>
                <span className="lc-t d">your first letter has arrived</span>
                <br />
                <span className="lc-s">{BOOKS[pick].t}</span>
              </span>
            </div>
          </div>
          <button className="btn ob-next" onClick={() => setScene('mirror')}>
            ONE MORE THING <Icon name="ti-arrow-right" />
          </button>
        </div>
      )}

      {/* ACT V — mirror, and the shape you'll grow */}
      {scene === 'mirror' && pick && (
        <div className="ob-stage">
          <div className="ob-mirror">
            <CastOwl owl="mirror" cls="mini" />
          </div>
          <GrowingRadar />
          <div className="ob-lines">
            <div className="msg owl">this is mirror. it doesn’t say much — it watches what you read.</div>
            <div className="msg owl">
              <span className="it">save what speaks to you, and it charts who you’re becoming.</span>
            </div>
          </div>
          <button className="btn ob-next" onClick={() => finish(pick)}>
            OPEN YOUR LETTER <Icon name="ti-mail" />
          </button>
        </div>
      )}
    </div>
  );
}
