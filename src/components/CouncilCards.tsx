import { IconArrowRight, IconStar } from '@tabler/icons-react';
import type { CouncilSession } from '../store/types';
import { navigate } from '../app/router';
import { figure } from '../content/figures';
import { book } from '../content/books';
import { takeawaysFor, readingFor } from '../engine/council';
import { Avatar } from './Avatar';
import { Cover } from './Cover';

/* ============================================================
   Card 1 — Your Council's Takeaways · Card 2 — Reading for Your Question
   Rendered inline in the chat and again, larger, on the summary screen.
   ============================================================ */
export function TakeawaysCard({ session, full = false }: { session: CouncilSession; full?: boolean }) {
  const t = takeawaysFor(session);
  return (
    <section className={`card council-card takeaways ${full ? 'full' : ''}`} aria-label="Your council's takeaways">
      {!full && <h3 className="council-card-title">Your Council’s Takeaways</h3>}
      <div className="tk-section">
        <span className="caps tk-label">Common ground</span>
        <p>{t.commonGround}</p>
      </div>
      <div className="tk-section">
        <span className="caps tk-label">Key differences</span>
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
        <span className="caps tk-label">What fits your situation</span>
        <p>{t.fits}</p>
        {t.context.length > 0 && (
          <ul className="tk-context">
            {t.context.map((c, i) => (
              <li key={i}>You added: “{c}”</li>
            ))}
          </ul>
        )}
      </div>
      <div className="tk-section tk-next">
        <span className="caps tk-label">One next step</span>
        <p>{t.nextStep}</p>
      </div>
      {!full && (
        <button type="button" className="council-card-link" onClick={() => navigate({ name: 'summary', id: session.id })}>
          View full summary <IconArrowRight />
        </button>
      )}
    </section>
  );
}

export function ReadingCard({ session, full = false }: { session: CouncilSession; full?: boolean }) {
  const recs = readingFor(session);
  return (
    <section className={`card council-card reading ${full ? 'full' : ''}`} aria-label="Reading for your question">
      {!full && <h3 className="council-card-title">Reading for Your Question</h3>}
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
                      <IconStar /> Best starting point
                    </span>
                  )}
                  <span className="rec-why">{r.why}</span>
                  <span className="rec-start">
                    Start with <b>{b.start.label}</b> — {b.start.title}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
