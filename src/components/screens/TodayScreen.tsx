import { useRef } from 'react';
import { useStore } from '../../store/useStore';
import { BOOKS } from '../../content/books';
import { PICKS } from '../../content/picks';
import { WX } from '../../content/weather';
import { getBook } from '../../lib/bookRegistry';
import { useClock } from '../../hooks/useClock';
import { pct } from '../../lib/format';
import { Icon } from '../Icon';
import { Cover } from '../Cover';
import { CastOwl } from '../CastOwl';

/* ---------- weather-reactive masthead ---------- */
function Masthead() {
  const wxIndex = useStore((s) => s.wxIndex);
  const cycleWeather = useStore((s) => s.cycleWeather);
  const toggleMode = useStore((s) => s.toggleMode);
  const mode = useStore((s) => s.prefs.mode);
  const { dt } = useClock();
  const w = WX[wxIndex];
  return (
    <div className="mast">
      <div className="logo d">
        <span>
          owlry<span className="gdot">.</span>
        </span>
        <button className="wx" id="wxBtn" aria-label={`Weather: ${w.l}. Tap to change`} onClick={cycleWeather}>
          <Icon name={w.i} />
          <span className="wx-fx" aria-hidden="true">
            <span className="drop" />
            <span className="drop" />
            <span className="drop" />
            <span className="flake" />
            <span className="flake" />
            <span className="flake" />
            <span className="star" />
            <span className="star" />
          </span>
        </button>
        <button className="wx mode" id="modeBtn" aria-label="Lighting" onClick={toggleMode}>
          <Icon name={mode === 'night' ? 'ti-sun' : 'ti-moon-stars'} />
        </button>
      </div>
      <span className="dt" id="dt">
        {dt}
      </span>
    </div>
  );
}

/* ---------- stats row ---------- */
function StatsRow() {
  const xp = useStore((s) => s.xp);
  const xpMax = useStore((s) => s.xpMax);
  const ink = useStore((s) => s.ink);
  const inkMax = useStore((s) => s.inkMax);
  const coins = useStore((s) => s.coins);
  const lv = useStore((s) => s.lv);
  const name = useStore((s) => s.prefs.name);
  return (
    <section className="stats" aria-label="Your reading progress">
      <div className="avatar d" aria-label={`Reader initial ${(name?.[0] ?? 'M').toUpperCase()}`}>
        {(name?.[0] ?? 'M').toUpperCase()}
      </div>
      <div className="bars">
        <div className="brow">
          <span className="blab d" id="lvLab">
            LV {lv}
          </span>
          <div
            className="track"
            role="progressbar"
            aria-label={`Level ${lv} experience`}
            aria-valuemin={0}
            aria-valuemax={xpMax}
            aria-valuenow={xp}
          >
            <div className="fill xp" style={{ width: `${(xp / xpMax) * 100}%` }} />
          </div>
          <span className="bval">{xp} XP</span>
        </div>
        <div className="brow">
          <span className="blab d">INK</span>
          <div
            className="track"
            role="progressbar"
            aria-label="Ink"
            aria-valuemin={0}
            aria-valuemax={inkMax}
            aria-valuenow={ink}
          >
            <div className="fill ink" style={{ width: `${(ink / inkMax) * 100}%` }} />
          </div>
          <span className="bval">
            {ink}/{inkMax}
          </span>
        </div>
      </div>
      <div className="coins" aria-label={`${coins} coins`}>
        <Icon name="ti-coin" />
        <span>{coins}</span>
      </div>
    </section>
  );
}

/* ---------- today's pick carousel ---------- */
function PickCard() {
  const pickIndex = useStore((s) => s.pickIndex);
  const setPick = useStore((s) => s.setPick);
  const saved = useStore((s) => s.savedIds.includes(PICKS[s.pickIndex]));
  const toggleSave = useStore((s) => s.toggleSave);
  const openSheet = useStore((s) => s.openSheet);
  const startAsk = useStore((s) => s.startAsk);

  const id = PICKS[pickIndex];
  const b = BOOKS[id];
  const swipeX = useRef<number | null>(null);

  return (
    <div className="pick-wrap">
      <article
        className="card today-pick-card swap"
        key={pickIndex}
        aria-label={`Owl post ${pickIndex + 1} of ${PICKS.length}`}
        aria-roledescription="carousel"
        onPointerDown={(e) => {
          swipeX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (swipeX.current === null) return;
          const dx = e.clientX - swipeX.current;
          swipeX.current = null;
          if (Math.abs(dx) > 40) setPick(pickIndex + (dx < 0 ? 1 : -1));
        }}
      >
        <button
          type="button"
          className={`save ${saved ? 'on' : ''}`}
          aria-label={saved ? `Remove ${b.t} from library` : `Save ${b.t} to library`}
          aria-pressed={saved}
          onClick={() => toggleSave(id)}
        >
          <Icon name="ti-heart" />
        </button>
        <div
          className="pick-cover-link"
          role="button"
          tabIndex={0}
          aria-label={`About ${b.t}`}
          aria-haspopup="dialog"
          onClick={() => openSheet(id)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            openSheet(id);
          }}
        >
          <Cover id={id} cls="cover-lg" />
        </div>
        <div className="pick-info">
          <h3 className="ttl d">
            <button
              type="button"
              className="pick-title-link"
              onClick={() => openSheet(id)}
              aria-label={`About ${b.t}`}
              aria-haspopup="dialog"
            >
              {b.t}
            </button>
          </h3>
          <div className="pick-author">{b.a}</div>
          <blockquote className="quote it">&ldquo;{b.q}&rdquo;</blockquote>
          <button type="button" className="btn" onClick={() => startAsk(id)} aria-label={`Ask Scout about ${b.t}`}>
            ASK <Icon name="ti-arrow-right" />
          </button>
        </div>
      </article>
    </div>
  );
}

function Dots() {
  const pickIndex = useStore((s) => s.pickIndex);
  const setPick = useStore((s) => s.setPick);
  return (
    <div className="dots" id="dotsRow">
      {PICKS.map((_, i) => (
        <button
          key={i}
          className={`dot ${i === pickIndex ? 'on' : ''}`}
          aria-label={`Show pick ${i + 1} of ${PICKS.length}`}
          onClick={() => setPick(i)}
        />
      ))}
    </div>
  );
}

/* ---------- pick up where you left off ---------- */
function Shelf() {
  const readingIds = useStore((s) => s.readingIds);
  const pagesRead = useStore((s) => s.pagesRead);
  const openBook = useStore((s) => s.openBook);
  const setTab = useStore((s) => s.setTab);
  return (
    <section className="sec resume-sec" aria-labelledby="resume-title">
      <div className="sec-head">
        <h2 className="sec-title d" id="resume-title">pick up where you left off</h2>
        <button className="all" data-tab="library" onClick={() => setTab('library')}>
          ALL &rarr;
        </button>
      </div>
      <div className="shelf" id="shelf">
        {readingIds.map((id) => {
          const b = getBook(id);
          if (!b) return null;
          const p = pct(pagesRead[id] ?? 0, b.n);
          return (
            <button
              key={id}
              className="sh-item"
              onClick={() => openBook(id)}
              aria-label={`Continue ${b.t}, ${p}% complete`}
            >
              <div className="sh-cover-wrap">
                <Cover id={id} cls="cover-home" />
                <span className="sh-badge">{p}%</span>
              </div>
              <div className="sh-title d">{b.t}</div>
              <div className="sh-author">{b.a}</div>
              <div className="mini-track">
                <div className="mini-fill" style={{ width: `${p}%` }} />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function TodayScreen() {
  const active = useStore((s) => s.activeTab === 'today');
  return (
    <section className={`screen ${active ? 'on' : ''}`} id="screen-today">
      <Masthead />
      <StatsRow />
      <div className="marquee">
        <h2 className="mq" aria-label="Today's post">
          <span>today&rsquo;s</span>
          <span>post<span className="gdot">.</span></span>
        </h2>
        <div className="mq-sub it">delivered while you slept.</div>
        <CastOwl owl="scout" cls="hero" />
      </div>
      <PickCard />
      <Dots />
      <Shelf />
    </section>
  );
}
