import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../store/useAuth';
import { getBook } from '../../lib/bookRegistry';
import { useLang, useT } from '../../i18n/react';
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
  DEFAULT_BIO,
  IG_STATS,
} from '../../content/profile';
import { Icon } from '../Icon';
import { Cover } from '../Cover';
import { CastOwl } from '../CastOwl';
import { RadarChart } from '../profile/RadarChart';
import { MemoryCard } from '../profile/MemoryCard';
import { ShelfSection } from '../profile/ShelfSection';
import { StageBar } from '../stage';

type ProfileTab = 'stats' | 'cal' | 'quotes' | 'mem';

/* ---------- stats tab ---------- */
function StatsTab({ radarKey }: { radarKey: number }) {
  const t = useT();
  const lang = useLang();
  return (
    <div className="tpanel on swap" id="tab-stats" role="tabpanel" aria-labelledby="tabbtn-stats">
      <div className="pcard radar go" id="radarCard">
        <div className="chart-head">
          <div className="d">{t.profile.readingBalance}</div>
          <span>{t.profile.sixShelves}</span>
        </div>
        <RadarChart replayKey={radarKey} />
        <p className="radar-note it">{RADAR_NOTE[lang]}</p>
        <div className="pdiv" />
        <div className="rep-grid">
          {REPORT[lang].map((r) => (
            <div key={r.l} className="rcell">
              <div className="snum d">{r.n}</div>
              <div className="slab">{r.l}</div>
            </div>
          ))}
        </div>
        <div className="pdiv" />
        <div className="chart-head">
          <div className="d">{t.profile.thisWeek}</div>
          <span>{WEEK_TIME[lang]}</span>
        </div>
        <div className="week7">
          {WEEK7.map((w, i) => (
            <div key={i} className="day">
              <div className="vtrack">
                <div className={`vfill ${w.today ? 'today' : ''}`} style={{ height: `${w.h}%` }} />
              </div>
              <span className="dlet">{t.profile.weekdays[i]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="achgrid">
        {ACHIEVEMENTS[lang].map((a, i) => (
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
  const t = useT();
  const lang = useLang();
  const [selDay, setSelDay] = useState(CTODAY);
  const rec = RECS[selDay];
  const bk = getBook(rec.book);
  return (
    <div className="tpanel on swap" id="tab-cal" role="tabpanel" aria-labelledby="tabbtn-cal">
      <div className="pcard">
        <div className="chart-head">
          <div className="d">{CMONTH[lang]}</div>
          <span id="calCount">{t.profile.owlPosts(Object.keys(RECS).length)}</span>
        </div>
        <div className="cal-week" aria-hidden="true">
          {t.profile.weekdays.map((d, i) => (
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
                  dayRec
                    ? t.profile.calDayAria(d, getBook(dayRec.book)?.t ?? '')
                    : t.profile.calDayAriaPlain(d)
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
          <i aria-hidden="true" />{t.profile.calFoot}
        </div>
      </div>
      <div className="pcard" id="recCard" aria-live="polite" key={selDay}>
        <div className="rec-kick">
          <div className="stamp">
            <Icon name="ti-mail" />
          </div>
          <span className="k">{t.profile.owlPost(selDay)}</span>
        </div>
        <div className="rec-lab">{t.profile.youAsked}</div>
        <div className="ask">{rec.q[lang]}</div>
        <div className="rec-lab">{t.profile.youPeeked}</div>
        <div className="prev-row">
          <Cover id={rec.book} cls="cover-xs" />
          <div>
            <div className="prev-ttl d">{bk?.t}</div>
            <div className="prev-auth">{bk?.a}</div>
            <div className="prev-note">{t.profile.firstPages}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- quotes tab ---------- */
function QuoteCard({ index }: { index: number }) {
  const t = useT();
  const lang = useLang();
  const q = QUOTES[index];
  const bk = getBook(q.book);
  const showToast = useStore((s) => s.showToast);
  const [done, setDone] = useState(false);

  if (!bk) return null; // seeded quotes use catalog ids — always resolves

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(t.profile.clipQuote(q.x[lang], bk.a, bk.t));
      showToast('ti-copy', t.profile.copiedToast, 'scribe');
    } catch {
      showToast('ti-copy', t.profile.keptToast, 'scribe');
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
        <div className="q-text it">&ldquo;{q.x[lang]}&rdquo;</div>
      </div>
      <button className={`q-copy ${done ? 'done' : ''}`} aria-label={t.profile.copyAria} onClick={copy}>
        <Icon name="ti-copy" />
      </button>
      <div className="q-meta">
        <span className="q-by">
          {bk.a} · {bk.t}
        </span>
        <span className="q-date">{t.profile.keptOn(q.d[lang])}</span>
      </div>
    </article>
  );
}

function QuotesTab() {
  const t = useT();
  return (
    <div className="tpanel on swap" id="tab-quotes" role="tabpanel" aria-labelledby="tabbtn-quotes">
      <div className="sec">
        <div className="sec-head">
          <div className="qhead">
            <CastOwl owl="scribe" cls="mini" />
            <div className="sec-title d">{t.profile.tuckedAway}</div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--fade)', fontWeight: 700 }}>{t.profile.quotesKept(QUOTES.length)}</span>
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

/* ---------- memory tab ---------- */
function MemTab() {
  return (
    <div className="tpanel on swap" id="tab-mem" role="tabpanel" aria-labelledby="tabbtn-mem">
      <MemoryCard />
    </div>
  );
}

/* ---------- bio line — instagram-benched: tap to edit in place, tap done to keep it ---------- */
function BioRow() {
  const t = useT();
  const lang = useLang();
  const bio = useStore((s) => s.prefs.bio) ?? DEFAULT_BIO[lang];
  const setPref = useStore((s) => s.setPref);
  const showToast = useStore((s) => s.showToast);
  const [editing, setEditing] = useState(false);
  const bioRef = useRef<HTMLParagraphElement>(null);

  // entering edit mode: focus the line and park the caret at the end
  useEffect(() => {
    if (!editing) return;
    const el = bioRef.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing]);

  const toggle = () => {
    if (editing) {
      setPref('bio', bioRef.current?.textContent?.trim() ?? '');
      setEditing(false);
      showToast('ti-check', t.profile.bioKept);
    } else {
      setEditing(true);
    }
  };

  return (
    <>
      {/* keyed remount on toggle keeps React's text child in sync with the user's edits */}
      <p
        key={editing ? 'editing' : 'kept'}
        className="bio"
        ref={bioRef}
        contentEditable={editing}
        suppressContentEditableWarning
        onKeyDown={(e) => {
          // enter = done, like a caption field
          if (e.key === 'Enter') {
            e.preventDefault();
            toggle();
          }
        }}
      >
        {bio}
      </p>
      <button className="editbio" onClick={toggle}>
        <Icon name={editing ? 'ti-check' : 'ti-pencil'} />
        <span>{editing ? t.profile.bioDone : t.profile.bioEdit}</span>
      </button>
    </>
  );
}

/* ---------- profile screen ---------- */
/* [key, icon] — the visible label comes from t.profile.tabs[key] */
const BASE_TABS: [ProfileTab, string][] = [
  ['stats', 'ti-radar-2'],
  ['cal', 'ti-calendar-event'],
  ['quotes', 'ti-quote'],
];
const MEM_TAB: [ProfileTab, string] = ['mem', 'ti-feather'];

export function ProfileScreen() {
  const t = useT();
  const lang = useLang();
  const active = useStore((s) => s.activeTab === 'profile');
  const lv = useStore((s) => s.lv);
  const coins = useStore((s) => s.coins);
  const streak = useStore((s) => s.streak);
  const openSettings = useStore((s) => s.openSettings);
  const prefName = useStore((s) => s.prefs.name);
  // the profile display (avatar/name) + the memory-tab gate use the rich useAuth
  // profile; sign-out lives in Settings (product). Chat/history gate on
  // useStore.authUser separately — both reflect the same Supabase session.
  const authUser = useAuth((s) => (s.status === 'authed' ? s.user : null));

  const [profileTab, setProfileTab] = useState<ProfileTab>('stats');
  const [radarKey, setRadarKey] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  // replay the radar pop whenever the profile tab is entered (mockup replayRadar)
  useEffect(() => {
    if (active) setRadarKey((k) => k + 1);
  }, [active]);

  // guard against an orphaned "memory" tab if the reader signs out while viewing it
  useEffect(() => {
    if (profileTab === 'mem' && !authUser) setProfileTab('stats');
  }, [authUser, profileTab]);

  const tabs = authUser ? [...BASE_TABS, MEM_TAB] : BASE_TABS;

  const switchTab = (key: ProfileTab) => {
    setProfileTab(key);
    sectionRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    if (key === 'stats') setRadarKey((k) => k + 1);
  };

  return (
    <section className={`screen ${active ? 'on' : ''}`} id="screen-profile" ref={sectionRef}>
      <StageBar />
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
        <button className="iconbtn lite set-gear" aria-label={t.profile.settingsAria} onClick={openSettings}>
          <Icon name="ti-settings" />
        </button>
      </div>

      <div className="prof-top">
        <div className="ig">
          <div className="ig-ava d" aria-hidden="true">
            {(prefName?.[0] ?? authUser?.avatar ?? 'M').toUpperCase()}
          </div>
          <div className="ig-main">
            <div className="pname d">{prefName ?? authUser?.name ?? 'Mira'}</div>
            <div className="psub">{t.profile.psub(lv, coins)}</div>
            <div className="ig-stats">
              {IG_STATS[lang].map((s) => (
                <button
                  key={s.l}
                  className={`ig-stat ${profileTab === s.tab ? 'on' : ''}`}
                  aria-label={s.aria}
                  onClick={() => switchTab(s.tab)}
                >
                  <b className="d">{s.n}</b>
                  <span>{s.l}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <BioRow />
        <div className="streak">
          <div className="flamebox">
            <Icon name="ti-flame" />
          </div>
          <div>
            <div className="stk-t d">{t.profile.streakDays(streak)}</div>
            <div className="stk-s">{t.profile.keepKindled}</div>
          </div>
          <div className="wkdots" aria-label={t.profile.wkdotsAria(WK_DOTS.length)}>
            {WK_DOTS.map((d, i) => (
              <span key={i} className={`wd ${d.today ? 'today' : d.on ? 'on' : ''}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="ptabs" role="tablist" aria-label={t.profile.sectionsAria}>
        {tabs.map(([key, icon]) => {
          const on = profileTab === key;
          return (
            <button
              key={key}
              id={`tabbtn-${key}`}
              className={`ptab ${on ? 'on' : ''}`}
              role="tab"
              aria-selected={on}
              aria-controls={`tab-${key}`}
              onClick={() => switchTab(key)}
            >
              <Icon name={icon} />
              {t.profile.tabs[key]}
            </button>
          );
        })}
      </div>

      <div className="pb-psheet">
        {profileTab === 'stats' && <StatsTab radarKey={radarKey} />}
        {profileTab === 'cal' && <CalendarTab />}
        {profileTab === 'quotes' && <QuotesTab />}
        {profileTab === 'mem' && <MemTab />}

        {/* the Keeper's shelves — the old Library tab, folded in at the profile's foot */}
        <ShelfSection />
      </div>
    </section>
  );
}
