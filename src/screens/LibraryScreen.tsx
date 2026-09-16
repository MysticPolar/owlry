import { useMemo, useState } from 'react';
import { IconSearch, IconChevronRight, IconX, IconMessageCircle, IconHighlight } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore, selectCouncils } from '../store/useStore';
import { maybeBook, CATEGORIES } from '../content/books';
import type { Category } from '../content/types';
import { figure } from '../content/figures';
import { timeAgo } from '../app/ids';
import { Cover } from '../components/Cover';
import { Avatar } from '../components/Avatar';
import { useT, fmt } from '../i18n/react';
import './LibraryScreen.css';

/* ============================================================
   Screen 3 — Library. "Your growing collection."
   Saved books by shelf, the latest session to resume, past councils to
   revisit, and highlights.
   ============================================================ */
type Tab = 'all' | 'reading' | 'completed';

export function LibraryScreen() {
  const saved = useStore((s) => s.saved);
  const progress = useStore((s) => s.progress);
  const lastRead = useStore((s) => s.lastRead);
  const highlights = useStore((s) => s.highlights);
  const bookmarks = useStore((s) => s.bookmarks);
  const councils = useStore(selectCouncils);
  const [tab, setTab] = useState<Tab>('all');
  const [cat, setCat] = useState<Category | 'All'>('All');
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const t = useT();

  const books = useMemo(() => {
    const ids = new Set([...saved, ...Object.keys(progress)]);
    return [...ids].map((id) => maybeBook(id)).filter((b): b is NonNullable<typeof b> => !!b);
  }, [saved, progress]);
  const shelves = useMemo(() => CATEGORIES.filter((c) => books.some((b) => b.category === c)), [books]);
  const qn = q.trim().toLowerCase();
  const shown = books.filter((b) => {
    const p = progress[b.id];
    if (tab === 'reading' && !(p && p.status === 'reading' && p.pct > 0)) return false;
    if (tab === 'completed' && p?.status !== 'completed') return false;
    if (cat !== 'All' && b.category !== cat) return false;
    if (qn && !`${b.title} ${b.authorName} ${b.tags.join(' ')}`.toLowerCase().includes(qn)) return false;
    return true;
  });
  const current = lastRead ? maybeBook(lastRead.bookId) : undefined;
  const savedCouncils = councils.filter((c) => c.saved || c.stage === 'summarized' || c.messages.length > 8);

  return (
    <div className="screen library">
      <div className="lib-head top-inset pad">
        <h1 className="display lib-title">{t.library.title}</h1>
        <button type="button" className={`iconbtn ${searchOpen ? 'on' : ''}`} aria-label={t.library.search} onClick={() => { setSearchOpen((v) => !v); setQ(''); }}>
          {searchOpen ? <IconX stroke={2} /> : <IconSearch stroke={2} />}
        </button>
      </div>
      {searchOpen && (
        <div className="pad lib-search">
          <input className="input" placeholder={t.library.searchPh} value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label={t.library.searchPh} />
        </div>
      )}
      <div className="pad">
        <div className="seg" role="tablist" aria-label={t.library.filter}>
          {(['all', 'reading', 'completed'] as Tab[]).map((tb) => (
            <button key={tb} type="button" role="tab" aria-selected={tab === tb} className={tab === tb ? 'on' : ''} onClick={() => setTab(tb)}>
              {tb === 'all' ? t.library.all : tb === 'reading' ? t.library.reading : t.library.completed}
            </button>
          ))}
        </div>
        {shelves.length > 1 && (
          <div className="chiprow lib-shelves">
            <button type="button" className={`chip ${cat === 'All' ? 'on' : ''}`} onClick={() => setCat('All')}>
              {t.library.allShelves}
            </button>
            {shelves.map((c) => (
              <button key={c} type="button" className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>
                {t.library.categories[c]}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="screen-scroll pad nav-space lib-body">
        {tab === 'all' && cat === 'All' && !qn && current && (
          <button type="button" className="card continue" onClick={() => navigate({ name: 'read', id: current.id, council: lastRead?.councilId })}>
            <Cover book={current} width={56} />
            <span className="grow">
              <span className="caps muted">{t.library.continueReading}</span>
              <span className="continue-title">{current.title}</span>
              <span className="small muted">{current.text.heading} · {Math.round((progress[current.id]?.pct ?? 0) * 100)}%</span>
              <span className="progress-track">
                <span style={{ width: `${Math.round((progress[current.id]?.pct ?? 0) * 100)}%` }} />
              </span>
            </span>
            <IconChevronRight className="bookrow-chev" />
          </button>
        )}

        <ul className="booklist">
          {shown.map((b) => {
            const p = progress[b.id];
            const marks = bookmarks[b.id]?.length ?? 0;
            return (
              <li key={b.id}>
                <button type="button" className="bookrow" onClick={() => navigate({ name: 'book', id: b.id })}>
                  <Cover book={b} width={44} />
                  <span className="bookrow-text">
                    <span className="bookrow-title">{b.title}</span>
                    <span className="bookrow-sub">
                      {b.authorName} · {t.library.categories[b.category]}
                      {p ? ` · ${p.status === 'completed' ? t.library.completed : `${Math.round(p.pct * 100)}%`}` : ''}
                      {marks ? ` · ${fmt(marks > 1 ? t.library.bookmarks : t.library.bookmark, { n: marks })}` : ''}
                    </span>
                  </span>
                  <IconChevronRight className="bookrow-chev" />
                </button>
              </li>
            );
          })}
          {shown.length === 0 && <li className="small muted lib-empty">{t.library.empty}</li>}
        </ul>

        {!qn && tab === 'all' && savedCouncils.length > 0 && (
          <section className="lib-section">
            <h2 className="heading">
              <IconMessageCircle /> {t.library.councils}
            </h2>
            <ul className="stack">
              {savedCouncils.map((c) => (
                <li key={c.id}>
                  <button type="button" className="card council-row" onClick={() => navigate({ name: c.stage === 'summarized' ? 'summary' : 'discussion', id: c.id })}>
                    <span className="council-row-avatars">
                      {c.seats.map((fid) => (
                        <Avatar key={fid} figure={figure(fid)} size={28} />
                      ))}
                    </span>
                    <span className="grow">
                      <span className="council-row-q">“{c.question}”</span>
                      <span className="small muted">
                        {c.seats.map((fid) => figure(fid).short).join(', ')} · {timeAgo(c.updatedAt)}
                        {c.stage !== 'summarized' ? t.library.inProgress : ''}
                      </span>
                    </span>
                    <IconChevronRight className="bookrow-chev" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!qn && tab === 'all' && highlights.length > 0 && (
          <section className="lib-section">
            <h2 className="heading">
              <IconHighlight /> {t.library.highlights}
            </h2>
            <ul className="stack">
              {highlights.slice(0, 8).map((h) => {
                const b = maybeBook(h.bookId);
                return (
                  <li key={h.id}>
                    <button type="button" className="card highlight-row" onClick={() => navigate({ name: 'read', id: h.bookId, council: h.councilId })}>
                      <span className="highlight-text">“{h.text}”</span>
                      <span className="small muted">
                        {b?.title} · {b?.authorName} · {timeAgo(h.ts)}
                      </span>
                      {h.note && <span className="small highlight-note">{h.note}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
