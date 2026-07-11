/* ============================================================
   owlry — uploaded-file inspection: format detection + DRM/encryption guard.

   We never strip DRM. If a file is encrypted/copy-protected we refuse it with a
   clear message. MOBI/AZW are rejected (DRM-prone and unsupported by our
   renderers). Detection is magic-byte / zip-entry based, all client-side.
   ============================================================ */
import type { FileInspection } from './types';

const enc = (s: string) => new TextEncoder().encode(s);

function bytesIndexOf(hay: Uint8Array, needle: Uint8Array, from = 0): number {
  const last = hay.length - needle.length;
  outer: for (let i = from; i <= last; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

export async function inspectFile(file: File): Promise<FileInspection> {
  const name = file.name.toLowerCase();
  const ext = name.slice(name.lastIndexOf('.') + 1);

  const buf = new Uint8Array(await file.arrayBuffer());
  const head = buf.subarray(0, 4096);

  // MOBI / AZW3 (KF8) — DRM-FREE only. Palm Database magic: bytes 60..67 spell
  // "BOOKMOBI". We never strip DRM: an encrypted (real-Kindle-DRM) file passes this
  // check but foliate throws when it hits the encrypted records → the reader shows
  // the copy-protected message. Old-style DRM .azw resolves the same way.
  if (ext === 'mobi' || ext === 'azw3' || ext === 'azw') {
    const magic = new TextDecoder('latin1').decode(buf.subarray(60, 68));
    if (magic !== 'BOOKMOBI') {
      return { ok: false, reason: 'this doesn’t look like a DRM-free kindle file. try a DRM-free EPUB or MOBI.' };
    }
    return { ok: true, format: ext === 'mobi' ? 'mobi' : 'azw3' };
  }
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b; // "PK"

  // EPUB (zip carrying the epub mimetype)
  if (ext === 'epub' || (isZip && bytesIndexOf(head, enc('application/epub+zip')) !== -1)) {
    if (!isZip) return { ok: false, reason: 'That doesn’t look like a valid EPUB file.' };
    if (
      bytesIndexOf(buf, enc('META-INF/encryption.xml')) !== -1 ||
      bytesIndexOf(buf, enc('META-INF/rights.xml')) !== -1
    ) {
      return { ok: false, reason: 'This file is copy-protected and can’t be opened. Try a DRM-free EPUB.' };
    }
    return { ok: true, format: 'epub' };
  }

  // PDF (password/DRM PDFs are caught at render time by pdf.js)
  if (ext === 'pdf' || (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)) {
    return { ok: true, format: 'pdf' };
  }

  // FB2 (FictionBook XML)
  if (ext === 'fb2' || bytesIndexOf(head, enc('<FictionBook')) !== -1) {
    return { ok: true, format: 'fb2' };
  }

  if (ext === 'txt') return { ok: true, format: 'txt' };

  return { ok: false, reason: 'Unsupported file type. Use a DRM-free EPUB, PDF, FB2, or TXT.' };
}

export const ACCEPT_ATTR = '.epub,.pdf,.fb2,.txt,.mobi,.azw3';
