import { useMemo, useState, type CSSProperties } from 'react';
import { IconSettings, IconCheck, IconLock } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore, selectCouncils } from '../store/useStore';
import { maybeBook } from '../content/books';
import type { Axis } from '../content/types';
import { timeAgo } from '../app/ids';
import { PersonAvatar } from '../components/Avatar';
import { Owl } from '../components/Owl';
import { RadarChart, AXES } from '../components/RadarChart';
import { Seg } from '../components/Seg';
import { useT, fmt } from '../i18n/react';
import './ProfileScreen.css';

/* ============================================================
   Screen 5 — Profile. "Track your journey."
   Progress as personal development: milestones, a radar of what you
   read, and the highlights and reflections you kept.
   ============================================================ */

export function ProfileScreen() {
  const user = useStore((s) => s.user);
  const saved = useStore((s) => s.saved);
  const progress = useStore((s) => s.progress);
  const highlights = useStore((s) => s.highlights);
  const posts = useStore((s) => s.posts);
  const following = useStore((s) => s.following);
  const interests = useStore((s) => s.interests);
  const councils = useStore(selectCouncils);
  const [tab, setTab] = useState<'insights' | 'activity' | 'badges'>('insights');
  const t = useT();
  const LEVELS = t.profile.levels;

  const completed = Object.values(progress).filter((p) => p.status === 'completed').length;
  const myPosts = posts.filter((p) => p.mine);
  const points = saved.length + completed * 3 + highlights.length + councils.length * 2 + myPosts.length * 2;
  const level = Math.min(LEVELS.length, 1 + Math.floor(points / 6));
  const toNext = level >= LEVELS.length ? 1 : (points % 6) / 6;

  const radar = useMemo(() => {
    const acc: Record<Axis, number> = { philosophy: 0, career: 0, health: 0, investing: 0, relationships: 0, literature: 0 };
    const ids = new Set([...saved, ...Object.keys(progress)]);
    for (const id of ids) {
      const b = maybeBook(id);
      if (!b) continue;
      const w = progress[id]?.status === 'completed' ? 2 : 1 + (progress[id]?.pct ?? 0);
      for (const a of b.axes) acc[a] += w / b.axes.length;
    }
    for (const h of highlights) {
      const b = maybeBook(h.bookId);
      if (b) for (const a of b.axes) acc[a] += 0.5 / b.axes.length;
    }
    const max = Math.max(1, ...Object.values(acc));
    const out = { ...acc };
    for (const a of AXES) out[a.id] = acc[a.id] / max;
    return out;
  }, [saved, progress, highlights]);

  const milestones = [
    { label: t.profile.ms.firstCouncil, done: councils.length >= 1, note: fmt(t.profile.ms.soFar, { n: councils.length }) },
    { label: t.profile.ms.fiveBooks, done: saved.length >= 5, note: `${Math.min(saved.length, 5)}/5` },
    { label: t.profile.ms.finished, done: completed >= 1, note: fmt(t.profile.ms.completedN, { n: completed }) },
    { label: t.profile.ms.tenHighlights, done: highlights.length >= 10, note: `${Math.min(highlights.length, 10)}/10` },
    { label: t.profile.ms.shared, done: myPosts.length >= 1, note: myPosts.length ? fmt(t.profile.ms.sharedN, { n: myPosts.length }) : t.profile.ms.notYet },
    { label: t.profile.ms.threeAreas, done: interests.length >= 3, note: `${Math.min(interests.length, 3)}/3` },
  ];

  const activity = [
    ...councils.map((c) => ({ ts: c.updatedAt, text: fmt(t.profile.act.asked, { q: c.question }), onClick: () => navigate({ name: c.stage === 'summarized' ? 'summary' : 'discussion', id: c.id }) })),
    ...highlights.map((h) => ({ ts: h.ts, text: fmt(t.profile.act.highlighted, { title: maybeBook(h.bookId)?.title ?? t.profile.act.aBook }), onClick: () => navigate({ name: 'read', id: h.bookId }) })),
    ...myPosts.map((p) => ({ ts: p.ts, text: t.profile.act.shared, onClick: () => navigate({ name: 'social' }) })),
    ...Object.entries(progress)
      .filter(([, p]) => p.status === 'completed')
      .map(([id, p]) => ({ ts: p.lastReadAt, text: fmt(t.profile.act.finished, { title: maybeBook(id)?.title ?? t.profile.act.aBook }), onClick: () => navigate({ name: 'book', id }) })),
  ].sort((a, b) => b.ts - a.ts);

  const badges = [
    { name: t.profile.badges.firstCouncil, done: councils.length >= 1, color: 'yellow' as const },
    { name: t.profile.badges.bookworm, done: saved.length >= 5, color: 'green' as const },
    { name: t.profile.badges.finisher, done: completed >= 1, color: 'teal' as const },
    { name: t.profile.badges.highlighter, done: highlights.length >= 10, color: 'orange' as const },
    { name: t.profile.badges.contributor, done: myPosts.length >= 1, color: 'violet' as const },
    { name: t.profile.badges.explorer, done: interests.length >= 3, color: 'blue' as const },
  ];

  return (
    <div className="screen profile">
      <div className="profile-head top-inset pad">
        <span style={{ width: 40 }} />
        <button type="button" className="iconbtn" aria-label={t.profile.settings} onClick={() => navigate({ name: 'settings' })}>
          <IconSettings stroke={1.8} />
        </button>
      </div>
      <div className="screen-scroll pad nav-space profile-body">
        <div className="profile-id">
          <PersonAvatar initial={user.initial} color="#FFD100" size={64} />
          <div className="grow">
            <div className="profile-handle">{user.handle}</div>
            <div className="small muted">“{user.bio}”</div>
          </div>
        </div>
        <ul className="profile-stats">
          <li>
            <b>{saved.length + completed}</b>
            <span>{t.profile.books}</span>
          </li>
          <li>
            <b>12.4K</b>
            <span>{t.profile.followers}</span>
          </li>
          <li>
            <b>{310 + following.length}</b>
            <span>{t.profile.following}</span>
          </li>
        </ul>

        <div className="level-card">
          <Owl color="yellow" size={48} />
          <div className="grow">
            <div className="level-name">{LEVELS[level - 1]}</div>
            <div className="level-sub">{fmt(t.profile.level, { n: level })}</div>
            <div className="level-track">
              <span style={{ width: `${Math.round(toNext * 100)}%` }} />
            </div>
          </div>
        </div>

        <Seg
          tabs
          className="wide tone-paper"
          options={(['insights', 'activity', 'badges'] as const).map((tb) => ({ id: tb, label: t.profile.tabs[tb] }))}
          value={tab}
          onChange={setTab}
        />

        {tab === 'insights' && (
          <>
            <section className="profile-section">
              <h2 className="heading">{t.profile.readingProfile}</h2>
              <RadarChart values={radar} />
              <p className="small muted profile-note">{t.profile.radarNote}</p>
            </section>
            <section className="profile-section">
              <h2 className="heading">{t.profile.milestones}</h2>
              <ul className="milestones cascade">
                {milestones.map((m, i) => (
                  <li key={m.label} className={m.done ? 'done' : ''} style={{ '--i': i } as CSSProperties}>
                    <span className="ms-check">{m.done ? <IconCheck stroke={3} /> : null}</span>
                    <span className="grow">{m.label}</span>
                    <span className="small muted">{m.note}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="profile-section">
              <h2 className="heading">{t.profile.highlightsTitle}</h2>
              <ul className="stack">
                {highlights.slice(0, 3).map((h) => (
                  <li key={h.id}>
                    <button type="button" className="card highlight-row" onClick={() => navigate({ name: 'read', id: h.bookId })}>
                      <span className="highlight-text">“{h.text}”</span>
                      <span className="small muted">{maybeBook(h.bookId)?.title} · {timeAgo(h.ts)}</span>
                    </button>
                  </li>
                ))}
                {myPosts.slice(0, 2).map((p) => (
                  <li key={p.id}>
                    <div className="card highlight-row reflection">
                      <span className="small muted">{t.profile.youWrote} · {timeAgo(p.ts)}</span>
                      <span>{p.caption}</span>
                    </div>
                  </li>
                ))}
                {highlights.length === 0 && myPosts.length === 0 && <li className="small muted">{t.profile.emptyHighlights}</li>}
              </ul>
            </section>
          </>
        )}

        {tab === 'activity' && (
          <section className="profile-section">
            <ul className="timeline cascade">
              {activity.map((a, i) => (
                <li key={i} style={{ '--i': i } as CSSProperties}>
                  <button type="button" onClick={a.onClick}>
                    <span className="tl-dot" />
                    <span className="grow">{a.text}</span>
                    <span className="small muted">{timeAgo(a.ts)}</span>
                  </button>
                </li>
              ))}
              {activity.length === 0 && <li className="small muted">{t.profile.emptyActivity}</li>}
            </ul>
          </section>
        )}

        {tab === 'badges' && (
          <section className="profile-section">
            <ul className="badges cascade">
              {badges.map((b, i) => (
                <li key={b.name} className={b.done ? 'done' : ''} style={{ '--i': i } as CSSProperties}>
                  <span className="badge-owl">{b.done ? <Owl color={b.color} size={40} /> : <IconLock />}</span>
                  <span className="badge-name">{b.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <Owl color="yellow" size={80} pose="peek" className="profile-owl" />
    </div>
  );
}
