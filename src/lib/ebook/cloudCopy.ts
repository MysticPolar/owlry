/* ============================================================
   owlry — cross-device copies of uploaded books.

   Signed in, an upload is mirrored to the reader's PRIVATE folder
   in the `owlry-uploads` bucket (path <uid>/<bookId>.<format>,
   owner-only RLS — see the 20260728150000 migration). Other
   devices pull it on open and cache it back into IndexedDB.
   Guests stay device-only. Every call is a best-effort no-op when
   the backend is unconfigured, the user is signed out, or the
   bucket doesn't exist yet — the local reading flow never blocks
   on the cloud.
   ============================================================ */
import { supabase } from '../supabase';
import { getBook } from '../bookRegistry';
import type { BookRef } from '../../content/types';
import type { EbookFormat, ReadingSource } from './types';

const BUCKET = 'owlry-uploads';
const FORMATS: EbookFormat[] = ['epub', 'pdf', 'txt', 'fb2', 'mobi', 'azw3'];

const uid = async (): Promise<string | null> => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
};

/** Mirror an uploaded copy to the signed-in reader's cloud folder. */
export async function pushCopy(bookId: BookRef, blob: Blob, format: EbookFormat): Promise<void> {
  const user = await uid();
  if (!user || !supabase) return;
  // one copy per book — clear leftovers from a different format first
  const stale = FORMATS.filter((f) => f !== format).map((f) => `${user}/${bookId}.${f}`);
  await supabase.storage.from(BUCKET).remove(stale);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(`${user}/${bookId}.${format}`, blob, {
      upsert: true,
      contentType: blob.type || 'application/octet-stream',
    });
  if (error) throw error;
}

/** Fetch the signed-in reader's cloud copy of a book, if one exists. */
export async function pullCopy(
  bookId: BookRef,
  sourceLabel: string,
): Promise<{ blob: Blob; source: ReadingSource } | null> {
  const user = await uid();
  if (!user || !supabase) return null;
  const { data: entries } = await supabase.storage.from(BUCKET).list(user, { search: `${bookId}.` });
  const entry = entries?.find((e) => FORMATS.some((f) => e.name === `${bookId}.${f}`));
  if (!entry) return null;
  const format = entry.name.slice(entry.name.lastIndexOf('.') + 1) as EbookFormat;
  const { data: blob, error } = await supabase.storage.from(BUCKET).download(`${user}/${entry.name}`);
  if (error || !blob) return null;
  const b = getBook(bookId);
  return {
    blob,
    source: {
      kind: 'local',
      format,
      title: b?.t ?? bookId,
      author: b?.a ?? '',
      sourceLabel,
    },
  };
}

/** Remove every cloud copy of a book (all formats). */
export async function removeCopy(bookId: BookRef): Promise<void> {
  const user = await uid();
  if (!user || !supabase) return;
  await supabase.storage.from(BUCKET).remove(FORMATS.map((f) => `${user}/${bookId}.${f}`));
}
