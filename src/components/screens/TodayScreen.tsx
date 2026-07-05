import { useRef } from 'react';
import { useStore } from '../../store/useStore';
import { BOOKS } from '../../content/books';
import { PICKS } from '../../content/picks';
import { WX } from '../../content/weather';
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
  return (
    <div className="stats">
      <div className="avatar d">M</div>
      <div className="bars">
        <div className="brow">
          <span className="blab d" id="lvLab">
            LV {lv}
          </span>
          <div className="track">
            <div className="fill xp" style={{ width: `${(xp / xpMax) * 100}%` }} />
          </div>
          <span className="bval">{xp} XP</span>
        </div>
        <div className="brow">
          <span className="blab d">INK</span>
          <div className="track">
            <div className="fill ink" style={{ width: `${(ink / inkMax) * 100}%` }} />
          </div>
          <span className="bval">
            {ink}/{inkMax}
          </span>
        </div>
      </div>
      <div className="coins">
        <Icon name="ti-coin" />
        <span>{coins}</span>
      </div>
    </div>
  );
}

/* ---------- today's pick carousel ---------- */
function PickCard() {
  const pickIndex = useStore((s) => s.pickIndex);
  const setPick = useStore((s) => s.setPick);
  const saved = useStore((s) => s.savedIds.includes(PICKS[s.pickIndex]));
  const resuming = useStore((s) => !!s.pagesRead[PICKS[s.pickIndex]]);
  const toggleSave = useStore((s) => s.toggleSave);
  const openReader = useStore((s) => s.openReader);

  const id = PICKS[pickIndex];
  const b = BOOKS[id];
  const swipeX = useRef<number | null>(null);

  return (
    <div className="pick-wrap">
      <div
        className="card swap"
        key={pickIndex}
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
          className={`save ${saved ? 'on' : ''}`}
          aria-label="Save to library"
          aria-pressed={saved}
          onClick={() => toggleSave(id)}
        >
          <Icon name="ti-heart" />
        </button>
        <Cover id={id} cls="cover-lg" />
        <div className="pick-info">
          <div className="lk">
            owl post &middot; n&ordm; {pickIndex + 1} of {PICKS.length}
          </div>
          <div className="ttl d">{b.t}</div>
          <div className="auth">{b.a}</div>
          <div className="quote it">&ldquo;{b.q}&rdquo;</div>
          <button className="btn" onClick={() => openReader(id)}>
            {resuming ? 'RESUME' : 'OPEN'} <Icon name="ti-arrow-right" />
          </button>
        </div>
      </div>
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
  const openReader = useStore((s) => s.openReader);
  const setTab = useStore((s) => s.setTab);
  return (
    <div className="sec">
      <div className="sec-head">
        <div className="sec-title d">pick up where you left off</div>
        <button className="all" data-tab="library" onClick={() => setTab('library')}>
          ALL &rarr;
        </button>
      </div>
      <div className="shelf" id="shelf">
        {readingIds.map((id) => {
          const b = BOOKS[id];
          const p = pct(pagesRead[id] ?? 0, b.n);
          return (
            <button key={id} className="sh-item" onClick={() => openReader(id)}>
              <Cover id={id} cls="cover-sm" />
              <div className="sh-title d">{b.t}</div>
              <div className="mini-track">
                <div className="mini-fill" style={{ width: `${p}%` }} />
              </div>
              <div className="mini-pct">{p}%</div>
            </button>
          );
        })}
        <div className="ph">
          <div className="cover cover-sm" style={{ background: '#5E7A55' }} />
        </div>
      </div>
    </div>
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
          <span>today's</span>
          <span>
            post<span className="gdot">.</span>
          </span>
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
