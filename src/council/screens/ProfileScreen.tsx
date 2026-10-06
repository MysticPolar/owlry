import { Fragment, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { IconSettings, IconCheck, IconStar } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore } from '../store/useStore';
import { maybeBook } from '../content/books';
import type { Axis } from '../content/types';
import { timeAgo } from '../app/ids';
import { AppBar } from '../components/chrome';
import { PersonAvatar } from '../components/Avatar';
import { Owl } from '../components/Owl';
import { RadarChart, AXES } from '../components/RadarChart';
import { Seg } from '../components/Seg';
import { useT, fmt } from '../i18n/react';
import './ProfileScreen.css';

/* ============================================================
   The profile — the fourth tab. "Track your journey."
   Who you are here (the gold medallion, the handle, the bio), three
   counts, the level card Mirror the violet owl keeps, then three tabs:
   Insights (the reading profile as a radar or as numbers, the
   milestones, the next steps you kept, your highlights and reflections),
   Activity (everything you did, newest first) and Badges. The gear opens
   Settings.
   ============================================================ */
type Tab = 'insights' | 'activity' | 'badges';
type Insight = 'radar' | 'bars';

// the tab and the chart/numbers choice outlive a trip to Settings and back (the mockup's st.profileTab / st.insight)
let lastTab: Tab = 'insights';
let lastInsight: Insight = 'radar';

/** the .rv stagger: the blocks arrive top to bottom */
const delay = (n: number): CSSProperties => ({ animationDelay: `${n * 60}ms` });
const cascade = (i: number) => ({ '--i': i }) as CSSProperties;

/** cut a question to fit a row's sub line, on a word boundary when there is one near the cut (Chinese has none) */
function trunc(s: string, n: number): string {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const at = cut.search(/\s+\S*$/);
  return (at > n * 0.6 ? cut.slice(0, at) : cut).trimEnd() + '…';
}

/** a timestamp as a <time dateTime>, or nothing when it is not a real date (toISOString throws on NaN) */
const iso = (ts: number) => (Number.isFinite(ts) ? new Date(ts).toISOString() : undefined);

/** an area the council was asked about, as a spoke of the radar ('other' has none) */
const AXIS_IDS = new Set<string>(AXES.map((a) => a.id));
const axisOf = (area: string): Axis | null => (AXIS_IDS.has(area) ? (area as Axis) : null);

interface ActivityItem {
  key: string;
  ts: number;
  text: string;
  onClick?: () => void;
}

export function ProfileScreen() {
  const user = useStore((s) => s.user);
  const saved = useStore((s) => s.saved);
  const progress = useStore((s) => s.progress);
  const highlights = useStore((s) => s.highlights);
  const posts = useStore((s) => s.posts);
  const interests = useStore((s) => s.interests);
  const steps = useStore((s) => s.steps);
  const councilMap = useStore((s) => s.councils);
  const councilOrder = useStore((s) => s.councilOrder);
  // selectCouncils builds a new array on every call, so the profile would re-render on any store change: derive it here
  const councils = useMemo(() => councilOrder.map((id) => councilMap[id]).filter(Boolean), [councilOrder, councilMap]);
  // recalled books resolve through the registry; their cards land in `minds`, so the profile follows that too
  const minds = useStore((s) => s.minds);
  const [tab, setTabState] = useState<Tab>(lastTab);
  const [insight, setInsightState] = useState<Insight>(lastInsight);
  // the first paint staggers the whole page (the tab's blocks after the four above it); a tab switch only brings its
  // own blocks in. Held in state so a store update mid-entrance never shifts a running delay.
  const [base, setBase] = useState(4);
  const setTab = (v: Tab) => {
    lastTab = v;
    setBase(0);
    setTabState(v);
  };
  const setInsight = (v: Insight) => {
    lastInsight = v;
    setInsightState(v);
  };
  const t = useT();
  const LEVELS = t.profile.levels;

  const completed = Object.values(progress).filter((p) => p.status === 'completed').length;
  const myPosts = posts.filter((p) => p.mine);
  const points = saved.length + completed * 3 + highlights.length + councils.length * 2 + myPosts.length * 2;
  const level = Math.min(LEVELS.length, 1 + Math.floor(points / 6));
  const toNext = level >= LEVELS.length ? 1 : (points % 6) / 6;

  // the reading profile: books (saved or opened; a finished one counts double, an opened one by how far you got),
  // highlights at half weight, and the councils you convened, by area. `values` is normalised to the strongest
  // spoke for the chart and the bars; `counts` is the plain number of books and councils in each area.
  const { values, counts } = useMemo(() => {
    const acc: Record<Axis, number> = { philosophy: 0, career: 0, health: 0, investing: 0, relationships: 0, literature: 0 };
    const n: Record<Axis, number> = { philosophy: 0, career: 0, health: 0, investing: 0, relationships: 0, literature: 0 };
    const ids = new Set([...saved, ...Object.keys(progress)]);
    for (const id of ids) {
      const b = maybeBook(id);
      if (!b || !b.axes.length) continue;
      const w = progress[id]?.status === 'completed' ? 2 : 1 + (progress[id]?.pct ?? 0);
      for (const a of b.axes) {
        acc[a] += w / b.axes.length;
        n[a] += 1;
      }
    }
    for (const h of highlights) {
      const b = maybeBook(h.bookId);
      if (b && b.axes.length) for (const a of b.axes) acc[a] += 0.5 / b.axes.length;
    }
    for (const c of councils) {
      const a = axisOf(c.area);
      if (!a) continue;
      acc[a] += 1;
      n[a] += 1;
    }
    const max = Math.max(1, ...Object.values(acc));
    const out = { ...acc };
    for (const a of AXES) out[a.id] = acc[a.id] / max;
    return { values: out, counts: n };
    // `minds`: a recalled book's card (and its axes) can land after the first paint
  }, [saved, progress, highlights, councils, minds]);

  // the numbers view lists the areas strongest first
  const bars = [...AXES].sort((a, b) => values[b.id] - values[a.id] || counts[b.id] - counts[a.id]);

  const milestones = [
    { label: t.profile.ms.firstCouncil, done: councils.length >= 1, note: fmt(t.profile.ms.soFar, { n: councils.length }) },
    { label: t.profile.ms.fiveBooks, done: saved.length >= 5, note: `${Math.min(saved.length, 5)}/5` },
    { label: t.profile.ms.finished, done: completed >= 1, note: fmt(t.profile.ms.completedN, { n: completed }) },
    { label: t.profile.ms.tenHighlights, done: highlights.length >= 10, note: `${Math.min(highlights.length, 10)}/10` },
    { label: t.profile.ms.shared, done: myPosts.length >= 1, note: myPosts.length ? fmt(t.profile.ms.sharedN, { n: myPosts.length }) : t.profile.ms.notYet },
    { label: t.profile.ms.threeAreas, done: interests.length >= 3, note: `${Math.min(interests.length, 3)}/3` },
  ];

  // a kept step opens its council's summary while that council is on this device
  const openStep = (councilId: string) => (councilMap[councilId] ? () => navigate({ name: 'summary', id: councilId }) : undefined);

  const activity: ActivityItem[] = [
    ...councils.map((c) => ({
      key: `c:${c.id}`,
      ts: c.updatedAt,
      text: fmt(t.profile.act.asked, { q: c.question }),
      onClick: () => navigate(c.stage === 'summarized' ? { name: 'summary', id: c.id } : { name: 'stands', id: c.id }),
    })),
    ...steps.map((s) => ({ key: `s:${s.id}`, ts: s.ts, text: fmt(t.profile.act.step, { text: s.text }), onClick: openStep(s.councilId) })),
    ...highlights.map((h) => ({
      key: `h:${h.id}`,
      ts: h.ts,
      text: fmt(t.profile.act.highlighted, { title: maybeBook(h.bookId)?.title ?? t.profile.act.aBook }),
      onClick: () => navigate({ name: 'read', id: h.bookId, council: h.councilId }),
    })),
    ...myPosts.map((p) => ({ key: `p:${p.id}`, ts: p.ts, text: t.profile.act.shared, onClick: () => navigate({ name: 'social' }) })),
    ...Object.entries(progress)
      .filter(([, p]) => p.status === 'completed')
      .map(([id, p]) => ({
        key: `f:${id}`,
        ts: p.lastReadAt,
        text: fmt(t.profile.act.finished, { title: maybeBook(id)?.title ?? t.profile.act.aBook }),
        onClick: () => navigate({ name: 'book', id }),
      })),
  ].sort((a, b) => (b.ts || 0) - (a.ts || 0));

  const badges = [
    { name: t.profile.badges.firstCouncil, done: councils.length >= 1 },
    { name: t.profile.badges.bookworm, done: saved.length >= 5 },
    { name: t.profile.badges.finisher, done: completed >= 1 },
    { name: t.profile.badges.highlighter, done: highlights.length >= 10 },
    { name: t.profile.badges.contributor, done: myPosts.length >= 1 },
    { name: t.profile.badges.explorer, done: interests.length >= 3 },
  ];

  const shownHighlights = highlights.slice(0, 3);
  const shownReflections = myPosts.slice(0, 2);

  return (
    <div className="screen profile-screen">
      <AppBar
        right={
          <button type="button" className="iconbtn" aria-label={t.profile.settings} onClick={() => navigate({ name: 'settings' })}>
            <IconSettings stroke={1.8} />
          </button>
        }
      />
      <div className="content">
        <div className="profile-id rv" style={delay(0)}>
          <PersonAvatar initial={user.initial} color="var(--gold)" size={64} />
          <div className="grow">
            <div className="profile-handle">{user.handle}</div>
            {user.bio.trim() && <div className="profile-bio">“{user.bio}”</div>}
          </div>
        </div>

        <ul className="profile-stats rv" style={delay(1)}>
          <li>
            <b>{saved.length + completed}</b>
            <span>{t.profile.books}</span>
          </li>
          <li>
            <b>{councils.length}</b>
            <span>{t.profile.councils}</span>
          </li>
          <li>
            <b>{highlights.length}</b>
            <span>{t.profile.highlights}</span>
          </li>
        </ul>

        <div className="level-card rv" style={delay(2)}>
          <Owl color="violet" size={60} pose="sit" title={t.profile.owl} />
          <div className="grow">
            <div className="level-name">{LEVELS[level - 1]}</div>
            <div className="level-sub">{fmt(t.profile.level, { n: level })}</div>
            <div className="level-track" aria-hidden="true">
              <span style={{ width: `${Math.round(toNext * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="rv" style={delay(3)}>
          <Seg
            tabs
            className="wide profile-tabs-seg"
            label={t.nav.profile}
            options={(['insights', 'activity', 'badges'] as const).map((id) => ({ id, label: t.profile.tabs[id] }))}
            value={tab}
            onChange={setTab}
          />
        </div>

        <div key={tab} className="profile-panel" role="tabpanel" aria-label={t.profile.tabs[tab]}>
          {tab === 'insights' && (
            <>
              <div className="profile-section rv" style={delay(base)}>
                <div className="insight-head">
                  <div className="act">{t.profile.readingProfile}</div>
                  <Seg
                    className="compact"
                    label={t.profile.readingProfile}
                    options={[
                      { id: 'radar' as const, label: t.profile.chart },
                      { id: 'bars' as const, label: t.profile.numbers },
                    ]}
                    value={insight}
                    onChange={setInsight}
                  />
                </div>
                {insight === 'radar' ? (
                  <Fragment key="radar">
                    <button type="button" className="radar-btn swap-in" aria-label={t.profile.showNumbers} onClick={() => setInsight('bars')}>
                      <RadarChart values={values} />
                    </button>
                    <div className="radar-note swap-in">{t.profile.radarNoteChart}</div>
                  </Fragment>
                ) : (
                  <Fragment key="bars">
                    <ul className="rp swap-in">
                      {bars.map((a) => (
                        <li key={a.id}>
                          <span>{t.profile.axes[a.id]}</span>
                          <span className="bar" aria-hidden="true">
                            <span style={{ width: `${Math.round(values[a.id] * 100)}%` }} />
                          </span>
                          <span className="n">{counts[a.id]}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="set-fine swap-in">{t.profile.radarNoteBars}</div>
                  </Fragment>
                )}
              </div>

              <div className="profile-section rv" style={delay(base + 1)}>
                <div className="act">{t.profile.milestones}</div>
                <ul className="milestones cascade">
                  {milestones.map((m, i) => (
                    <li key={m.label} className={m.done ? 'done' : ''} style={cascade(i)}>
                      <span className="ms-check" aria-hidden="true">
                        <IconCheck stroke={3} />
                      </span>
                      <span className="grow">{m.label}</span>
                      <span className="n">{m.note}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {steps.length > 0 && (
                <div className="profile-section rv" style={delay(base + 2)}>
                  <div className="act">{t.profile.nextSteps}</div>
                  <div className="profile-list cascade">
                    {steps.map((s, i) => {
                      const open = openStep(s.councilId);
                      const body: ReactNode = (
                        <>
                          <div className="kept-text">{s.text}</div>
                          <div className="bookrow-sub">
                            {fmt(t.profile.stepFrom, { q: trunc(s.question, 60) })} · {timeAgo(s.ts)}
                          </div>
                        </>
                      );
                      return open ? (
                        <button key={s.id} type="button" className="card kept-row" style={cascade(i)} onClick={open}>
                          {body}
                        </button>
                      ) : (
                        <div key={s.id} className="card kept-row" style={cascade(i)}>
                          {body}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="profile-section rv" style={delay(base + (steps.length > 0 ? 3 : 2))}>
                <div className="act">{t.profile.highlightsTitle}</div>
                <div className="profile-list cascade">
                  {shownHighlights.map((h, i) => (
                    <button
                      key={h.id}
                      type="button"
                      className="card highlight-row"
                      style={cascade(i)}
                      onClick={() => navigate({ name: 'read', id: h.bookId, council: h.councilId })}
                    >
                      <div className="highlight-text">“{h.text}”</div>
                      <div className="bookrow-sub">{[maybeBook(h.bookId)?.title, timeAgo(h.ts)].filter(Boolean).join(' · ')}</div>
                    </button>
                  ))}
                  {shownReflections.map((p, i) => (
                    <div key={p.id} className="card highlight-row reflection" style={cascade(shownHighlights.length + i)}>
                      <div className="bookrow-sub">
                        {t.profile.youWrote} · {timeAgo(p.ts)}
                      </div>
                      <div className="highlight-text">{p.caption}</div>
                    </div>
                  ))}
                  {shownHighlights.length === 0 && shownReflections.length === 0 && <p className="muted profile-empty">{t.profile.emptyHighlights}</p>}
                </div>
              </div>
            </>
          )}

          {tab === 'activity' && (
            <ul className="activity profile-section rv cascade" style={delay(base)}>
              {activity.map((a, i) => {
                const body: ReactNode = (
                  <>
                    <span className="dot" aria-hidden="true" />
                    <div>
                      {a.text}
                      <time dateTime={iso(a.ts)}>{timeAgo(a.ts)}</time>
                    </div>
                  </>
                );
                return (
                  <li key={a.key} style={cascade(i)}>
                    {a.onClick ? (
                      <button type="button" className="activity-row" onClick={a.onClick}>
                        {body}
                      </button>
                    ) : (
                      <div className="activity-row">{body}</div>
                    )}
                  </li>
                );
              })}
              {activity.length === 0 && <li className="muted profile-empty">{t.profile.emptyActivity}</li>}
            </ul>
          )}

          {tab === 'badges' && (
            <ul className="badges profile-section rv cascade" style={delay(base)}>
              {badges.map((b, i) => (
                <li key={b.name} className={b.done ? 'done' : ''} style={cascade(i)}>
                  <span className="b" aria-hidden="true">
                    <IconStar stroke={2.2} />
                  </span>
                  {b.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
