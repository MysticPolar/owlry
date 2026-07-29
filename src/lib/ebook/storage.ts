/* ============================================================
   owlry — owner-scoped ebook cache.

   Guests get an in-memory reading session: their bytes and exact position
   disappear with the tab and never enter persistent browser storage. Signed-in
   readers get an account-scoped IndexedDB cache for offline reopening; the
   private cloud mirror is handled separately by cloudCopy.ts.

   Keeping the owner in every durable key is a privacy boundary. A guest or a
   second account using the same browser must never discover the previous
   reader's uploaded bytes or resume position.
   ============================================================ */
import { createStore, delMany, get, getMany, keys } from 'idb-keyval';
import type { BookRef } from '../../content/types';
import type { EbookFormat, ReadingPosition, ReadingSource } from './types';
import {
  fingerprintEbookCopy,
  normalizeCopyFingerprint,
} from './fingerprint';
import { compareReadingPositionWrites } from './positionOrder';

export type EbookOwner = 'guest' | string;

let activeOwner: EbookOwner = 'guest';
const guestUploads = new Map<BookRef, { blob: Blob; source: ReadingSource }>();
const guestPositions = new Map<BookRef, ReadingPosition>();

const ownerKey = (owner: EbookOwner): string => encodeURIComponent(owner);
const bookKey = (id: BookRef): string => encodeURIComponent(id);
const blobKey = (owner: EbookOwner, id: BookRef) => `owlry/ebook/v2/${ownerKey(owner)}/blob/${bookKey(id)}`;
const metaKey = (owner: EbookOwner, id: BookRef) => `owlry/ebook/v2/${ownerKey(owner)}/meta/${bookKey(id)}`;
const posKey = (owner: EbookOwner, id: BookRef) => `owlry/ebook/v2/${ownerKey(owner)}/pos/${bookKey(id)}`;
const stageBlobKey = (owner: EbookOwner, id: BookRef) => `owlry/ebook/v2/${ownerKey(owner)}/stage-blob/${bookKey(id)}`;
const stageMetaKey = (owner: EbookOwner, id: BookRef) => `owlry/ebook/v2/${ownerKey(owner)}/stage-meta/${bookKey(id)}`;
const syncPrefix = (owner: EbookOwner) => `owlry/ebook/v2/${ownerKey(owner)}/sync/`;
const syncKey = (owner: EbookOwner, id: BookRef) => `${syncPrefix(owner)}${bookKey(id)}`;
const LEGACY_PREFIXES = [
  'owlry/ebook/blob/',
  'owlry/ebook/meta/',
  'owlry/ebook/pos/',
] as const;
const EBOOK_FORMATS = new Set<EbookFormat>(['epub', 'pdf', 'txt', 'fb2', 'mobi', 'azw3']);
const ebookKeyvalStore = createStore('keyval-store', 'keyval');

const storedSource = (source: ReadingSource): ReadingSource => {
  const copyFingerprint = normalizeCopyFingerprint(source.copyFingerprint);
  const safe = { ...source, url: undefined };
  if (copyFingerprint) safe.copyFingerprint = copyFingerprint;
  else delete safe.copyFingerprint;
  return safe;
};

const fingerprintBlob = async (blob: Blob): Promise<string | undefined> => {
  try {
    return await fingerprintEbookCopy(blob);
  } catch {
    // Older browsers/private contexts may not expose Web Crypto. The exact
    // copyVersion fence still provides the same safe legacy behavior.
    return undefined;
  }
};

const runEbookTransaction = (
  mutate: (store: IDBObjectStore) => void,
): Promise<void> => ebookKeyvalStore('readwrite', (store) => new Promise<void>((resolve, reject) => {
  const transaction = store.transaction;
  transaction.oncomplete = () => resolve();
  transaction.onabort = transaction.onerror = () => reject(transaction.error);
  try {
    mutate(store);
  } catch (error) {
    transaction.abort();
    reject(error);
  }
}));

export interface PendingUploadSync {
  bookId: BookRef;
  format: EbookFormat;
  queuedAt: number;
  version: string;
}

interface StagedCloudRefresh {
  source: ReadingSource;
  expectedCopyVersion: string | undefined;
  /** True only after the old copy's final exact anchor reached IndexedDB. */
  readyToPromote: boolean;
}

const normalizeStagedCloudRefresh = (value: unknown): StagedCloudRefresh | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const staged = value as Partial<StagedCloudRefresh>;
  if (
    !staged.source
    || typeof staged.source !== 'object'
    || !EBOOK_FORMATS.has(staged.source.format as EbookFormat)
    || typeof staged.source.title !== 'string'
    || typeof staged.source.author !== 'string'
    || typeof staged.source.sourceLabel !== 'string'
  ) return null;
  return {
    source: storedSource(staged.source as ReadingSource),
    expectedCopyVersion: typeof staged.expectedCopyVersion === 'string'
      ? staged.expectedCopyVersion
      : undefined,
    readyToPromote: staged.readyToPromote === true,
  };
};

export const createEbookCopyVersion = (selectedAt = Date.now()): string => {
  const order = Math.max(1, Math.floor(selectedAt));
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${order}-${crypto.randomUUID()}`;
  }
  return `${order}-${Math.random().toString(36).slice(2)}`;
};

const normalizePendingUpload = (value: unknown): PendingUploadSync | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const pending = value as Partial<PendingUploadSync>;
  if (
    typeof pending.bookId !== 'string'
    || !EBOOK_FORMATS.has(pending.format as EbookFormat)
    || typeof pending.queuedAt !== 'number'
    || !Number.isFinite(pending.queuedAt)
  ) return null;
  return {
    bookId: pending.bookId as BookRef,
    format: pending.format as EbookFormat,
    queuedAt: pending.queuedAt,
    version: typeof pending.version === 'string' && pending.version
      ? pending.version
      : `legacy-${pending.queuedAt}`,
  };
};

/** Switch the local cache namespace before any owner-bound reader work begins. */
export function setEbookStorageOwner(owner: EbookOwner): void {
  activeOwner = owner;
}

export function getEbookStorageOwner(): EbookOwner {
  return activeOwner;
}

/** Explicit cleanup for tests and for any future "clear guest session" action. */
export function clearGuestEbookSession(): void {
  guestUploads.clear();
  guestPositions.clear();
}

/**
 * Pre-v2 uploads were stored without an owner namespace, including for guests.
 * They cannot be assigned safely to an account, so remove them during upgrade
 * instead of leaving old book bytes behind the new session-only boundary.
 */
export async function purgeLegacyEbookStorage(): Promise<number> {
  const legacyKeys = (await keys()).filter(
    (key) => typeof key === 'string' && LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix)),
  );
  if (legacyKeys.length) await delMany(legacyKeys);
  return legacyKeys.length;
}

/** Store an uploaded file in the current owner's cache. Guests stay memory-only. */
export async function saveUpload(
  id: BookRef,
  blob: Blob,
  source: ReadingSource,
  options: {
    queueCloudSync?: boolean;
    owner?: EbookOwner;
    resetPosition?: boolean;
  } = {},
): Promise<PendingUploadSync | null> {
  const owner = options.owner ?? activeOwner;
  const copySelectedAt =
    typeof source.copySelectedAt === 'number'
    && Number.isFinite(source.copySelectedAt)
    && source.copySelectedAt > 0
      ? source.copySelectedAt
      : Date.now();
  const copyFingerprint = normalizeCopyFingerprint(source.copyFingerprint);
  const safeSource = {
    ...source,
    url: undefined,
    copyVersion: source.copyVersion ?? createEbookCopyVersion(copySelectedAt),
    copySelectedAt,
  };
  if (copyFingerprint) safeSource.copyFingerprint = copyFingerprint;
  else delete safeSource.copyFingerprint;
  if (owner === 'guest') {
    guestUploads.set(id, { blob, source: safeSource });
    if (options.resetPosition) guestPositions.delete(id);
    return null;
  }
  const pending = options.queueCloudSync
    ? {
        bookId: id,
        format: source.format,
        queuedAt: safeSource.copySelectedAt,
        version: safeSource.copyVersion,
      } satisfies PendingUploadSync
    : null;
  const entries: [IDBValidKey, unknown][] = [
    [blobKey(owner, id), blob],
    [metaKey(owner, id), safeSource],
  ];
  if (pending) entries.push([syncKey(owner, id), pending]);
  // A replacement and its reset resume anchor are one durable commit. If the
  // account changes while IndexedDB is working, the captured owner's new bytes
  // can never reopen at an anchor from the previous file.
  await runEbookTransaction((store) => {
    for (const [key, value] of entries) store.put(value, key);
    // A reader-selected replacement always outranks a downloaded cloud stage.
    store.delete(stageBlobKey(owner, id));
    store.delete(stageMetaKey(owner, id));
    if (options.resetPosition) store.delete(posKey(owner, id));
  });
  return pending;
}

export async function loadUpload(
  id: BookRef,
  owner: EbookOwner = activeOwner,
  expected?: Pick<ReadingSource, 'copyVersion' | 'format'>,
): Promise<{ blob: Blob; source: ReadingSource } | null> {
  if (owner === 'guest') {
    const upload = guestUploads.get(id) ?? null;
    if (
      upload
      && expected
      && (
        upload.source.copyVersion !== expected.copyVersion
        || upload.source.format !== expected.format
      )
    ) return null;
    if (!upload) return null;
    const safeSource = storedSource(upload.source);
    if (safeSource.copyFingerprint) {
      return { blob: upload.blob, source: safeSource };
    }
    const copyFingerprint = await fingerprintBlob(upload.blob);
    if (!copyFingerprint) return { blob: upload.blob, source: safeSource };
    const backfilledSource = { ...safeSource, copyFingerprint };
    const current = guestUploads.get(id);
    if (
      current
      && current.source.copyVersion === safeSource.copyVersion
      && current.source.format === safeSource.format
    ) {
      guestUploads.set(id, {
        blob: current.blob,
        source: storedSource({ ...current.source, copyFingerprint }),
      });
    }
    return { blob: upload.blob, source: backfilledSource };
  }
  const [blob, source] = await getMany([
    blobKey(owner, id),
    metaKey(owner, id),
  ]) as [Blob | undefined, ReadingSource | undefined];
  if (!blob || !source) return null;
  if (
    expected
    && (
      source.copyVersion !== expected.copyVersion
      || source.format !== expected.format
    )
  ) return null;
  const safeSource = storedSource(source);
  if (safeSource.copyFingerprint) return { blob, source: safeSource };
  const copyFingerprint = await fingerprintBlob(blob);
  if (!copyFingerprint) return { blob, source: safeSource };

  // Hashing can take long enough for another tab to select a replacement.
  // Compare and write in one transaction so this legacy backfill can never
  // attach the old bytes' identity to newer metadata.
  try {
    await runEbookTransaction((store) => {
      const request = store.get(metaKey(owner, id));
      request.onsuccess = () => {
        const current = request.result as ReadingSource | undefined;
        if (
          !current
          || current.copyVersion !== safeSource.copyVersion
          || current.format !== safeSource.format
          || normalizeCopyFingerprint(current.copyFingerprint)
        ) return;
        store.put(
          storedSource({ ...current, copyFingerprint }),
          metaKey(owner, id),
        );
      };
    });
  } catch {
    // The computed identity is still useful for this open. A quota/private-mode
    // failure to backfill metadata must not turn a readable legacy book into an
    // error; a later load can try again.
  }
  return {
    blob,
    source: { ...safeSource, copyFingerprint },
  };
}

/**
 * Read only an upload's small metadata record. Account upgrades use this to
 * restore a legacy open-world shelf entry without loading, hashing, or parsing
 * the copyrighted book bytes.
 */
export async function loadUploadSource(
  id: BookRef,
  owner: EbookOwner = activeOwner,
): Promise<ReadingSource | null> {
  if (owner === 'guest') {
    const source = guestUploads.get(id)?.source;
    return source ? storedSource(source) : null;
  }
  const source = await get<ReadingSource>(metaKey(owner, id));
  return source ? storedSource(source) : null;
}

/**
 * Replace an account cache with a cloud copy only if the upload we compared
 * against is still current and no local copy is waiting to sync.
 *
 * The metadata check, pending check, and writes share one read-write
 * transaction. A file selected while a cloud download is in flight therefore
 * wins atomically; the refresh cannot overwrite its bytes or version marker.
 */
export async function saveCloudRefreshIfCurrent(
  id: BookRef,
  blob: Blob,
  source: ReadingSource,
  owner: EbookOwner,
  expectedCopyVersion: string | undefined,
): Promise<boolean> {
  if (owner === 'guest') return false;
  let saved = false;
  const safeSource = storedSource(source);
  await runEbookTransaction((store) => {
    const metaRequest = store.get(metaKey(owner, id));
    metaRequest.onsuccess = () => {
      const currentVersion = (metaRequest.result as ReadingSource | undefined)?.copyVersion;
      if (currentVersion !== expectedCopyVersion) return;
      const pendingRequest = store.get(syncKey(owner, id));
      pendingRequest.onsuccess = () => {
        if (normalizePendingUpload(pendingRequest.result)) return;
        store.put(blob, blobKey(owner, id));
        store.put(safeSource, metaKey(owner, id));
        saved = true;
      };
    };
  });
  return saved;
}

/**
 * Downloaded cloud bytes are staged durably without changing the live cache.
 * This survives a hard reload while keeping the currently rendered engine and
 * its version-fenced resume anchor coherent.
 */
export async function stageCloudRefreshIfCurrent(
  id: BookRef,
  blob: Blob,
  source: ReadingSource,
  owner: EbookOwner,
  expectedCopyVersion: string | undefined,
): Promise<boolean> {
  if (owner === 'guest') return false;
  let staged = false;
  const safeSource = storedSource(source);
  await runEbookTransaction((store) => {
    const metaRequest = store.get(metaKey(owner, id));
    metaRequest.onsuccess = () => {
      const currentVersion = (metaRequest.result as ReadingSource | undefined)?.copyVersion;
      if (currentVersion !== expectedCopyVersion) return;
      const pendingRequest = store.get(syncKey(owner, id));
      pendingRequest.onsuccess = () => {
        if (normalizePendingUpload(pendingRequest.result)) return;
        store.put(blob, stageBlobKey(owner, id));
        store.put({
          source: safeSource,
          expectedCopyVersion,
          readyToPromote: false,
        } satisfies StagedCloudRefresh, stageMetaKey(owner, id));
        staged = true;
      };
    };
  });
  return staged;
}

/** Fence a durable stage behind the old copy's successfully saved last anchor. */
export async function markStagedCloudRefreshReady(
  id: BookRef,
  owner: EbookOwner,
): Promise<boolean> {
  if (owner === 'guest') return false;
  let marked = false;
  await runEbookTransaction((store) => {
    const stageRequest = store.get(stageMetaKey(owner, id));
    stageRequest.onsuccess = () => {
      const staged = normalizeStagedCloudRefresh(stageRequest.result);
      if (!staged) return;
      const metaRequest = store.get(metaKey(owner, id));
      metaRequest.onsuccess = () => {
        const currentVersion = (metaRequest.result as ReadingSource | undefined)?.copyVersion;
        if (currentVersion !== staged.expectedCopyVersion) {
          store.delete(stageBlobKey(owner, id));
          store.delete(stageMetaKey(owner, id));
          return;
        }
        store.put(
          { ...staged, readyToPromote: true } satisfies StagedCloudRefresh,
          stageMetaKey(owner, id),
        );
        marked = true;
      };
    };
  });
  return marked;
}

/**
 * Atomically promote only a stage whose old-copy anchor has been fenced. A
 * local pending upload or intervening replacement wins and discards the stage.
 */
export async function promoteReadyCloudRefresh(
  id: BookRef,
  owner: EbookOwner,
): Promise<boolean> {
  if (owner === 'guest') return false;
  let promoted = false;
  await runEbookTransaction((store) => {
    const stageRequest = store.get(stageMetaKey(owner, id));
    stageRequest.onsuccess = () => {
      const staged = normalizeStagedCloudRefresh(stageRequest.result);
      if (!staged?.readyToPromote) return;
      const blobRequest = store.get(stageBlobKey(owner, id));
      blobRequest.onsuccess = () => {
        const stagedBlob = blobRequest.result;
        if (!(stagedBlob instanceof Blob)) return;
        const metaRequest = store.get(metaKey(owner, id));
        metaRequest.onsuccess = () => {
          const currentVersion = (metaRequest.result as ReadingSource | undefined)?.copyVersion;
          if (currentVersion !== staged.expectedCopyVersion) {
            store.delete(stageBlobKey(owner, id));
            store.delete(stageMetaKey(owner, id));
            return;
          }
          const pendingRequest = store.get(syncKey(owner, id));
          pendingRequest.onsuccess = () => {
            if (normalizePendingUpload(pendingRequest.result)) {
              store.delete(stageBlobKey(owner, id));
              store.delete(stageMetaKey(owner, id));
              return;
            }
            store.put(stagedBlob, blobKey(owner, id));
            store.put(staged.source, metaKey(owner, id));
            store.delete(posKey(owner, id));
            store.delete(stageBlobKey(owner, id));
            store.delete(stageMetaKey(owner, id));
            promoted = true;
          };
        };
      };
    };
  });
  return promoted;
}

export async function hasUpload(id: BookRef): Promise<boolean> {
  const owner = activeOwner;
  if (owner === 'guest') return guestUploads.has(id);
  return (await get<Blob>(blobKey(owner, id))) != null;
}

export async function removeUpload(id: BookRef): Promise<void> {
  const owner = activeOwner;
  if (owner === 'guest') {
    guestUploads.delete(id);
    guestPositions.delete(id);
    return;
  }
  await delMany([
    blobKey(owner, id),
    metaKey(owner, id),
    posKey(owner, id),
    syncKey(owner, id),
    stageBlobKey(owner, id),
    stageMetaKey(owner, id),
  ]);
}

/** Pending manifests contain no book bytes; they make failed signed-in cloud
    uploads retryable after a reload or network reconnect. */
export async function listPendingUploadSyncs(
  owner: EbookOwner = activeOwner,
): Promise<PendingUploadSync[]> {
  if (owner === 'guest') return [];
  const prefix = syncPrefix(owner);
  const pendingKeys = (await keys()).filter(
    (key): key is string => typeof key === 'string' && key.startsWith(prefix),
  );
  if (!pendingKeys.length) return [];
  const values = await getMany(pendingKeys);
  return values
    .map(normalizePendingUpload)
    .filter((value): value is PendingUploadSync => value !== null);
}

export async function getPendingUploadSync(
  id: BookRef,
  owner: EbookOwner = activeOwner,
): Promise<PendingUploadSync | null> {
  if (owner === 'guest') return null;
  return normalizePendingUpload(await get(syncKey(owner, id)));
}

export async function markUploadSynced(
  id: BookRef,
  owner: EbookOwner = activeOwner,
  version?: string,
): Promise<void> {
  if (owner === 'guest') return;
  if (!version) {
    await delMany([syncKey(owner, id)]);
    return;
  }
  // Compare and delete inside one read-write transaction. A separate get+del
  // could erase a replacement manifest saved between those two operations.
  const key = syncKey(owner, id);
  await runEbookTransaction((store) => {
    const request = store.get(key);
    request.onsuccess = () => {
      if (normalizePendingUpload(request.result)?.version === version) store.delete(key);
    };
  });
}

export async function savePosition(
  pos: ReadingPosition,
  owner: EbookOwner = activeOwner,
): Promise<boolean> {
  if (owner === 'guest') {
    const currentSource = guestUploads.get(pos.bookId)?.source;
    if (
      !currentSource
      || currentSource.copyVersion !== pos.copyVersion
      || currentSource.format !== pos.format
    ) return false;
    const current = guestPositions.get(pos.bookId);
    const sameSlot = (
      current?.bookId === pos.bookId
      && current.format === pos.format
      && current.copyVersion === pos.copyVersion
    );
    if (!sameSlot || compareReadingPositionWrites(pos, current) > 0) {
      guestPositions.set(pos.bookId, pos);
    }
    return true;
  }
  // Serialize against replacement uploads in the same object-store transaction.
  // Whichever starts second sees the other's metadata: a late timer from the old
  // reader can therefore never recreate the deleted old-file anchor.
  let saved = false;
  await runEbookTransaction((store) => {
    const metaRequest = store.get(metaKey(owner, pos.bookId));
    metaRequest.onsuccess = () => {
      const currentSource = metaRequest.result as ReadingSource | undefined;
      if (
        !currentSource
        || currentSource.copyVersion !== pos.copyVersion
        || currentSource.format !== pos.format
      ) return;

      const positionRequest = store.get(posKey(owner, pos.bookId));
      positionRequest.onsuccess = () => {
        const current = positionRequest.result as ReadingPosition | undefined;
        const sameSlot = (
          current?.bookId === pos.bookId
          && current.format === pos.format
          && current.copyVersion === pos.copyVersion
        );
        if (!sameSlot || compareReadingPositionWrites(pos, current) > 0) {
          store.put(pos, posKey(owner, pos.bookId));
        }
        // `true` means the copy-version fence accepted this save. A stale write
        // that correctly loses LWW is still not a copy-replacement failure.
        saved = true;
      };
    };
  });
  return saved;
}

export async function loadPosition(
  id: BookRef,
  owner: EbookOwner = activeOwner,
): Promise<ReadingPosition | null> {
  if (owner === 'guest') return guestPositions.get(id) ?? null;
  return (await get<ReadingPosition>(posKey(owner, id))) ?? null;
}

export async function removePosition(
  id: BookRef,
  owner: EbookOwner = activeOwner,
): Promise<void> {
  if (owner === 'guest') {
    guestPositions.delete(id);
    return;
  }
  await delMany([posKey(owner, id)]);
}
