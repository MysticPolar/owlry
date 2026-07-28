/* ============================================================
   owlry — cross-device copies of uploaded books.

   Signed in, an upload is mirrored to the reader's PRIVATE folder
   in the `owlry-uploads` bucket (immutable path
   <uid>/<bookId>/<version>.<format>, owner-only RLS — see the
   20260728150000 migration). Other devices pull the most recently updated
   version and cache it back into IndexedDB. Immutable paths prevent concurrent
   devices from overwriting or erasing one another's completed copy. A root
   compatibility mirror remains readable by already-installed pre-version PWAs;
   pulls compare that mirror with immutable candidates during the rollout.
   Guests stay device-only. Pushes explicitly report a skipped or
   synced outcome; configured-backend failures are thrown so the UI
   can tell the reader that their local copy is ready but cloud sync
   needs attention.
   ============================================================ */
import { supabase } from '../supabase';
import { getBook } from '../bookRegistry';
import type { BookRef } from '../../content/types';
import type { EbookFormat, ReadingSource } from './types';

const BUCKET = 'owlry-uploads';
const FORMATS: EbookFormat[] = ['epub', 'pdf', 'txt', 'fb2', 'mobi', 'azw3'];
const VERSION_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const LIST_PAGE_SIZE = 100;

interface CloudEntry {
  name: string;
  created_at: string | null;
  updated_at: string | null;
  metadata: Record<string, unknown> | null;
}

export type PushCopyOutcome =
  | { status: 'skipped'; reason: 'backend-unavailable' | 'signed-out' }
  | { status: 'synced' };

const uid = async (): Promise<string | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user.id ?? null;
};

const copyPath = (
  userId: string,
  bookId: BookRef,
  version: string,
  format: EbookFormat,
): string => `${userId}/${bookId}/${version}.${format}`;
const legacyCopyPath = (
  userId: string,
  bookId: BookRef,
  format: EbookFormat,
): string => `${userId}/${bookId}.${format}`;

const alreadyExists = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    status?: number;
    statusCode?: string;
    code?: string;
    message?: string;
  };
  return (
    candidate.status === 409
    || candidate.statusCode === '409'
    || candidate.code === '409'
    || candidate.code?.toLowerCase() === 'duplicate'
    || candidate.message?.toLowerCase().includes('already exists') === true
  );
};

const listVersionEntries = async (
  userId: string,
  bookId: BookRef,
): Promise<CloudEntry[]> => {
  if (!supabase) return [];
  const entries: CloudEntry[] = [];
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(`${userId}/${bookId}`, {
        limit: LIST_PAGE_SIZE,
        offset,
        sortBy: { column: 'created_at', order: 'desc' },
      });
    if (error) throw error;
    entries.push(...(data ?? []));
    if (!data || data.length < LIST_PAGE_SIZE) return entries;
  }
};

const selectedAtFromEntry = (
  entry: CloudEntry,
  version: string,
  timestamp: string,
): number => {
  const metadataOrder = Number(entry.metadata?.selectedAt);
  if (Number.isFinite(metadataOrder) && metadataOrder > 0) return metadataOrder;
  // Only versions created by createEbookCopyVersion carry a millisecond prefix.
  // A legacy UUID can begin with digits by chance; treating that fragment as a
  // timestamp would incorrectly bury the copy near 1970.
  const versionOrder = Number(/^(\d{13})-/.exec(version)?.[1]);
  if (Number.isFinite(versionOrder) && versionOrder > 0) return versionOrder;
  const serverOrder = Date.parse(timestamp);
  return Number.isFinite(serverOrder) ? serverOrder : 0;
};

interface CopyOrder {
  selectedAt: number;
  timestamp: string;
  version: string;
}

const compareCopyOrder = (a: CopyOrder, b: CopyOrder): number => (
  a.selectedAt - b.selectedAt
  || a.timestamp.localeCompare(b.timestamp)
  || a.version.localeCompare(b.version)
);

/** One total order shared by cloud listing and local-vs-cloud adoption. */
export const compareCopySelection = (
  a: ReadingSource,
  b: ReadingSource,
): number => compareCopyOrder(
  {
    selectedAt: (
      typeof a.copySelectedAt === 'number'
      && Number.isFinite(a.copySelectedAt)
      && a.copySelectedAt > 0
    ) ? a.copySelectedAt : 0,
    timestamp: a.cloudUpdatedAt ?? '',
    version: a.copyVersion ?? '',
  },
  {
    selectedAt: (
      typeof b.copySelectedAt === 'number'
      && Number.isFinite(b.copySelectedAt)
      && b.copySelectedAt > 0
    ) ? b.copySelectedAt : 0,
    timestamp: b.cloudUpdatedAt ?? '',
    version: b.copyVersion ?? '',
  },
);

/** Mirror an uploaded copy to the signed-in reader's cloud folder. */
export async function pushCopy(
  bookId: BookRef,
  blob: Blob,
  format: EbookFormat,
  expectedUserId?: string,
  version?: string,
  selectedAt?: number,
): Promise<PushCopyOutcome> {
  if (!supabase) return { status: 'skipped', reason: 'backend-unavailable' };
  const user = await uid();
  if (!user) return { status: 'skipped', reason: 'signed-out' };
  if (expectedUserId && user !== expectedUserId) {
    throw new Error('The signed-in account changed before this copy could sync.');
  }
  if (!version || !VERSION_PATTERN.test(version)) {
    throw new Error('This copy is missing a safe upload version.');
  }
  if (
    typeof selectedAt !== 'number'
    || !Number.isFinite(selectedAt)
    || selectedAt <= 0
  ) {
    throw new Error('This copy is missing its selection order.');
  }

  // Each selection gets a create-only immutable path. If the response was lost,
  // a retry sees the same object and is successful without changing its server
  // creation order (or making an older selection look newest again).
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(copyPath(user, bookId, version, format), blob, {
      upsert: false,
      contentType: blob.type || 'application/octet-stream',
      metadata: { selectedAt: String(selectedAt) },
    });
  if (error && !alreadyExists(error)) throw error;

  // Keep pre-version installed PWAs working during rollout. Metadata lets new
  // clients recognize this root object as the same immutable selection instead
  // of treating a retry's later server timestamp as a newer choice.
  const staleLegacy = FORMATS
    .filter((candidate) => candidate !== format)
    .map((candidate) => legacyCopyPath(user, bookId, candidate));
  if (staleLegacy.length) {
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove(staleLegacy);
    if (removeError) throw removeError;
  }
  const { error: mirrorError } = await supabase.storage
    .from(BUCKET)
    .upload(legacyCopyPath(user, bookId, format), blob, {
      upsert: true,
      contentType: blob.type || 'application/octet-stream',
      metadata: {
        selectedAt: String(selectedAt),
        version,
      },
    });
  if (mirrorError) throw mirrorError;
  if (expectedUserId && await uid() !== expectedUserId) {
    throw new Error('The signed-in account changed while this copy was syncing.');
  }

  // Never delete other versions here. A delayed retry on another device may
  // still be preparing to publish one of them.
  return { status: 'synced' };
}

/** Fetch the signed-in reader's cloud copy of a book, if one exists. */
export async function pullCopy(
  bookId: BookRef,
  sourceLabel: string,
  expectedUserId?: string,
): Promise<{ blob: Blob; source: ReadingSource } | null> {
  const user = await uid();
  if (!supabase) return null;
  if (!user) {
    if (expectedUserId) throw new Error('Signed out before this copy could download.');
    return null;
  }
  if (expectedUserId && user !== expectedUserId) {
    throw new Error('The signed-in account changed before this copy could download.');
  }

  const [entries, legacyResult] = await Promise.all([
    listVersionEntries(user, bookId),
    supabase.storage.from(BUCKET).list(user, { search: `${bookId}.` }),
  ]);
  if (legacyResult.error) throw legacyResult.error;
  if (expectedUserId && await uid() !== expectedUserId) {
    throw new Error('The signed-in account changed while this copy was downloading.');
  }
  // Selection order is captured before upload and included in both immutable
  // object metadata and new-version filenames. Thus an older choice that was
  // offline longer cannot supersede a newer choice merely by arriving later.
  // Legacy objects fall back to immutable server creation time.
  const immutableCandidates = entries
    .map((item) => {
      const dot = item.name.lastIndexOf('.');
      const version = item.name.slice(0, dot);
      const format = item.name.slice(dot + 1) as EbookFormat;
      const timestamp = item.created_at ?? item.updated_at ?? '';
      return {
        version,
        format,
        timestamp,
        selectedAt: selectedAtFromEntry(item, version, timestamp),
        path: copyPath(user, bookId, version, format),
      };
    })
    .filter((candidate) => (
      VERSION_PATTERN.test(candidate.version)
      && FORMATS.includes(candidate.format)
    ));
  const immutableVersions = new Set(
    immutableCandidates.map((candidate) => candidate.version),
  );
  const legacyCandidates = (legacyResult.data ?? [])
    .filter((item) => FORMATS.some((format) => item.name === `${bookId}.${format}`))
    .map((item) => {
      const format = item.name.slice(item.name.lastIndexOf('.') + 1) as EbookFormat;
      const timestamp = item.updated_at ?? item.created_at ?? '';
      const metadataVersion = typeof item.metadata?.version === 'string'
        && VERSION_PATTERN.test(item.metadata.version)
        ? item.metadata.version
        : null;
      // A compatibility mirror is mutable. When its immutable twin is listed,
      // always download that twin so a root overwrite between list/download
      // cannot be cached under bytes that no longer match the version label.
      if (metadataVersion && immutableVersions.has(metadataVersion)) return null;
      const version = metadataVersion
        ?? `legacy-${timestamp.replace(/[^A-Za-z0-9_-]/g, '_')}-${format}`;
      return {
        version,
        format,
        timestamp,
        selectedAt: selectedAtFromEntry(item, version, timestamp),
        path: `${user}/${item.name}`,
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);
  const entry = [...immutableCandidates, ...legacyCandidates]
    .sort((a, b) => compareCopyOrder(b, a))[0];
  if (entry) {
    const { data: blob, error } = await supabase.storage
      .from(BUCKET)
      .download(entry.path);
    if (error || !blob) return null;
    if (expectedUserId && await uid() !== expectedUserId) {
      throw new Error('The signed-in account changed while this copy was downloading.');
    }
    const b = getBook(bookId);
    return {
      blob,
      source: {
        kind: 'local',
        format: entry.format,
        title: b?.t ?? bookId,
        author: b?.a ?? '',
        sourceLabel,
        copyVersion: entry.version,
        copySelectedAt: entry.selectedAt,
        cloudUpdatedAt: entry.timestamp,
      },
    };
  }
  return null;
}
