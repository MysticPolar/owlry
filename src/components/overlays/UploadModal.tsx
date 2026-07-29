import { useRef, useState } from 'react';
import { persistAccountProgressNow, useStore } from '../../store/useStore';
import { useModalFocus } from '../../hooks/useModalFocus';
import { useOverlayPresence } from '../../hooks/useOverlayPresence';
import { getBook } from '../../lib/bookRegistry';
import { inspectFile, preflightFile, ACCEPT_ATTR } from '../../lib/ebook/inspect';
import type { InspectReason } from '../../lib/ebook/types';
import {
  createEbookCopyVersion,
  getPendingUploadSync,
  getEbookStorageOwner,
  saveUpload,
} from '../../lib/ebook/storage';
import {
  schedulePendingCopyRetry,
  syncPendingCopy,
} from '../../lib/ebook/uploadSync';
import { flushActiveReadingPosition } from '../../lib/ebook/activePosition';
import type { ReadingSource } from '../../lib/ebook/types';
import { fingerprintEbookCopy } from '../../lib/ebook/fingerprint';
import { useT } from '../../i18n/react';
import { Icon } from '../Icon';

/**
 * File-picker modal. Inspects the file client-side (format + DRM) and hands the
 * reader a local source. Signed-in readers get an account-scoped offline cache
 * plus a private cloud copy; guest bytes stay in memory for this tab only.
 */
export function UploadModal() {
  const open = useStore((s) => s.ebook.uploadOpen);
  const bookId = useStore((s) => s.ebook.bookId);
  const close = useStore((s) => s.closeUpload);
  const setSource = useStore((s) => s.setUploadedSource);
  const showToast = useStore((s) => s.showToast);

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useT().settings.upload;

  const inspectReason = (reason?: InspectReason): string => {
    switch (reason) {
      case 'empty':
        return t.errEmpty;
      case 'too-large':
        return t.errTooLarge;
      case 'bad-kindle':
        return t.errBadKindle;
      case 'protected':
        return t.errProtected;
      case 'bad-epub':
        return t.errBadEpub;
      case 'bad-pdf':
        return t.errBadPdf;
      case 'bad-readable-pdf':
        return t.errBadReadablePdf;
      case 'bad-fb2':
        return t.errBadFb2;
      case 'unsupported':
        return t.errUnsupported;
      default:
        return t.errUnreadable;
    }
  };

  // fade both ways (centered dialog — a fade is its natural path); latch the id
  const { mounted, shown } = useOverlayPresence(open && !!bookId, { ref: dialogRef, duration: 220 });
  const heldId = useRef(bookId);
  if (bookId) heldId.current = bookId;
  const effectiveId = bookId ?? (mounted ? heldId.current : null);

  const closeWhenIdle = () => {
    if (!busy) close();
  };

  useModalFocus(open && !!bookId && mounted, closeWhenIdle, dialogRef);

  if (!mounted || !effectiveId) return null;
  const b = getBook(effectiveId);
  if (!b) return null;

  const onFile = async (file?: File) => {
    if (!file) return;
    // Capture intent when the reader chooses the file, not after a slow EPUB/PDF
    // inspection. This preserves same-device replacement order.
    const copySelectedAt = Date.now();
    const storageOwner = getEbookStorageOwner();
    const authOwner = useStore.getState().authUser?.id ?? null;
    const ownerIsStable = (
      (storageOwner === 'guest' && authOwner === null)
      || (storageOwner !== 'guest' && storageOwner === authOwner)
    );
    if (!ownerIsStable) {
      setError(t.errAccountChanged);
      return;
    }
    const signedOwner = storageOwner === 'guest' ? null : storageOwner;
    const accountIsCurrent = () => (
      getEbookStorageOwner() === storageOwner
      && (useStore.getState().authUser?.id ?? null) === authOwner
    );
    const operationIsCurrent = () => (
      accountIsCurrent()
      && useStore.getState().ebook.bookId === effectiveId
    );
    const stopIfAccountChanged = () => {
      if (operationIsCurrent()) return false;
      if (useStore.getState().ebook.uploadOpen) setError(t.errAccountChanged);
      return true;
    };

    setBusy(true);
    setError(null);
    try {
      const preflight = preflightFile(file);
      if (preflight === 'empty') {
        setError(t.errEmpty);
        return;
      }
      if (preflight === 'too-large') {
        setError(t.errTooLarge);
        return;
      }

      const check = await inspectFile(file);
      if (stopIfAccountChanged()) return;
      if (!check.ok || !check.format) {
        setError(inspectReason(check.reason));
        return;
      }
      const copyFingerprint = await fingerprintEbookCopy(file);
      if (stopIfAccountChanged()) return;
      const source: ReadingSource = {
        kind: 'local',
        format: check.format,
        title: b.t,
        author: b.a,
        sourceLabel: t.sourceLabel,
        copyVersion: createEbookCopyVersion(copySelectedAt),
        copyFingerprint,
        copySelectedAt,
      };
      // The old copy may have a position waiting in the 500ms debounce. Commit
      // that exact anchor before the atomic replacement changes the version
      // fence, otherwise the old reader's final turn can be discarded.
      await flushActiveReadingPosition(storageOwner);
      if (stopIfAccountChanged()) return;
      if (signedOwner) {
        await persistAccountProgressNow(signedOwner);
        if (stopIfAccountChanged()) return;
      }
      await saveUpload(effectiveId, file, source, {
        owner: storageOwner,
        queueCloudSync: !!signedOwner,
        resetPosition: true,
      });
      if (stopIfAccountChanged()) return;
      // Local success is the reading gate. Start immediately; cloud work
      // continues after the modal closes and reports its own outcome.
      setSource(effectiveId, source);
      showToast('ti-book-2', t.localReady, 'keeper');

      if (!signedOwner) {
        showToast('ti-lock', t.localOnly, 'keeper');
        return;
      }

      try {
        const cloud = await syncPendingCopy(signedOwner, effectiveId);
        const stillPending = await getPendingUploadSync(effectiveId, signedOwner);
        // Retry belongs to the captured account, not to this modal. Closing or
        // switching books must not strand an otherwise valid pending copy.
        if (!accountIsCurrent()) return;
        if (!cloud || cloud.status === 'skipped' || stillPending) {
          schedulePendingCopyRetry(signedOwner);
          if (operationIsCurrent()) showToast('ti-lock', t.cloudFailed, 'keeper');
        } else if (operationIsCurrent()) {
          showToast('ti-cloud', t.cloudSynced, 'keeper');
        }
      } catch {
        if (accountIsCurrent()) {
          schedulePendingCopyRetry(signedOwner);
          if (operationIsCurrent()) showToast('ti-wifi', t.cloudFailed, 'keeper');
        }
      }
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
      aria-busy={busy}
      onClick={closeWhenIdle}
      ref={dialogRef}
      tabIndex={-1}
      className={`pb-upload-scrim${shown ? ' on' : ''}`}
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
          disabled={busy}
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = '';
            void onFile(file);
          }}
        />
        <div className="l-btnrow">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? t.busy : t.choose} <Icon name="ti-upload" />
          </button>
          <button type="button" className="btn ghost" disabled={busy} onClick={closeWhenIdle}>
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
