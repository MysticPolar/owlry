import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties } from 'react';
import { loadUpload } from '../../lib/ebook/storage';
import { useStore } from '../../store/useStore';
import { SYSTEM_STACK } from './shared';
import type { EngineHandle, EngineProps } from './shared';

function txtToParas(text: string): string[] {
  return text.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
}

const stack = (font: EngineProps['prefs']['font']): string => {
  if (font === 'fraunces') return "'Fraunces', Georgia, serif";
  if (font === 'system') return SYSTEM_STACK;
  return "'Literata', Georgia, serif";
};

export const TextView = forwardRef<EngineHandle, EngineProps>(function TextView(
  { bookId, source, initial, prefs, onProgress, onError },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [paras, setParas] = useState<string[] | null>(null);
  const fractionRef = useRef(initial?.scroll ?? 0);
  const restoredRef = useRef(false);
  const reduceMotion = useStore((s) => s.prefs.reduceMotion);

  const emit = () => {
    const el = viewportRef.current;
    if (!el) return;
    const page = prefs.flow === 'page';
    const max = page ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
    const offset = page ? el.scrollLeft : el.scrollTop;
    const fraction = max > 0 ? offset / max : 1;
    fractionRef.current = Math.max(0, Math.min(1, fraction));
    const pageTotal = page ? Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth)) : undefined;
    const pageNumber = page ? Math.min(pageTotal ?? 1, Math.round(offset / el.clientWidth) + 1) : undefined;
    onProgress({ percent: fractionRef.current * 100, scroll: fractionRef.current, page: pageNumber, pageTotal });
  };

  const pageBy = (dir: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const behavior = reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (prefs.flow === 'page') el.scrollBy({ left: dir * el.clientWidth, behavior });
    else el.scrollBy({ top: dir * el.clientHeight * 0.9, behavior });
  };

  useImperativeHandle(ref, () => ({ next: () => pageBy(1), prev: () => pageBy(-1) }));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const upload = await loadUpload(bookId);
        if (!upload) return onError('Your uploaded file is missing — please upload it again.', true);
        const text = await upload.blob.text();
        if (!cancelled) setParas(txtToParas(text));
      } catch {
        onError('We couldn’t open this file.');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, source]);

  useEffect(() => {
    if (!paras) return;
    const el = viewportRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      const fraction = restoredRef.current ? fractionRef.current : (initial?.scroll ?? 0);
      restoredRef.current = true;
      if (prefs.flow === 'page') el.scrollLeft = fraction * (el.scrollWidth - el.clientWidth);
      else el.scrollTop = fraction * (el.scrollHeight - el.clientHeight);
      emit();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paras, prefs.flow, prefs.font, prefs.size]);

  const style = {
    '--text-reader-font': stack(prefs.font),
    '--text-reader-size': `${prefs.size}px`,
  } as CSSProperties;

  return (
    <div
      ref={viewportRef}
      className={`text-reader ${prefs.flow === 'page' ? 'is-paged' : 'is-scroll'}`}
      style={style}
      onScroll={emit}
    >
      <article className="text-reader-page">
        {paras?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </article>
    </div>
  );
});
