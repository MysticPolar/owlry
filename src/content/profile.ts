/* ============================================================
   owlry — profile content & seeds (radar, calendar, quotes).
   Display constants ported from the mockup. The live loop
   (level, coins, streak, saved/reading/finished counts) is read
   from the store; these are the historical / seeded views.
   ============================================================ */
import type { BookId } from './types';

/* ---------- stats tab: radar "reading balance" ---------- */
export type RadarDim = [name: string, value: number];
export const DIMS: RadarDim[] = [
  ['health', 62],
  ['wealth', 48],
  ['relationship', 71],
  ['career', 76],
  ['mindset', 85],
  ['fiction', 94],
];
export const RADAR_NOTE = 'fiction is carrying the team — wealth could use a chapter.';

/* ---------- stats tab: report card ---------- */
export interface ReportStat {
  n: string;
  l: string;
}
export const REPORT: ReportStat[] = [
  { n: '23', l: 'BOOKS READ' },
  { n: '6,412', l: 'PAGES TURNED' },
  { n: '84h', l: 'TIME READING' },
  { n: '132', l: 'HIGHLIGHTS' },
];

/* ---------- stats tab: this-week bars ---------- */
export interface WeekBar {
  h: number;
  d: string;
  today?: boolean;
}
export const WEEK_TIME = '3h 56m';
export const WEEK7: WeekBar[] = [
  { h: 38, d: 'M' },
  { h: 62, d: 'T' },
  { h: 48, d: 'W', today: true },
  { h: 75, d: 'T' },
  { h: 30, d: 'F' },
  { h: 15, d: 'S' },
  { h: 88, d: 'S' },
];

/* ---------- stats tab: achievements ---------- */
export interface Achievement {
  i: string;
  l: string;
  lock?: boolean;
}
export const ACHIEVEMENTS: Achievement[] = [
  { i: 'ti-flame', l: '7-day streak' },
  { i: 'ti-moon', l: 'night owl' },
  { i: 'ti-books', l: '20 books' },
  { i: 'ti-lock', l: 'marathon', lock: true },
];

/* ---------- profile header: identity row (benched on instagram) ---------- */
export const DEFAULT_BIO = 'night reader · soft spot for island myths & stubborn heroines';

export interface IgStat {
  n: string;
  l: string;
  /** which profile tab a tap opens */
  tab: 'stats' | 'quotes';
  aria: string;
}
export const IG_STATS: IgStat[] = [
  { n: '23', l: 'books', tab: 'stats', aria: '23 books read — open stats' },
  { n: '84h', l: 'reading time', tab: 'stats', aria: '84 hours reading time — open stats' },
  { n: '132', l: 'highlights', tab: 'quotes', aria: '132 highlights — open quotes' },
];

/* ---------- profile header: weekly streak dots ---------- */
export interface WeekDot {
  on?: boolean;
  today?: boolean;
}
export const WK_DOTS: WeekDot[] = [
  { on: true },
  { on: true },
  { today: true },
  { on: true },
  { on: true },
  { on: true },
  { on: true },
];

/* ---------- calendar tab: owl-post calendar (june, today = 11) ---------- */
export const CMONTH = 'june';
export const CTODAY = 11;
export const CDAYS = 30;

export interface CalRec {
  q: string;
  book: BookId;
}
export const RECS: Record<number, CalRec> = {
  2: { q: 'something quiet for a rainy tuesday?', book: 'snow' },
  5: { q: 'a book to fix my sleep schedule?', book: 'wws' },
  8: { q: 'stoic, but make it gentle.', book: 'medit' },
  10: { q: 'a mystery that smells like rain?', book: 'sleep' },
  11: { q: 'one strange, beautiful world, please.', book: 'piranesi' },
};

/* ---------- quotes tab: tucked-away quotes ---------- */
export interface SavedQuote {
  x: string;
  book: BookId;
  d: string;
}
export const QUOTES: SavedQuote[] = [
  { x: 'The house is vast. The tide keeps its own hours.', book: 'piranesi', d: 'jun 9' },
  { x: 'Confine yourself to the present.', book: 'medit', d: 'jun 6' },
  { x: 'A wish made of winter walks out of the woods.', book: 'snow', d: 'jun 2' },
  { x: 'Tiny votes, cast daily, for the person you’re becoming.', book: 'atomic', d: 'may 28' },
  { x: 'Rain, neon, and a case that will not stay closed.', book: 'sleep', d: 'may 19' },
];
