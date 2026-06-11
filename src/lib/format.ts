/* small formatting helpers shared across components */
import { GUIDES } from '../content/guides';
import type { BookId, GuideId } from '../content/types';

/** is this catalog book one the owl can write a letter for? */
export const isGuide = (id: BookId): id is GuideId => id in GUIDES;

/** reading progress percent, clamped 0–100 (mockup `pct`) */
export const pct = (pages: number, total: number): number =>
  Math.min(100, Math.round(((pages || 0) / total) * 100));

/** split a spine label into lines (the mockup encodes breaks as <br>) */
export const spineLines = (s: string): string[] => s.split(/<br\s*\/?>/i);
