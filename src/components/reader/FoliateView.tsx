/* Reader engine backed by the vendored foliate-js (src/vendor/foliate-js).
   One engine for EPUB (local upload + remote public-domain URL), MOBI/AZW3, and
   FB2 — foliate's makeBook() auto-detects the format. Progress is the book-wide
   fraction from foliate's `relocate` event (percent), with a CFI to resume.

   Security: the vendored paginator/fixed-layout are patched to sandbox content
   iframes with "allow-same-origin" only (no allow-scripts) — a malicious ebook
   cannot run scripts against our origin. See src/vendor/foliate-js/VENDOR.md. */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import '../../vendor/foliate-js/view.js'; // side effect: registers <foliate-view>
import { loadUpload } from '../../lib/ebook/storage';
import { fetchRemoteBook } from '../../lib/ebook/remote';
import type { ReaderPrefs } from '../../store/types';
import { COPY_REPLACED_ERROR, SYSTEM_STACK } from './shared';
import type { EngineHandle, EngineProps } from './shared';
import literataUrl from '../../assets/fonts/literata-var-latin.woff2';
import frauncesUrl from '../../assets/fonts/fraunces-var-latin.woff2';
import frauncesItalicUrl from '../../assets/fonts/fraunces-italic-latin.woff2';

type FoliateRenderer = HTMLElement & {
  destroy?: () => void;
  goTo?: (target: unknown) => Promise<void>;
  setStyles?: (styles: string | [string, string]) => void;
};

/** the minimal <foliate-view> surface we drive (the element is plain-JS). */
type FoliateViewEl = HTMLElement & {
  open(input: File | Blob | string): Promise<void>;
  init(opts: { lastLocation?: string; showTextStart?: boolean }): Promise<void>;
  next(distance?: number): Promise<void>;
  prev(distance?: number): Promise<void>;
  goToFraction(frac: number): Promise<void>;
  lastLocation?: { cfi?: string };
  resolveNavigation?: (target: string) => unknown;
  renderer?: FoliateRenderer;
};

const paper = (amount: number): string => {
  const from = [251, 244, 225];
  const to = [230, 214, 172];
  const channel = (i: number) => Math.round(from[i]! + (to[i]! - from[i]!) * amount);
  return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
};

/* The ebook renders inside an iframe served from a blob: URL, whose base is
   opaque — new URL('/fonts/x.woff2', 'blob:…') throws, and a relative href
   cannot resolve either. That is why this sheet used to @import from Google:
   an absolute URL was the only form that worked. Now that the fonts are
   self-hosted we build absolute URLs ourselves, from Vite's fingerprinted
   asset paths, and inline the @font-face rules into the injected stylesheet.
   (paginator.js re-expands on document.fonts.ready, so a late load reflows.) */
const abs = (u: string) => new URL(u, document.baseURI).href;
const READER_FACES = `
    @font-face { font-family:'Literata'; src:url('${abs(literataUrl)}') format('woff2');
                 font-weight:400 600; font-style:normal; font-display:swap; }
    @font-face { font-family:'Fraunces'; src:url('${abs(frauncesUrl)}') format('woff2');
                 font-weight:400 700; font-style:normal; font-display:swap; }
    @font-face { font-family:'Fraunces'; src:url('${abs(frauncesItalicUrl)}') format('woff2');
                 font-weight:400; font-style:italic; font-display:swap; }`;

const readerStyles = (prefs: ReaderPrefs, chromeVisible: boolean): string => {
  const family = prefs.font === 'fraunces'
    ? "'Fraunces', Georgia, serif"
    : prefs.font === 'system'
      ? SYSTEM_STACK
      : "'Literata', Georgia, serif";
  const scrollInteraction = prefs.flow === 'scroll'
    ? `
      html, body {
        touch-action: pan-y pinch-zoom !important;
      }`
    : '';
  return `
    ${READER_FACES}
    :root {
      color-scheme: light !important;
      background: ${paper(prefs.dimmer)} !important;
      color: #241B0E !important;
      font-optical-sizing: auto;
      --owlry-rule: color-mix(in srgb, #775008 45%, transparent);
      --owlry-inner-gutter: clamp(.25rem, 1.5%, .75rem);
      --owlry-chrome-visible: ${chromeVisible ? 1 : 0};
    }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      background: ${paper(prefs.dimmer)} !important;
      color: #241B0E !important;
      overflow-wrap: anywhere;
      word-break: normal;
      -webkit-user-select: text;
      user-select: text;
    }
    ${scrollInteraction}
    body {
      inline-size: 100%;
      max-inline-size: 42rem;
      margin-inline: auto !important;
      padding-block: clamp(1rem, 3%, 1.75rem) !important;
      padding-inline: var(--owlry-inner-gutter) !important;
      font-family: ${family} !important;
      font-size: ${prefs.size}px !important;
      font-weight: 430;
      font-kerning: normal;
      font-variant-ligatures: common-ligatures;
      line-height: 1.65 !important;
      text-align: start !important;
      hyphens: auto;
      -webkit-hyphens: auto;
    }
    :where(p, li, blockquote, dd, dt, figcaption, section, article, div, span) {
      font-family: inherit !important;
    }
    :where(pre, code, samp, kbd) {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
    }
    p {
      margin-block: 0 .62em !important;
      text-indent: 0;
      text-align: start !important;
      orphans: 3;
      widows: 3;
    }
    p + p { text-indent: 1.05em; }
    :is(h1, h2, h3, h4, h5, h6, hr, figure, table, pre, blockquote, ul, ol) + p,
    :where(blockquote, li, figure, figcaption, table, th, td, header, footer, nav, aside,
      [role="doc-footnote"], [role="doc-endnote"], [epub\\:type~="footnote"],
      [epub\\:type~="endnote"]) p {
      text-indent: 0 !important;
    }
    h1, h2, h3, h4, h5, h6 {
      margin-block: 1.35em .58em !important;
      font-family: ${family};
      font-weight: 650;
      line-height: 1.2 !important;
      text-align: start !important;
      text-wrap: balance;
      overflow-wrap: normal !important;
      word-break: normal !important;
      hyphens: auto !important;
      -webkit-hyphens: auto !important;
      break-after: avoid;
      page-break-after: avoid;
    }
    h1 { font-size: 1.72em !important; }
    h2 { font-size: 1.44em !important; }
    h3 { font-size: 1.23em !important; }
    h4, h5, h6 { font-size: 1.08em !important; }
    ul, ol {
      margin-block: .85em 1em !important;
      padding-inline-start: clamp(1.25em, 7%, 1.75em) !important;
    }
    li {
      margin-block: .28em;
      padding-inline-start: .15em;
    }
    li > :is(ul, ol) { margin-block: .35em !important; }
    blockquote {
      margin-block: 1.15em !important;
      margin-inline: clamp(.55rem, 4%, 1.35rem) !important;
      padding: .12em 0 .12em clamp(.75rem, 3%, 1rem);
      border-inline-start: 2px solid var(--owlry-rule);
      font-style: normal;
    }
    blockquote > :last-child { margin-block-end: 0 !important; }
    figure {
      margin-block: 1.25em !important;
      margin-inline: auto !important;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    figcaption {
      margin-block-start: .55em;
      font-size: .86em;
      line-height: 1.45;
      text-align: start;
      text-wrap: balance;
    }
    img, svg, video, canvas {
      display: block;
      max-inline-size: 100% !important;
      block-size: auto;
      margin-inline: auto;
    }
    table {
      display: block;
      inline-size: max-content;
      max-inline-size: 100% !important;
      margin-block: 1em !important;
      overflow-x: auto;
      border-collapse: collapse;
      -webkit-overflow-scrolling: touch;
    }
    th, td {
      max-inline-size: min(18rem, 70vw);
      padding: .4em .55em;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    pre {
      max-inline-size: 100%;
      margin-block: 1em !important;
      padding: .75em;
      overflow-x: auto;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      -webkit-overflow-scrolling: touch;
    }
    code, samp, kbd { overflow-wrap: anywhere; }
    a {
      color: #775008 !important;
      text-decoration-color: #A8730A !important;
      text-decoration-thickness: .08em;
      text-underline-offset: .14em;
      touch-action: manipulation;
    }
    ::selection {
      background: rgba(255, 192, 23, .34);
      color: #241B0E;
    }
    @media (max-width: 430px) {
      :root { --owlry-inner-gutter: clamp(.25rem, 1.4vw, .4rem); }
      body { padding-block: clamp(.9rem, 3.6vw, 1.25rem) !important; }
      h1 { font-size: 1.62em !important; }
      h2 { font-size: 1.36em !important; }
      blockquote { margin-inline: clamp(.35rem, 3vw, .8rem) !important; }
    }
    @media (max-width: 350px) {
      :root { --owlry-inner-gutter: .2rem; }
      ul, ol { padding-inline-start: 1.2em !important; }
    }
  `;
};

const appliedSheets = new WeakMap<FoliateRenderer, string>();

const setRendererAttribute = (
  renderer: FoliateRenderer,
  name: string,
  value: string,
): boolean => {
  if (renderer.getAttribute(name) === value) return false;
  renderer.setAttribute(name, value);
  return true;
};

const readerMetrics = (inlineSize: number) => {
  const width = Number.isFinite(inlineSize) && inlineSize > 0
    ? inlineSize
    : window.innerWidth;
  // On compact phones this yields 13–17 px of chrome clearance. Horizontal
  // book gutters are percentages so they grow gently from 320 through 430 px,
  // instead of consuming the same fixed 24 px at every width.
  const margin = Math.round(Math.min(32, Math.max(12, width * .04)));
  const gap = Math.min(6, Math.max(4.5, 3.5 + width / 300));
  return {
    margin: `${margin}px`,
    gap: `${Math.round(gap * 10) / 10}%`,
    maxInlineSize: `${42 * 16}px`,
  };
};

/** Apply only changed values: every paginator attribute update may reflow. */
const applyReaderPrefs = (
  view: FoliateViewEl | null,
  prefs: ReaderPrefs,
  inlineSize: number,
  chromeVisible: boolean,
): boolean => {
  const renderer = view?.renderer;
  if (!renderer) return false;

  let changed = false;
  const styles = readerStyles(prefs, chromeVisible);
  if (renderer.setStyles && appliedSheets.get(renderer) !== styles) {
    appliedSheets.set(renderer, styles);
    renderer.setStyles(styles);
    changed = true;
  }

  // Fixed-layout EPUBs intentionally retain their authored canvas. These
  // paginator settings apply to EPUB/FB2/MOBI/AZW3 reflowable documents.
  if (renderer.localName !== 'foliate-paginator') return changed;

  const metrics = readerMetrics(inlineSize);
  changed = setRendererAttribute(renderer, 'margin', metrics.margin) || changed;
  changed = setRendererAttribute(renderer, 'gap', metrics.gap) || changed;
  changed = setRendererAttribute(renderer, 'max-inline-size', metrics.maxInlineSize) || changed;
  changed = setRendererAttribute(renderer, 'max-column-count', '1') || changed;
  changed = setRendererAttribute(
    renderer,
    'flow',
    prefs.flow === 'scroll' ? 'scrolled' : 'paginated',
  ) || changed;
  return changed;
};

export const FoliateView = forwardRef<EngineHandle, EngineProps>(function FoliateView(
  { bookId, source, initial, prefs, chromeVisible = false, onProgress, onToggleChrome, onError },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateViewEl | null>(null);
  const prefsRef = useRef(prefs);
  const chromeVisibleRef = useRef(chromeVisible);
  const onToggleChromeRef = useRef(onToggleChrome);
  const onErrorRef = useRef(onError);
  const shellAnchorRef = useRef<string | null>(null);
  const reflowFrameRef = useRef<number | null>(null);
  const reflowGenerationRef = useRef(0);
  const turnStateRef = useRef<{
    view: FoliateViewEl | null;
    ready: boolean;
    pending: Promise<void>;
  }>({ view: null, ready: false, pending: Promise.resolve() });
  prefsRef.current = prefs;
  chromeVisibleRef.current = chromeVisible;
  onToggleChromeRef.current = onToggleChrome;
  onErrorRef.current = onError;

  const turnSafely = useCallback((direction: 'next' | 'prev') => {
    const view = viewRef.current;
    const state = turnStateRef.current;
    if (!view || state.view !== view || !state.ready) return;

    // Fixed-layout navigation does not lock itself while a spread is loading.
    // Keep all turns ordered for this exact view, and discard queued work when
    // a replacement book/view takes over.
    state.pending = state.pending.then(async () => {
      if (
        turnStateRef.current !== state
        || viewRef.current !== view
        || !state.ready
      ) return;
      try {
        await view[direction]();
      } catch (error) {
        if (turnStateRef.current !== state || viewRef.current !== view) return;
        console.error('[reader] foliate page turn failed:', error);
        onErrorRef.current('We couldn’t turn that page. Try closing and reopening the book.');
      }
    });
  }, []);

  const cancelPendingReflow = useCallback(() => {
    reflowGenerationRef.current += 1;
    if (reflowFrameRef.current != null) cancelAnimationFrame(reflowFrameRef.current);
    reflowFrameRef.current = null;
  }, []);

  const applyPrefsPreservingLocation = useCallback((inlineSize: number) => {
    const view = viewRef.current;
    if (!view) return;
    const cfi = shellAnchorRef.current ?? view.lastLocation?.cfi;
    const changed = applyReaderPrefs(
      view,
      prefsRef.current,
      inlineSize,
      chromeVisibleRef.current,
    );
    if (!changed || !cfi || !view.resolveNavigation || !view.renderer?.goTo) {
      if (changed) shellAnchorRef.current = null;
      return;
    }

    // Paginator.render() already keeps its current Range anchor. Resolving the
    // CFI once more after the batched style/metric change is a guard for font
    // swaps and flow switches, whose geometry can settle one frame later.
    const target = view.resolveNavigation(cfi);
    if (!target) {
      shellAnchorRef.current = null;
      return;
    }
    cancelPendingReflow();
    const generation = reflowGenerationRef.current;
    reflowFrameRef.current = requestAnimationFrame(() => {
      reflowFrameRef.current = requestAnimationFrame(() => {
        reflowFrameRef.current = null;
        if (generation !== reflowGenerationRef.current || viewRef.current !== view) return;
        void view.renderer?.goTo?.(target)
          .catch((error: unknown) => {
            console.warn('[reader] could not restore location after reflow:', error);
          })
          .finally(() => {
            if (shellAnchorRef.current === cfi) shellAnchorRef.current = null;
          });
      });
    });
  }, [cancelPendingReflow]);

  useImperativeHandle(ref, () => ({
    next: () => turnSafely('next'),
    prev: () => turnSafely('prev'),
  }), [turnSafely]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let settled = false;
    let view: FoliateViewEl | null = null;
    const wiredDocuments = new WeakSet<Document>();
    let activeDocumentRefs: WeakRef<Document>[] = [];

    const pruneDocumentListeners = () => {
      activeDocumentRefs = activeDocumentRefs.filter((ref) => {
        const doc = ref.deref();
        if (!doc) return false;
        if (!doc.defaultView?.frameElement?.isConnected) {
          doc.removeEventListener('click', handleDocumentClick);
          return false;
        }
        return true;
      });
    };

    const handleDocumentClick = (click: MouseEvent) => {
      if (cancelled || click.defaultPrevented || click.button !== 0 || click.detail === 0) return;
      const doc = click.currentTarget as Document | null;
      const activeView = viewRef.current;
      if (!doc || !activeView || activeView !== view) return;

      // The target belongs to the iframe's realm, so parent-window
      // `instanceof Element` would reject it even though it is an element.
      const target = click.target as Element | null;
      if (
        typeof target?.closest === 'function'
        && target.closest(
          'a,button,input,textarea,select,option,label,summary,details,audio,video,'
          + '[role="button"],[role="link"],[tabindex],'
          + '[contenteditable]:not([contenteditable="false"])',
        )
      ) return;
      const selection = doc.getSelection();
      if (selection && !selection.isCollapsed) return;

      if (prefsRef.current.flow === 'page') {
        const hostRect = host.getBoundingClientRect();
        const frameElement = doc.defaultView?.frameElement;
        const frameRect = frameElement?.getBoundingClientRect();
        // Fixed-layout iframes retain their authored width and are often
        // transformed down to phone size. Mouse coordinates inside the frame
        // are pre-transform, while getBoundingClientRect() is post-transform.
        const scaleX = frameRect && frameElement?.clientWidth
          ? frameRect.width / frameElement.clientWidth
          : 1;
        const parentClientX = frameRect
          ? frameRect.left + click.clientX * scaleX
          : click.clientX;
        const x = hostRect.width > 0 ? (parentClientX - hostRect.left) / hostRect.width : .5;
        if (x < .24) {
          turnSafely('prev');
          return;
        }
        if (x > .76) {
          turnSafely('next');
          return;
        }
      }

      // Capture before React changes the host height. The prefs/reflow effect
      // consumes this exact CFI after the chrome transition.
      shellAnchorRef.current = activeView.lastLocation?.cfi ?? null;
      onToggleChromeRef.current?.();
    };

    const handleDocumentLoad = (event: Event) => {
      const doc = (event as CustomEvent<{ doc?: Document }>).detail?.doc;
      if (cancelled || viewRef.current !== view || !doc || wiredDocuments.has(doc)) return;
      wiredDocuments.add(doc);

      // Reflowable books have one live document; fixed-layout spreads can have
      // two. Weak references cover both without retaining every visited spine.
      pruneDocumentListeners();
      activeDocumentRefs.push(new WeakRef(doc));
      doc.addEventListener('click', handleDocumentClick);
    };

    const handleRelocate = (event: Event) => {
      if (cancelled || !view || viewRef.current !== view) return;
      const detail = (event as CustomEvent).detail as {
        fraction?: number;
        cfi?: string;
      } | undefined;
      const percent = Math.max(0, Math.min(100, (detail?.fraction ?? 0) * 100));
      onProgress({ percent, cfi: detail?.cfi });
    };

    const handleNavigationError = (event: Event) => {
      const error = (event as CustomEvent<unknown>).detail;
      if (
        cancelled
        || !view
        || viewRef.current !== view
        || !(error instanceof Error)
      ) return;
      event.stopPropagation();
      console.error('[reader] foliate internal navigation failed:', error);
      onErrorRef.current('We couldn’t turn that page. Try closing and reopening the book.');
    };

    const teardownView = (target: FoliateViewEl | null) => {
      for (const ref of activeDocumentRefs) {
        ref.deref()?.removeEventListener('click', handleDocumentClick);
      }
      activeDocumentRefs = [];
      target?.removeEventListener('load', handleDocumentLoad);
      target?.removeEventListener('relocate', handleRelocate);
      target?.removeEventListener('error', handleNavigationError);
      if (turnStateRef.current.view === target) {
        turnStateRef.current = {
          view: null,
          ready: false,
          pending: Promise.resolve(),
        };
      }
      try {
        target?.renderer?.destroy?.();
      } catch {
        /* a malformed renderer must not prevent detaching its element */
      }
      try {
        target?.remove();
      } catch {
        /* DOM removal is independently best-effort */
      }
      if (viewRef.current === target) viewRef.current = null;
    };

    const fail = (msg: string) => {
      if (settled || cancelled) return;
      settled = true;
      onError(msg, true);
    };
    // remote copies can be CORS-blocked or slow, and a stray file can hang — fall
    // back to the upload flow if nothing has rendered in time.
    // generous: a remote classic streams through book-proxy (~4-5s from Gutenberg)
    // before foliate even parses it.
    const watchdog = setTimeout(() => fail('We couldn’t load this book. Upload your own file to read it.'), 20000);

    (async () => {
      try {
        let input: File | Blob | string;
        if (source.kind === 'local') {
          const up = await loadUpload(bookId, undefined, {
            copyVersion: source.copyVersion,
            format: source.format,
          });
          if (!up) {
            const replacement = await loadUpload(bookId);
            if (replacement) return fail(COPY_REPLACED_ERROR);
            return fail('Your uploaded file is missing — please upload it again.');
          }
          // foliate sniffs format from file.name — a raw Blob (or a platform
          // that degrades File → Blob in IndexedDB) would crash makeBook, so
          // re-wrap with a name carrying the stored format's extension
          input = up.blob instanceof File && up.blob.name
            ? up.blob
            : new File([up.blob], `book.${up.source.format}`, { type: up.blob.type || 'application/octet-stream' });
        } else {
          // remote public-domain EPUB — routed through book-proxy (the host sends
          // no CORS header, so the browser can't fetch it directly)
          input = await fetchRemoteBook(source.url as string, source.title);
        }
        if (cancelled) return;

        view = document.createElement('foliate-view') as FoliateViewEl;
        view.style.width = '100%';
        view.style.height = '100%';
        host.append(view);
        viewRef.current = view;
        turnStateRef.current = {
          view,
          ready: false,
          pending: Promise.resolve(),
        };

        // The EPUB lives in sandboxed iframes, so ordinary clicks do not bubble
        // into EbookReader. Listen inside each loaded spine document instead,
        // while leaving links, controls, pinch/pan, and text selection untouched.
        view.addEventListener('load', handleDocumentLoad);
        view.addEventListener('relocate', handleRelocate);
        view.addEventListener('error', handleNavigationError);

        await view.open(input);
        if (cancelled) {
          teardownView(view);
          return;
        }
        applyReaderPrefs(
          view,
          prefsRef.current,
          host.clientWidth,
          chromeVisibleRef.current,
        );
        // display at the saved position (CFI), or the start
        await view.init({ lastLocation: initial?.cfi || undefined });
        if (cancelled) {
          teardownView(view);
          return;
        }
        if (turnStateRef.current.view === view) {
          turnStateRef.current.ready = true;
        }

        clearTimeout(watchdog);
        settled = true;
      } catch (e) {
        teardownView(view);
        if (cancelled) return;
        console.error('[reader] foliate open failed:', e);
        fail('We couldn’t open this book. Try a different DRM-free file.');
      }
    })();

    return () => {
      cancelled = true;
      cancelPendingReflow();
      clearTimeout(watchdog);
      teardownView(view);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, source]);

  useEffect(() => {
    applyPrefsPreservingLocation(hostRef.current?.clientWidth ?? window.innerWidth);
  }, [prefs, chromeVisible, applyPrefsPreservingLocation]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    let resizeFrame: number | null = null;
    const observer = new ResizeObserver(([entry]) => {
      const inlineSize = entry?.contentRect.width ?? host.clientWidth;
      if (resizeFrame != null) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        applyPrefsPreservingLocation(inlineSize);
      });
    });
    observer.observe(host);
    return () => {
      observer.disconnect();
      if (resizeFrame != null) cancelAnimationFrame(resizeFrame);
    };
  }, [applyPrefsPreservingLocation]);

  return (
    <div
      ref={hostRef}
      className="foliate-reader"
      style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden' }}
    />
  );
});
