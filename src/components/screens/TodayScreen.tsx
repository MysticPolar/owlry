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
  const readerName = name?.trim() || 'Mira';
  const xpPercent = Math.min(100, Math.max(0, (xp / Math.max(1, xpMax)) * 100));
  const inkPercent = Math.min(100, Math.max(0, (ink / Math.max(1, inkMax)) * 100));

  return (
    <section className="today-player" aria-label="Your reading progress">
      <div className="today-player-portrait" role="img" aria-label={`${readerName}'s reader portrait`}>
        <img className="today-player-portrait-art" src="/user-bar-v3/portrait.png" alt="" aria-hidden="true" />
      </div>

      <div className="today-player-level-badge" role="img" aria-label={`Level ${lv}`}>
        <img src="/user-bar-v3/level-badge.png" alt="" aria-hidden="true" />
        <span className="d" aria-hidden="true">
          LV <strong>{lv}</strong>
        </span>
      </div>

      <div className="today-player-progress">
        <div className="today-player-meter today-player-meter-xp">
          <img className="today-player-emblem" src="/user-bar-v3/xp.png" alt="" aria-hidden="true" />
          <span className="today-player-meter-label d">{xp} XP</span>
          <div
            className="today-player-track"
            role="progressbar"
            aria-label={`Level ${lv} experience`}
            aria-valuemin={0}
            aria-valuemax={xpMax}
            aria-valuenow={xp}
          >
            <span className="today-player-fill" style={{ width: `${xpPercent}%` }} />
          </div>
        </div>

        <div className="today-player-meter today-player-meter-ink">
          <img className="today-player-emblem" src="/user-bar-v3/ink.png" alt="" aria-hidden="true" />
          <span className="today-player-meter-label d">INK</span>
          <div
            className="today-player-track"
            role="progressbar"
            aria-label="Ink"
            aria-valuemin={0}
            aria-valuemax={inkMax}
            aria-valuenow={ink}
          >
            <span className="today-player-fill" style={{ width: `${inkPercent}%` }} />
          </div>
          <span className="today-player-meter-value d">
            {ink}/{inkMax}
          </span>
        </div>
      </div>

      <div className="today-player-coins" role="group" aria-label={`${coins} coins`}>
        <img className="today-player-coin" src="/user-bar-v3/coin.png" alt="" aria-hidden="true" />
        <strong className="d">{coins}</strong>
      </div>
    </section>
  );
}

/* ---------- today's pick carousel — the quote is the hero, no cover ---------- */
function PickCard() {
  const pickIndex = useStore((s) => s.pickIndex);
  const setPick = useStore((s) => s.setPick);
  const openSheet = useStore((s) => s.openSheet);
  const startAsk = useStore((s) => s.startAsk);

  const id = PICKS[pickIndex];
  const b = BOOKS[id];
  const swipeX = useRef<number | null>(null);

  return (
    <div className="pick-wrap">
      <article
        className="quote-post swap"
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
        <blockquote className="quote-hero">
          {b.q}
        </blockquote>

        <div className="quote-source">
          <button
            type="button"
            className="quote-title d"
            onClick={() => openSheet(id)}
            aria-label={`About ${b.t}`}
            aria-haspopup="dialog"
          >
            {b.t}
          </button>
          <span className="quote-author">{b.a}</span>
        </div>

        <div className="quote-actions">
          <button
            type="button"
            className="btn ask-btn"
            onClick={() => startAsk(id)}
            aria-label={`Ask Scout about ${b.t}`}
          >
            ASK <Icon name="ti-arrow-right" />
          </button>
        </div>
      </article>
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
      <Shelf />
    </section>
  );
}
