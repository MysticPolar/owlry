/* Plain-text (.txt) rendering as scrollable, paginated HTML. Progress = scroll
   fraction. (EPUB/MOBI/AZW3/FB2 are handled by FoliateView.) */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { loadUpload } from '../../lib/ebook/storage';
import type { EngineHandle, EngineProps } from './shared';

function txtToParas(t: string): string[] {
  return t
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const TextView = forwardRef<EngineHandle, EngineProps>(function TextView(
  { bookId, source, initial, onProgress, onError },
  ref,
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paras, setParas] = useState<string[] | null>(null);

  const emit = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const frac = max > 0 ? el.scrollTop / max : 1;
    onProgress({ percent: Math.max(0, Math.min(100, frac * 100)), scroll: frac });
  };

  const pageBy = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ top: dir * el.clientHeight * 0.9, behavior: 'smooth' });
  };

  useImperativeHandle(ref, () => ({
    next: () => pageBy(1),
    prev: () => pageBy(-1),
  }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const up = await loadUpload(bookId);
        if (!up) return onError('Your uploaded file is missing — please upload it again.', true);
        const text = await up.blob.text();
        if (cancelled) return;
        setParas(txtToParas(text));
      } catch {
        onError('We couldn’t open this file.');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, source]);

  // restore position once rendered, then emit an initial progress reading
  useEffect(() => {
    if (!paras) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      if (initial?.scroll) el.scrollTop = initial.scroll * (el.scrollHeight - el.clientHeight);
      emit();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paras]);

  return (
    <div
      ref={scrollRef}
      onScroll={emit}
      style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '10px 22px 44px', boxSizing: 'border-box' }}
    >
      {paras?.map((p, i) => (
        <p
          key={i}
          style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: 16, lineHeight: 1.7, margin: '0 0 14px' }}
        >
          {p}
        </p>
      ))}
    </div>
  );
});
