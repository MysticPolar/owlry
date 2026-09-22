import type { CSSProperties } from 'react';
import { IconChevronRight, IconPlayerPlay } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore, selectCouncils } from '../store/useStore';
import { maybeBook, book } from '../content/books';
import { readingFor } from '../engine/council';
import { timeAgo } from '../app/ids';
import { Cover } from '../components/Cover';
import { useT, fmt } from '../i18n/react';
import './LibraryScreen.css';

/* the Reading tab: resume the latest session, then what's recently open and what the councils suggested */
export function ReadingScreen() {
  const lastRead = useStore((s) => s.lastRead);
  const progress = useStore((s) => s.progress);
  const councils = useStore(selectCouncils);
  const t = useT();

  const current = lastRead ? maybeBook(lastRead.bookId) : undefined;
  const recent = Object.entries(progress)
    .map(([id, p]) => ({ b: maybeBook(id), p }))
    .filter((x): x is { b: NonNullable<typeof x.b>; p: (typeof x)['p'] } => !!x.b && x.b.id !== current?.id)
    .sort((a, b) => b.p.lastReadAt - a.p.lastReadAt)
    .slice(0, 6);
  const suggested = councils
    .flatMap((c) => readingFor(c).map((r) => ({ ...r, councilId: c.id, question: c.question })))
    .filter((r, i, arr) => !progress[r.bookId] && arr.findIndex((x) => x.bookId === r.bookId) === i)
    .slice(0, 4);

  return (
    <div className="screen library">
      <div className="lib-head top-inset pad">
        <h1 className="display lib-title">{t.reading.title}</h1>
      </div>
      <div className="screen-scroll pad nav-space lib-body">
        {current ? (
          <section className="card continue" aria-label={t.reading.continue}>
            <Cover book={current} width={72} />
            <div className="grow">
              <span className="caps muted">{t.reading.continue}</span>
              <div className="continue-title">{current.title}</div>
              <div className="small muted">{current.authorName} · {current.text.heading}</div>
              <div className="progress-track">
                <span style={{ width: `${Math.round((progress[current.id]?.pct ?? 0) * 100)}%` }} />
              </div>
              <button type="button" className="btn btn-primary btn-sm continue-btn" onClick={() => navigate({ name: 'read', id: current.id, council: lastRead?.councilId })}>
                <IconPlayerPlay /> {fmt(t.reading.resume, { pct: Math.round((progress[current.id]?.pct ?? 0) * 100) })}
              </button>
            </div>
          </section>
        ) : (
          <section className="card card-pad">
            <p className="heading">{t.reading.nothing}</p>
            <p className="small muted" style={{ marginTop: 4 }}>{t.reading.nothingSub}</p>
            <button type="button" className="btn btn-dark btn-sm" style={{ marginTop: 12 }} onClick={() => navigate({ name: 'council' })}>
              {t.reading.askQ}
            </button>
          </section>
        )}

        {recent.length > 0 && (
          <section className="lib-section">
            <h2 className="heading">{t.reading.recent}</h2>
            <ul className="booklist cascade">
              {recent.map(({ b, p }, i) => (
                <li key={b.id} style={{ '--i': i } as CSSProperties}>
                  <button type="button" className="bookrow" onClick={() => navigate({ name: 'read', id: b.id })}>
                    <Cover book={b} width={40} />
                    <span className="bookrow-text">
                      <span className="bookrow-title">{b.title}</span>
                      <span className="bookrow-sub">
                        {b.authorName} · {p.status === 'completed' ? t.reading.completed : `${Math.round(p.pct * 100)}%`} · {timeAgo(p.lastReadAt)}
                      </span>
                    </span>
                    <IconChevronRight className="bookrow-chev" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {suggested.length > 0 && (
          <section className="lib-section">
            <h2 className="heading">{t.reading.fromCouncils}</h2>
            <ul className="booklist">
              {suggested.map((r) => {
                const b = book(r.bookId);
                return (
                  <li key={r.bookId}>
                    <button type="button" className="bookrow" onClick={() => navigate({ name: 'book', id: b.id, council: r.councilId })}>
                      <Cover book={b} width={40} />
                      <span className="bookrow-text">
                        <span className="bookrow-title">{b.title}</span>
                        <span className="bookrow-sub">{fmt(t.reading.startWithFor, { label: b.start.label, q: r.question })}</span>
                      </span>
                      <IconChevronRight className="bookrow-chev" />
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
