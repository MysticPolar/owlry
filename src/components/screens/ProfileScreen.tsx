import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { LV_CAP, ROWS, encoreStars, rowFromLevel, seatMovesAt } from '../../lib/economy/curve';
import {
  localDayKey,
  monthLabel,
  radarDimsFromSnapshot,
  radarNoteFromDims,
  reportFromStats,
  weekBarsFromCalendar,
} from '../../lib/economy/profileView';
import type { CalendarDay, QuoteRow } from '../../lib/economy/types';
import { STUBS } from '../../content/stubs';
import { useLevelFlash } from '../StatFx';
import { useAuth } from '../../store/useAuth';
import { getBook } from '../../lib/bookRegistry';
import { useLang, useT } from '../../i18n/react';
import {
  RADAR_NOTE,
  REPORT,
  WEEK7,
  WEEK_TIME,
  CMONTH,
  CTODAY,
  CDAYS,
  RECS,
  QUOTES,
  DEFAULT_BIO,
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
  const radar = useStore((s) => s.profileRadar);
  const stats = useStore((s) => s.profileStats);
  const calendar = useStore((s) => s.profileCalendar);
  const live = radar !== null && stats !== null;

  const dims = useMemo(
    () => (live ? radarDimsFromSnapshot(radar!, lang) : undefined),
    [live, radar, lang],
  );
  const note = live ? radarNoteFromDims(dims!, lang) : RADAR_NOTE[lang];
  const report = live ? reportFromStats(stats!, lang) : REPORT[lang];
  const week = useMemo(() => {
    if (!live || !calendar) return { bars: WEEK7, label: WEEK_TIME[lang] };
    const { bars, posts } = weekBarsFromCalendar(calendar);
    return {
      bars,
      label: posts > 0 ? t.profile.weekPosts(posts) : t.profile.weekQuiet,
    };
  }, [live, calendar, lang, t.profile]);

  return (
    <div className="tpanel on swap" id="tab-stats" role="tabpanel" aria-labelledby="tabbtn-stats">
      <div className="pcard radar go" id="radarCard">
        <div className="chart-head">
          <div className="d">{t.profile.readingBalance}</div>
          <span>{t.profile.sixShelves}</span>
        </div>
        <RadarChart replayKey={radarKey} dims={dims} />
        <p className="radar-note it">{note}</p>
        <div className="pdiv" />
        <div className="rep-grid">
          {report.map((r) => (
            <div key={r.l} className="rcell">
              <div className="snum d">{r.n}</div>
              <div className="slab">{r.l}</div>
            </div>
          ))}
        </div>
        <div className="pdiv" />
        <div className="chart-head">
          <div className="d">{t.profile.thisWeek}</div>
          <span>{week.label}</span>
        </div>
        <div className="week7">
          {week.bars.map((w, i) => (
            <div key={i} className="day">
              <div className="vtrack">
                <div className={`vfill ${w.today ? 'today' : ''}`} style={{ height: `${w.h}%` }} />
              </div>
              <span className="dlet">{t.profile.weekdays[i]}</span>
            </div>
          ))}
        </div>
      </div>
      <Album />
    </div>
  );
}

/* ---------- the album: ticket stubs, by programme ----------
   Every stub is granted from the ledger (or, for guests, the local engine).
   Nothing is decided here — the album only lays them out, newest programme
   first, with the ones still to be earned kept quietly at the foot. */
function Album() {
  const stubs = useStore((s) => s.stubs);
  const t = useT().profile;
  const lang = useLang();

  const { seasons, missing, encores } = useMemo(() => {
    const encoreCount = stubs.reduce((n, s) => (s.id === 'encore' ? n + 1 : n), 0);
    const shown = stubs.filter((s) => s.id !== 'encore');
    const bySeason = new Map<string, { year: number; q: number; items: typeof shown }>();
    for (const stub of shown) {
      const at = new Date(stub.at);
      const year = at.getFullYear();
      const q = Math.floor(at.getMonth() / 3) + 1;
      const key = `${year}-${q}`;
      if (!bySeason.has(key)) bySeason.set(key, { year, q, items: [] });
      bySeason.get(key)!.items.push(stub);
    }
    const earned = new Set(shown.map((s) => s.id));
    return {
      seasons: [...bySeason.values()].sort((a, b) => b.year - a.year || b.q - a.q),
      missing: Object.keys(STUBS).filter((id) => id !== 'encore' && !earned.has(id)),
      encores: encoreCount,
    };
  }, [stubs]);

  const label = (id: string): string => (lang === 'zh' ? STUBS[id]?.zh : STUBS[id]?.en) ?? id;

  return (
    <div className="pcard album">
      <div className="chart-head">
        <div className="d">{t.albumTitle}</div>
        <span>{stubs.length ? t.albumCount(stubs.length) : t.albumEmpty}</span>
      </div>

      {seasons.map(({ year, q, items }) => (
        <div key={`${year}-${q}`} className="alb-season">
          <div className="alb-head">{t.albumSeason(year, q)}</div>
          <div className="achgrid">
            {items.map((s) => (
              <div key={`${s.id}-${s.at}`} className="ach">
                <Icon name={STUBS[s.id]?.i ?? 'ti-ticket'} />
                <span className="al">{label(s.id)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {encores > 0 && (
        <div className="alb-season">
          <div className="achgrid">
            <div className="ach encore">
              <Icon name="ti-star" />
              <span className="al">{t.albumEncore(encores)}</span>
            </div>
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div className="alb-season">
          <div className="achgrid">
            {missing.map((id) => (
              <div key={id} className="ach lock">
                <Icon name={STUBS[id]?.i ?? 'ti-ticket'} />
                <span className="al">{label(id)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- the seat map: thirteen rows, the stage at the top ---------- */
function SeatMap({ lv }: { lv: number }) {
  const t = useT().profile;
  const row = rowFromLevel(lv);
  return (
    <div className="pb-seatmap" role="img" aria-label={t.seatAria(row, lv)}>
      <span className="pb-stagelip" aria-hidden="true" />
      {Array.from({ length: ROWS }, (_, i) => {
        // row 1 is nearest the stage and the climb runs 13 → 1, so the rows
        // already CROSSED are the ones numbered ABOVE the current seat
        const r = i + 1;
        return <span key={r} className={`pb-seatrow${r === row ? ' on' : ''}${r > row ? ' past' : ''}`} />;
      })}
    </div>
  );
}

/* ---------- calendar tab ---------- */
function MockCalendarTab() {
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

function LiveCalendarTab({ calendar }: { calendar: CalendarDay[] }) {
  const t = useT();
  const lang = useLang();
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    for (const row of calendar) map.set(row.day, row);
    return map;
  }, [calendar]);

  const focus = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    if (byDay.has(localDayKey(today))) return today;
    const latest = calendar[0]?.day;
    if (latest) {
      const [y, m, d] = latest.split('-').map(Number);
      return new Date(y!, m! - 1, d!, 12);
    }
    return today;
  }, [byDay, calendar]);

  const year = focus.getFullYear();
  const month = focus.getMonth(); // 0-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = localDayKey(new Date());
  const pad = (focus.getDay() + 6) % 7; // monday-first leading blanks

  const activeDays = useMemo(
    () =>
      [...byDay.values()]
        .filter((row) => row.day.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
        .filter((row) => (row.owl_posts ?? 0) > 0 || row.previewed_book || row.asked),
    [byDay, year, month],
  );

  const defaultKey =
    activeDays.find((r) => r.day === todayKey)?.day
    ?? activeDays[0]?.day
    ?? todayKey;
  const [selKey, setSelKey] = useState(defaultKey);
  useEffect(() => {
    setSelKey(defaultKey);
  }, [defaultKey]);

  const sel = byDay.get(selKey);
  const bk = sel?.previewed_book ? getBook(sel.previewed_book) : null;
  const dayNum = Number(selKey.slice(-2));
  const stampLabel =
    lang === 'zh'
      ? `${month + 1}月${dayNum}日`
      : focus.toLocaleString('en-US', { month: 'short' }).toUpperCase() + ` ${dayNum}`;

  return (
    <div className="tpanel on swap" id="tab-cal" role="tabpanel" aria-labelledby="tabbtn-cal">
      <div className="pcard">
        <div className="chart-head">
          <div className="d">{monthLabel(focus, lang)}</div>
          <span id="calCount">{t.profile.owlPosts(activeDays.length)}</span>
        </div>
        <div className="cal-week" aria-hidden="true">
          {t.profile.weekdays.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="cal-grid" id="calGrid">
          {Array.from({ length: pad }, (_, i) => (
            <span key={`pad-${i}`} className="cd off" aria-hidden="true" />
          ))}
          {Array.from({ length: daysInMonth }, (_, idx) => {
            const d = idx + 1;
            const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const row = byDay.get(key);
            const has = !!(row && ((row.owl_posts ?? 0) > 0 || row.previewed_book || row.asked));
            const isToday = key === todayKey;
            const future = key > todayKey;
            const isSel = key === selKey;
            const clickable = has && !future;
            const cls = ['cd', isToday && 'today', future && 'off', has && 'rec', isSel && 'sel']
              .filter(Boolean)
              .join(' ');
            return (
              <button
                key={key}
                className={cls}
                disabled={!clickable}
                aria-label={
                  has && row?.previewed_book
                    ? t.profile.calDayAria(d, getBook(row.previewed_book)?.t ?? '')
                    : has
                      ? t.profile.calDayAriaAsked(d)
                      : t.profile.calDayAriaPlain(d)
                }
                aria-pressed={has ? isSel : undefined}
                onClick={clickable ? () => setSelKey(key) : undefined}
              >
                {d}
              </button>
            );
          })}
        </div>
        <div className="cal-foot">
          <i aria-hidden="true" />
          {activeDays.length ? t.profile.calFoot : t.profile.calEmpty}
        </div>
      </div>
      {sel && (sel.asked || sel.previewed_book) ? (
        <div className="pcard" id="recCard" aria-live="polite" key={selKey}>
          <div className="rec-kick">
            <div className="stamp">
              <Icon name="ti-mail" />
            </div>
            <span className="k">{t.profile.owlPostDated(stampLabel)}</span>
          </div>
          <div className="rec-lab">{t.profile.youAsked}</div>
          <div className="ask">{sel.asked?.trim() || t.profile.noAskYet}</div>
          <div className="rec-lab">{t.profile.youPeeked}</div>
          {bk && sel.previewed_book ? (
            <div className="prev-row">
              <Cover id={sel.previewed_book} cls="cover-xs" />
              <div>
                <div className="prev-ttl d">{bk.t}</div>
                <div className="prev-auth">{bk.a}</div>
                <div className="prev-note">{t.profile.firstPages}</div>
              </div>
            </div>
          ) : (
            <div className="ask">{t.profile.noPeekYet}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CalendarTab() {
  const calendar = useStore((s) => s.profileCalendar);
  if (calendar === null) return <MockCalendarTab />;
  return <LiveCalendarTab calendar={calendar} />;
}

/* ---------- quotes tab ---------- */
function MockQuoteCard({ index }: { index: number }) {
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

function LiveQuoteCard({ quote }: { quote: QuoteRow }) {
  const t = useT();
  const lang = useLang();
  const bk = getBook(quote.book);
  const showToast = useStore((s) => s.showToast);
  const [done, setDone] = useState(false);

  const keptLabel = (() => {
    const d = new Date(quote.kept_at);
    if (Number.isNaN(d.getTime())) return '';
    return lang === 'zh'
      ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  })();

  const author = bk?.a ?? '';
  const title = bk?.t ?? quote.book;
  const stampBg = bk?.c ?? '#3A3428';
  const stampFg = bk?.tc ?? '#E8E0BC';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(t.profile.clipQuote(quote.text, author, title));
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
        <div className="q-stamp" style={{ background: stampBg, color: stampFg }}>
          <Icon name="ti-quote" />
        </div>
        <div className="q-text it">&ldquo;{quote.text}&rdquo;</div>
      </div>
      <button className={`q-copy ${done ? 'done' : ''}`} aria-label={t.profile.copyAria} onClick={copy}>
        <Icon name="ti-copy" />
      </button>
      <div className="q-meta">
        <span className="q-by">
          {author ? `${author} · ${title}` : title}
        </span>
        {keptLabel ? <span className="q-date">{t.profile.keptOn(keptLabel)}</span> : null}
      </div>
    </article>
  );
}

function QuotesTab() {
  const t = useT();
  const quotes = useStore((s) => s.profileQuotes);
  const live = quotes !== null;
  const list = live ? quotes : null;

  return (
    <div className="tpanel on swap" id="tab-quotes" role="tabpanel" aria-labelledby="tabbtn-quotes">
      <div className="sec">
        <div className="sec-head">
          <div className="qhead">
            <CastOwl owl="scribe" cls="mini" />
            <div className="sec-title d">{t.profile.tuckedAway}</div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--fade)', fontWeight: 700 }}>
            {t.profile.quotesKept(live ? list!.length : QUOTES.length)}
          </span>
        </div>
        <div className="qlist" id="qList" style={{ paddingTop: 0 }}>
          {live ? (
            list!.length ? (
              list!.map((q) => <LiveQuoteCard key={q.id} quote={q} />)
            ) : (
              <p className="radar-note it" style={{ padding: '12px 4px' }}>
                {t.profile.quotesEmpty}
              </p>
            )
          ) : (
            QUOTES.map((_, i) => <MockQuoteCard key={i} index={i} />)
          )}
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
  const active = useStore((s) => s.activeTab === 'profile');
  const lv = useStore((s) => s.lv);
  const xp = useStore((s) => s.xp);
  const xpMax = useStore((s) => s.xpMax);
  const totalXp = useStore((s) => s.totalXp);
  const ink = useStore((s) => s.ink);
  const coins = useStore((s) => s.coins);
  const streak = useStore((s) => s.streak);
  const openSettings = useStore((s) => s.openSettings);
  const openStand = useStore((s) => s.openStand);
  const popped = useLevelFlash();
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
      <StageBar>
        <button className="pb-gear" aria-label={t.profile.settingsAria} onClick={openSettings}>
          <Icon name="ti-settings" />
        </button>
      </StageBar>

      {/* the mockup's three-beat top: who you are → the level moment → the purse */}
      <div className="prof-top">
        <div className="ig">
          <div className="ig-ava d" aria-hidden="true">
            {(prefName?.[0] ?? authUser?.avatar ?? 'M').toUpperCase()}
          </div>
          <div className="ig-main">
            <div className="pname d">{prefName ?? authUser?.name ?? 'Mira'}</div>
            <div className="psub">{t.profile.readerTitle}</div>
          </div>
          <CastOwl owl="mirror" cls="mini" />
        </div>

        <div className="pb-plvl">
          <SeatMap lv={lv} />
          <div className={`pb-plvl-row${popped ? ' pop' : ''}`}>
            <Icon name="ti-armchair" className="crown" />
            <span className="pb-plvl-t">
              {lv >= LV_CAP ? t.profile.seatFront : t.profile.seatLabel(rowFromLevel(lv))}
            </span>
            <span className="pb-plvl-lv">{t.profile.levelLabel(lv)}</span>
          </div>
          <div
            className="pb-bigxp"
            role="progressbar"
            aria-label={t.profile.levelLabel(lv)}
            aria-valuemin={0}
            aria-valuemax={xpMax}
            aria-valuenow={xp}
          >
            <b style={{ width: `${Math.min(100, Math.max(0, (xp / Math.max(1, xpMax)) * 100))}%` }} />
          </div>
          {/* past the front row the seat stops moving, so the bar counts encores.
              below it, only every third level walks you forward a row — on the
              other two the bar owes a level, not a seat, and must say so */}
          <div className="pb-xpcap">
            {lv >= LV_CAP
              ? t.profile.seatEncore(xp, xpMax, encoreStars(totalXp) + 1)
              : seatMovesAt(lv + 1)
                ? t.profile.seatToNext(xp, xpMax, rowFromLevel(lv + 1))
                : t.profile.seatToLevel(xp, xpMax, lv + 1)}
          </div>
        </div>

        <div className="pb-pchips">
          <div className="pb-chip" aria-label={t.profile.inkAria(ink)}>
            <Icon name="ti-inkdrop" className="drop" />
            <span className="n">{ink}</span>
          </div>
          {/* the purse opens keeper's counter — the one place brass is spent */}
          <button
            type="button"
            className="pb-chip pb-chip-btn"
            aria-label={t.profile.coinsAria(coins)}
            onClick={openStand}
          >
            <Icon name="ti-coin" className="coin" />
            <span className="n">{coins.toLocaleString()}</span>
          </button>
          <div className="pb-chip" aria-label={t.profile.streakAria(streak)}>
            {/* dim when the flame is out, lit while it holds, house gold at seven */}
            <Icon
              name="ti-flame"
              className={`flame${streak === 0 ? ' dim' : streak >= 7 ? ' bright' : ''}`}
            />
            <span className="n">{t.profile.streakChip(streak)}</span>
          </div>
        </div>

        <BioRow />
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
