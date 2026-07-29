import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { loadUpload } from '../../lib/ebook/storage';
import { useStore } from '../../store/useStore';
import { COPY_REPLACED_ERROR, SYSTEM_STACK } from './shared';
import type { EngineHandle, EngineProps } from './shared';
import { getActiveLang, tOf } from '../../i18n';

const r = () => tOf(getActiveLang()).reader;

async function decodeText(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let encoding = 'utf-8';
  let offset = 0;

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    offset = 3;
  } else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    encoding = 'utf-16le';
    offset = 2;
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    encoding = 'utf-16be';
    offset = 2;
  }

  return new TextDecoder(encoding).decode(bytes.subarray(offset)).replace(/^\uFEFF/, '');
}

function txtToParas(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
}

const stack = (font: EngineProps['prefs']['font']): string => {
  if (font === 'fraunces') return "'Fraunces', Georgia, serif";
  if (font === 'system') return SYSTEM_STACK;
  return "'Literata', Georgia, serif";
};

const clampFraction = (value: number | undefined): number => (
  Number.isFinite(value) ? Math.max(0, Math.min(1, value ?? 0)) : 0
);

const TextDocument = memo(function TextDocument({ paragraphs }: { paragraphs: string[] | null }) {
  return (
    <article className="text-reader-page">
      {paragraphs?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </article>
  );
});

export const TextView = forwardRef<EngineHandle, EngineProps>(function TextView(
  { bookId, source, initial, prefs, onProgress, onError },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [paras, setParas] = useState<string[] | null>(null);
  const fractionRef = useRef(initial?.scroll ?? 0);
  const restoredRef = useRef(false);
  const progressFrameRef = useRef<number | null>(null);
  const restoreFrameRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);
  const flowRef = useRef(prefs.flow);
  const onProgressRef = useRef(onProgress);
  const reduceMotion = useStore((s) => s.prefs.reduceMotion);
  const reduceMotionRef = useRef(reduceMotion);

  flowRef.current = prefs.flow;
  onProgressRef.current = onProgress;
  reduceMotionRef.current = reduceMotion;

  const emitProgress = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const page = flowRef.current === 'page';
    const max = page ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
    const offset = page ? el.scrollLeft : el.scrollTop;
    const fraction = max > 0 ? offset / max : 1;
    fractionRef.current = Math.max(0, Math.min(1, fraction));
    const pageTotal = page && el.clientWidth > 0
      ? Math.max(1, Math.ceil(el.scrollWidth / el.clientWidth))
      : undefined;
    const pageNumber = page && el.clientWidth > 0
      ? Math.min(pageTotal ?? 1, Math.round(offset / el.clientWidth) + 1)
      : undefined;
    onProgressRef.current({
      percent: fractionRef.current * 100,
      scroll: fractionRef.current,
      page: pageNumber,
      pageTotal,
    });
  }, []);

  const queueProgress = useCallback(() => {
    if (progressFrameRef.current !== null) return;
    progressFrameRef.current = window.requestAnimationFrame(() => {
      progressFrameRef.current = null;
      emitProgress();
    });
  }, [emitProgress]);

  const prefersReducedMotion = useCallback(
    () => reduceMotionRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  const snapToPage = useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = viewportRef.current;
    if (!el || flowRef.current !== 'page' || el.clientWidth <= 0) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const target = Math.max(0, Math.min(max, Math.round(el.scrollLeft / el.clientWidth) * el.clientWidth));

    if (Math.abs(el.scrollLeft - target) <= 0.5) {
      el.scrollLeft = target;
      queueProgress();
      return;
    }
    el.scrollTo({ left: target, behavior });
  }, [queueProgress]);

  const handleScroll = useCallback(() => {
    queueProgress();
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
    if (flowRef.current !== 'page') return;
    settleTimerRef.current = window.setTimeout(() => {
      settleTimerRef.current = null;
      snapToPage(prefersReducedMotion() ? 'auto' : 'smooth');
    }, 120);
  }, [prefersReducedMotion, queueProgress, snapToPage]);

  const pageBy = useCallback((dir: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    if (flowRef.current === 'page' && el.clientWidth > 0) {
      const currentPage = Math.round(el.scrollLeft / el.clientWidth);
      const max = Math.max(0, el.scrollWidth - el.clientWidth);
      const target = Math.max(0, Math.min(max, (currentPage + dir) * el.clientWidth));
      el.scrollTo({ left: target, behavior });
    } else {
      el.scrollBy({ top: dir * el.clientHeight * 0.9, behavior });
    }
  }, [prefersReducedMotion]);

  useImperativeHandle(ref, () => ({ next: () => pageBy(1), prev: () => pageBy(-1) }), [pageBy]);

  useEffect(() => {
    let cancelled = false;
    if (progressFrameRef.current !== null) {
      window.cancelAnimationFrame(progressFrameRef.current);
      progressFrameRef.current = null;
    }
    if (restoreFrameRef.current !== null) {
      window.cancelAnimationFrame(restoreFrameRef.current);
      restoreFrameRef.current = null;
    }
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    setParas(null);
    restoredRef.current = false;
    fractionRef.current = clampFraction(initial?.scroll);
    void (async () => {
      try {
        const upload = await loadUpload(bookId, undefined, {
          copyVersion: source.copyVersion,
          format: source.format,
        });
        if (!upload) {
          const replacement = await loadUpload(bookId);
          if (!cancelled) {
            onError(
              replacement
                ? COPY_REPLACED_ERROR
                : r().errMissingUpload,
              true,
            );
          }
          return;
        }
        const text = await decodeText(upload.blob);
        if (!cancelled) setParas(txtToParas(text));
      } catch {
        if (!cancelled) onError(r().errOpenFile);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, source]);

  useEffect(() => {
    if (!paras) return;
    const el = viewportRef.current;
    if (!el) return;
    if (restoreFrameRef.current !== null) window.cancelAnimationFrame(restoreFrameRef.current);
    restoreFrameRef.current = window.requestAnimationFrame(() => {
      restoreFrameRef.current = null;
      const fraction = restoredRef.current ? fractionRef.current : clampFraction(initial?.scroll);
      restoredRef.current = true;
      if (prefs.flow === 'page') el.scrollLeft = fraction * (el.scrollWidth - el.clientWidth);
      else el.scrollTop = fraction * (el.scrollHeight - el.clientHeight);
      if (prefs.flow === 'page') snapToPage('auto');
      else queueProgress();
    });
    return () => {
      if (restoreFrameRef.current !== null) {
        window.cancelAnimationFrame(restoreFrameRef.current);
        restoreFrameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paras, prefs.flow, prefs.font, prefs.size, queueProgress, snapToPage]);

  useEffect(() => () => {
    if (progressFrameRef.current !== null) window.cancelAnimationFrame(progressFrameRef.current);
    if (restoreFrameRef.current !== null) window.cancelAnimationFrame(restoreFrameRef.current);
    if (settleTimerRef.current !== null) window.clearTimeout(settleTimerRef.current);
  }, []);

  const style = {
    '--text-reader-font': stack(prefs.font),
    '--text-reader-size': `${prefs.size}px`,
  } as CSSProperties;

  return (
    <div
      ref={viewportRef}
      className={`text-reader ${prefs.flow === 'page' ? 'is-paged' : 'is-scroll'}`}
      style={style}
      onScroll={handleScroll}
    >
      <TextDocument paragraphs={paras} />
    </div>
  );
});
