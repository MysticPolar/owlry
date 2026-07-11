import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { getBook } from '../../lib/bookRegistry';
import { loadPosition, savePosition } from '../../lib/ebook/storage';
import type { ReadingPosition } from '../../lib/ebook/types';
import type { EngineHandle, ProgressUpdate } from '../reader/shared';
import { Icon } from '../Icon';
import { CastOwl } from '../CastOwl';

// Heavy renderers (foliate-js / pdf.js) are split out and loaded only when a book
// actually opens — the "Open" click stays fast.
const FoliateView = lazy(() => import('../reader/FoliateView').then((m) => ({ default: m.FoliateView })));
const PdfView = lazy(() => import('../reader/PdfView').then((m) => ({ default: m.PdfView })));
const TextView = lazy(() => import('../reader/TextView').then((m) => ({ default: m.TextView })));

/**
 * The real in-app reader. One overlay, three engines (EPUB via epub.js, PDF via
 * pdf.js, TXT/FB2 as paginated HTML). Tracks PERCENT progress (stable across
 * reflow), persists the exact position locally, and feeds active reading time
 * into the (cosmetic) XP loop.
 */
export function EbookReader() {
  const ebook = useStore((s) => s.ebook);
  const close = useStore((s) => s.closeBook);
  const openUpload = useStore((s) => s.openUpload);
  const report = useStore((s) => s.reportProgress);

  const { open, bookId, status, source, percent } = ebook;
  const b = bookId ? getBook(bookId) : null;

  const engineRef = useRef<EngineHandle>(null);
  const [initial, setInitial] = useState<ReadingPosition | null>(null);
  const secondsRef = useRef(0);
  const posRef = useRef<ProgressUpdate>({ percent: 0 });
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // load the saved position whenever a new book opens
  useEffect(() => {
    secondsRef.current = 0;
    posRef.current = { percent: 0 };
    if (open && bookId) void loadPosition(bookId).then(setInitial);
    else setInitial(null);
  }, [open, bookId]);

  // active-reading timer (only while visible + actually reading) → drives XP
  useEffect(() => {
    if (!open || status !== 'reading') return;
    const t = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      secondsRef.current += 1;
      report(posRef.current.percent, secondsRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, [open, status, report]);

  const onProgress = (u: ProgressUpdate) => {
    posRef.current = u;
    report(u.percent, secondsRef.current);
    if (!bookId || !source) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const pos: ReadingPosition = {
        bookId,
        percent: u.percent,
        cfi: u.cfi,
        page: u.page,
        scroll: u.scroll,
        secondsRead: secondsRef.current,
        format: source.format,
        updatedAt: Date.now(),
      };
      void savePosition(pos);
    }, 600);
  };

  const onError = (msg: string, fallbackEmpty?: boolean) => {
    useStore.setState((s) => ({
      ebook: { ...s.ebook, status: fallbackEmpty ? 'empty' : 'error', error: msg },
    }));
  };

  return (
    <div
      className={`reader ${open ? 'on' : ''}`}
      id="ebook-reader"
      role="dialog"
      aria-modal="true"
      aria-label={b ? `Reading ${b.t}` : 'Reader'}
    >
      {open && b && bookId && (
        <>
          <div className="r-top">
            <button className="iconbtn lite" aria-label="Close reader" onClick={close}>
              <Icon name="ti-arrow-left" />
            </button>
            <div className="r-mid">
              <div className="r-title d">{b.t}</div>
              <div className="r-auth">{(source?.sourceLabel ?? b.a).toUpperCase()}</div>
            </div>
            <span style={{ flex: '0 0 32px' }} aria-hidden="true" />
          </div>

          <div className="r-body" style={{ padding: 0, position: 'relative', cursor: 'default' }}>
            {status === 'resolving' && <div className="ebook-center it">checking the free shelves…</div>}
            {status === 'error' && (
              <div className="ebook-center">{ebook.error ?? 'something went sideways — try again in a moment.'}</div>
            )}
            {status === 'empty' && (
              <div className="ebook-center ebook-empty">
                <CastOwl owl="keeper" cls="mini" />
                <div className="d" style={{ fontSize: 15 }}>
                  keeper here — the free shelves don’t carry this one.
                </div>
                <p className="l-p" style={{ margin: 0, color: 'var(--fade)' }}>
                  bring your own copy — an epub, pdf, or txt — and i’ll shelve it for you. it stays on this
                  device; nothing leaves.
                </p>
                <button className="btn" onClick={openUpload}>
                  upload your copy <Icon name="ti-upload" />
                </button>
                <button className="gate-switch" onClick={close}>
                  keep looking
                </button>
              </div>
            )}
            {status === 'reading' && source && (
              <Suspense fallback={<div className="ebook-center it">opening…</div>}>
                {source.format === 'pdf' ? (
                  <PdfView
                    ref={engineRef}
                    bookId={bookId}
                    source={source}
                    initial={initial}
                    onProgress={onProgress}
                    onError={onError}
                  />
                ) : source.format === 'txt' ? (
                  <TextView
                    ref={engineRef}
                    bookId={bookId}
                    source={source}
                    initial={initial}
                    onProgress={onProgress}
                    onError={onError}
                  />
                ) : (
                  // epub (local + remote), mobi, azw3, fb2 → foliate-js
                  <FoliateView
                    ref={engineRef}
                    bookId={bookId}
                    source={source}
                    initial={initial}
                    onProgress={onProgress}
                    onError={onError}
                  />
                )}
              </Suspense>
            )}
          </div>

          <div className="r-foot">
            <button
              className="iconbtn lite"
              aria-label="Previous"
              disabled={status !== 'reading'}
              onClick={() => engineRef.current?.prev()}
            >
              <Icon name="ti-chevron-left" />
            </button>
            <div className="r-prog">
              <div className="r-page">
                {Math.round(percent)}%{source ? ` · ${source.sourceLabel}` : ''}
              </div>
              <div className="track">
                <div className="fill xp" style={{ width: `${Math.round(percent)}%` }} />
              </div>
            </div>
            <button
              className="iconbtn"
              aria-label="Next"
              disabled={status !== 'reading'}
              onClick={() => engineRef.current?.next()}
            >
              <Icon name="ti-chevron-right" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
