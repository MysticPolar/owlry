/* PDF rendering via pdf.js. Uploaded (local) files only — the public-domain
   resolver returns EPUB. Password/DRM-protected PDFs are caught and refused. */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { loadUpload } from '../../lib/ebook/storage';
import type { EngineHandle, EngineProps } from './shared';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export const PdfView = forwardRef<EngineHandle, EngineProps>(function PdfView(
  { bookId, source, initial, onProgress, onError },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const pageRef = useRef<number>(initial?.page ?? 1);
  const numRef = useRef<number>(1);
  const [, force] = useState(0);

  const renderPage = async (n: number) => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;
    const page = await doc.getPage(n);
    const parent = canvas.parentElement;
    const targetW = parent ? parent.clientWidth - 24 : 360;
    const base = page.getViewport({ scale: 1 });
    const scale = Math.max(0.2, targetW / base.width);
    const viewport = page.getViewport({ scale });
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const num = numRef.current;
    onProgress({ percent: num > 1 ? ((n - 1) / (num - 1)) * 100 : 100, page: n, pageTotal: num });
  };

  const go = (n: number) => {
    const clamped = Math.max(1, Math.min(numRef.current, n));
    pageRef.current = clamped;
    force((x) => x + 1);
    void renderPage(clamped);
  };

  useImperativeHandle(ref, () => ({
    next: () => go(pageRef.current + 1),
    prev: () => go(pageRef.current - 1),
  }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const up = await loadUpload(bookId);
        if (!up) return onError('Your uploaded file is missing — please upload it again.', true);
        const data = await up.blob.arrayBuffer();
        if (cancelled) return;
        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) {
          void (doc as unknown as { destroy?: () => void }).destroy?.();
          return;
        }
        docRef.current = doc;
        numRef.current = doc.numPages;
        await renderPage(pageRef.current);
      } catch (e) {
        const name = (e as { name?: string })?.name;
        if (name === 'PasswordException')
          onError('This file is copy-protected and can’t be opened. Try a DRM-free EPUB.');
        else onError('We couldn’t open this PDF.');
      }
    })();
    return () => {
      cancelled = true;
      try {
        void (docRef.current as unknown as { destroy?: () => void })?.destroy?.();
      } catch {
        /* ignore */
      }
      docRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, source]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        display: 'flex',
        justifyContent: 'center',
        padding: '24px 12px 44px',
        boxSizing: 'border-box',
        background: 'var(--reader-paper)',
      }}
    >
      <canvas
        ref={canvasRef}
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
