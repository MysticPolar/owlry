/* PDF rendering via pdf.js. Uploaded (local) files only — the public-domain
   resolver returns EPUB. Password/DRM-protected PDFs are caught and refused. */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { loadUpload } from '../../lib/ebook/storage';
import { COPY_REPLACED_ERROR, type EngineHandle, type EngineProps, type TocItem } from './shared';
import { pageChunkToc } from './tocBuild';
import { getActiveLang, tOf } from '../../i18n';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const r = () => tOf(getActiveLang()).reader;

type PdfOutlineNode = {
  title: string;
  dest: string | unknown[] | null;
  items: PdfOutlineNode[];
};

async function outlineToToc(
  doc: pdfjs.PDFDocumentProxy,
  nodes: PdfOutlineNode[] | null | undefined,
): Promise<TocItem[]> {
  if (!nodes?.length) return [];
  const items: TocItem[] = [];
  for (const node of nodes) {
    let page: number | null = null;
    try {
      let dest = node.dest;
      if (typeof dest === 'string') dest = await doc.getDestination(dest);
      if (Array.isArray(dest) && dest[0]) {
        const index = await doc.getPageIndex(dest[0] as Parameters<typeof doc.getPageIndex>[0]);
        if (Number.isFinite(index)) page = index + 1;
      }
    } catch {
      page = null;
    }
    const children = node.items?.length ? await outlineToToc(doc, node.items) : undefined;
    const label = (node.title || '').trim() || (page != null ? r().tocPage(page) : '…');
    if (page != null) {
      items.push({ label, href: `page:${page}`, ...(children?.length ? { children } : {}) });
    } else if (children?.length) {
      items.push({ label, href: '', children });
    }
  }
  return items;
}

export const PdfView = forwardRef<EngineHandle, EngineProps>(function PdfView(
  { bookId, source, initial, onProgress, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const tocRef = useRef<TocItem[]>([]);
  const pageRef = useRef<number>(initial?.page ?? 1);
  const numRef = useRef<number>(1);
  const renderTaskRef = useRef<pdfjs.RenderTask | null>(null);
  const loadingTaskRef = useRef<pdfjs.PDFDocumentLoadingTask | null>(null);
  const renderGenerationRef = useRef(0);
  const resizeFrameRef = useRef<number | null>(null);
  const onProgressRef = useRef(onProgress);
  const onErrorRef = useRef(onError);
  const [loading, setLoading] = useState(true);
  const [renderedPage, setRenderedPage] = useState<number | null>(null);

  onProgressRef.current = onProgress;
  onErrorRef.current = onError;

  const renderPage = useCallback(async (n: number) => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!doc || !canvas || !container || container.clientWidth <= 24) return;

    const generation = ++renderGenerationRef.current;
    renderTaskRef.current?.cancel();
    renderTaskRef.current = null;
    setLoading(true);

    try {
      const page = await doc.getPage(n);
      if (generation !== renderGenerationRef.current || doc !== docRef.current) return;

      const targetWidth = container.clientWidth - 24;
      const baseViewport = page.getViewport({ scale: 1 });
      const cssScale = Math.max(0.2, targetWidth / baseViewport.width);
      const cssViewport = page.getViewport({ scale: cssScale });
      const outputScale = Math.max(1, Math.min(window.devicePixelRatio || 1, 3));
      const renderViewport = page.getViewport({ scale: cssScale * outputScale });
      const stagingCanvas = document.createElement('canvas');
      stagingCanvas.width = Math.max(1, Math.ceil(renderViewport.width));
      stagingCanvas.height = Math.max(1, Math.ceil(renderViewport.height));

      const task = page.render({
        canvas: stagingCanvas,
        viewport: renderViewport,
      });
      renderTaskRef.current = task;
      await task.promise;

      if (generation !== renderGenerationRef.current || doc !== docRef.current) return;
      canvas.width = stagingCanvas.width;
      canvas.height = stagingCanvas.height;
      canvas.style.width = `${Math.round(cssViewport.width)}px`;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Canvas is unavailable');
      context.drawImage(stagingCanvas, 0, 0);

      const num = numRef.current;
      setRenderedPage(n);
      onProgressRef.current({
        percent: num > 1 ? ((n - 1) / (num - 1)) * 100 : 100,
        page: n,
        pageTotal: num,
      });
    } catch (error) {
      const cancelled = (error as { name?: string })?.name === 'RenderingCancelledException';
      if (!cancelled && generation === renderGenerationRef.current) {
        onErrorRef.current(r().errRenderPdf);
      }
    } finally {
      if (generation === renderGenerationRef.current) {
        renderTaskRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  const go = useCallback((n: number) => {
    const clamped = Math.max(1, Math.min(numRef.current, n));
    pageRef.current = clamped;
    containerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    void renderPage(clamped);
  }, [renderPage]);

  useImperativeHandle(ref, () => ({
    next: () => go(pageRef.current + 1),
    prev: () => go(pageRef.current - 1),
    getToc: () => tocRef.current,
    goToPage: (page: number) => go(page),
    goToHref: (href: string) => {
      if (!href.startsWith('page:')) return;
      const page = Number(href.slice(5));
      if (Number.isFinite(page)) go(page);
    },
    goToFraction: (frac: number) => {
      const total = Math.max(1, numRef.current);
      if (total <= 1) {
        go(1);
        return;
      }
      const page = Math.round(frac * (total - 1)) + 1;
      go(page);
    },
  }), [go]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setRenderedPage(null);
    void (async () => {
      try {
        const up = await loadUpload(bookId, undefined, {
          copyVersion: source.copyVersion,
          format: source.format,
        });
        if (!up) {
          const replacement = await loadUpload(bookId);
          if (!cancelled) {
            onErrorRef.current(
              replacement
                ? COPY_REPLACED_ERROR
                : r().errMissingUpload,
              true,
            );
          }
          return;
        }
        const data = await up.blob.arrayBuffer();
        if (cancelled) return;
        const loadingTask = pdfjs.getDocument({ data });
        loadingTaskRef.current = loadingTask;
        const doc = await loadingTask.promise;
        if (cancelled) return;
        docRef.current = doc;
        numRef.current = doc.numPages;
        try {
          const outline = (await doc.getOutline()) as PdfOutlineNode[] | null;
          const fromOutline = await outlineToToc(doc, outline);
          tocRef.current = fromOutline.length
            ? fromOutline
            : pageChunkToc(doc.numPages, (n) => r().tocPage(n));
        } catch {
          tocRef.current = pageChunkToc(doc.numPages, (n) => r().tocPage(n));
        }
        const restored = initial?.page ?? 1;
        pageRef.current = Math.max(
          1,
          Math.min(doc.numPages, Number.isFinite(restored) ? Math.round(restored) : 1),
        );
        await renderPage(pageRef.current);
      } catch (e) {
        if (cancelled) return;
        const name = (e as { name?: string })?.name;
        if (name === 'PasswordException')
          onErrorRef.current(r().errProtected);
        else onErrorRef.current(r().errOpenPdf);
      } finally {
        if (!cancelled && !docRef.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      renderGenerationRef.current += 1;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      docRef.current = null;
      tocRef.current = [];
      const loadingTask = loadingTaskRef.current;
      loadingTaskRef.current = null;
      if (loadingTask) void loadingTask.destroy().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, source, renderPage]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let lastWidth = container.clientWidth;
    let lastPixelRatio = window.devicePixelRatio || 1;

    const queueRender = () => {
      if (!docRef.current || resizeFrameRef.current !== null) return;
      resizeFrameRef.current = window.requestAnimationFrame(() => {
        resizeFrameRef.current = null;
        void renderPage(pageRef.current);
      });
    };
    const handleResize = () => {
      const width = container.clientWidth;
      const pixelRatio = window.devicePixelRatio || 1;
      if (Math.abs(width - lastWidth) < 0.5 && pixelRatio === lastPixelRatio) return;
      lastWidth = width;
      lastPixelRatio = pixelRatio;
      queueRender();
    };
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(handleResize);
    observer?.observe(container);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', queueRender);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', queueRender);
      if (resizeFrameRef.current !== null) {
        window.cancelAnimationFrame(resizeFrameRef.current);
        resizeFrameRef.current = null;
      }
    };
  }, [renderPage]);

  return (
    <div
      ref={containerRef}
      className="pdf-reader"
      aria-busy={loading}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
        padding: '24px 12px 44px',
        boxSizing: 'border-box',
        background: 'var(--reader-paper)',
      }}
    >
      {loading && (
        <div
          className="pdf-reader-loading"
          role="status"
          style={{
            position: 'absolute',
            zIndex: 1,
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '5px 9px',
            borderRadius: 999,
            background: 'rgba(36,27,14,.78)',
            color: '#fff',
            font: '600 11px/1.2 system-ui, sans-serif',
            pointerEvents: 'none',
          }}
        >
          {r().loadingPage}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="pdf-reader-canvas"
        aria-label={renderedPage
          ? `PDF page ${renderedPage} of ${numRef.current}`
          : 'PDF page'}
        style={{
          maxWidth: '100%',
          height: 'auto',
          alignSelf: 'flex-start',
          boxShadow: '0 2px 12px rgba(0,0,0,.15)',
          mixBlendMode: 'multiply',
        }}
      />
    </div>
  );
});
