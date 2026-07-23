import { useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import { getBook } from '../../lib/bookRegistry';
import { inspectFile, ACCEPT_ATTR } from '../../lib/ebook/inspect';
import { saveUpload } from '../../lib/ebook/storage';
import type { ReadingSource } from '../../lib/ebook/types';
import { useT } from '../../i18n/react';
import { Icon } from '../Icon';

/**
 * File-picker modal. Inspects the file client-side (format + DRM), stores the
 * bytes in IndexedDB on THIS device, and hands the reader a local source. The
 * file itself is never uploaded to our server.
 */
export function UploadModal() {
  const open = useStore((s) => s.ebook.uploadOpen);
  const bookId = useStore((s) => s.ebook.bookId);
  const close = useStore((s) => s.closeUpload);
  const setSource = useStore((s) => s.setUploadedSource);

  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useT().settings.upload;

  if (!open || !bookId) return null;
  const b = getBook(bookId);
  if (!b) return null;

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const check = await inspectFile(file);
      if (!check.ok || !check.format) {
        setError(check.reason ?? t.errUnreadable);
        return;
      }
      const source: ReadingSource = {
        kind: 'local',
        format: check.format,
        title: b.t,
        author: b.a,
        sourceLabel: t.sourceLabel,
      };
      await saveUpload(bookId, file, source);
      setSource(bookId, source);
    } catch {
      setError(t.errGeneric);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.ariaDialog}
      onClick={close}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(20,18,12,.55)',
      }}
    >
      <div
        className="pcard pb-upload"
        style={{ width: '88%', maxWidth: 360 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="l-sec" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
          {t.title}
        </div>
        <p className="l-p">{t.body}</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          style={{ display: 'none' }}
          onChange={(e) => void onFile(e.target.files?.[0])}
        />
        <div className="l-btnrow">
          <button className="btn" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? t.busy : t.choose} <Icon name="ti-upload" />
          </button>
          <button className="btn ghost" onClick={close}>
            {t.cancel}
          </button>
        </div>
        {error && (
          <p className="l-p pb-upload-err" role="status" aria-live="polite" style={{ fontWeight: 600 }}>
            {error}
          </p>
        )}
        <p className="l-p" style={{ color: 'var(--fade)', fontSize: 12 }}>
          {t.drmNote}
        </p>
      </div>
    </div>
  );
}
