/* Shared contract between the reader shell and its rendering engines. */
import type { BookRef } from '../../content/types';
import type { ReadingPosition, ReadingSource } from '../../lib/ebook/types';
import type { ReaderPrefs } from '../../store/types';

export interface ProgressUpdate {
  percent: number; // 0..100 — the stable progress unit
  cfi?: string; // epub.js
  page?: number; // pdf.js (1-based)
  pageTotal?: number; // fixed-layout/pdf display total
  scroll?: number; // txt/fb2 (0..1)
}

export interface EngineProps {
  bookId: BookRef;
  source: ReadingSource;
  initial: ReadingPosition | null;
  prefs: ReaderPrefs;
  onProgress: (u: ProgressUpdate) => void;
  /** report a hard failure; fallbackEmpty=true asks the shell to offer upload instead */
  onError: (msg: string, fallbackEmpty?: boolean) => void;
}

/** Imperative paging handle the shell calls from the footer buttons. */
export interface EngineHandle {
  next: () => void;
  prev: () => void;
}

/** The reader's "Sans" option. Mirrors --font-chrome in src/styles/type.css —
    it has to be a literal because CSS custom properties do not cross into the
    epub's blob: iframe. Keep the two in sync. */
export const SYSTEM_STACK =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, " +
  "'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', " +
  "'Microsoft YaHei', 'Noto Sans SC', sans-serif";
