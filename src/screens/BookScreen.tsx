import { useState } from 'react';
import { IconBookmark, IconBookmarkFilled, IconShare, IconExternalLink } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore, selectCouncil } from '../store/useStore';
import { maybeBook } from '../content/books';
import { figure } from '../content/figures';
import { readingFor } from '../engine/council';
import { TopBar, Sheet } from '../components/chrome';
import { Cover } from '../components/Cover';
import { Owl } from '../components/Owl';
import './BookScreen.css';

/* ============================================================
   Book detail — "Open a book. A new perspective."
   Cover, tags, an epigraph, why it relates to your question, where to
   start, and the two primary actions.
   ============================================================ */
export function BookScreen({ id, councilId }: { id: string; councilId?: string }) {
  const b = maybeBook(id);
  const session = useStore(selectCouncil(councilId));
  const saved = useStore((s) => s.saved);
  const toggleSaved = useStore((s) => s.toggleSaved);
  const showToast = useStore((s) => s.showToast);
  const progress = useStore((s) => (b ? s.progress[b.id] : undefined));
  const [summaryOpen, setSummaryOpen] = useState(false);

  if (!b) {
    return (
      <div className="screen">
        <TopBar backFallback={{ name: 'library' }} title="Book" className="top-inset" />
        <p className="pad muted" style={{ paddingTop: 24 }}>We couldn’t find that book.</p>
      </div>
    );
  }
  const author = figure(b.authorId);
  const rec = session ? readingFor(session).find((r) => r.bookId === b.id) : undefined;
  const isSaved = saved.includes(b.id);
  const onSave = () => {
    toggleSaved(b.id);
    showToast(isSaved ? 'Removed from your library.' : 'Saved to your library.');
  };
  const share = async () => {
    const text = `${b.title} by ${b.authorName} — ${b.blurb}`;
    try {
      if (navigator.share) await navigator.share({ title: b.title, text });
      else {
        await navigator.clipboard.writeText(text);
        showToast('Copied.');
      }
    } catch {
      /* dismissed */
    }
  };
  const startReading = () => navigate({ name: 'read', id: b.id, council: councilId });

  return (
    <div className="screen bookscreen">
      <TopBar
        backFallback={councilId ? { name: 'summary', id: councilId } : { name: 'library' }}
        className="top-inset"
        right={
          <>
            <button type="button" className={`iconbtn ${isSaved ? 'on' : ''}`} aria-label={isSaved ? 'Remove from library' : 'Save to library'} onClick={onSave}>
              {isSaved ? <IconBookmarkFilled /> : <IconBookmark stroke={1.8} />}
            </button>
            <button type="button" className="iconbtn" aria-label="Share" onClick={share}>
              <IconShare stroke={1.8} />
            </button>
          </>
        }
      />
      <div className="screen-scroll pad book-body">
        <div className="book-hero">
          <Cover book={b} width={136} className="book-cover" />
          <h1 className="title book-title">{b.title}</h1>
          <p className="book-author">{b.authorName}</p>
          <div className="book-tags">
            {b.tags.map((tg) => (
              <span key={tg} className="tag">
                {tg}
              </span>
            ))}
          </div>
        </div>

        {b.quote && (
          <blockquote className="book-quote">
            <p>“{b.quote.text}”</p>
            <footer>
              — {b.authorName}
              {b.quote.source.url && (
                <a href={b.quote.source.url} target="_blank" rel="noreferrer" aria-label="Source">
                  <IconExternalLink />
                </a>
              )}
              <span className="msg-source-tag">verbatim</span>
            </footer>
          </blockquote>
        )}

        {rec && session && (
          <section className="card book-why">
            <span className="caps muted">Why it relates to your question</span>
            <p>{rec.why}</p>
            <p className="small muted">“{session.question}” — recommended by {author.short}’s seat on your council.</p>
          </section>
        )}

        <section className="card book-start">
          <span className="caps muted">Start here</span>
          <p className="book-start-title">
            <b>{b.start.label}</b> — {b.start.title}
          </p>
          <p className="small muted">{b.start.why}</p>
          {progress && progress.pct > 0 && (
            <p className="small book-progress">{progress.status === 'completed' ? 'Completed' : `${Math.round(progress.pct * 100)}% read — pick up where you left off`}</p>
          )}
        </section>

        <p className="book-blurb">{b.blurb}</p>
      </div>
      <div className="book-actions pad">
        <button type="button" className="btn btn-primary" onClick={startReading}>
          {progress && progress.pct > 0 && progress.status !== 'completed' ? 'Continue Reading' : 'Start Reading'}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => setSummaryOpen(true)}>
          Read Book Summary
        </button>
        <button type="button" className="linkbtn book-save" onClick={onSave}>
          {isSaved ? 'Saved to Library ✓' : 'Save to Library'}
        </button>
        <span className="hand book-hand" aria-hidden="true">
          Small steps.
          <br />
          Brighter you.
        </span>
        <Owl color="yellow" size={62} className="book-owl" />
      </div>

      <Sheet open={summaryOpen} onClose={() => setSummaryOpen(false)} label={`Summary of ${b.title}`} tall>
        <div className="book-summary">
          <span className="caps muted">Book summary</span>
          <h2 className="title">{b.title}</h2>
          <p className="small muted">{b.authorName} · {b.year < 0 ? `${-b.year} BC` : b.year}</p>
          <p className="book-summary-gist">{b.summary.gist}</p>
          <span className="caps muted">Main ideas</span>
          <ol className="book-ideas">
            {b.summary.ideas.map((idea, i) => (
              <li key={i}>{idea}</li>
            ))}
          </ol>
          <button type="button" className="btn btn-primary" onClick={startReading}>
            Read {b.start.label}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
