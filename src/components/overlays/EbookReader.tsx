import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  commitStagedReaderCloudRefresh,
  persistAccountProgressNow,
  useStore,
} from '../../store/useStore';
import { useT } from '../../i18n/react';
import { getBook } from '../../lib/bookRegistry';
import { useOverlayPresence } from '../../hooks/useOverlayPresence';
import { useModalFocus } from '../../hooks/useModalFocus';
import {
  getEbookStorageOwner,
  loadUpload,
  loadPosition,
  savePosition,
  type EbookOwner,
} from '../../lib/ebook/storage';
import type { ReadingPosition } from '../../lib/ebook/types';
import { registerActiveReadingPosition } from '../../lib/ebook/activePosition';
import { getReadingPosition } from '../../lib/ebook/positionKey';
import { sameEbookContent } from '../../lib/ebook/fingerprint';
import type { ReaderFont, ReaderPrefs } from '../../store/types';
import { COPY_REPLACED_ERROR, SYSTEM_STACK, pageTapAction } from '../reader/shared';
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
  if (font === 'system') return SYSTEM_STACK;
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
    <section
      className="reader-settings"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reader-settings-title"
      tabIndex={-1}
    >
      <div className="reader-settings-head">
        <div id="reader-settings-title" className="reader-settings-title">
          {t.reader.settingsAria}
        </div>
        <button
          className="reader-icon"
          aria-label={t.reader.closeSettingsAria}
          onClick={onClose}
          autoFocus
        >
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
          <button className={!pdf && prefs.flow === 'scroll' ? 'on' : ''} aria-pressed={!pdf && prefs.flow === 'scroll'} disabled={pdf} onClick={() => onChange({ flow: 'scroll', flowSetByUser: true })}>{t.reader.flowScroll}</button>
          <button className={pdf || prefs.flow === 'page' ? 'on' : ''} aria-pressed={pdf || prefs.flow === 'page'} disabled={pdf} onClick={() => onChange({ flow: 'page', flowSetByUser: true })}>{t.reader.flowPage}</button>
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
  const retryBook = useStore((s) => s.openBook);
  const openUpload = useStore((s) => s.openUpload);
  const report = useStore((s) => s.reportProgress);
  const syncStatus = useStore((s) => s.syncStatus);
  const syncAccountNow = useStore((s) => s.syncAccountNow);
  const accountId = useStore((s) => s.authUser?.id ?? null);

  const { open, status, source } = ebook;
  // scale-fade both ways; latch the id so the fade-out isn't a blank unmount
  // (closeBook resets ebook wholesale — the engine may briefly show the
  // resolving note under the fading surface, invisible at 240ms)
  const rootRef = useRef<HTMLDivElement>(null);
  const { mounted, shown } = useOverlayPresence(open, { ref: rootRef, duration: 260 });
  useModalFocus(open && mounted, null, rootRef);
  const heldId = useRef(ebook.bookId);
  if (ebook.bookId) heldId.current = ebook.bookId;
  const bookId = ebook.bookId ?? (mounted ? heldId.current : null);
  const b = bookId ? getBook(bookId) : null;
  const pdf = source?.format === 'pdf';
  const pageMode = pdf || prefs.flow === 'page';
  // formats rendered by FoliateView, i.e. inside a sandboxed iframe (mirrors
  // the engine switch below: everything that isn't pdf/txt)
  const foliate = !!source && source.format !== 'pdf' && source.format !== 'txt';

  const engineRef = useRef<EngineHandle>(null);
  const [initial, setInitial] = useState<ReadingPosition | null>(null);
  const [positionReady, setPositionReady] = useState(false);
  const [location, setLocation] = useState<ProgressUpdate>({ percent: 0 });
  const [chromeVisible, setChromeVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const secondsRef = useRef(0);
  const posRef = useRef<ProgressUpdate>({ percent: 0 });
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const positionFlushTaskRef = useRef<Promise<void> | null>(null);
  const pendingPositionRef = useRef<ReadingPosition | null>(null);
  const latestPositionRef = useRef<ReadingPosition | null>(null);
  const positionOwnerRef = useRef<EbookOwner>('guest');
  const tapStart = useRef<{
    pointerId: number;
    x: number;
    y: number;
    maxTravel: number;
    interactive: boolean;
  } | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const revealChrome = useCallback(() => {
    setChromeVisible(true);
  }, []);
  const toggleChrome = useCallback(() => setChromeVisible((visible) => !visible), []);
  const openSettings = useCallback(() => {
    setChromeVisible(true);
    setSettingsOpen(true);
  }, []);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    requestAnimationFrame(() => settingsButtonRef.current?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    if (!open) return;
    setChromeVisible(true);
    setSettingsOpen(false);
  }, [open, bookId]);

  useEffect(() => {
    if (settingsOpen) setChromeVisible(true);
  }, [settingsOpen]);

  const flushPosition = useCallback((): Promise<void> => {
    clearTimeout(saveTimer.current);
    const pending = pendingPositionRef.current;
    if (!pending) return positionFlushTaskRef.current ?? Promise.resolve();
    pendingPositionRef.current = null;
    const positionOwner = positionOwnerRef.current;
    const previous = positionFlushTaskRef.current ?? Promise.resolve();
    const task = previous.then(async () => {
      if (
        positionOwner !== 'guest'
        && getEbookStorageOwner() === positionOwner
      ) {
        // Cloud progress is the durable fallback for the exact old-copy anchor.
        // Record it before touching IDB so a local storage exception cannot make
        // a staged metadata swap forget where this edition was closed.
        useStore.getState().setReadingPosition(pending);
      }
      try {
        const saved = await savePosition(pending, positionOwner);
        if (
          positionOwner !== 'guest'
          && getEbookStorageOwner() === positionOwner
        ) {
          if (!saved) {
            const replacement = await loadUpload(pending.bookId, positionOwner);
            const state = useStore.getState();
            if (
              replacement
              && replacement.source.copyVersion !== pending.copyVersion
              && state.ebook.bookId === pending.bookId
              && state.ebook.source?.copyVersion === pending.copyVersion
              && getEbookStorageOwner() === positionOwner
            ) {
              useStore.setState({
                ebook: {
                  ...state.ebook,
                  status: 'reading',
                  source: replacement.source,
                  percent: 0,
                  error: null,
                },
              });
            }
          }
        }
      } catch (error) {
        if (
          !pendingPositionRef.current
          || pendingPositionRef.current.updatedAt <= pending.updatedAt
        ) pendingPositionRef.current = pending;
        console.warn('[reader] could not save local position:', error);
        // A cloud replacement must remain staged when the old-copy anchor did
        // not reach its version-fenced cache. Callers use this rejection as the
        // promotion barrier; the durable stage can be retried on a later close.
        throw error;
      }
    });
    positionFlushTaskRef.current = task;
    const clearTask = () => {
      if (positionFlushTaskRef.current === task) positionFlushTaskRef.current = null;
    };
    void task.then(clearTask, clearTask);
    return task;
  }, []);

  useEffect(() => {
    let cancelled = false;
    secondsRef.current = 0;
    posRef.current = { percent: 0 };
    setLocation({ percent: 0 });
    setPositionReady(false);
    clearTimeout(saveTimer.current);
    pendingPositionRef.current = null;
    latestPositionRef.current = null;
    if (open && bookId && source) {
      const positionOwner = getEbookStorageOwner();
      positionOwnerRef.current = positionOwner;
      const synced = getReadingPosition(
        useStore.getState().readingPositions,
        bookId,
        source.copyVersion,
      );
      const settle = (local: ReadingPosition | null) => {
        if (cancelled) return;
        const sourceHasFingerprint = sameEbookContent(
          source.copyFingerprint,
          source.copyFingerprint,
        );
        const exact = [local, synced]
          .filter((candidate): candidate is ReadingPosition => (
            candidate?.bookId === bookId
            && candidate.format === source.format
            && candidate.copyVersion === source.copyVersion
            && (
              !sourceHasFingerprint
              || !sameEbookContent(candidate.copyFingerprint, candidate.copyFingerprint)
              || sameEbookContent(candidate.copyFingerprint, source.copyFingerprint)
            )
          ));
        const fingerprintMatches = sourceHasFingerprint
          ? [local, ...Object.values(useStore.getState().readingPositions)]
            .filter((candidate): candidate is ReadingPosition => (
              candidate?.bookId === bookId
              && candidate.format === source.format
              && sameEbookContent(candidate.copyFingerprint, source.copyFingerprint)
            ))
          : [];
        const newest = [...exact, ...fingerprintMatches]
          .sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null;
        // Re-uploading byte-identical content briefly creates a fresh 0% copy
        // marker. It must not erase a well-established anchor from that same
        // fingerprint. Once the new copy has moved beyond its start, recency
        // becomes authoritative again so later reading always wins.
        const selectedAt = (
          typeof source.copySelectedAt === 'number'
          && Number.isFinite(source.copySelectedAt)
        ) ? source.copySelectedAt : null;
        const isFreshSelectionMarker = (
          sourceHasFingerprint
          && newest
          && newest.percent <= 1
          && newest.secondsRead <= 3
          && newest.copyVersion === source.copyVersion
          && selectedAt !== null
          && newest.updatedAt >= selectedAt - 1_000
          && newest.updatedAt - selectedAt <= 10 * 60_000
        );
        const establishedSameCopy = isFreshSelectionMarker
          ? fingerprintMatches
            .filter((candidate) => candidate.percent >= 5)
            .sort((a, b) => b.percent - a.percent || b.updatedAt - a.updatedAt)[0] ?? null
          : null;
        const position = establishedSameCopy ?? newest;
        const update: ProgressUpdate = position
          ? {
              percent: position.percent,
              cfi: position.cfi,
              page: position.page,
              scroll: position.scroll,
            }
          : { percent: 0 };
        posRef.current = update;
        setLocation(update);
        setInitial(position);
        setPositionReady(true);
      };
      void loadPosition(bookId, positionOwner).then(settle).catch(() => settle(null));
    } else {
      setInitial(null);
    }
    return () => { cancelled = true; };
  }, [open, bookId, source]);

  useEffect(() => {
    if (!open || !bookId || !source) return;
    const positionOwner = positionOwnerRef.current;
    return registerActiveReadingPosition(
      positionOwner,
      () => latestPositionRef.current,
      flushPosition,
    );
  }, [open, bookId, source, flushPosition]);

  useEffect(() => {
    if (!open) return;
    const flushAndCommit = () => {
      const positionOwner = positionOwnerRef.current;
      void flushPosition()
        .then(async () => {
          if (positionOwner === 'guest' || !bookId) return;
          await persistAccountProgressNow(positionOwner);
          await commitStagedReaderCloudRefresh(positionOwner, bookId);
          await syncAccountNow();
        })
        .catch((error: unknown) => {
          console.warn('[reader] could not finish hidden-tab storage:', error);
        });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushAndCommit();
    };
    const onPageHide = () => flushAndCommit();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      flushAndCommit();
    };
  }, [open, bookId, flushPosition, syncAccountNow]);

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
      // A nested modal (notably the busy upload picker) owns Escape first.
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (settingsOpen) closeSettings();
        else {
          void flushPosition().catch(() => {});
          close();
        }
      } else if ((pageMode || foliate) && event.key === 'ArrowLeft') {
        event.preventDefault();
        engineRef.current?.prev();
      } else if ((pageMode || foliate) && event.key === 'ArrowRight') {
        event.preventDefault();
        engineRef.current?.next();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, settingsOpen, pageMode, foliate, close, closeSettings, flushPosition]);

  const onProgress = useCallback((update: ProgressUpdate) => {
    posRef.current = update;
    setLocation(update);
    report(update.percent, secondsRef.current);
    if (!bookId || !source) return;
    clearTimeout(saveTimer.current);
    const position: ReadingPosition = {
      bookId,
      percent: update.percent,
      cfi: update.cfi,
      page: update.page,
      scroll: update.scroll,
      secondsRead: secondsRef.current,
      format: source.format,
      copyVersion: source.copyVersion,
      copyFingerprint: source.copyFingerprint,
      updatedAt: Date.now(),
    };
    latestPositionRef.current = position;
    pendingPositionRef.current = position;
    saveTimer.current = setTimeout(() => {
      void flushPosition().catch(() => {});
    }, 500);
  }, [bookId, source, report, flushPosition]);

  const onError = useCallback((msg: string, fallbackEmpty?: boolean) => {
    if (msg === COPY_REPLACED_ERROR && bookId && source) {
      const expectedVersion = source.copyVersion;
      const readingOwner = getEbookStorageOwner();
      const lastOldCopyPosition = latestPositionRef.current;
      if (
        readingOwner !== 'guest'
        && lastOldCopyPosition
        && lastOldCopyPosition.copyVersion === expectedVersion
      ) {
        // Another tab already advanced the local metadata fence, so the normal
        // IDB save will (correctly) refuse this old-copy anchor. Its cloud key is
        // versioned, though, so preserve the final location there before the UI
        // adopts the replacement.
        useStore.getState().setReadingPosition(lastOldCopyPosition);
      }
      void loadUpload(bookId, readingOwner)
        .then((replacement) => {
          const state = useStore.getState();
          if (
            !replacement
            || state.ebook.bookId !== bookId
            || state.ebook.source?.copyVersion !== expectedVersion
            || getEbookStorageOwner() !== readingOwner
          ) return;
          useStore.setState({
            ebook: {
              ...state.ebook,
              status: 'reading',
              source: replacement.source,
              percent: 0,
              error: null,
            },
          });
        })
        .catch(() => {});
      return;
    }
    useStore.setState((s) => ({ ebook: { ...s.ebook, status: fallbackEmpty ? 'empty' : 'error', error: msg } }));
  }, [bookId, source]);

  const closeReader = useCallback(() => {
    void flushPosition().catch(() => {});
    close();
  }, [close, flushPosition]);

  const handleReaderPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary) return;
    const target = event.target as HTMLElement;
    const interactive = Boolean(target.closest(
      'a,button,input,textarea,select,option,label,summary,details,audio,video,'
      + '.reader-settings,[role="button"],[role="link"],'
      + '[contenteditable]:not([contenteditable="false"])',
    ));
    tapStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      maxTravel: 0,
      interactive,
    };
    if (!interactive) {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        /* the pointer may already have been claimed by the embedded reader */
      }
    }
  }, []);

  const handleReaderPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const start = tapStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    start.maxTravel = Math.max(
      start.maxTravel,
      Math.hypot(event.clientX - start.x, event.clientY - start.y),
    );
  }, []);

  const handleReaderPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const start = tapStart.current;
    if (!start || !event.isPrimary || start.pointerId !== event.pointerId) return;
    tapStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (
      start.interactive
      || Math.max(
        start.maxTravel,
        Math.hypot(event.clientX - start.x, event.clientY - start.y),
      ) > 16
    ) return;
    const target = event.target as HTMLElement;
    if (target.closest(
      'a,button,input,textarea,select,option,label,summary,details,audio,video,'
      + '.reader-settings,[role="button"],[role="link"],[contenteditable]:not([contenteditable="false"])',
    )) return;
    const selection = window.getSelection();
    if (
      selection
      && !selection.isCollapsed
      && selection.anchorNode
      && event.currentTarget.contains(selection.anchorNode)
    ) {
      selection.removeAllRanges();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.width > 0 ? (event.clientX - rect.left) / rect.width : .5;
    const action = pageMode ? pageTapAction(x) : 'chrome';
    if (action === 'prev') engineRef.current?.prev();
    else if (action === 'next') engineRef.current?.next();
    else toggleChrome();
  }, [pageMode, toggleChrome]);

  const readerStyle = useMemo(
    () => ({
      '--reader-paper': mix([251, 243, 226], [239, 230, 208], prefs.dimmer),
      '--reader-font': fontStack(prefs.font),
      '--reader-size': `${prefs.size}px`,
    }) as CSSProperties,
    [prefs],
  );

  if (!mounted || !b || !bookId) return null;

  const displayTitle = source?.title || b.t;
  const displayAuthor = source?.author || b.a;
  const progressPercent = Math.max(0, Math.min(100, location.percent));
  const pageLabel = location.page && location.pageTotal
    ? t.reader.pageOf(location.page, location.pageTotal)
    : `${Math.round(progressPercent)}%`;
  return (
    <div
      className={`reader reader-live${shown ? ' on' : ''}${chromeVisible ? ' chrome-on' : ''}`}
      style={readerStyle}
      role="dialog"
      aria-modal="true"
      aria-label={t.reader.readingAria(displayTitle)}
      ref={rootRef}
      tabIndex={-1}
      onPointerDown={handleReaderPointerDown}
      onPointerMove={handleReaderPointerMove}
      onPointerUp={handleReaderPointerUp}
      onPointerCancel={() => { tapStart.current = null; }}
    >
      <div className="reader-stage">
        {status === 'resolving' && <div className="ebook-center it" role="status">{t.reader.resolving}</div>}
        {status === 'error' && (
          <div className="ebook-center ebook-empty" role="alert">
            <CastOwl owl="keeper" cls="mini" />
            <div className="d ebook-empty-title">{t.reader.errorTitle}</div>
            <p>{ebook.error ?? t.reader.errorFallback}</p>
            <div className="ebook-recovery-actions">
              <button className="btn" onClick={() => void retryBook(bookId)}>
                {t.reader.retryBtn} <Icon name="ti-refresh" />
              </button>
              <button className="btn ghost" onClick={openUpload}>
                {t.reader.chooseAnotherBtn} <Icon name="ti-upload" />
              </button>
            </div>
          </div>
        )}
        {status === 'empty' && (
          <div className="ebook-center ebook-empty">
            <CastOwl owl="keeper" cls="mini" />
            <div className="d ebook-empty-title">{ebook.error ? t.reader.errorTitle : t.reader.emptyTitle}</div>
            <p>{ebook.error ?? t.reader.emptyBody}</p>
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
              <FoliateView
                ref={engineRef}
                bookId={bookId}
                source={source}
                initial={initial}
                prefs={prefs}
                onProgress={onProgress}
                onToggleChrome={toggleChrome}
                onError={onError}
              />
            )}
          </Suspense>
        )}
      </div>

      <header
        className={`reader-chrome reader-chrome-top${chromeVisible ? ' is-visible' : ''}`}
        aria-hidden={!chromeVisible}
      >
        <button tabIndex={chromeVisible ? 0 : -1} className="reader-icon" aria-label={t.reader.backAria} onClick={closeReader}><Icon name="ti-arrow-left" /></button>
        <div className="reader-heading">
          <div className="reader-book-title">{displayTitle}</div>
          <div className="reader-book-author">{displayAuthor}</div>
        </div>
        <button
          ref={settingsButtonRef}
          tabIndex={chromeVisible ? 0 : -1}
          className="reader-icon reader-type-button"
          aria-label={t.reader.settingsAria}
          onClick={openSettings}
        >
          <span aria-hidden="true">Aa</span>
        </button>
      </header>
      <footer
        className={`reader-chrome reader-chrome-bottom${chromeVisible ? ' is-visible' : ''}`}
        aria-hidden={!chromeVisible}
      >
        {pageMode && (
          <button
            tabIndex={chromeVisible ? 0 : -1}
            className="reader-icon reader-page-button"
            aria-label={t.reader.prevPageAria}
            disabled={status !== 'reading'}
            onClick={() => { revealChrome(); engineRef.current?.prev(); }}
          >
            <Icon name="ti-chevron-left" />
          </button>
        )}
        <div className="reader-progress">
          <div className="reader-progress-meta">
            <span className="reader-location">{pageLabel}</span>
            {accountId && positionOwnerRef.current !== 'guest' && syncStatus === 'error' && (
              <button
                className="reader-sync-status is-error"
                type="button"
                aria-label={t.settings.settings.ariaSyncRetry}
                onClick={() => void syncAccountNow()}
              >
                {t.settings.settings.syncLabel.error}
              </button>
            )}
            {accountId && positionOwnerRef.current !== 'guest' && (
              <span className="sr-only" role="status" aria-live="polite">
                {syncStatus === 'error' ? t.settings.settings.ariaSyncRetry : ''}
              </span>
            )}
          </div>
          <div
            className="reader-thread"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercent)}
            aria-valuetext={pageLabel}
          >
            <span style={{ width: `${Math.round(progressPercent)}%` }} />
          </div>
        </div>
        {pageMode && (
          <button
            tabIndex={chromeVisible ? 0 : -1}
            className="reader-icon reader-page-button"
            aria-label={t.reader.nextPageAria}
            disabled={status !== 'reading'}
            onClick={() => { revealChrome(); engineRef.current?.next(); }}
          >
            <Icon name="ti-chevron-right" />
          </button>
        )}
      </footer>

      {settingsOpen && (
        <>
          <button
            className="reader-settings-scrim"
            tabIndex={-1}
            aria-hidden="true"
            onClick={closeSettings}
          />
          <ReaderSettings
            prefs={prefs}
            pdf={pdf}
            onChange={(patch) => setPref('reader', { ...prefs, ...patch })}
            onClose={closeSettings}
          />
        </>
      )}
    </div>
  );
}
