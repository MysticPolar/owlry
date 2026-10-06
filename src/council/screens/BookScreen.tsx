import { useEffect, useState } from 'react';
import { IconBookmark, IconBookmarkFilled, IconShare, IconExternalLink } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore, selectCouncil, selectMindUnavailable } from '../store/useStore';
import { maybeBook } from '../content/books';
import { figure } from '../content/figures';
import type { Book } from '../content/types';
import { readingFor } from '../engine/council';
import { AppBar, Sheet } from '../components/chrome';
import { Cover } from '../components/Cover';
import { useBump } from '../hooks/useBump';
import { useT, useLang, fmt } from '../i18n/react';
import './BookScreen.css';

/* ============================================================
   The book (v14). The jacket beside the title, author and tags; where to
   start (and, when it was opened from a council, why this seat handed it
   to you); the book's epigraph with its tag; the blurb. The footer reads
   the guide, opens the summary sheet, and links out to the book or keeps
   it in the library. A book a cast seat named arrives as a title only and
   fills in when the live council has written its card.
   ============================================================ */

/** the book on Open Library (the mockup's `bookUrl`): its ISBN page, else a search by title and author — a recalled
 *  card, or a cast's placeholder, has no ISBN, and the link out still works on the title alone */
const bookUrl = (b: Book): string =>
  b.isbn ? `https://openlibrary.org/isbn/${b.isbn}` : `https://openlibrary.org/search?q=${encodeURIComponent(`${b.title} ${b.authorName}`)}`;

/** the mockup's `trunc`: cut at a word, add an ellipsis */
const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…` : s);

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
      <div className="screen book-screen">
        <AppBar back={{ name: 'library' }} label={t.book.title} />
        <div className="content">
          <p className="sub rv">{t.book.missing}</p>
        </div>
      </div>
    );
  }

  const rec = session ? readingFor(session).find((r) => r.bookId === b.id) : undefined;
  const isSaved = saved.includes(b.id);
  const olUrl = bookUrl(b);
  const quoteUrl = b.quote?.source.url || olUrl;
  const pct = progress ? Math.round(progress.pct * 100) : 0;
  const reading = pct > 0 && progress?.status !== 'completed';

  const onSave = () => {
    bumpSave();
    toggleSaved(b.id);
    showToast(isSaved ? t.book.removed : t.book.savedLib);
  };
  const share = async () => {
    // a cast's placeholder has no blurb yet: then just the title and the author
    const text = b.blurb
      ? fmt(t.book.shareText, { title: b.title, author: b.authorName, blurb: b.blurb })
      : fmt(t.book.coverAria, { title: b.title, author: b.authorName });
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

  // "Book V — At dawn…"; a recalled card may name no section, and then the guide's own heading stands in
  const ttl = b.start.label ? (b.start.title ? `${b.start.label} — ${b.start.title}` : b.start.label) : b.text.heading;
  // the same rounded figure as the gold button's "Continue": a sliver under 0.5% is not progress, and never "0% read"
  const progressLine = progress?.status === 'completed' ? t.book.completed : pct > 0 ? fmt(t.book.pctRead, { pct }) : '';
  const showPanel = !b.pending && !!(rec || ttl || b.start.why || progressLine);
  const year = b.year < 0 ? fmt(t.common.bc, { year: -b.year }) : String(b.year);
  // the two actions on a recalled book mount after the page, once its card lands, so they get an entrance
  const landed = b.recalled ? 'book-landed' : '';

  return (
    <div className="screen book-screen">
      <AppBar
        back={councilId ? { name: 'summary', id: councilId } : { name: 'library' }}
        right={
          <>
            <button
              type="button"
              className={`iconbtn ${isSaved ? 'on' : ''} ${saveBump ? 'bump' : ''}`}
              aria-label={isSaved ? t.book.ariaRemove : t.book.ariaSave}
              onClick={onSave}
            >
              {isSaved ? <IconBookmarkFilled /> : <IconBookmark stroke={1.8} />}
            </button>
            <button type="button" className="iconbtn" aria-label={t.common.share} onClick={share}>
              <IconShare stroke={1.8} />
            </button>
          </>
        }
      />
      <div className="content">
        <div className="book-head rv">
          <Cover book={b} width={107} height={160} size="L" className="book-cover" />
          <div className="book-meta">
            <h1 className="book-title">{b.title}</h1>
            <div className="book-author">
              {b.authorName}
              {/* a recalled book has no curated cover to date it; the year the cast gave stays on the line */}
              {b.recalled && b.year !== 0 && ` · ${year}`}
            </div>
            {b.tags.length > 0 && <div className="book-tags">{b.tags.join(' · ')}</div>}
          </div>
        </div>

        {b.pending ? (
          <p className="book-arriving rv" style={{ animationDelay: '.06s' }}>
            {unavailable ? t.book.unavailable : t.book.arriving}
          </p>
        ) : (
          showPanel && (
            <div className="panel rv" style={{ animationDelay: '.06s' }}>
              <div className="act">{t.book.startHere}</div>
              {ttl && <div className="ttl">{ttl}</div>}
              {rec && session ? (
                <>
                  <p>{rec.why}</p>
                  <p className="q">{fmt(t.book.recommended, { name: figure(rec.figureId).short, q: trunc(session.question, 70) })}</p>
                </>
              ) : (
                b.start.why && <p className="q">{b.start.why}</p>
              )}
              {progressLine && <p className="book-progress">{progressLine}</p>}
            </div>
          )
        )}

        {b.quote && (
          <div className="book-quote rv" style={{ animationDelay: '.12s' }}>
            <p>“{b.quote.text}”</p>
            {b.quote.gloss && (
              <p className="book-quote-gloss">
                <span className="vtag">{t.common.translation}</span> {b.quote.gloss}
              </p>
            )}
            <footer>
              — {b.authorName}
              <a href={quoteUrl} target="_blank" rel="noopener noreferrer" aria-label={t.common.source}>
                <IconExternalLink stroke={2} />
              </a>
              {/* a recalled book's epigraph is the model's memory of it: attributed, never verbatim */}
              <span className="vtag">{b.recalled ? t.common.attributed : t.common.verbatim}</span>
            </footer>
          </div>
        )}

        {b.blurb && (
          <p className="book-blurb rv" style={{ animationDelay: '.16s' }}>
            {b.blurb}
          </p>
        )}
      </div>

      <div className="footer">
        <div className="stack">
          {/* nothing to read or summarise until the card is here; saving and the link out work on the title alone */}
          {!b.pending && (
            <button type="button" className={`btn gold ${landed}`} onClick={startReading}>
              {reading ? t.book.continueGuide : t.book.readGuide}
            </button>
          )}
          {!b.pending && (
            <button type="button" className={`btn ghost ${landed}`} onClick={() => setSummaryOpen(true)}>
              {t.book.bookSummary}
            </button>
          )}
          <div className="book-links">
            <a className="btn text" href={olUrl} target="_blank" rel="noopener noreferrer">
              {t.book.getBook} <IconExternalLink stroke={2} />
            </a>
            <button type="button" className="btn text" onClick={onSave}>
              {isSaved ? t.book.savedTick : t.book.saveLib}
            </button>
          </div>
        </div>
      </div>

      <Sheet open={summaryOpen} onClose={() => setSummaryOpen(false)} label={fmt(t.book.summaryOf, { title: b.title })} tall>
        <div className="book-summary">
          <div className="act">{t.book.bookSummary}</div>
          <h2 className="book-summary-title">{b.title}</h2>
          <p className="book-summary-by">
            {b.authorName}
            {b.year !== 0 && ` · ${year}`}
          </p>
          {b.summary.gist && <p className="book-summary-gist">{b.summary.gist}</p>}
          {b.summary.ideas.length > 0 && (
            <>
              <div className="act">{t.book.mainIdeas}</div>
              <ol className="book-ideas">
                {b.summary.ideas.map((idea, i) => (
                  <li key={i}>{idea}</li>
                ))}
              </ol>
            </>
          )}
          <button type="button" className="btn gold" onClick={startReading}>
            {b.start.label ? fmt(t.book.read, { label: b.start.label }) : t.book.readGuide}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
