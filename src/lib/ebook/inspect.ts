/* ============================================================
   owlry — uploaded-file inspection: format detection + DRM/encryption guard.

   We never strip DRM. If a file is encrypted/copy-protected we refuse it with a
   clear message. DRM-free MOBI/AZW3 are accepted when their Palm Database
   signature is valid. Detection is magic-byte / zip-entry based, all client-side.
   ============================================================ */
import type { FileInspection } from './types';
import {
  BlobReader,
  TextWriter,
  ZipReader,
} from '../../vendor/foliate-js/vendor/zip.js';

const enc = (s: string) => new TextEncoder().encode(s);
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // exact 50 MiB storage cap

export type FilePreflightFailure = 'empty' | 'too-large';

/**
 * Cheap checks which must run before any file bytes are read. Kept separate so
 * the picker can localize the message while inspectFile remains safe for every
 * caller.
 */
export function preflightFile(file: File): FilePreflightFailure | null {
  if (file.size === 0) return 'empty';
  if (file.size > MAX_UPLOAD_BYTES) return 'too-large';
  return null;
}

function bytesIndexOf(hay: Uint8Array, needle: Uint8Array, from = 0): number {
  const last = hay.length - needle.length;
  outer: for (let i = from; i <= last; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

const FONT_OBFUSCATION_ALGORITHMS = new Set([
  'http://www.idpf.org/2008/embedding',
  'http://ns.adobe.com/pdf/enc#RC',
]);
const EPUB_CONTAINER_NS = 'urn:oasis:names:tc:opendocument:xmlns:container';
const EPUB_PACKAGE_MEDIA_TYPE = 'application/oebps-package+xml';

async function inspectEpubProtection(
  file: File,
): Promise<'protected' | 'invalid' | null> {
  const reader = new ZipReader(new BlobReader(file));
  try {
    const entries = await reader.getEntries();
    if (entries.some((entry) => entry.encrypted)) return 'protected';
    const byName = new Map(
      entries.map((entry) => [entry.filename, entry] as const),
    );
    const mimetype = entries.find((entry) => entry.filename === 'mimetype');
    const container = byName.get('META-INF/container.xml');
    if (!mimetype || mimetype.compressionMethod !== 0 || !container) return 'invalid';
    const mime = await mimetype.getData(new TextWriter(), { useWebWorkers: false });
    if (mime.trim() !== 'application/epub+zip') return 'invalid';
    const containerXml = await container.getData(
      new TextWriter(),
      { useWebWorkers: false },
    );
    const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml');
    if (containerDoc.querySelector('parsererror')) return 'invalid';
    const packageRootfiles = Array.from(
      containerDoc.getElementsByTagNameNS(EPUB_CONTAINER_NS, 'rootfile'),
    ).filter((rootfile) => (
      rootfile.getAttribute('media-type') === EPUB_PACKAGE_MEDIA_TYPE
    ));
    const packagePath = packageRootfiles[0]?.getAttribute('full-path')?.trim();
    // Match the bundled Foliate parser: it selects the first package rootfile
    // with the standard media type and then loads that exact ZIP entry.
    if (!packagePath || !entries.some((entry) => entry.filename === packagePath)) {
      return 'invalid';
    }

    const encryption = byName.get('META-INF/encryption.xml');
    if (!encryption) return null;

    const xml = await encryption.getData(new TextWriter(), { useWebWorkers: false });
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) return 'invalid';
    const encryptedData = Array.from(
      doc.getElementsByTagNameNS('*', 'EncryptedData'),
    );
    for (const item of encryptedData) {
      const algorithm = item
        .getElementsByTagNameNS('*', 'EncryptionMethod')[0]
        ?.getAttribute('Algorithm');
      // EPUB's two standardized font-obfuscation methods are reversible layout
      // metadata, not access-control DRM, and are supported by Foliate.
      if (!algorithm || !FONT_OBFUSCATION_ALGORITHMS.has(algorithm)) {
        return 'protected';
      }
    }
    return null;
  } catch {
    return 'invalid';
  } finally {
    await reader.close().catch(() => {});
  }
}

async function inspectPdf(
  file: File,
): Promise<'protected' | 'invalid' | null> {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (
    await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  try {
    const doc = await loadingTask.promise;
    if (!Number.isFinite(doc.numPages) || doc.numPages < 1) return 'invalid';
    // PDF.js returns `null` only when the document has no permission dictionary.
    // Encrypted PDFs with an empty user password can open without throwing a
    // PasswordException, but still return permission flags here. Refuse every
    // such file rather than silently accepting a restricted/copy-protected copy.
    if (await doc.getPermissions() !== null) return 'protected';
    // Parsing one page catches broken xref/page trees before the upload is
    // persisted, while avoiding the cost of rendering every page.
    await doc.getPage(1);
    return null;
  } catch (error) {
    return (error as { name?: string })?.name === 'PasswordException'
      ? 'protected'
      : 'invalid';
  } finally {
    await loadingTask.destroy().catch(() => {});
  }
}

async function inspectFb2(file: File): Promise<'invalid' | null> {
  try {
    const xml = await file.text();
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) return 'invalid';
    return doc.documentElement?.localName === 'FictionBook'
      ? null
      : 'invalid';
  } catch {
    return 'invalid';
  }
}

async function inspectMobi(
  file: File,
  head: Uint8Array,
): Promise<'protected' | 'invalid' | null> {
  if (head.byteLength < 82) return 'invalid';
  const firstRecordOffset = new DataView(
    head.buffer,
    head.byteOffset,
    head.byteLength,
  ).getUint32(78, false);
  if (
    firstRecordOffset < 86
    || firstRecordOffset + 20 > file.size
  ) return 'invalid';
  const record = firstRecordOffset + 20 <= head.byteLength
    ? head.subarray(firstRecordOffset, firstRecordOffset + 20)
    : new Uint8Array(
        await file.slice(firstRecordOffset, firstRecordOffset + 20).arrayBuffer(),
      );
  if (record.byteLength < 20) return 'invalid';
  const view = new DataView(record.buffer, record.byteOffset, record.byteLength);
  const compression = view.getUint16(0, false);
  const encryption = view.getUint16(12, false);
  const mobiMagic = new TextDecoder('latin1').decode(record.subarray(16, 20));
  if (mobiMagic !== 'MOBI' || ![1, 2, 17480].includes(compression)) return 'invalid';
  return encryption === 0 ? null : 'protected';
}

export async function inspectFile(file: File): Promise<FileInspection> {
  const preflight = preflightFile(file);
  if (preflight === 'empty') return { ok: false, reason: 'This file is empty.' };
  if (preflight === 'too-large') {
    return { ok: false, reason: 'This file is larger than the 50 MiB upload limit.' };
  }

  const name = file.name.toLowerCase();
  const ext = name.slice(name.lastIndexOf('.') + 1);

  // Most formats only need their header. EPUB protection metadata is read from
  // the ZIP directory below without loading the whole (up-to-50-MiB) file.
  const head = new Uint8Array(await file.slice(0, Math.min(file.size, 4096)).arrayBuffer());

  // MOBI / AZW3 (KF8) — DRM-FREE only. Palm Database magic: bytes 60..67 spell
  // "BOOKMOBI"; the first PalmDOC record carries the encryption flag.
  if (ext === 'mobi' || ext === 'azw3' || ext === 'azw') {
    const magic = new TextDecoder('latin1').decode(head.subarray(60, 68));
    if (magic !== 'BOOKMOBI') {
      return {
        ok: false,
        reason: 'This is not a supported DRM-free Kindle file. Try a DRM-free EPUB, MOBI, or AZW3.',
      };
    }
    const protection = await inspectMobi(file, head);
    if (protection === 'protected') {
      return {
        ok: false,
        reason: 'This file is copy-protected and can’t be opened. Try a DRM-free EPUB.',
      };
    }
    if (protection === 'invalid') {
      return {
        ok: false,
        reason: 'This is not a supported DRM-free Kindle file. Try a DRM-free EPUB, MOBI, or AZW3.',
      };
    }
    return { ok: true, format: ext === 'mobi' ? 'mobi' : 'azw3' };
  }
  const isZip = head[0] === 0x50 && head[1] === 0x4b; // "PK"

  // EPUB (zip carrying the epub mimetype)
  if (ext === 'epub' || (isZip && bytesIndexOf(head, enc('application/epub+zip')) !== -1)) {
    if (!isZip) return { ok: false, reason: 'That doesn’t look like a valid EPUB file.' };
    const protection = await inspectEpubProtection(file);
    if (protection === 'invalid') {
      return { ok: false, reason: 'That doesn’t look like a valid EPUB file.' };
    }
    if (protection === 'protected') {
      return { ok: false, reason: 'This file is copy-protected and can’t be opened. Try a DRM-free EPUB.' };
    }
    return { ok: true, format: 'epub' };
  }

  // PDF: parse before persistence so a renamed or password-protected file never
  // receives a false "ready" toast or enters the cloud retry queue.
  if (
    ext === 'pdf' ||
    bytesIndexOf(head.subarray(0, 1024), enc('%PDF-')) !== -1
  ) {
    if (bytesIndexOf(head.subarray(0, 1024), enc('%PDF-')) === -1) {
      return { ok: false, reason: 'That doesn’t look like a valid PDF file.' };
    }
    const protection = await inspectPdf(file);
    if (protection === 'protected') {
      return {
        ok: false,
        reason: 'This file is copy-protected and can’t be opened. Try a DRM-free EPUB.',
      };
    }
    if (protection === 'invalid') {
      return { ok: false, reason: 'That doesn’t look like a readable PDF file.' };
    }
    return { ok: true, format: 'pdf' };
  }

  // FB2 (FictionBook XML)
  if (ext === 'fb2' || bytesIndexOf(head, enc('<FictionBook')) !== -1) {
    if (await inspectFb2(file) === 'invalid') {
      return { ok: false, reason: 'That doesn’t look like a valid FB2 file.' };
    }
    return { ok: true, format: 'fb2' };
  }

  if (ext === 'txt') return { ok: true, format: 'txt' };

  return { ok: false, reason: 'Unsupported file type. Use a DRM-free EPUB, PDF, FB2, or TXT.' };
}

export const ACCEPT_ATTR = '.epub,.pdf,.fb2,.txt,.mobi,.azw3';
