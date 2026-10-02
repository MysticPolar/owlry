import { useEffect, useState } from 'react';
import { IconBookmark, IconBookmarkFilled, IconShare, IconExternalLink } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore, selectCouncil, selectMindUnavailable } from '../store/useStore';
import { maybeBook } from '../content/books';
import { figure } from '../content/figures';
import { readingFor } from '../engine/council';
import { TopBar, Sheet } from '../components/chrome';
import { Cover } from '../components/Cover';
import { Owl } from '../components/Owl';
import { useBump } from '../hooks/useBump';
import { useT, useLang, fmt } from '../i18n/react';
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
  // a recalled book's card lands in the store's `minds`, not in a session: subscribing is what turns the arriving note into the card
  useStore((s) => s.minds);
  const ensureBook = useStore((s) => s.ensureBook);
  const unavailable = useStore(selectMindUnavailable('book', id));
  const recalled = !!b?.recalled;
  // the card is asked for here, when the page is reached — and again in a new language, where the other language's card
  // stands in meanwhile; ensureBook returns at once when the card for this language is already here
  const lang = useLang();
  useEffect(() => {
    if (recalled) void ensureBook(id);
  }, [recalled, id, lang, ensureBook]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [saveBump, bumpSave] = useBump();
  const t = useT();

  if (!b) {
    return (
      <div className="screen">
        <TopBar backFallback={{ name: 'library' }} title={t.book.title} className="top-inset" />
        <p className="pad muted" style={{ paddingTop: 24 }}>{t.book.missing}</p>
      </div>
    );
  }
  const author = figure(b.authorId);
  const rec = session ? readingFor(session).find((r) => r.bookId === b.id) : undefined;
  const isSaved = saved.includes(b.id);
  const onSave = () => {
    bumpSave();
    toggleSaved(b.id);
    showToast(isSaved ? t.book.removed : t.book.savedLib);
  };
  const share = async () => {
    const text = fmt(t.book.shareText, { title: b.title, author: b.authorName, blurb: b.blurb });
    try {
      if (navigator.share) await navigator.share({ title: b.title, text });
      else {
        await navigator.clipboard.writeText(text);
        showToast(t.common.copied);
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
            <button type="button" className={`iconbtn ${isSaved ? 'on' : ''} ${saveBump ? 'bump' : ''}`} aria-label={isSaved ? t.book.ariaRemove : t.book.ariaSave} onClick={onSave}>
              {isSaved ? <IconBookmarkFilled /> : <IconBookmark stroke={1.8} />}
            </button>
            <button type="button" className="iconbtn" aria-label={t.common.share} onClick={share}>
              <IconShare stroke={1.8} />
            </button>
          </>
        }
      />
      <div className="screen-scroll pad book-body">
        <div className="book-hero">
          <Cover book={b} width={136} className="book-cover" />
          <h1 className="title book-title">{b.title}</h1>
          <p className="book-author">
            {b.authorName}
            {/* a recalled book has no curated cover to date it; the year the cast gave stays on the line once the card lands */}
            {b.recalled && b.year !== 0 && ` · ${b.year < 0 ? fmt(t.common.bc, { year: -b.year }) : b.year}`}
          </p>
          {b.pending && <p className="book-arriving">{unavailable ? t.book.unavailable : t.book.arriving}</p>}
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
            {b.quote.gloss && (
              <p className="book-quote-gloss">
                <span className="msg-source-tag">{t.common.translation}</span> {b.quote.gloss}
              </p>
            )}
            <footer>
              — {b.authorName}
              {b.quote.source.url && (
                <a href={b.quote.source.url} target="_blank" rel="noreferrer" aria-label={t.common.source}>
                  <IconExternalLink />
                </a>
              )}
              {/* a recalled book's epigraph is the model's memory of it: attributed, never verbatim */}
              <span className="msg-source-tag">{b.recalled ? t.common.attributed : t.common.verbatim}</span>
            </footer>
          </blockquote>
        )}

        {rec && session && (
          <section className="card book-why">
            <span className="caps muted">{t.book.why}</span>
            <p>{rec.why}</p>
            <p className="small muted">{fmt(t.book.recommended, { q: session.question, name: author.short })}</p>
          </section>
        )}

        {/* a recalled card may name no section to start from: then there is no start card, and the reader opens on the guide itself */}
        {!b.pending && b.start.label && (
        <section className="card book-start">
          <span className="caps muted">{t.book.startHere}</span>
          <p className="book-start-title">
            <b>{b.start.label}</b> — {b.start.title}
          </p>
          <p className="small muted">{b.start.why}</p>
          {progress && progress.pct > 0 && (
            <p className="small book-progress">{progress.status === 'completed' ? t.book.completed : fmt(t.book.pctRead, { pct: Math.round(progress.pct * 100) })}</p>
          )}
        </section>
        )}

        {b.blurb && <p className="book-blurb">{b.blurb}</p>}
      </div>
      <div className="book-actions pad">
        {/* nothing to read or summarise until the card is here; saving and sharing work on the title alone.
            On a recalled book the two buttons land after the page, once the card does, so they get an entrance */}
        {!b.pending && (
          <button type="button" className={`btn btn-primary ${b.recalled ? 'book-landed' : ''}`} onClick={startReading}>
            {progress && progress.pct > 0 && progress.status !== 'completed' ? t.book.continueReading : t.book.startReading}
          </button>
        )}
        {!b.pending && (
          <button type="button" className={`btn btn-outline ${b.recalled ? 'book-landed' : ''}`} onClick={() => setSummaryOpen(true)}>
            {t.book.readSummary}
          </button>
        )}
        <button type="button" className="linkbtn book-save" onClick={onSave}>
          {isSaved ? t.book.savedTick : t.book.saveLib}
        </button>
        <span className="hand book-hand" aria-hidden="true">
          {t.book.hand1}
          <br />
          {t.book.hand2}
        </span>
        <Owl color="yellow" size={62} className="book-owl" />
      </div>

      <Sheet open={summaryOpen} onClose={() => setSummaryOpen(false)} label={fmt(t.book.summaryOf, { title: b.title })} tall>
        <div className="book-summary">
          <span className="caps muted">{t.book.bookSummary}</span>
          <h2 className="title">{b.title}</h2>
          <p className="small muted">
            {b.authorName}
            {b.year !== 0 && ` · ${b.year < 0 ? fmt(t.common.bc, { year: -b.year }) : b.year}`}
          </p>
          <p className="book-summary-gist">{b.summary.gist}</p>
          <span className="caps muted">{t.book.mainIdeas}</span>
          <ol className="book-ideas">
            {b.summary.ideas.map((idea, i) => (
              <li key={i}>{idea}</li>
            ))}
          </ol>
          <button type="button" className="btn btn-primary" onClick={startReading}>
            {b.start.label ? fmt(t.book.read, { label: b.start.label }) : t.book.startReading}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
