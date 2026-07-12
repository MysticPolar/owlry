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
import type { EngineHandle, EngineProps } from './shared';

/** the minimal <foliate-view> surface we drive (the element is plain-JS). */
type FoliateViewEl = HTMLElement & {
  open(input: File | Blob | string): Promise<void>;
  init(opts: { lastLocation?: string; showTextStart?: boolean }): Promise<void>;
  next(distance?: number): Promise<void>;
  prev(distance?: number): Promise<void>;
  goToFraction(frac: number): Promise<void>;
  renderer?: { destroy?: () => void };
};

export const FoliateView = forwardRef<EngineHandle, EngineProps>(function FoliateView(
  { bookId, source, initial, onProgress, onError },
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

  return <div ref={hostRef} style={{ width: '100%', height: '100%' }} />;
});
