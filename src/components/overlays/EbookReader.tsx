import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useStore } from '../../store/useStore';
import { useT } from '../../i18n/react';
import { getBook } from '../../lib/bookRegistry';
import { useOverlayPresence } from '../../hooks/useOverlayPresence';
import { loadPosition, savePosition } from '../../lib/ebook/storage';
import type { ReadingPosition } from '../../lib/ebook/types';
import type { ReaderFont, ReaderPrefs } from '../../store/types';
import type { EngineHandle, ProgressUpdate } from '../reader/shared';
import { Icon } from '../Icon';
import { CastOwl } from '../CastOwl';

const FoliateView = lazy(() => import('../reader/FoliateView').then((m) => ({ default: m.FoliateView })));
const PdfView = lazy(() => import('../reader/PdfView').then((m) => ({ default: m.PdfView })));
const TextView = lazy(() => import('../reader/TextView').then((m) => ({ default: m.TextView })));

/* font notes live in the i18n dict (t.reader.fontNotes) — labels are typeface names */
const FONT_LABELS: { key: ReaderFont; label: string }[] = [
  { key: 'literata', label: 'Literata' },
  { key: 'fraunces', label: 'Fraunces' },
  { key: 'system', label: 'Sans' },
];

const fontStack = (font: ReaderFont): string => {
  if (font === 'fraunces') return "'Fraunces', Georgia, serif";
  if (font === 'system') return "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  return "'Literata', Georgia, serif";
};

const mix = (a: [number, number, number], b: [number, number, number], amount: number): string => {
  const channel = (i: number) => Math.round(a[i]! + (b[i]! - a[i]!) * amount);
  return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
};

function ReaderSettings({
  prefs,
  pdf,
  onChange,
  onClose,
}: {
  prefs: ReaderPrefs;
  pdf: boolean;
  onChange: (patch: Partial<ReaderPrefs>) => void;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <section className="reader-settings" role="dialog" aria-label={t.reader.settingsAria}>
      <div className="reader-settings-head">
        <div>
          <div className="reader-settings-kick">{t.reader.settingsKick}</div>
          <div className="reader-settings-title d">{t.reader.settingsTitle}</div>
        </div>
        <button className="reader-icon" aria-label={t.reader.closeSettingsAria} onClick={onClose}>
          <Icon name="ti-x" />
        </button>
      </div>

      <div className="reader-control">
        <div className="reader-control-label"><span>{t.reader.fontLabel}</span>{pdf && <small>{t.reader.fixedByPdf}</small>}</div>
        <div className="reader-fonts" role="group" aria-label={t.reader.fontGroupAria}>
          {FONT_LABELS.map((font) => (
            <button
              key={font.key}
              className={prefs.font === font.key ? 'on' : ''}
              style={{ fontFamily: fontStack(font.key) }}
              aria-pressed={prefs.font === font.key}
              disabled={pdf}
              onClick={() => onChange({ font: font.key })}
            >
              <span>{font.label}</span><small>{t.reader.fontNotes[font.key]}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="reader-control reader-stepper-row">
        <div className="reader-control-label"><span>{t.reader.sizeLabel}</span>{pdf && <small>{t.reader.fixedByPdf}</small>}</div>
        <div className="reader-stepper" aria-label={t.reader.sizeAria}>
          <button aria-label={t.reader.sizeDownAria} disabled={pdf || prefs.size <= 16} onClick={() => onChange({ size: prefs.size - 1 })}>
            <Icon name="ti-minus" />
          </button>
          <output aria-live="polite">{prefs.size}px</output>
          <button aria-label={t.reader.sizeUpAria} disabled={pdf || prefs.size >= 24} onClick={() => onChange({ size: prefs.size + 1 })}>
            <Icon name="ti-plus" />
          </button>
        </div>
      </div>

      <label className="reader-control reader-dimmer">
        <span className="reader-control-label"><span>{t.reader.candleLabel}</span><small>{t.reader.candleNote}</small></span>
        <span className="reader-range-row">
          <Icon name="ti-sun" />
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(prefs.dimmer * 100)}
            aria-label={t.reader.candleAria}
            onChange={(event) => onChange({ dimmer: Number(event.target.value) / 100 })}
          />
          <Icon name="ti-flame" />
        </span>
      </label>

      <div className="reader-control reader-flow-row">
        <div className="reader-control-label"><span>{t.reader.flowLabel}</span>{pdf && <small>{t.reader.pagesOnly}</small>}</div>
        <div className="reader-flow" role="group" aria-label={t.reader.flowGroupAria}>
          <button className={!pdf && prefs.flow === 'scroll' ? 'on' : ''} aria-pressed={!pdf && prefs.flow === 'scroll'} disabled={pdf} onClick={() => onChange({ flow: 'scroll' })}>{t.reader.flowScroll}</button>
          <button className={pdf || prefs.flow === 'page' ? 'on' : ''} aria-pressed={pdf || prefs.flow === 'page'} disabled={pdf} onClick={() => onChange({ flow: 'page' })}>{t.reader.flowPage}</button>
        </div>
      </div>
    </section>
  );
}

export function EbookReader() {
  const t = useT();
  const ebook = useStore((s) => s.ebook);
  const prefs = useStore((s) => s.prefs.reader);
  const setPref = useStore((s) => s.setPref);
  const close = useStore((s) => s.closeBook);
  const openUpload = useStore((s) => s.openUpload);
  const report = useStore((s) => s.reportProgress);

  const { open, status, source, percent } = ebook;
  // scale-fade both ways; latch the id so the fade-out isn't a blank unmount
  // (closeBook resets ebook wholesale — the engine may briefly show the
  // resolving note under the fading surface, invisible at 240ms)
  const rootRef = useRef<HTMLDivElement>(null);
  const { mounted, shown } = useOverlayPresence(open, { ref: rootRef, duration: 260 });
  const heldId = useRef(ebook.bookId);
  if (ebook.bookId) heldId.current = ebook.bookId;
  const bookId = ebook.bookId ?? (mounted ? heldId.current : null);
  const b = bookId ? getBook(bookId) : null;
  const pdf = source?.format === 'pdf';
  const pageMode = pdf || prefs.flow === 'page';

  const engineRef = useRef<EngineHandle>(null);
  const [initial, setInitial] = useState<ReadingPosition | null>(null);
  const [positionReady, setPositionReady] = useState(false);
  const [location, setLocation] = useState<ProgressUpdate>({ percent: 0 });
  const [chromeVisible, setChromeVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const secondsRef = useRef(0);
  const posRef = useRef<ProgressUpdate>({ percent: 0 });
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const chromeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tapStart = useRef<{ x: number; y: number } | null>(null);

  const revealChrome = useCallback(() => {
    clearTimeout(chromeTimer.current);
    setChromeVisible(true);
    if (!settingsOpen) chromeTimer.current = setTimeout(() => setChromeVisible(false), 2000);
  }, [settingsOpen]);

  useEffect(() => {
    if (!open) return;
    setChromeVisible(true);
    setSettingsOpen(false);
    const timer = setTimeout(() => setChromeVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [open, bookId]);

  useEffect(() => {
    clearTimeout(chromeTimer.current);
    if (settingsOpen) setChromeVisible(true);
    else if (open) chromeTimer.current = setTimeout(() => setChromeVisible(false), 2000);
    return () => clearTimeout(chromeTimer.current);
  }, [settingsOpen, open]);

  useEffect(() => {
    let cancelled = false;
    secondsRef.current = 0;
    posRef.current = { percent: 0 };
    setLocation({ percent: 0 });
    setPositionReady(false);
    if (open && bookId) {
      void loadPosition(bookId).then((position) => {
        if (cancelled) return;
        setInitial(position);
        setPositionReady(true);
      });
    } else {
      setInitial(null);
    }
    return () => { cancelled = true; };
  }, [open, bookId]);

  useEffect(() => {
    if (!open || status !== 'reading') return;
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      secondsRef.current += 1;
      report(posRef.current.percent, secondsRef.current);
    }, 1000);
    return () => clearInterval(timer);
  }, [open, status, report]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (settingsOpen) setSettingsOpen(false);
        else close();
      } else if (pageMode && event.key === 'ArrowLeft') {
        event.preventDefault();
        engineRef.current?.prev();
      } else if (pageMode && event.key === 'ArrowRight') {
        event.preventDefault();
        engineRef.current?.next();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, settingsOpen, pageMode, close]);

  const onProgress = (update: ProgressUpdate) => {
    posRef.current = update;
    setLocation(update);
    report(update.percent, secondsRef.current);
    if (!bookId || !source) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void savePosition({
        bookId,
        percent: update.percent,
        cfi: update.cfi,
        page: update.page,
        scroll: update.scroll,
        secondsRead: secondsRef.current,
        format: source.format,
        updatedAt: Date.now(),
      });
    }, 600);
  };

  const onError = (msg: string, fallbackEmpty?: boolean) => {
    useStore.setState((s) => ({ ebook: { ...s.ebook, status: fallbackEmpty ? 'empty' : 'error', error: msg } }));
  };

  const readerStyle = useMemo(
    () => ({
      '--reader-paper': mix([251, 244, 225], [230, 214, 172], prefs.dimmer),
      '--reader-font': fontStack(prefs.font),
      '--reader-size': `${prefs.size}px`,
    }) as CSSProperties,
    [prefs],
  );

  if (!mounted || !b || !bookId) return null;

  const pageLabel = pdf && location.page && location.pageTotal
    ? t.reader.pageOf(location.page, location.pageTotal)
    : `${Math.round(percent)}%`;
  return (
    <div className={`reader reader-live${shown ? ' on' : ''}`} style={readerStyle} role="dialog" aria-modal="true" aria-label={t.reader.readingAria(b.t)} ref={rootRef}>
      <div
        className="reader-stage"
        onPointerDown={(event) => { tapStart.current = { x: event.clientX, y: event.clientY }; }}
        onPointerUp={(event) => {
          const start = tapStart.current;
          tapStart.current = null;
          if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
          if ((event.target as HTMLElement).closest('button,input,.reader-settings')) return;
          if (window.getSelection()?.toString()) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width;
          if (pageMode && x < 0.24) engineRef.current?.prev();
          else if (pageMode && x > 0.76) engineRef.current?.next();
          else chromeVisible ? setChromeVisible(false) : revealChrome();
        }}
      >
        {status === 'resolving' && <div className="ebook-center it" role="status">{t.reader.resolving}</div>}
        {status === 'error' && <div className="ebook-center" role="alert">{ebook.error ?? t.reader.errorFallback}</div>}
        {status === 'empty' && (
          <div className="ebook-center ebook-empty">
            <CastOwl owl="keeper" cls="mini" />
            <div className="d ebook-empty-title">{t.reader.emptyTitle}</div>
            <p>{t.reader.emptyBody}</p>
            <button className="btn" onClick={openUpload}>{t.reader.uploadBtn} <Icon name="ti-upload" /></button>
            <button className="gate-switch" onClick={close}>{t.reader.keepLooking}</button>
          </div>
        )}
        {status === 'reading' && source && !positionReady && <div className="ebook-center it">{t.reader.findingPlace}</div>}
        {status === 'reading' && source && positionReady && (
          <Suspense fallback={<div className="ebook-center it">{t.reader.opening}</div>}>
            {source.format === 'pdf' ? (
              <PdfView ref={engineRef} bookId={bookId} source={source} initial={initial} prefs={prefs} onProgress={onProgress} onError={onError} />
            ) : source.format === 'txt' ? (
              <TextView ref={engineRef} bookId={bookId} source={source} initial={initial} prefs={prefs} onProgress={onProgress} onError={onError} />
            ) : (
              <FoliateView ref={engineRef} bookId={bookId} source={source} initial={initial} prefs={prefs} onProgress={onProgress} onError={onError} />
            )}
          </Suspense>
        )}
      </div>

      {chromeVisible && (
        <>
          <header className="reader-chrome reader-chrome-top">
            <button className="reader-icon" aria-label={t.reader.backAria} onClick={close}><Icon name="ti-arrow-left" /></button>
            <div className="reader-heading">
              <div className="reader-book-title d">{b.t}</div>
              <div className="reader-book-author">{(source?.sourceLabel ?? b.a).toUpperCase()}</div>
            </div>
            <button className="reader-icon" aria-label={t.reader.settingsAria} onClick={() => setSettingsOpen(true)}><Icon name="ti-settings" /></button>
          </header>
          <footer className="reader-chrome reader-chrome-bottom">
            {pageMode && <button className="reader-icon reader-page-button" aria-label={t.reader.prevPageAria} disabled={status !== 'reading'} onClick={() => { revealChrome(); engineRef.current?.prev(); }}><Icon name="ti-chevron-left" /></button>}
            <div className="reader-progress">
              <div className="reader-location">{pageLabel}</div>
              <div className="reader-thread"><span style={{ width: `${Math.round(percent)}%` }} /></div>
            </div>
            {pageMode && <button className="reader-icon reader-page-button" aria-label={t.reader.nextPageAria} disabled={status !== 'reading'} onClick={() => { revealChrome(); engineRef.current?.next(); }}><Icon name="ti-chevron-right" /></button>}
          </footer>
        </>
      )}

      {settingsOpen && (
        <ReaderSettings
          prefs={prefs}
          pdf={pdf}
          onChange={(patch) => setPref('reader', { ...prefs, ...patch })}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
