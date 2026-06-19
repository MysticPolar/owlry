/* ============================================================
   owlry — client-only ebook storage.

   Uploaded files live in IndexedDB on THIS device and never leave it. The
   server only ever sees metadata + progress numbers (via the economy RPCs),
   never the bytes. Reading positions are also kept here so the reader resumes
   exactly where the user left off.
   ============================================================ */
import { get, set, del } from 'idb-keyval';
import type { BookId } from '../../content/types';
import type { ReadingPosition, ReadingSource } from './types';

const blobKey = (id: BookId) => `owlry/ebook/blob/${id}`;
const metaKey = (id: BookId) => `owlry/ebook/meta/${id}`;
const posKey = (id: BookId) => `owlry/ebook/pos/${id}`;

/** Store an uploaded file's bytes (client-side only). */
export async function saveUpload(id: BookId, blob: Blob, source: ReadingSource): Promise<void> {
  await set(blobKey(id), blob);
  // strip url; keep only non-sensitive metadata
  await set(metaKey(id), { ...source, url: undefined });
}

export async function loadUpload(id: BookId): Promise<{ blob: Blob; source: ReadingSource } | null> {
  const blob = await get<Blob>(blobKey(id));
  const source = await get<ReadingSource>(metaKey(id));
  if (!blob || !source) return null;
  return { blob, source };
}

export async function hasUpload(id: BookId): Promise<boolean> {
  return (await get<Blob>(blobKey(id))) != null;
}

export async function removeUpload(id: BookId): Promise<void> {
  await del(blobKey(id));
  await del(metaKey(id));
}

export async function savePosition(pos: ReadingPosition): Promise<void> {
  await set(posKey(pos.bookId), pos);
}

export async function loadPosition(id: BookId): Promise<ReadingPosition | null> {
  return (await get<ReadingPosition>(posKey(id))) ?? null;
}
