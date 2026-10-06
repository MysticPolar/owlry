import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { IconBookmark, IconBookmarkFilled, IconTypography, IconHighlight, IconUsers, IconCopy, IconX, IconExternalLink } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore, selectCouncil } from '../store/useStore';
import { maybeBook } from '../content/books';
import { readingFor } from '../engine/council';
import type { TextSize } from '../store/types';
import type { Book } from '../content/types';
import { AppBar } from '../components/chrome';
import { usePresence } from '../hooks/usePresence';
import { useBump } from '../hooks/useBump';
import { useT, useLang, fmt } from '../i18n/react';
import './ReaderScreen.css';

/* ============================================================
   The reader (v14). The book and the section in the app bar, the text
   size and a bookmark beside them; the page — kicker, heading, what the
   text is (an Owlry reading guide, or a public-domain translation and
   who made it), the paragraphs with your highlights marked, the end of
   the section and the way to the full book; a thin progress bar under it
   all. Select a passage to highlight it, copy it, or take it to the
   council. Opened from a council, a panel on top says why this section.
   ============================================================ */
const SIZES: TextSize[] = ['S', 'M', 'L'];
type Sel = { text: string; x: number; y: number };

/** the book on Open Library: its ISBN page, else a search by title and author (a recalled card has no ISBN) */
const bookUrl = (b: Book): string =>
  b.isbn ? `https://openlibrary.org/isbn/${b.isbn}` : `https://openlibrary.org/search?q=${encodeURIComponent(`${b.title} ${b.authorName}`)}`;

export function ReaderScreen({ id, councilId }: { id: string; councilId?: string }) {
  const b = maybeBook(id);
  const session = useStore(selectCouncil(councilId));
  const textSize = useStore((s) => s.textSize);
  const setTextSize = useStore((s) => s.setTextSize);
  const progress = useStore((s) => (b ? s.progress[b.id] : undefined));
  const setProgress = useStore((s) => s.setProgress);
  const bookmarks = useStore((s) => (b ? s.bookmarks[b.id] : undefined));
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const highlights = useStore((s) => s.highlights);
  const addHighlight = useStore((s) => s.addHighlight);
  const bringPassage = useStore((s) => s.bringPassage);
  const showToast = useStore((s) => s.showToast);
  // a recalled book's guide lands in `minds`, not in a session: subscribing is what replaces the arriving note with the text
  useStore((s) => s.minds);
  const ensureBook = useStore((s) => s.ensureBook);
  const recalled = !!b?.recalled;
  // asked for when the reader is reached, in the language it reads in; the other language's guide stands in until then
  const lang = useLang();
  useEffect(() => {
    if (recalled) void ensureBook(id);
  }, [recalled, id, lang, ensureBook]);
  const t = useT();

  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [noteOpen, setNoteOpen] = useState(true);
  const note = usePresence(noteOpen, 220);
  const [sizeOpen, setSizeOpen] = useState(false);
  const sizePop = usePresence(sizeOpen, 120);
  const [sel, setSel] = useState<Sel | null>(null);
  // the toolbar keeps its last place while it fades out
  const [selShown, setSelShown] = useState<Sel | null>(null);
  const selPresence = usePresence(!!sel, 120);
  useEffect(() => {
    if (sel) setSelShown(sel);
  }, [sel]);
  const [pos, setPos] = useState(progress?.pos ?? 0);
  const [pct, setPct] = useState(progress?.pct ?? 0);
  const pctRef = useRef(progress?.pct ?? 0);
  const posRef = useRef(progress?.pos ?? 0);
  const [markBump, bumpMark] = useBump();

  // restore the saved position once the text has laid out
  const restored = useRef(false);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || restored.current || !b) return;
    restored.current = true;
    if (progress?.pos) el.scrollTop = progress.pos;
  }, [b, progress?.pos]);

  // save progress as you read: at most every 600ms, and once more when the reader closes. The saver reads the
  // latest render through a ref, so the timer never holds a stale book or council
  const saveTimer = useRef<number | null>(null);
  const save = useRef<() => void>(() => {});
  save.current = () => {
    saveTimer.current = null;
    // an empty page is not reading: a book still waiting for its card records no progress (it would top "Continue reading")
    if (!b || b.pending) return;
    setProgress(b.id, pctRef.current, posRef.current, councilId);
  };
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = Math.max(1, el.scrollHeight - el.clientHeight);
    const p = Math.min(1, Math.max(0, el.scrollTop / max));
    pctRef.current = p;
    posRef.current = el.scrollTop;
    setPos(el.scrollTop);
    setPct(p);
    if (!saveTimer.current) saveTimer.current = window.setTimeout(() => save.current(), 600);
  };
  const onScrollRef = useRef(onScroll);
  onScrollRef.current = onScroll;
  // a layout effect, after the restore above: the strip is measured before the first paint, so a book read to the
  // end and reopened at the top does not flash "100% · Finished" and shrink
  useLayoutEffect(() => {
    // opening the reader counts as reading: measure where it opened (and keep that as the last read)
    onScrollRef.current();
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        save.current();
      }
    };
  }, []);

  // a new text size reflows the page; stay at the same place in the text, not the same pixel
  const sizeWas = useRef(textSize);
  useLayoutEffect(() => {
    if (sizeWas.current === textSize) return;
    sizeWas.current = textSize;
    const el = scrollRef.current;
    if (el) el.scrollTop = pctRef.current * Math.max(1, el.scrollHeight - el.clientHeight);
  }, [textSize]);

  // the selection toolbar follows a selection inside the text
  useEffect(() => {
    const handle = () => {
      const s = window.getSelection();
      const root = textRef.current;
      if (!s || s.isCollapsed || !root || !s.anchorNode || !root.contains(s.anchorNode)) {
        setSel(null);
        return;
      }
      const text = s.toString().replace(/\s+/g, ' ').trim();
      if (text.length < 6 || text.length > 700) {
        setSel(null);
        return;
      }
      const el = scrollRef.current;
      if (!el) return;
      // in the page's own coordinates (the toolbar scrolls with the text); the layout effect below keeps it on screen
      const rect = s.getRangeAt(0).getBoundingClientRect();
      const host = el.getBoundingClientRect();
      setSel({ text, x: rect.left + rect.width / 2 - host.left, y: Math.max(8, rect.top - host.top + el.scrollTop - 54) });
    };
    document.addEventListener('selectionchange', handle);
    return () => document.removeEventListener('selectionchange', handle);
  }, []);

  // centred over the selection, but never past the page's edges: clamp by the toolbar's own width (it differs by language)
  const toolsRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const bar = toolsRef.current;
    const el = scrollRef.current;
    if (!bar || !el || !selShown) return;
    const half = bar.offsetWidth / 2 + 8;
    bar.style.left = `${Math.max(half, Math.min(selShown.x, el.clientWidth - half))}px`;
  }, [selShown, selPresence.mounted]);

  if (!b) {
    return (
      <div className="screen reader-screen">
        <AppBar back={{ name: 'library' }} label={t.reader.title} />
        <div className="content">
          <p className="sub rv">{t.reader.missing}</p>
        </div>
      </div>
    );
  }

  const rec = session ? readingFor(session).find((r) => r.bookId === b.id) : undefined;
  const bookHighlights = highlights.filter((h) => h.bookId === b.id).map((h) => h.text);
  const nearBookmark = (bookmarks ?? []).some((p) => Math.abs(p - pos) < 40);
  const heading = b.text.heading || b.title;
  const shownPct = Math.round(pct * 100);
  const olUrl = bookUrl(b);

  const clearSel = () => {
    window.getSelection()?.removeAllRanges();
    setSel(null);
  };
  const doHighlight = () => {
    if (!sel) return;
    addHighlight(b.id, sel.text, councilId);
    clearSel();
    showToast(t.reader.highlightSaved);
  };
  const doCouncil = () => {
    if (!sel) return;
    const passage = sel.text;
    addHighlight(b.id, passage, councilId);
    clearSel();
    const target = bringPassage(b.id, passage);
    if (target) navigate({ name: 'debate', id: target });
    else showToast(t.reader.askFirst);
  };
  const doCopy = async () => {
    if (!sel) return;
    try {
      await navigator.clipboard.writeText(fmt(t.reader.copyFormat, { text: sel.text, title: b.title, author: b.authorName }));
      showToast(t.reader.copiedAttr);
    } catch {
      showToast(t.reader.copyNA);
    }
    clearSel();
  };
  const onBookmark = () => {
    toggleBookmark(b.id, posRef.current);
    bumpMark();
    showToast(nearBookmark ? t.reader.bookmarkRemoved : t.reader.bookmarked);
  };

  const tools = selShown && selPresence.mounted ? selShown : null;

  return (
    <div className="screen reader-screen">
      <AppBar
        back={{ name: 'book', id: b.id, council: councilId }}
        rig={false}
        centre={
          <div className="grow reader-titles">
            <div className="reader-book">{b.title}</div>
            <div className="reader-section">{heading}</div>
          </div>
        }
        right={
          <>
            <button
              type="button"
              className={`iconbtn ${sizeOpen ? 'on' : ''}`}
              aria-label={t.reader.textSize}
              aria-expanded={sizeOpen}
              onClick={() => setSizeOpen((v) => !v)}
            >
              <IconTypography stroke={1.8} />
            </button>
            <button
              type="button"
              className={`iconbtn ${nearBookmark ? 'on' : ''} ${markBump ? 'bump' : ''}`}
              aria-label={nearBookmark ? t.reader.removeBookmark : t.reader.bookmarkSpot}
              onClick={onBookmark}
            >
              {nearBookmark ? <IconBookmarkFilled /> : <IconBookmark stroke={1.8} />}
            </button>
          </>
        }
      />
      {sizePop.mounted && (
        <div className={`size-pop ${sizePop.closing ? 'closing' : ''}`} role="group" aria-label={t.reader.textSize}>
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              className={textSize === s ? 'on' : ''}
              aria-pressed={textSize === s}
              aria-label={t.common.sizes[s]}
              onClick={() => {
                setTextSize(s);
                setSizeOpen(false);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="content" ref={scrollRef} onScroll={onScroll}>
        {rec && session && note.mounted && (
          <aside className={`panel reader-why rv ${note.closing ? 'closing' : ''}`}>
            <button type="button" className="reader-why-x" aria-label={t.common.dismiss} onClick={() => setNoteOpen(false)}>
              <IconX stroke={2} />
            </button>
            <div className="act">{t.reader.whySection}</div>
            <p>{rec.why}</p>
            <p className="q">{fmt(t.reader.youAsked, { q: session.question })}</p>
            <button type="button" className="linkbtn reader-why-back" onClick={() => navigate({ name: 'summary', id: session.id })}>
              {t.reader.backToCouncil}
            </button>
          </aside>
        )}
        <div className="reader-page">
          <div className="reader-kicker">
            {b.title} · {b.authorName}
          </div>
          <h1 className="reader-heading">{heading}</h1>
          {/* a guide says it is not the book; a public-domain passage names its translator */}
          {b.text.kind === 'guide' ? (
            <div className="reader-guide">
              <b>{t.reader.guideLabel}</b>
              {t.reader.guideTail}
            </div>
          ) : (
            b.text.note && <div className="reader-guide">{b.text.note}</div>
          )}
          <div className={`reader-text sz-${textSize.toLowerCase()}`} ref={textRef}>
            {b.text.paragraphs.map((p, i) => (
              <p key={i}>{markHighlights(p, bookHighlights)}</p>
            ))}
          </div>
          {b.pending && <p className="reader-arriving">{t.book.arriving}</p>}
          {/* a card that came without guide paragraphs: the gist stands in, or a note that says there is none */}
          {!b.pending && b.text.paragraphs.length === 0 && <p className="reader-arriving">{b.summary.gist || t.reader.noGuide}</p>}
          {!b.pending && (
            <div className="reader-end">
              <div className="caps">{t.reader.end}</div>
              <a className="reader-ol" href={olUrl} target="_blank" rel="noopener noreferrer">
                {t.reader.findFull} <IconExternalLink stroke={2} />
              </a>
            </div>
          )}
        </div>
        {tools && (
          <div
            ref={toolsRef}
            className={`sel-tools ${selPresence.closing ? 'closing' : ''}`}
            style={{ left: tools.x, top: tools.y }}
            role="toolbar"
            aria-label={t.reader.selection}
            // pressing a button must not clear the selection it acts on (the toolbar would fade before the click lands)
            onMouseDown={(e) => e.preventDefault()}
          >
            <button type="button" onClick={doHighlight}>
              <IconHighlight stroke={1.8} /> {t.reader.highlight}
            </button>
            <button type="button" onClick={doCouncil}>
              <IconUsers stroke={1.8} /> {t.reader.toCouncil}
            </button>
            <button type="button" onClick={doCopy} aria-label={t.reader.copy}>
              <IconCopy stroke={1.8} />
            </button>
          </div>
        )}
      </div>

      <div className="reader-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={shownPct} aria-label={fmt(t.reader.pctRead, { pct: shownPct })}>
        <span className="reader-bar" style={{ transform: `scaleX(${pct})` }} />
        <span className="reader-progress-text">{shownPct > 0 ? `${shownPct}% · ${pct >= 0.98 ? t.reader.finished : t.reader.progressSaved}` : ''}</span>
      </div>
    </div>
  );
}

/* wrap saved highlights in <mark>; plain substring matching is enough for a section this size */
function markHighlights(text: string, highlights: string[]): ReactNode {
  const hits = highlights.filter((h) => h && text.includes(h));
  if (!hits.length) return text;
  const parts: ReactNode[] = [];
  let rest = text;
  let k = 0;
  while (rest.length) {
    let best: { i: number; h: string } | null = null;
    for (const h of hits) {
      const i = rest.indexOf(h);
      if (i >= 0 && (!best || i < best.i)) best = { i, h };
    }
    if (!best) {
      parts.push(rest);
      break;
    }
    if (best.i > 0) parts.push(rest.slice(0, best.i));
    parts.push(<mark key={k++}>{best.h}</mark>);
    rest = rest.slice(best.i + best.h.length);
  }
  return parts;
}
