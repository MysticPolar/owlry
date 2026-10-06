import { useMemo, useState, type CSSProperties } from 'react';
import { IconSearch, IconChevronRight } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore, selectCouncils } from '../store/useStore';
import type { Highlight, Progress } from '../store/types';
import { maybeBook, CATEGORIES } from '../content/books';
import type { Book, Category } from '../content/types';
import { figure } from '../content/figures';
import { readingFor } from '../engine/council';
import { timeAgo } from '../app/ids';
import { AppBar } from '../components/chrome';
import { Cover } from '../components/Cover';
import { Avatar } from '../components/Avatar';
import { usePresence } from '../hooks/usePresence';
import { useT, useLang, fmt } from '../i18n/react';
import './LibraryScreen.css';

/* ============================================================
   The Library — the second tab. "My library."
   Where you left off, your books most recently opened first (by shelf, or
   searched), what your councils suggested you read next, the councils
   themselves to revisit, and your highlights. The chips are the shelves:
   every category you hold a book in, plus "Councils", which keeps only the
   two council sections.
   ============================================================ */
type Shelf = 'all' | 'councils' | Category;

/** cut a question to fit a row's sub line, on a word boundary */
const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s);

/** the .rv stagger: the blocks arrive top to bottom */
const delay = (n: number): CSSProperties => ({ animationDelay: `${n * 60}ms` });
const cascade = (i: number) => ({ '--i': i }) as CSSProperties;

interface Rec {
  bookId: string;
  councilId: string;
  question: string;
}

interface Suggestion {
  book: Book;
  councilId: string;
  question: string;
}

const Chev = () => <IconChevronRight className="chev" stroke={2} aria-hidden="true" />;

export function LibraryScreen() {
  const saved = useStore((s) => s.saved);
  const progress = useStore((s) => s.progress);
  const bookmarks = useStore((s) => s.bookmarks);
  const lastRead = useStore((s) => s.lastRead);
  const highlights = useStore((s) => s.highlights);
  const councils = useStore(selectCouncils);
  // recalled books resolve through the registry; their cards land in `minds`, so the shelf follows that too
  const minds = useStore((s) => s.minds);
  const lang = useLang();
  const [shelf, setShelf] = useState<Shelf>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  // the search field stays mounted for its exit
  const search = usePresence(searchOpen, 220);
  const t = useT();

  // saved and opened books, the ones you have been reading most recently first
  // (maybeBook reads the language and the recalled cards, so both are inputs)
  const books = useMemo(() => {
    void minds;
    void lang;
    const ids = new Set([...saved, ...Object.keys(progress)]);
    return [...ids]
      .map((id) => maybeBook(id))
      .filter((b): b is Book => !!b)
      .sort((a, b) => (progress[b.id]?.lastReadAt ?? 0) - (progress[a.id]?.lastReadAt ?? 0));
  }, [saved, progress, minds, lang]);
  const shelves = useMemo(() => CATEGORIES.filter((c) => books.some((b) => b.category === c)), [books]);

  // every book a council handed over, in council order (a cast council synthesises its script, so keep this off the keystroke path)
  const recs = useMemo<Rec[]>(() => {
    void minds;
    void lang;
    return councils.flatMap((c) => readingFor(c).map((r) => ({ bookId: r.bookId, councilId: c.id, question: c.question })));
  }, [councils, minds, lang]);

  const councilShelf = shelf === 'councils';
  const qn = q.trim().toLowerCase();
  const hit = (...parts: (string | undefined)[]) => !qn || parts.join(' ').toLowerCase().includes(qn);
  const hitBook = (b: Book, ...more: (string | undefined)[]) => hit(b.title, b.authorName, t.library.categories[b.category], ...b.tags, ...more);
  const onShelf = (b: Book | undefined) => shelf === 'all' || councilShelf || (!!b && b.category === shelf);
  const subOf = (b: Book, p: Progress | undefined) => {
    let out = '';
    if (p?.status === 'completed') out += ` · ${t.library.completed}`;
    else if (p) {
      const pct = Math.round(p.pct * 100);
      if (pct > 0) out += ` · ${pct}%`;
    }
    const marks = bookmarks[b.id]?.length ?? 0;
    if (marks) out += ` · ${fmt(marks > 1 ? t.library.bookmarks : t.library.bookmark, { n: marks })}`;
    return out;
  };

  // where you left off — shown above the rows, which then leave it out
  const current = lastRead ? maybeBook(lastRead.bookId) : undefined;
  const currentPct = current ? Math.round((progress[current.id]?.pct ?? 0) * 100) : 0;
  const empty = books.length === 0;
  const showContinue = !!current && !councilShelf && !qn;
  const matching = councilShelf ? [] : books.filter((b) => onShelf(b) && hitBook(b));
  const rows = matching.filter((b) => !(showContinue && b.id === current?.id));
  // "Nothing here yet." only when the shelf or the search found nothing, not when the one match is the card above
  const showRecent = !councilShelf && !empty && (rows.length > 0 || matching.length === 0);

  // what the councils suggested and you have not opened yet, one row per book
  const suggested: Suggestion[] = [];
  const seen = new Set<string>();
  for (const r of recs) {
    if (suggested.length >= 4) break;
    if (progress[r.bookId] || seen.has(r.bookId)) continue;
    const book = maybeBook(r.bookId);
    if (!book || !onShelf(book) || !hitBook(book, r.question)) continue;
    seen.add(r.bookId);
    suggested.push({ book, councilId: r.councilId, question: r.question });
  }

  // the councils worth coming back to: saved, finished, or well under way
  const savedCouncils = councils.filter((c) => c.saved || c.stage === 'summarized' || c.messages.length > 8);
  const shownCouncils = shelf === 'all' || councilShelf ? savedCouncils.filter((c) => hit(c.question, ...c.seats.map((fid) => figure(fid).short))) : [];

  const shownHighlights: { h: Highlight; book: Book | undefined }[] = councilShelf
    ? []
    : highlights
        .map((h) => ({ h, book: maybeBook(h.bookId) }))
        .filter(({ h, book }) => onShelf(book) && hit(h.text, h.note, book?.title, book?.authorName))
        .slice(0, 8);

  const chips: { id: Shelf; label: string }[] = [
    { id: 'all', label: t.library.allShelves },
    { id: 'councils', label: t.library.councilsChip },
    ...shelves.map((c) => ({ id: c as Shelf, label: t.library.categories[c] })),
  ];

  const toggleSearch = () => {
    setSearchOpen((v) => !v);
    setQ('');
  };

  return (
    <div className="screen library">
      <AppBar />
      <div className="content">
        <div className="lib-head rv" style={delay(0)}>
          <h1 className="lead">{t.library.title}</h1>
          <button type="button" className={`iconbtn ghost ${searchOpen ? 'on' : ''}`} aria-label={t.library.search} aria-pressed={searchOpen} onClick={toggleSearch}>
            <IconSearch stroke={1.8} />
          </button>
        </div>
        {search.mounted && (
          <div className={`lib-search ${search.closing ? 'closing' : 'in'}`}>
            <input
              className="input"
              type="text"
              enterKeyHint="search"
              placeholder={t.library.searchPh}
              aria-label={t.library.searchPh}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') toggleSearch();
                else if (e.key === 'Enter') e.currentTarget.blur();
              }}
              disabled={search.closing}
              autoFocus
            />
          </div>
        )}
        <div className="chips-wrap rv" style={delay(1)}>
          <div className="chips">
            {chips.map((c) => (
              <button key={c.id} type="button" className={`chip ${shelf === c.id ? 'on' : ''}`} aria-pressed={shelf === c.id} onClick={() => setShelf(c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* an empty library: nothing saved, nothing opened */}
        {empty && !councilShelf && (
          <div className="card lib-nothing rv" style={delay(2)}>
            <p className="lib-nothing-title">{t.library.nothingOpen}</p>
            <p className="bookrow-sub">{t.library.nothingOpenSub}</p>
            <button type="button" className="btn dark sm" onClick={() => navigate({ name: 'council' })}>
              {t.library.askQ}
            </button>
          </div>
        )}

        {/* continue reading */}
        {showContinue && current && (
          <button type="button" className="card continue rv" style={delay(2)} onClick={() => navigate({ name: 'read', id: current.id, council: lastRead?.councilId })}>
            <Cover book={current} width={70} height={100} />
            <div className="grow">
              <div className="caps">{t.library.continueReading}</div>
              <div className="continue-title">{current.title}</div>
              <div className="bookrow-sub">
                {current.text.heading || current.authorName} · {currentPct}%
              </div>
              <div className="progress-track" aria-hidden="true">
                <span style={{ width: `${currentPct}%` }} />
              </div>
            </div>
            <Chev />
          </button>
        )}

        {/* recently opened: the shelf chip and the search narrow it */}
        {showRecent && (
          <div className="lib-section rv" style={delay(3)}>
            <div className="act">{t.library.recentlyOpened}</div>
            <div className="cascade">
              {rows.map((b, i) => (
                <button key={b.id} type="button" className="bookrow" style={cascade(i)} onClick={() => navigate({ name: 'book', id: b.id })}>
                  <Cover book={b} width={44} height={64} />
                  <div className="bookrow-text">
                    <div className="bookrow-title">{b.title}</div>
                    <div className="bookrow-sub">
                      {b.authorName} · {t.library.categories[b.category]}
                      {subOf(b, progress[b.id])}
                    </div>
                  </div>
                  <Chev />
                </button>
              ))}
              {rows.length === 0 && <p className="muted lib-empty">{t.library.nothing}</p>}
            </div>
          </div>
        )}

        {/* from your councils */}
        {suggested.length > 0 && (
          <div className="lib-section rv" style={delay(4)}>
            <div className="act">{t.library.fromCouncils}</div>
            <div className="cascade">
              {suggested.map(({ book, councilId, question }, i) => (
                <button key={book.id} type="button" className="bookrow" style={cascade(i)} onClick={() => navigate({ name: 'book', id: book.id, council: councilId })}>
                  <Cover book={book} width={44} height={64} />
                  <div className="bookrow-text">
                    <div className="bookrow-title">{book.title}</div>
                    <div className="bookrow-sub">
                      {book.start.label
                        ? fmt(t.library.fromCouncilSub, { q: trunc(question, 38), label: book.start.label })
                        : fmt(t.library.fromCouncilSubNoLabel, { q: trunc(question, 38) })}
                    </div>
                  </div>
                  <Chev />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* your councils */}
        {(shownCouncils.length > 0 || (councilShelf && suggested.length === 0)) && (
          <div className="lib-section rv" style={delay(5)}>
            <div className="act">{t.library.councils}</div>
            <div className="lib-list cascade">
              {shownCouncils.map((c, i) => {
                const seats = c.seats.map((fid) => figure(fid));
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="card council-row"
                    style={cascade(i)}
                    onClick={() => navigate(c.stage === 'summarized' ? { name: 'summary', id: c.id } : { name: 'stands', id: c.id })}
                  >
                    <span className="stack-meds" aria-hidden="true">
                      {seats.map((f, seat) => (
                        <Avatar key={`${f.id}-${seat}`} figure={f} size={28} seat={seat} />
                      ))}
                    </span>
                    <div className="grow">
                      <div className="council-row-q">“{c.question}”</div>
                      <div className="bookrow-sub">
                        {seats.map((f) => f.short).join(t.library.nameSep)} · {timeAgo(c.updatedAt)}
                        {c.stage !== 'summarized' ? t.library.inProgress : ''}
                      </div>
                    </div>
                    <Chev />
                  </button>
                );
              })}
              {shownCouncils.length === 0 && <p className="muted lib-empty">{t.library.nothing}</p>}
            </div>
          </div>
        )}

        {/* highlights */}
        {shownHighlights.length > 0 && (
          <div className="lib-section rv" style={delay(6)}>
            <div className="act">{t.library.highlights}</div>
            <div className="lib-list cascade">
              {shownHighlights.map(({ h, book }, i) => (
                <button
                  key={h.id}
                  type="button"
                  className="card highlight-row"
                  style={cascade(i)}
                  onClick={() => navigate({ name: 'read', id: h.bookId, council: h.councilId })}
                >
                  <div className="highlight-text">“{h.text}”</div>
                  <div className="bookrow-sub">{[book?.title, book?.authorName, timeAgo(h.ts)].filter(Boolean).join(' · ')}</div>
                  {h.note && <div className="highlight-note">{h.note}</div>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
