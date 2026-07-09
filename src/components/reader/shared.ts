/* Shared contract between the reader shell and its rendering engines. */
import type { BookRef } from '../../content/types';
import type { ReadingPosition, ReadingSource } from '../../lib/ebook/types';

export interface ProgressUpdate {
  percent: number; // 0..100 — the stable progress unit
  cfi?: string; // epub.js
  page?: number; // pdf.js (1-based)
  scroll?: number; // txt/fb2 (0..1)
}

export interface EngineProps {
  bookId: BookRef;
  source: ReadingSource;
  initial: ReadingPosition | null;
  onProgress: (u: ProgressUpdate) => void;
  /** report a hard failure; fallbackEmpty=true asks the shell to offer upload instead */
  onError: (msg: string, fallbackEmpty?: boolean) => void;
}

/** Imperative paging handle the shell calls from the footer buttons. */
export interface EngineHandle {
  next: () => void;
  prev: () => void;
}
