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
import { useWakeLock } from '../../hooks/useWakeLock';
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
import type { ReaderFont, ReaderPrefs, ReaderTheme } from '../../store/types';
import {
  COPY_REPLACED_ERROR,
  SYSTEM_STACK,
  pageTapAction,
  readerThemeColors,
} from '../reader/shared';
import type { EngineHandle, ProgressUpdate, TextSelectPayload, TocItem } from '../reader/shared';
import { Icon } from '../Icon';
import { CastOwl } from '../CastOwl';

const THEME_KEYS: ReaderTheme[] = ['paper', 'sepia', 'night'];

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
  const theme = prefs.theme ?? 'paper';
  const themeLabel = (key: ReaderTheme) => (
    key === 'sepia' ? t.reader.themeSepia : key === 'night' ? t.reader.themeNight : t.reader.themePaper
  );
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
        <div className="reader-control-label"><span>{t.reader.themeLabel}</span></div>
        <div className="reader-themes" role="group" aria-label={t.reader.themeGroupAria}>
          {THEME_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={theme === key ? 'on' : ''}
              aria-pressed={theme === key}
              onClick={() => onChange({ theme: key })}
            >
              {themeLabel(key)}
            </button>
          ))}
        </div>
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

function flattenToc(items: TocItem[], depth = 0): Array<TocItem & { depth: number }> {
  const out: Array<TocItem & { depth: number }> = [];
  for (const item of items) {
    out.push({ ...item, depth });
    if (item.children?.length) out.push(...flattenToc(item.children, depth + 1));
  }
  return out;
}

function ReaderSelectionRail({
  selection,
  rootEl,
  onDismiss,
}: {
  selection: TextSelectPayload;
  rootEl: HTMLElement | null;
  onDismiss: () => void;
}) {
  const t = useT().today.chrome.selection;
  const showToast = useStore((s) => s.showToast);
  const saveQuote = useStore((s) => s.saveQuote);
  const beginAskQuote = useStore((s) => s.beginAskQuote);
  const barRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const app = rootEl ?? document.getElementById('app');
    if (!app) return;
    const box = app.getBoundingClientRect();
    const rect = selection.rect;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const below = coarse || rect.top - box.top < 56;
    const half = barRef.current ? barRef.current.offsetWidth / 2 + 10 : 130;
    setPos({
      x: Math.min(Math.max(rect.left - box.left + rect.width / 2, half), box.width - half),
      y: below ? rect.bottom - box.top + 10 : Math.max(8, rect.top - box.top - 46),
    });
  }, [selection, rootEl]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(selection.text);
      showToast('ti-copy', t.copied, 'scribe');
    } catch {
      /* clipboard denied */
    }
    onDismiss();
  };

  return (
    <div
      ref={barRef}
      className="reader-selbar"
      role="toolbar"
      aria-label={t.aria}
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button type="button" onClick={() => void copy()}>
        <Icon name="ti-copy" />
        {t.copy}
      </button>
      <button
        type="button"
        onClick={() => {
          saveQuote(selection.text);
          onDismiss();
        }}
      >
        <svg className="owl pb-sel-owl" viewBox="0 0 120 130" aria-hidden="true">
          <use href="#owl-scribe" />
        </svg>
        {t.saveQuote}
      </button>
      <button
        type="button"
        onClick={() => {
          beginAskQuote(selection.text);
          onDismiss();
        }}
      >
        <svg className="owl pb-sel-owl" viewBox="0 0 120 130" aria-hidden="true">
          <use href="#owl-scout" />
        </svg>
        {t.ask}
      </button>
    </div>
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
  const [tocOpen, setTocOpen] = useState(false);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [textSelect, setTextSelect] = useState<TextSelectPayload | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const secondsRef = useRef(0);

  useWakeLock(open && status === 'reading');
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

  const clearReaderSelection = useCallback(() => {
    engineRef.current?.clearSelection?.();
    setTextSelect(null);
  }, []);

  const revealChrome = useCallback(() => {
    setChromeVisible(true);
  }, []);
  const toggleChrome = useCallback(() => {
    clearReaderSelection();
    setChromeVisible((visible) => !visible);
  }, [clearReaderSelection]);
  const openSettings = useCallback(() => {
    setChromeVisible(true);
    setTocOpen(false);
    clearReaderSelection();
    setSettingsOpen(true);
  }, [clearReaderSelection]);
  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
    requestAnimationFrame(() => settingsButtonRef.current?.focus({ preventScroll: true }));
  }, []);
  const openToc = useCallback(() => {
    clearReaderSelection();
    setSettingsOpen(false);
    setChromeVisible(true);
    const items = engineRef.current?.getToc?.() ?? [];
    setTocItems(items);
    setTocOpen(true);
  }, [clearReaderSelection]);
  const closeToc = useCallback(() => setTocOpen(false), []);
  const jumpToc = useCallback(async (href: string) => {
    if (!href) return;
    clearReaderSelection();
    setTocOpen(false);
    await engineRef.current?.goToHref?.(href);
  }, [clearReaderSelection]);

  const commitScrub = useCallback((percent: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    clearReaderSelection();
    if (pdf && engine.goToPage && location.pageTotal) {
      const total = location.pageTotal;
      const page = total <= 1 ? 1 : Math.round((percent / 100) * (total - 1)) + 1;
      void engine.goToPage(page);
      return;
    }
    void engine.goToFraction?.(percent / 100);
  }, [clearReaderSelection, pdf, location.pageTotal]);

  useEffect(() => {
    if (!open) return;
    setChromeVisible(true);
    setSettingsOpen(false);
  }, [open, bookId]);

  useEffect(() => {
    if (settingsOpen) setChromeVisible(true);
  }, [settingsOpen]);

  useEffect(() => {
    if (!open) {
      setTextSelect(null);
      setTocOpen(false);
      setScrubbing(false);
    }
  }, [open]);

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
        else if (tocOpen) closeToc();
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
  }, [open, settingsOpen, tocOpen, pageMode, foliate, close, closeSettings, closeToc, flushPosition]);

  useEffect(() => {
    if (!scrubbing) setScrubValue(Math.max(0, Math.min(100, location.percent)));
  }, [location.percent, scrubbing]);

  // Foliate builds TOC after open — refresh when the engine mounts into reading
  useEffect(() => {
    if (status !== 'reading' || !positionReady) {
      setTocItems([]);
      return;
    }
    const id = window.setTimeout(() => {
      setTocItems(engineRef.current?.getToc?.() ?? []);
    }, 80);
    return () => window.clearTimeout(id);
  }, [status, positionReady, bookId, source]);

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

  const readerStyle = useMemo(() => {
    const theme = readerThemeColors(prefs.theme ?? 'paper', prefs.dimmer);
    return {
      '--reader-paper': theme.paper,
      '--reader-ink': theme.ink,
      '--reader-mute': theme.mute,
      '--reader-rule': theme.rule,
      '--reader-accent': theme.accent,
      '--reader-font': fontStack(prefs.font),
      '--reader-size': `${prefs.size}px`,
    } as CSSProperties;
  }, [prefs]);

  const onTextSelect = useCallback((sel: TextSelectPayload | null) => {
    setTextSelect(sel);
  }, []);

  if (!mounted || !b || !bookId) return null;

  const displayTitle = source?.title || b.t;
  const displayAuthor = source?.author || b.a;
  const progressPercent = Math.max(0, Math.min(100, scrubbing ? scrubValue : location.percent));
  const canScrub = status === 'reading' && (pdf || foliate || source?.format === 'txt');
  const hasToc = tocItems.length > 0;
  const pageLabel = location.page && location.pageTotal
    ? t.reader.pageOf(location.page, location.pageTotal)
    : `${Math.round(progressPercent)}%`;
  const tocRows = flattenToc(tocItems);
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
                onTextSelect={onTextSelect}
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
        {hasToc && (
          <button
            tabIndex={chromeVisible ? 0 : -1}
            className="reader-icon"
            aria-label={t.reader.tocAria}
            aria-expanded={tocOpen}
            onClick={openToc}
          >
            <Icon name="ti-books" />
          </button>
        )}
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
            onClick={() => { revealChrome(); clearReaderSelection(); engineRef.current?.prev(); }}
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
          {canScrub ? (
            <input
              type="range"
              className="reader-scrub"
              min={0}
              max={100}
              step={0.1}
              value={progressPercent}
              tabIndex={chromeVisible ? 0 : -1}
              aria-label={t.reader.scrubAria}
              aria-valuetext={pageLabel}
              disabled={status !== 'reading'}
              onPointerDown={() => setScrubbing(true)}
              onPointerUp={(event) => {
                const next = Number((event.target as HTMLInputElement).value);
                setScrubValue(next);
                setScrubbing(false);
                commitScrub(next);
              }}
              onPointerCancel={() => setScrubbing(false)}
              onChange={(event) => {
                const next = Number(event.target.value);
                setScrubbing(true);
                setScrubValue(next);
              }}
              onKeyUp={(event) => {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
                  const next = Number((event.target as HTMLInputElement).value);
                  setScrubValue(next);
                  commitScrub(next);
                }
              }}
            />
          ) : (
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
          )}
        </div>
        {pageMode && (
          <button
            tabIndex={chromeVisible ? 0 : -1}
            className="reader-icon reader-page-button"
            aria-label={t.reader.nextPageAria}
            disabled={status !== 'reading'}
            onClick={() => { revealChrome(); clearReaderSelection(); engineRef.current?.next(); }}
          >
            <Icon name="ti-chevron-right" />
          </button>
        )}
      </footer>

      {textSelect && (
        <ReaderSelectionRail
          selection={textSelect}
          rootEl={rootRef.current}
          onDismiss={clearReaderSelection}
        />
      )}

      {tocOpen && (
        <>
          <button
            type="button"
            className="reader-toc-scrim"
            tabIndex={-1}
            aria-hidden="true"
            onClick={closeToc}
          />
          <section
            className="reader-toc"
            role="dialog"
            aria-modal="true"
            aria-label={t.reader.tocTitle}
          >
            <div className="reader-toc-head">
              <div className="reader-toc-title">{t.reader.tocTitle}</div>
              <button type="button" className="reader-icon" aria-label={t.reader.tocCloseAria} onClick={closeToc}>
                <Icon name="ti-x" />
              </button>
            </div>
            {tocRows.length ? (
              <ul className="reader-toc-list">
                {tocRows.map((item, index) => (
                  <li key={`${item.href}-${index}`}>
                    <button
                      type="button"
                      className={`reader-toc-item${item.depth > 0 ? ' is-nested' : ''}`}
                      disabled={!item.href}
                      onClick={() => void jumpToc(item.href)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="reader-toc-empty">{t.reader.tocEmpty}</p>
            )}
          </section>
        </>
      )}

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
