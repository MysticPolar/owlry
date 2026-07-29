/* ============================================================
   owlry — ebook types. Shared by the resolver, the client-only
   storage, the reader, and the progress→XP loop.
   ============================================================ */
import type { BookRef } from '../../content/types';

export type EbookFormat = 'epub' | 'pdf' | 'txt' | 'fb2' | 'mobi' | 'azw3';

/** Where the reader gets its bytes. Remote = a legal public-domain EPUB URL.
 *  Local uploads stay in memory for guests; signed-in uploads use an
 *  account-scoped offline cache plus the user's private cloud copy. */
export interface ReadingSource {
  kind: 'remote-epub' | 'local';
  format: EbookFormat;
  title: string;
  author: string;
  /** remote sources only: the EPUB URL */
  url?: string;
  /** human label, e.g. "Project Gutenberg" / "Your upload" */
  sourceLabel: string;
  /** Stable identity for one exact uploaded copy (local + cloud). */
  copyVersion?: string;
  /** SHA-256 identity of the file bytes. Unlike copyVersion, this is stable
   *  when the same file is selected again or downloaded on another device. */
  copyFingerprint?: string;
  /** User-selection order for concurrent/offline copies across devices. */
  copySelectedAt?: number;
  /** Server timestamp retained as ordering fallback for legacy cloud copies. */
  cloudUpdatedAt?: string;
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
  /** Prevents an anchor from one file reopening in a same-format replacement. */
  copyVersion?: string;
  /** Content identity used to recognize the same bytes across copy versions. */
  copyFingerprint?: string;
  updatedAt: number;
}

/** Result of inspecting an uploaded file for format + DRM. */
export interface FileInspection {
  ok: boolean;
  format?: EbookFormat;
  /** blocking reason when ok=false (shown to the user) */
  reason?: string;
}
