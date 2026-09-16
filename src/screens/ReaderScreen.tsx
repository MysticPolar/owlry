import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconBookmark, IconBookmarkFilled, IconTypography, IconHighlight, IconUsers, IconCopy, IconX, IconExternalLink } from '@tabler/icons-react';
import { navigate } from '../app/router';
import { useStore, selectCouncil } from '../store/useStore';
import { maybeBook } from '../content/books';
import { readingFor } from '../engine/council';
import type { TextSize } from '../store/types';
import { TopBar } from '../components/chrome';
import { useT, fmt } from '../i18n/react';
import './ReaderScreen.css';

/* ============================================================
   Screen 2 — Reading. Quiet typography, adjustable size, bookmarks,
   saved progress, and a selection toolbar to highlight a passage or
   bring it back to the council.
   ============================================================ */
const SIZES: TextSize[] = ['S', 'M', 'L'];

export function ReaderScreen({ id, councilId }: { id: string; councilId?: string }) {
  const b = maybeBook(id);
  const session = useStore(selectCouncil(councilId));
  const textSize = useStore((s) => s.textSize);
  const setTextSize = useStore((s) => s.setTextSize);
  const progress = useStore((s) => (b ? s.progress[b.id] : undefined));
  const setProgress = useStore((s) => s.setProgress);
  const bookmarks = useStore((s) => (b ? (s.bookmarks[b.id] ?? []) : []));
  const toggleBookmark = useStore((s) => s.toggleBookmark);
  const highlights = useStore((s) => s.highlights);
  const addHighlight = useStore((s) => s.addHighlight);
  const bringPassage = useStore((s) => s.bringPassage);
  const showToast = useStore((s) => s.showToast);
  const t = useT();

  const scrollRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [noteOpen, setNoteOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [sel, setSel] = useState<{ text: string; x: number; y: number } | null>(null);
  const [pos, setPos] = useState(0);
  const [pct, setPct] = useState(progress?.pct ?? 0);
  const restored = useRef(false);

  // restore the saved position once the text has laid out
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || restored.current || !b) return;
    restored.current = true;
    if (progress?.pos) el.scrollTop = progress.pos;
  }, [b, progress?.pos]);

  // save progress as you read (throttled)
  const saveTimer = useRef<number | null>(null);
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !b) return;
    const max = Math.max(1, el.scrollHeight - el.clientHeight);
    const p = Math.min(1, Math.max(0, el.scrollTop / max));
    setPos(el.scrollTop);
    setPct(p);
    if (saveTimer.current) return;
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null;
      setProgress(b.id, p, el.scrollTop, councilId);
    }, 600);
  }, [b, councilId, setProgress]);
  useEffect(() => {
    onScroll();
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [onScroll]);

  // selection toolbar
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
      const rect = s.getRangeAt(0).getBoundingClientRect();
      const host = scrollRef.current?.getBoundingClientRect();
      if (!host) return;
      setSel({ text, x: rect.left + rect.width / 2 - host.left, y: rect.top - host.top });
    };
    document.addEventListener('selectionchange', handle);
    return () => document.removeEventListener('selectionchange', handle);
  }, []);

  if (!b) {
    return (
      <div className="screen">
        <TopBar backFallback={{ name: 'library' }} title={t.reader.title} className="top-inset" />
        <p className="pad muted" style={{ paddingTop: 24 }}>{t.reader.missing}</p>
      </div>
    );
  }

  const rec = session ? readingFor(session).find((r) => r.bookId === b.id) : undefined;
  const bookHighlights = highlights.filter((h) => h.bookId === b.id).map((h) => h.text);
  const nearBookmark = bookmarks.some((p) => Math.abs(p - pos) < 40);

  const doHighlight = () => {
    if (!sel) return;
    addHighlight(b.id, sel.text, councilId);
    window.getSelection()?.removeAllRanges();
    setSel(null);
    showToast(t.reader.highlightSaved);
  };
  const doCouncil = () => {
    if (!sel) return;
    const passage = sel.text;
    addHighlight(b.id, passage, councilId);
    window.getSelection()?.removeAllRanges();
    setSel(null);
    const target = bringPassage(b.id, passage);
    if (target) navigate({ name: 'discussion', id: target });
    else showToast(t.reader.askFirst);
  };
  const doCopy = async () => {
    if (!sel) return;
    try {
      await navigator.clipboard.writeText(`“${sel.text}” — ${b.title}, ${b.authorName}`);
      showToast(t.reader.copiedAttr);
    } catch {
      showToast(t.reader.copyNA);
    }
    window.getSelection()?.removeAllRanges();
    setSel(null);
  };

  return (
    <div className={`screen reader size-${textSize}`}>
      <TopBar
        backFallback={{ name: 'book', id: b.id, council: councilId }}
        title={
          <span className="reader-titles">
            <span className="reader-book">{b.title}</span>
            <span className="reader-section">{b.text.heading}</span>
          </span>
        }
        className="top-inset"
        right={
          <>
            <button type="button" className={`iconbtn ${sizeOpen ? 'on' : ''}`} aria-label={t.reader.textSize} aria-expanded={sizeOpen} onClick={() => setSizeOpen((v) => !v)}>
              <IconTypography stroke={1.8} />
            </button>
            <button type="button" className={`iconbtn ${nearBookmark ? 'on' : ''}`} aria-label={nearBookmark ? t.reader.removeBookmark : t.reader.bookmarkSpot} onClick={() => { toggleBookmark(b.id, pos); showToast(nearBookmark ? t.reader.bookmarkRemoved : t.reader.bookmarked); }}>
              {nearBookmark ? <IconBookmarkFilled /> : <IconBookmark stroke={1.8} />}
            </button>
          </>
        }
      />
      {sizeOpen && (
        <div className="size-pop" role="group" aria-label={t.reader.textSize}>
          {SIZES.map((s) => (
            <button key={s} type="button" className={`size-btn size-btn-${s} ${textSize === s ? 'on' : ''}`} onClick={() => { setTextSize(s); setSizeOpen(false); }}>
              Aa
            </button>
          ))}
        </div>
      )}
      <div className="screen-scroll reader-scroll" ref={scrollRef} onScroll={onScroll}>
        {rec && session && noteOpen && (
          <aside className="reader-note">
            <button type="button" className="reader-note-x" aria-label={t.common.dismiss} onClick={() => setNoteOpen(false)}>
              <IconX />
            </button>
            <span className="caps">{t.reader.whySection}</span>
            <p>{rec.why}</p>
            <p className="small muted">{fmt(t.reader.youAsked, { q: session.question })}</p>
            <button type="button" className="linkbtn" onClick={() => navigate({ name: 'discussion', id: session.id })}>
              {t.reader.backToCouncil}
            </button>
          </aside>
        )}
        <div className="reader-page">
          <p className="caps muted reader-kicker">{b.title} · {b.authorName}</p>
          <h1 className="reader-heading">{b.text.heading}</h1>
          <p className={`reader-provenance ${b.text.kind === 'guide' ? 'guide' : ''}`}>
            {b.text.kind === 'guide' ? t.reader.guide : ''}
            {b.text.note}
          </p>
          <div className="reader-text" ref={textRef}>
            {b.text.paragraphs.map((p, i) => (
              <p key={i}>{markHighlights(p, bookHighlights)}</p>
            ))}
          </div>
          <div className="reader-end">
            <span className="caps muted">{t.reader.end}</span>
            {b.isbn && (
              <a className="reader-ol" href={`https://openlibrary.org/isbn/${b.isbn}`} target="_blank" rel="noreferrer">
                {t.reader.findFull} <IconExternalLink />
              </a>
            )}
          </div>
        </div>
        {sel && (
          <div className="sel-tools" style={{ left: Math.max(90, Math.min(sel.x, (scrollRef.current?.clientWidth ?? 390) - 90)), top: Math.max(8, sel.y + (scrollRef.current?.scrollTop ?? 0) - 52) }} role="toolbar" aria-label={t.reader.selection}>
            <button type="button" onClick={doHighlight}>
              <IconHighlight /> {t.reader.highlight}
            </button>
            <button type="button" onClick={doCouncil}>
              <IconUsers /> {t.reader.toCouncil}
            </button>
            <button type="button" onClick={doCopy} aria-label={t.reader.copy}>
              <IconCopy />
            </button>
          </div>
        )}
      </div>
      <div className="reader-progress" aria-label={fmt(t.reader.pctRead, { pct: Math.round(pct * 100) })}>
        <span className="reader-bar" style={{ width: `${Math.round(pct * 100)}%` }} />
        <span className="reader-progress-text">
          {Math.round(pct * 100)}% · {pct >= 0.98 ? t.reader.finished : t.reader.progressSaved}
        </span>
      </div>
    </div>
  );
}

/* wrap saved highlights in <mark>; plain substring matching is enough for a section this size */
function markHighlights(text: string, highlights: string[]): React.ReactNode {
  const hits = highlights.filter((h) => h && text.includes(h));
  if (!hits.length) return text;
  const parts: React.ReactNode[] = [];
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
