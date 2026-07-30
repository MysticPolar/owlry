/* Shared contract between the reader shell and its rendering engines. */
import type { BookRef } from '../../content/types';
import type { ReadingPosition, ReadingSource } from '../../lib/ebook/types';
import type { ReaderPrefs, ReaderTheme } from '../../store/types';

export interface ProgressUpdate {
  percent: number; // 0..100 — the stable progress unit
  cfi?: string; // epub.js
  page?: number; // pdf.js (1-based)
  pageTotal?: number; // fixed-layout/pdf display total
  scroll?: number; // txt/fb2 (0..1)
}

/** One TOC entry from the engine (Foliate book.toc shape, flattened for nesting). */
export interface TocItem {
  label: string;
  href: string;
  children?: TocItem[];
}

/** Selection inside a sandboxed Foliate iframe, mapped to the app viewport. */
export interface TextSelectPayload {
  text: string;
  /** bounding rect in viewport coordinates (same space as getBoundingClientRect) */
  rect: { left: number; top: number; right: number; bottom: number; width: number; height: number };
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
  /** Foliate iframe text selection — null when cleared. */
  onTextSelect?: (sel: TextSelectPayload | null) => void;
  /** report a hard failure; fallbackEmpty=true asks the shell to offer upload instead */
  onError: (msg: string, fallbackEmpty?: boolean) => void;
}

/** Imperative paging + navigation handle the shell calls from chrome. */
export interface EngineHandle {
  next: () => void;
  prev: () => void;
  getToc?: () => TocItem[];
  goToHref?: (href: string) => void | Promise<void>;
  /** Jump to a book-wide fraction in 0..1 (EPUB/TXT). */
  goToFraction?: (frac: number) => void | Promise<void>;
  /** Jump to a 1-based PDF page. */
  goToPage?: (page: number) => void | Promise<void>;
  clearSelection?: () => void;
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

export interface ReaderThemeColors {
  paper: string;
  ink: string;
  mute: string;
  rule: string;
  accent: string;
}

const mixRgb = (
  a: [number, number, number],
  b: [number, number, number],
  amount: number,
): string => {
  const channel = (i: number) => Math.round(a[i]! + (b[i]! - a[i]!) * amount);
  return `rgb(${channel(0)} ${channel(1)} ${channel(2)})`;
};

/** Paper/ink tokens for the shell and Foliate/TextView injected styles. */
export function readerThemeColors(theme: ReaderTheme, dimmer: number): ReaderThemeColors {
  const d = Math.min(1, Math.max(0, dimmer));
  if (theme === 'night') {
    return {
      paper: mixRgb([28, 24, 20], [18, 16, 14], d),
      ink: '#E8E0D0',
      mute: '#A89880',
      rule: 'rgba(138,106,51,.45)',
      accent: '#D9A94F',
    };
  }
  if (theme === 'sepia') {
    return {
      paper: mixRgb([244, 228, 196], [232, 210, 168], d),
      ink: '#3A2A18',
      mute: '#7A6248',
      rule: 'rgba(138,106,51,.4)',
      accent: '#8A6A33',
    };
  }
  // paper — current cream lamp
  return {
    paper: mixRgb([251, 243, 226], [239, 230, 208], d),
    ink: '#241C14',
    mute: '#6A5C4A',
    rule: '#D8C6A2',
    accent: '#8A6A33',
  };
}
