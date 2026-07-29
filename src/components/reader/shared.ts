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
  /** Lets an engine reserve safe space only while the overlay chrome is visible. */
  chromeVisible?: boolean;
  /** A non-interactive tap in an embedded book can toggle the parent chrome. */
  onToggleChrome?: () => void;
  /** report a hard failure; fallbackEmpty=true asks the shell to offer upload instead */
  onError: (msg: string, fallbackEmpty?: boolean) => void;
}

/** Imperative paging handle the shell calls from the footer buttons. */
export interface EngineHandle {
  next: () => void;
  prev: () => void;
}

export type PageTapAction = 'prev' | 'chrome' | 'next';

/** Full-height page-mode tap zones: generous outer thirds turn pages while the
    middle third remains a stable way to reveal or hide the reader chrome. */
export const pageTapAction = (fraction: number): PageTapAction => {
  if (fraction < 1 / 3) return 'prev';
  if (fraction > 2 / 3) return 'next';
  return 'chrome';
};

/** Internal engine signal: another tab atomically replaced this exact copy. */
export const COPY_REPLACED_ERROR = '__owlry_copy_replaced__';

/** The reader's "Sans" option. Mirrors --font-chrome in src/styles/type.css —
    it has to be a literal because CSS custom properties do not cross into the
    epub's blob: iframe. Keep the two in sync. */
export const SYSTEM_STACK =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, " +
  "'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', " +
  "'Microsoft YaHei', 'Noto Sans SC', sans-serif";
