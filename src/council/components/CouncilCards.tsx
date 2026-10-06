import { useEffect } from 'react';
import { IconStar } from '@tabler/icons-react';
import type { CouncilSession } from '../store/types';
import { navigate } from '../app/router';
import { useStore } from '../store/useStore';
import { figure } from '../content/figures';
import { book } from '../content/books';
import { takeawaysFor, readingFor } from '../engine/council';
import { Avatar } from './Avatar';
import { Cover } from './Cover';
import { useT, useLang, fmt } from '../i18n/react';

/* ============================================================
   Card 1 — Your Council's Takeaways · Card 2 — Reading for Your Question
   Rendered inline in the chat and again, larger, on the summary screen.
   ============================================================ */
export function TakeawaysCard({ session, full = false }: { session: CouncilSession; full?: boolean }) {
  const t = takeawaysFor(session);
  const d = useT();
  return (
    <section className={`card council-card takeaways ${full ? 'full' : ''}`} aria-label={d.cards.takeawaysAria}>
      {!full && <h3 className="council-card-title">{d.cards.takeawaysTitle}</h3>}
      <div className="tk-section">
        <span className="caps tk-label">{d.cards.common}</span>
        <p>{t.commonGround}</p>
      </div>
      <div className="tk-section">
        <span className="caps tk-label">{d.cards.differences}</span>
        <ul className="tk-diffs">
          {t.differences.map((d) => {
            const f = figure(d.figureId);
            return (
              <li key={d.figureId}>
                <Avatar figure={f} size={22} />
                <span>
                  <b>{f.short}:</b> {d.text}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="tk-section">
        <span className="caps tk-label">{d.cards.fits}</span>
        <p>{t.fits}</p>
        {t.context.length > 0 && (
          <ul className="tk-context">
            {t.context.map((c, i) => (
              <li key={i}>{fmt(d.cards.youAdded, { c })}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="tk-section tk-next">
        <span className="caps tk-label">{d.cards.next}</span>
        <p>{t.nextStep}</p>
      </div>
    </section>
  );
}

export function ReadingCard({ session, full = false }: { session: CouncilSession; full?: boolean }) {
  const recs = readingFor(session);
  const d = useT();
  // a recalled book's card lands in `minds`, not in the session: this is what fills in its "Start with" line
  useStore((s) => s.minds);
  // and it is asked for here, when the card is reached — not when the session was cast — in the language the card reads in
  // (ensureBook returns at once when that language's card is already here)
  const ensureBook = useStore((s) => s.ensureBook);
  const lang = useLang();
  const recalledIds = recs.filter((r) => book(r.bookId).recalled).map((r) => r.bookId).join(' ');
  useEffect(() => {
    for (const id of recalledIds.split(' ')) if (id) void ensureBook(id);
  }, [recalledIds, lang, ensureBook]);
  return (
    <section className={`card council-card reading ${full ? 'full' : ''}`} aria-label={d.cards.readingAria}>
      {!full && <h3 className="council-card-title">{d.cards.readingTitle}</h3>}
      <ul className="rec-list">
        {recs.map((r) => {
          const b = book(r.bookId);
          const f = figure(r.figureId);
          return (
            <li key={r.bookId}>
              <button type="button" className="rec" onClick={() => navigate({ name: 'book', id: b.id, council: session.id })}>
                <Cover book={b} width={48} />
                <span className="rec-body">
                  <span className="rec-title">
                    {b.title} <span className="muted">· {f.short}</span>
                  </span>
                  {r.bestStart && (
                    <span className="rec-best">
                      <IconStar /> {d.cards.best}
                    </span>
                  )}
                  <span className="rec-why">{r.why}</span>
                  {b.start.label && (
                    <span className="rec-start">
                      {d.cards.startWith} <b>{b.start.label}</b> — {b.start.title}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
