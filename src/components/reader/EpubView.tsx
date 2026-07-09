/* EPUB rendering via epub.js (Readium). Progress is tracked by CFI → percent
   from generated locations (pages are unstable in reflowable EPUB). */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import ePub from 'epubjs';
import { loadUpload } from '../../lib/ebook/storage';
import type { EngineHandle, EngineProps } from './shared';

/* epub.js types are partial; treat the runtime objects loosely. */
type Loose = Record<string, unknown> & { [k: string]: any };

export const EpubView = forwardRef<EngineHandle, EngineProps>(function EpubView(
  { bookId, source, initial, onProgress, onError },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Loose | null>(null);

  useImperativeHandle(ref, () => ({
    next: () => renditionRef.current?.next?.(),
    prev: () => renditionRef.current?.prev?.(),
  }));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let book: Loose | undefined;
    let cancelled = false;
    let settled = false;

    const fail = (msg: string) => {
      if (settled || cancelled) return;
      settled = true;
      onError(msg, true);
    };
    // remote EPUBs can be CORS-blocked or slow — fall back to upload if so
    const watchdog = setTimeout(
      () => fail('We couldn’t load the free copy. Upload your own file to read it.'),
      9000,
    );

    const report = (location: Loose | undefined) => {
      const cfi: string | undefined = location?.start?.cfi;
      let percent = 0;
      try {
        const fromCfi = cfi ? book?.locations?.percentageFromCfi?.(cfi) : undefined;
        if (typeof fromCfi === 'number' && fromCfi > 0) percent = fromCfi * 100;
        else if (typeof location?.start?.percentage === 'number') percent = location.start.percentage * 100;
      } catch {
        /* ignore */
      }
      onProgress({ percent: Math.max(0, Math.min(100, percent)), cfi });
    };

    (async () => {
      try {
        let input: string | ArrayBuffer;
        if (source.kind === 'local') {
          const up = await loadUpload(bookId);
          if (!up) return fail('Your uploaded file is missing — please upload it again.');
          input = await up.blob.arrayBuffer();
        } else {
          input = source.url as string;
        }
        if (cancelled) return;

        book = ePub(input as never) as unknown as Loose;
        const rendition = book.renderTo(host, {
          width: '100%',
          height: '100%',
          flow: 'paginated',
          spread: 'none',
          allowScriptedContent: false,
        });
        renditionRef.current = rendition;
        rendition.on('relocated', report);

        await rendition.display(initial?.cfi || undefined);
        await book.ready;
        try {
          await book.locations.generate(1200);
          const cur = rendition.currentLocation?.();
          if (cur?.start) report(cur);
        } catch {
          /* locations best-effort */
        }
        if (cancelled) return;
        clearTimeout(watchdog);
        settled = true;
      } catch {
        fail('We couldn’t open this EPUB. Try a different DRM-free file.');
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
      try {
        renditionRef.current?.destroy?.();
        book?.destroy?.();
      } catch {
        /* ignore */
      }
      renditionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, source]);

  return <div ref={hostRef} style={{ width: '100%', height: '100%' }} />;
});
