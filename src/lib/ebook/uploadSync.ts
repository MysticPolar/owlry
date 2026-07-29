/* ============================================================
   owlry — retry queue for private uploaded copies.

   Upload bytes remain in the signed-in owner's IndexedDB cache. A tiny
   account-scoped manifest records only which copy still needs to reach the
   private Supabase bucket, so a transient failure can retry on startup or
   reconnect without asking the reader to choose the file again.
   ============================================================ */
import type { EbookOwner } from './storage';
import {
  getPendingUploadSync,
  getEbookStorageOwner,
  listPendingUploadSyncs,
  loadUpload,
  markUploadSynced,
} from './storage';
import { pushCopy, type PushCopyOutcome } from './cloudCopy';
import type { BookRef } from '../../content/types';

const running = new Map<string, Promise<number>>();
const runningBooks = new Map<string, Promise<PushCopyOutcome | null>>();
const retryTimers = new Map<string, number>();
const retryAttempts = new Map<string, number>();
const BASE_RETRY_MS = 10_000;
const MAX_RETRY_MS = 5 * 60_000;

const bookRunKey = (owner: EbookOwner, bookId: BookRef): string => `${owner}\n${bookId}`;

/**
 * Sync the newest queued version of one book. Calls for the same owner/book
 * share a lock, so an older upload can never clean up formats or clear the
 * manifest underneath a newer replacement.
 */
export function syncPendingCopy(
  owner: EbookOwner,
  bookId: BookRef,
): Promise<PushCopyOutcome | null> {
  if (owner === 'guest') return Promise.resolve(null);
  const key = bookRunKey(owner, bookId);
  const inFlight = runningBooks.get(key);
  if (inFlight) return inFlight;

  const run = async (): Promise<PushCopyOutcome | null> => {
    let lastOutcome: PushCopyOutcome | null = null;
    while (getEbookStorageOwner() === owner) {
      const pending = await getPendingUploadSync(bookId, owner);
      if (!pending) return lastOutcome;

      const upload = await loadUpload(bookId, owner);
      if (!upload) {
        await markUploadSynced(bookId, owner, pending.version);
        continue;
      }

      // A replacement may have landed while the blob was loading. Start again
      // so the manifest, bytes, and format all describe the same version.
      const latest = await getPendingUploadSync(bookId, owner);
      if (!latest || latest.version !== pending.version) continue;
      if (
        upload.source.copyVersion !== pending.version
        || upload.source.format !== pending.format
      ) {
        // Never publish a blob under a manifest/version that describes another
        // local selection. Keep the pending marker so a later recovery can
        // retry; clearing it here would silently lose the intended copy.
        throw new Error('The queued ebook copy no longer matches its local bytes.');
      }

      const outcome = await pushCopy(
        bookId,
        upload.blob,
        upload.source.format,
        owner,
        pending.version,
        pending.queuedAt,
        upload.source.copyFingerprint,
        {
          title: upload.source.title,
          author: upload.source.author,
        },
      );
      if (outcome.status === 'skipped') return outcome;
      await markUploadSynced(bookId, owner, pending.version);
      lastOutcome = outcome;
      // Loop once more: a replacement queued during the network request must
      // be uploaded before this lock is released.
    }
    return lastOutcome;
  };
  let task: Promise<PushCopyOutcome | null>;
  task = run().then(
    async (outcome) => {
      if (runningBooks.get(key) === task) runningBooks.delete(key);
      // Close the tiny gap where a replacement can be queued after the loop's
      // final read but before this promise settles.
      if (
        outcome?.status !== 'skipped'
        && getEbookStorageOwner() === owner
        && await getPendingUploadSync(bookId, owner)
      ) return syncPendingCopy(owner, bookId);
      return outcome;
    },
    (error: unknown) => {
      if (runningBooks.get(key) === task) runningBooks.delete(key);
      throw error;
    },
  );
  runningBooks.set(key, task);
  return task;
}

/** Returns the number of copies still pending after this pass. */
export function retryPendingCopies(owner: EbookOwner = getEbookStorageOwner()): Promise<number> {
  if (owner === 'guest') return Promise.resolve(0);
  const inFlight = running.get(owner);
  if (inFlight) return inFlight;

  const task = (async () => {
    try {
      const pending = await listPendingUploadSyncs(owner);
      let remaining = 0;
      for (const item of pending) {
        // The account may have changed while IndexedDB was being read. The
        // expected-user guard in pushCopy is a second privacy boundary.
        if (getEbookStorageOwner() !== owner) {
          remaining += 1;
          continue;
        }
        try {
          await syncPendingCopy(owner, item.bookId);
          if (await getPendingUploadSync(item.bookId, owner)) remaining += 1;
        } catch {
          remaining += 1;
        }
      }
      return remaining;
    } catch {
      // IndexedDB can be temporarily unavailable (private mode/quota/upgrade).
      // Keep the backoff alive rather than producing an unhandled rejection.
      return 1;
    }
  })().finally(() => {
    running.delete(owner);
  });
  running.set(owner, task);
  return task;
}

/** Keep retrying while the account remains active, with bounded backoff. */
export function schedulePendingCopyRetry(owner: EbookOwner): void {
  if (
    typeof window === 'undefined'
    || owner === 'guest'
    || getEbookStorageOwner() !== owner
    || retryTimers.has(owner)
  ) return;
  const attempt = retryAttempts.get(owner) ?? 0;
  const delay = Math.min(MAX_RETRY_MS, BASE_RETRY_MS * (2 ** Math.min(attempt, 8)));
  const timer = window.setTimeout(() => {
    retryTimers.delete(owner);
    if (getEbookStorageOwner() !== owner) {
      retryAttempts.delete(owner);
      return;
    }
    void retryPendingCopies(owner).then((remaining) => {
      if (remaining > 0) {
        retryAttempts.set(owner, attempt + 1);
        schedulePendingCopyRetry(owner);
      } else {
        retryAttempts.delete(owner);
      }
    });
  }, delay);
  retryTimers.set(owner, timer);
}

/** Retry immediately (startup/reconnect), then arm backoff if needed. */
export async function retryPendingCopiesNow(owner: EbookOwner): Promise<number> {
  if (
    typeof window === 'undefined'
    || owner === 'guest'
    || getEbookStorageOwner() !== owner
  ) return 0;
  const timer = retryTimers.get(owner);
  if (timer !== undefined) window.clearTimeout(timer);
  retryTimers.delete(owner);
  retryAttempts.set(owner, 0);
  const remaining = await retryPendingCopies(owner);
  if (remaining > 0) schedulePendingCopyRetry(owner);
  else retryAttempts.delete(owner);
  return remaining;
}
