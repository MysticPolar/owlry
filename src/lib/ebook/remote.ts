/* ============================================================
   owlry — fetch a public-domain ebook through the book-proxy edge function.

   Hosts like Project Gutenberg serve the file with NO CORS header, so a browser
   can't download it directly. The book-proxy fetches it server-side and
   re-serves it with CORS (as application/octet-stream); we wrap the blob back
   into a named .epub File that foliate-js can open.

   Offline / no backend → a direct fetch (usually CORS-blocked, so the reader
   falls through to the upload flow — same graceful failure as before).
   ============================================================ */
import { supabase } from '../supabase';

function fileName(title: string): string {
  const safe = title.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  return `${safe || 'book'}.epub`;
}

/** Resolve a remote public-domain ebook URL to a File the reader can open. */
export async function fetchRemoteBook(url: string, title = 'book'): Promise<File> {
  const name = fileName(title);

  if (supabase) {
    const { data, error } = await supabase.functions.invoke('book-proxy', { body: { url } });
    if (error) throw error;
    // the proxy sends application/octet-stream, so invoke() hands back a Blob
    const blob = data instanceof Blob ? data : new Blob([data as BlobPart]);
    if (!blob.size) throw new Error('empty book');
    return new File([blob], name, { type: 'application/epub+zip' });
  }

  // no backend configured — try direct (usually CORS-blocked; the caller falls back)
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return new File([await res.blob()], name, { type: 'application/epub+zip' });
}
