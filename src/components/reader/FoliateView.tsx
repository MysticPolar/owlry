/* Reader engine backed by the vendored foliate-js (src/vendor/foliate-js).
   One engine for EPUB (local upload + remote public-domain URL), MOBI/AZW3, and
   FB2 — foliate's makeBook() auto-detects the format. Progress is the book-wide
   fraction from foliate's `relocate` event (percent), with a CFI to resume.

   Security: the vendored paginator/fixed-layout are patched to sandbox content
   iframes with "allow-same-origin" only (no allow-scripts) — a malicious ebook
   cannot run scripts against our origin. See src/vendor/foliate-js/VENDOR.md. */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import '../../vendor/foliate-js/view.js'; // side effect: registers <foliate-view>
import { loadUpload } from '../../lib/ebook/storage';
import { fetchRemoteBook } from '../../lib/ebook/remote';
import type { ReaderPrefs } from '../../store/types';
import { SYSTEM_STACK } from './shared';
import type { EngineHandle, EngineProps } from './shared';
import literataUrl from '../../assets/fonts/literata-var-latin.woff2';
import frauncesUrl from '../../assets/fonts/fraunces-var-latin.woff2';
import frauncesItalicUrl from '../../assets/fonts/fraunces-italic-latin.woff2';

type FoliateRenderer = HTMLElement & {
  destroy?: () => void;
  setStyles?: (styles: string | [string, string]) => void;
};

/** the minimal <foliate-view> surface we drive (the element is plain-JS). */
type FoliateViewEl = HTMLElement & {
  open(input: File | Blob | string): Promise<void>;
  init(opts: { lastLocation?: string; showTextStart?: boolean }): Promise<void>;
  next(distance?: number): Promise<void>;
  prev(distance?: number): Promise<void>;
  goToFraction(frac: number): Promise<void>;
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

const readerStyles = (prefs: ReaderPrefs): string => {
  const family = prefs.font === 'fraunces'
    ? "'Fraunces', Georgia, serif"
    : prefs.font === 'system'
      ? SYSTEM_STACK
      : "'Literata', Georgia, serif";
  return `
    ${READER_FACES}
    :root { color-scheme: light !important; background: ${paper(prefs.dimmer)} !important; color: #241B0E !important; font-optical-sizing: auto; }
    html, body { background: ${paper(prefs.dimmer)} !important; color: #241B0E !important; }
    body { box-sizing: border-box; max-width: 42em; margin: 0 auto !important; padding: 24px !important; font-family: ${family} !important; font-size: ${prefs.size}px !important; font-weight: 430; line-height: 1.6 !important; text-align: left !important; hyphens: none !important; -webkit-hyphens: none !important; }
    p { margin-block: 0 !important; text-indent: 1.2em; text-align: left !important; }
    h1 + p, h2 + p, h3 + p, hr + p, blockquote p, li p { text-indent: 0; }
    h1, h2, h3, h4, h5, h6, blockquote, ul, ol, figure, table, pre { margin-block: 1em !important; }
    img, svg, video, table { max-width: 100% !important; height: auto; }
    a { color: #775008 !important; text-decoration-color: #A8730A !important; }
  `;
};

const applyReaderPrefs = (view: FoliateViewEl | null, prefs: ReaderPrefs) => {
  const renderer = view?.renderer;
  if (!renderer) return;
  renderer.setAttribute('flow', prefs.flow === 'scroll' ? 'scrolled' : 'paginated');
  renderer.setAttribute('margin', '24');
  renderer.setAttribute('gap', '6');
  renderer.setAttribute('max-inline-size', '520');
  renderer.setAttribute('max-column-count', '1');
  renderer.setStyles?.(readerStyles(prefs));
};

export const FoliateView = forwardRef<EngineHandle, EngineProps>(function FoliateView(
  { bookId, source, initial, prefs, onProgress, onError },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateViewEl | null>(null);

  useImperativeHandle(ref, () => ({
    next: () => void viewRef.current?.next(),
    prev: () => void viewRef.current?.prev(),
  }));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let settled = false;
    let view: FoliateViewEl | null = null;

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
          const up = await loadUpload(bookId);
          if (!up) return fail('Your uploaded file is missing — please upload it again.');
          input = up.blob;
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

        view.addEventListener('relocate', (e: Event) => {
          const d = (e as CustomEvent).detail as { fraction?: number; cfi?: string } | undefined;
          const percent = Math.max(0, Math.min(100, (d?.fraction ?? 0) * 100));
          onProgress({ percent, cfi: d?.cfi });
        });

        await view.open(input);
        if (cancelled) return;
        applyReaderPrefs(view, prefs);
        // display at the saved position (CFI), or the start
        await view.init({ lastLocation: initial?.cfi || undefined });

        clearTimeout(watchdog);
        settled = true;
      } catch {
        fail('We couldn’t open this book. Try a different DRM-free file.');
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
      try {
        view?.renderer?.destroy?.();
        view?.remove();
      } catch {
        /* ignore */
      }
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, source]);

  useEffect(() => {
    applyReaderPrefs(viewRef.current, prefs);
  }, [prefs]);

  return <div ref={hostRef} style={{ width: '100%', height: '100%' }} />;
});
