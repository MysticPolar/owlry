import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { BOOKS } from '../../content/books';
import {
  RADAR_NOTE,
  REPORT,
  WEEK7,
  WEEK_TIME,
  ACHIEVEMENTS,
  WK_DOTS,
  CMONTH,
  CTODAY,
  CDAYS,
  RECS,
  QUOTES,
} from '../../content/profile';
import { Icon } from '../Icon';
import { Cover } from '../Cover';
import { CastOwl } from '../CastOwl';
import { RadarChart } from '../profile/RadarChart';

type ProfileTab = 'stats' | 'cal' | 'quotes';

/* ---------- stats tab ---------- */
function StatsTab({ radarKey }: { radarKey: number }) {
  return (
    <div className="tpanel on swap" id="tab-stats" role="tabpanel">
      <div className="pcard radar go" id="radarCard">
        <div className="chart-head">
          <div className="d">reading balance</div>
          <span>six shelves of you</span>
        </div>
        <RadarChart replayKey={radarKey} />
        <p className="radar-note it">{RADAR_NOTE}</p>
        <div className="pdiv" />
        <div className="rep-grid">
          {REPORT.map((r) => (
            <div key={r.l} className="rcell">
              <div className="snum d">{r.n}</div>
              <div className="slab">{r.l}</div>
            </div>
          ))}
        </div>
        <div className="pdiv" />
        <div className="chart-head">
          <div className="d">this week</div>
          <span>{WEEK_TIME}</span>
        </div>
        <div className="week7">
          {WEEK7.map((w, i) => (
            <div key={i} className="day">
              <div className="vtrack">
                <div className={`vfill ${w.today ? 'today' : ''}`} style={{ height: `${w.h}%` }} />
              </div>
              <span className="dlet">{w.d}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="achgrid">
        {ACHIEVEMENTS.map((a, i) => (
          <div key={i} className={`ach ${a.lock ? 'lock' : ''}`}>
            <Icon name={a.i} />
            <span className="al">{a.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- calendar tab ---------- */
function CalendarTab() {
  const [selDay, setSelDay] = useState(CTODAY);
  const rec = RECS[selDay];
  const bk = BOOKS[rec.book];
  return (
    <div className="tpanel on swap" id="tab-cal" role="tabpanel">
      <div className="pcard">
        <div className="chart-head">
          <div className="d">{CMONTH}</div>
          <span id="calCount">{Object.keys(RECS).length} owl posts</span>
        </div>
        <div className="cal-week" aria-hidden="true">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="cal-grid" id="calGrid">
          {Array.from({ length: CDAYS }, (_, idx) => {
            const d = idx + 1;
            const dayRec = RECS[d];
            const isToday = d === CTODAY;
            const off = d > CTODAY;
            const sel = d === selDay;
            const clickable = !!dayRec && !off;
            const cls = ['cd', isToday && 'today', off && 'off', dayRec && 'rec', sel && 'sel']
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={d}
                className={cls}
                disabled={!clickable}
                aria-label={
                  dayRec ? `june ${d} — asked the owl, previewed ${BOOKS[dayRec.book].t}` : `june ${d}`
                }
                aria-pressed={dayRec ? sel : undefined}
                onClick={clickable ? () => setSelDay(d) : undefined}
              >
                {d}
              </button>
            );
          })}
        </div>
        <div className="cal-foot">
          <i aria-hidden="true" />a day you asked the owl &amp; previewed a pick
        </div>
      </div>
      <div className="pcard" id="recCard" aria-live="polite" key={selDay}>
        <div className="rec-kick">
          <div className="stamp">
            <Icon name="ti-mail" />
          </div>
          <span className="k">OWL POST · JUN {selDay}</span>
        </div>
        <div className="rec-lab">YOU ASKED</div>
        <div className="ask">{rec.q}</div>
        <div className="rec-lab">YOU PREVIEWED</div>
        <div className="prev-row">
          <Cover id={rec.book} cls="cover-xs" />
          <div>
            <div className="prev-ttl d">{bk.t}</div>
            <div className="prev-auth">{bk.a}</div>
            <div className="prev-note">first pages, by owl</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- quotes tab ---------- */
function QuoteCard({ index }: { index: number }) {
  const q = QUOTES[index];
  const bk = BOOKS[q.book];
  const showToast = useStore((s) => s.showToast);
  const [done, setDone] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`“${q.x}” — ${bk.a}, ${bk.t}`);
      showToast('ti-copy', 'copied — word for word.', 'scribe');
    } catch {
      showToast('ti-copy', 'kept. word for word.', 'scribe');
    }
    setDone(false);
    requestAnimationFrame(() => setDone(true));
  };

  return (
    <article className="qcard">
      <div className="q-top">
        <div className="q-stamp" style={{ background: bk.c, color: bk.tc ?? '#E8E0BC' }}>
          <Icon name="ti-quote" />
        </div>
        <div className="q-text it">&ldquo;{q.x}&rdquo;</div>
      </div>
      <button className={`q-copy ${done ? 'done' : ''}`} aria-label="Copy quote" onClick={copy}>
        <Icon name="ti-copy" />
      </button>
      <div className="q-meta">
        <span className="q-by">
          {bk.a} · {bk.t}
        </span>
        <span className="q-date">kept {q.d}</span>
      </div>
    </article>
  );
}

function QuotesTab() {
  return (
    <div className="tpanel on swap" id="tab-quotes" role="tabpanel">
      <div className="sec">
        <div className="sec-head">
          <div className="qhead">
            <CastOwl owl="scribe" cls="mini" />
            <div className="sec-title d">tucked away</div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--fade)', fontWeight: 700 }}>{QUOTES.length} quotes kept</span>
        </div>
        <div className="qlist" id="qList" style={{ paddingTop: 0 }}>
          {QUOTES.map((_, i) => (
            <QuoteCard key={i} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- profile screen ---------- */
const TABS: [ProfileTab, string, string][] = [
  ['stats', 'ti-radar-2', 'stats'],
  ['cal', 'ti-calendar-event', 'calendar'],
  ['quotes', 'ti-quote', 'quotes'],
];

export function ProfileScreen() {
  const active = useStore((s) => s.activeTab === 'profile');
  const lv = useStore((s) => s.lv);
  const coins = useStore((s) => s.coins);
  const streak = useStore((s) => s.streak);
  const openSettings = useStore((s) => s.openSettings);

  const [profileTab, setProfileTab] = useState<ProfileTab>('stats');
  const [radarKey, setRadarKey] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  // replay the radar pop whenever the profile tab is entered (mockup replayRadar)
  useEffect(() => {
    if (active) setRadarKey((k) => k + 1);
  }, [active]);

  const switchTab = (key: ProfileTab) => {
    setProfileTab(key);
    sectionRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    if (key === 'stats') setRadarKey((k) => k + 1);
  };

  return (
    <section className={`screen ${active ? 'on' : ''}`} id="screen-profile" ref={sectionRef}>
      <div className="pad-h">
        <span className="ghost" aria-hidden="true">
          Mirror
        </span>
        <h1 className="hl sm d">
          <span className="u" />
          <span className="t">
            profile<span className="gdot">.</span>
          </span>
        </h1>
        <CastOwl owl="mirror" cls="mini" />
        <button className="iconbtn lite set-gear" aria-label="Settings" onClick={openSettings}>
          <Icon name="ti-settings" />
        </button>
      </div>

      <div className="pcard">
        <div className="prof">
          <div className="avatar lg d">M</div>
          <div>
            <div className="pname d">Mira</div>
            <div className="psub">
              LV {lv} BIBLIOPHILE · {coins} COINS
            </div>
          </div>
        </div>
        <div className="pdiv" />
        <div className="streak">
          <div className="flamebox">
            <Icon name="ti-flame" />
          </div>
          <div>
            <div className="stk-t d">{streak}-day streak</div>
            <div className="stk-s">keep it kindled</div>
          </div>
          <div className="wkdots" aria-label={`Reading streak, ${WK_DOTS.length} days this week`}>
            {WK_DOTS.map((d, i) => (
              <span key={i} className={`wd ${d.today ? 'today' : d.on ? 'on' : ''}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="seg" role="tablist" aria-label="Profile sections">
        {TABS.map(([key, icon, label]) => {
          const on = profileTab === key;
          return (
            <button
              key={key}
              className={`chip grow ${on ? 'on' : ''}`}
              role="tab"
              aria-selected={on}
              onClick={() => switchTab(key)}
            >
              <Icon name={icon} />
              {label}
            </button>
          );
        })}
      </div>

      {profileTab === 'stats' && <StatsTab radarKey={radarKey} />}
      {profileTab === 'cal' && <CalendarTab />}
      {profileTab === 'quotes' && <QuotesTab />}
    </section>
  );
}
