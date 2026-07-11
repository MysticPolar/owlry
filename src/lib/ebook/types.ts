/* ============================================================
   owlry — ebook types. Shared by the resolver, the client-only
   storage, the reader, and the progress→XP loop.
   ============================================================ */
import type { BookRef } from '../../content/types';

export type EbookFormat = 'epub' | 'pdf' | 'txt' | 'fb2' | 'mobi' | 'azw3';

/** Where the reader gets its bytes. Remote = a legal public-domain EPUB URL;
 *  local = a user-uploaded file kept in IndexedDB (never sent to our server). */
export interface ReadingSource {
  kind: 'remote-epub' | 'local';
  format: EbookFormat;
  title: string;
  author: string;
  /** remote sources only: the EPUB URL */
  url?: string;
  /** human label, e.g. "Project Gutenberg" / "Your upload" */
  sourceLabel: string;
}

/** Reading position — percent is the stable unit (pages drift in reflowable EPUB).
 *  cfi/page/scroll are the engine-specific anchors used to resume exactly. */
export interface ReadingPosition {
  bookId: BookRef;
  percent: number; // 0..100
  cfi?: string; // epub.js
  page?: number; // pdf.js (1-based)
  scroll?: number; // txt/fb2 (0..1 fraction)
  secondsRead: number;
  format: EbookFormat;
  updatedAt: number;
}

/** Result of inspecting an uploaded file for format + DRM. */
export interface FileInspection {
  ok: boolean;
  format?: EbookFormat;
  /** blocking reason when ok=false (shown to the user) */
  reason?: string;
}
