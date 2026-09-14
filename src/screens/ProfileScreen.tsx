import { useMemo, useState } from 'react';
import { IconSettings, IconCheck, IconLock } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore, selectCouncils } from '../store/useStore';
import { maybeBook } from '../content/books';
import type { Axis } from '../content/types';
import { timeAgo } from '../app/ids';
import { PersonAvatar } from '../components/Avatar';
import { Owl } from '../components/Owl';
import { RadarChart, AXES } from '../components/RadarChart';
import './ProfileScreen.css';

/* ============================================================
   Screen 5 — Profile. "Track your journey."
   Progress as personal development: milestones, a radar of what you
   read, and the highlights and reflections you kept.
   ============================================================ */
const LEVELS = ['The Newcomer', 'The Reader', 'The Curious', 'The Seeker', 'The Thinker', 'The Sage'];

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
    { label: 'Convened your first council', done: councils.length >= 1, note: `${councils.length} so far` },
    { label: 'Saved five books', done: saved.length >= 5, note: `${Math.min(saved.length, 5)}/5` },
    { label: 'Finished a book', done: completed >= 1, note: `${completed} completed` },
    { label: 'Kept ten highlights', done: highlights.length >= 10, note: `${Math.min(highlights.length, 10)}/10` },
    { label: 'Shared a reflection', done: myPosts.length >= 1, note: myPosts.length ? `${myPosts.length} shared` : 'not yet' },
    { label: 'Explored three areas', done: interests.length >= 3, note: `${Math.min(interests.length, 3)}/3` },
  ];

  const activity = [
    ...councils.map((c) => ({ ts: c.updatedAt, text: `Asked the council: “${c.question}”`, onClick: () => navigate({ name: c.stage === 'summarized' ? 'summary' : 'discussion', id: c.id }) })),
    ...highlights.map((h) => ({ ts: h.ts, text: `Highlighted a line in ${maybeBook(h.bookId)?.title ?? 'a book'}`, onClick: () => navigate({ name: 'read', id: h.bookId }) })),
    ...myPosts.map((p) => ({ ts: p.ts, text: 'Shared a reflection', onClick: () => navigate({ name: 'social' }) })),
    ...Object.entries(progress)
      .filter(([, p]) => p.status === 'completed')
      .map(([id, p]) => ({ ts: p.lastReadAt, text: `Finished ${maybeBook(id)?.title ?? 'a book'}`, onClick: () => navigate({ name: 'book', id }) })),
  ].sort((a, b) => b.ts - a.ts);

  const badges = [
    { name: 'First Council', done: councils.length >= 1, color: 'yellow' as const },
    { name: 'Bookworm', done: saved.length >= 5, color: 'green' as const },
    { name: 'Finisher', done: completed >= 1, color: 'teal' as const },
    { name: 'Highlighter', done: highlights.length >= 10, color: 'orange' as const },
    { name: 'Contributor', done: myPosts.length >= 1, color: 'violet' as const },
    { name: 'Explorer', done: interests.length >= 3, color: 'blue' as const },
  ];

  return (
    <div className="screen profile">
      <div className="profile-head top-inset pad">
        <span style={{ width: 40 }} />
        <button type="button" className="iconbtn" aria-label="Settings" onClick={() => navigate({ name: 'settings' })}>
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
            <span>Books</span>
          </li>
          <li>
            <b>12.4K</b>
            <span>Followers</span>
          </li>
          <li>
            <b>{310 + following.length}</b>
            <span>Following</span>
          </li>
        </ul>

        <div className="level-card">
          <Owl color="yellow" size={48} />
          <div className="grow">
            <div className="level-name">{LEVELS[level - 1]}</div>
            <div className="level-sub">Level {level}</div>
            <div className="level-track">
              <span style={{ width: `${Math.round(toNext * 100)}%` }} />
            </div>
          </div>
        </div>

        <div className="profile-tabs" role="tablist">
          {(['insights', 'activity', 'badges'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'insights' && (
          <>
            <section className="profile-section">
              <h2 className="heading">Reading Profile</h2>
              <RadarChart values={radar} />
              <p className="small muted profile-note">Where your reading has gone so far — a picture of habits, not a personality test.</p>
            </section>
            <section className="profile-section">
              <h2 className="heading">Milestones</h2>
              <ul className="milestones">
                {milestones.map((m) => (
                  <li key={m.label} className={m.done ? 'done' : ''}>
                    <span className="ms-check">{m.done ? <IconCheck stroke={3} /> : null}</span>
                    <span className="grow">{m.label}</span>
                    <span className="small muted">{m.note}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="profile-section">
              <h2 className="heading">Highlights & reflections</h2>
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
                      <span className="small muted">You wrote · {timeAgo(p.ts)}</span>
                      <span>{p.caption}</span>
                    </div>
                  </li>
                ))}
                {highlights.length === 0 && myPosts.length === 0 && <li className="small muted">Highlight a passage while reading and it will appear here.</li>}
              </ul>
            </section>
          </>
        )}

        {tab === 'activity' && (
          <section className="profile-section">
            <ul className="timeline">
              {activity.map((a, i) => (
                <li key={i}>
                  <button type="button" onClick={a.onClick}>
                    <span className="tl-dot" />
                    <span className="grow">{a.text}</span>
                    <span className="small muted">{timeAgo(a.ts)}</span>
                  </button>
                </li>
              ))}
              {activity.length === 0 && <li className="small muted">Your reading and council activity will show up here.</li>}
            </ul>
          </section>
        )}

        {tab === 'badges' && (
          <section className="profile-section">
            <ul className="badges">
              {badges.map((b) => (
                <li key={b.name} className={b.done ? 'done' : ''}>
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
