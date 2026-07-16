/* ============================================================
   owlry — profile content & seeds (radar, calendar, quotes).
   Display constants ported from the mockup. The live loop
   (level, coins, streak, saved/reading/finished counts) is read
   from the store; these are the historical / seeded views.

   Localization: every user-facing string is available per
   language — flat display lists are keyed `Record<Lang, …>`
   (index with useLang()); seeds with shared structure (calendar
   days, book ids, bar heights) keep one entry and nest a
   `Record<Lang, string>` per text field. en values are
   byte-identical to the original English.
   ============================================================ */
import type { Lang } from '../i18n';
import type { BookId } from './types';

/* ---------- stats tab: radar "reading balance" ---------- */
export type RadarDim = [name: string, value: number];
export const DIMS: Record<Lang, RadarDim[]> = {
  en: [
    ['health', 62],
    ['wealth', 48],
    ['relationship', 71],
    ['career', 76],
    ['mindset', 85],
    ['fiction', 94],
  ],
  zh: [
    ['健康', 62],
    ['财富', 48],
    ['关系', 71],
    ['事业', 76],
    ['心态', 85],
    ['虚构', 94],
  ],
};
export const RADAR_NOTE: Record<Lang, string> = {
  en: 'fiction is carrying the team — wealth could use a chapter.',
  zh: '虚构类一枝独秀 — 财富区还差一章。',
};

/* ---------- stats tab: report card ---------- */
export interface ReportStat {
  n: string;
  l: string;
}
export const REPORT: Record<Lang, ReportStat[]> = {
  en: [
    { n: '23', l: 'BOOKS READ' },
    { n: '6,412', l: 'PAGES TURNED' },
    { n: '84h', l: 'TIME READING' },
    { n: '132', l: 'HIGHLIGHTS' },
  ],
  zh: [
    { n: '23', l: '读过的书' },
    { n: '6,412', l: '翻过的页数' },
    { n: '84h', l: '阅读时长' },
    { n: '132', l: '划线' },
  ],
};

/* ---------- stats tab: this-week bars ----------
   heights are shared; the weekday letters live in the "profile"
   i18n dict (t.profile.weekdays), monday-first. */
export interface WeekBar {
  h: number;
  today?: boolean;
}
export const WEEK_TIME: Record<Lang, string> = { en: '3h 56m', zh: '3小时56分' };
export const WEEK7: WeekBar[] = [
  { h: 38 },
  { h: 62 },
  { h: 48, today: true },
  { h: 75 },
  { h: 30 },
  { h: 15 },
  { h: 88 },
];

/* ---------- stats tab: achievements ---------- */
export interface Achievement {
  i: string;
  l: string;
  lock?: boolean;
}
export const ACHIEVEMENTS: Record<Lang, Achievement[]> = {
  en: [
    { i: 'ti-flame', l: '7-day streak' },
    { i: 'ti-moon', l: 'night owl' },
    { i: 'ti-books', l: '20 books' },
    { i: 'ti-lock', l: 'marathon', lock: true },
  ],
  zh: [
    { i: 'ti-flame', l: '连读7天' },
    { i: 'ti-moon', l: '夜猫子' },
    { i: 'ti-books', l: '20本书' },
    { i: 'ti-lock', l: '马拉松', lock: true },
  ],
};

/* ---------- profile header: identity row (benched on instagram) ---------- */
export const DEFAULT_BIO: Record<Lang, string> = {
  en: 'night reader · soft spot for island myths & stubborn heroines',
  zh: '夜读派 · 偏爱海岛神话和倔强的女主角',
};

export interface IgStat {
  n: string;
  l: string;
  /** which profile tab a tap opens */
  tab: 'stats' | 'quotes';
  aria: string;
}
export const IG_STATS: Record<Lang, IgStat[]> = {
  en: [
    { n: '23', l: 'books', tab: 'stats', aria: '23 books read — open stats' },
    { n: '84h', l: 'reading time', tab: 'stats', aria: '84 hours reading time — open stats' },
    { n: '132', l: 'highlights', tab: 'quotes', aria: '132 highlights — open quotes' },
  ],
  zh: [
    { n: '23', l: '本书', tab: 'stats', aria: '读过 23 本书 — 打开统计' },
    { n: '84h', l: '阅读时长', tab: 'stats', aria: '阅读时长 84 小时 — 打开统计' },
    { n: '132', l: '划线', tab: 'quotes', aria: '132 条划线 — 打开摘句' },
  ],
};

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
export const CMONTH: Record<Lang, string> = { en: 'june', zh: '六月' };
export const CTODAY = 11;
export const CDAYS = 30;

export interface CalRec {
  q: Record<Lang, string>;
  book: BookId;
}
export const RECS: Record<number, CalRec> = {
  2: {
    q: {
      en: 'something quiet for a rainy tuesday?',
      zh: '雨天的周二，想读点安静的？',
    },
    book: 'snow',
  },
  5: {
    q: {
      en: 'a book to fix my sleep schedule?',
      zh: '有什么书能救救我的作息？',
    },
    book: 'wws',
  },
  8: {
    q: {
      en: 'stoic, but make it gentle.',
      zh: '要斯多葛，但请温柔一点。',
    },
    book: 'medit',
  },
  10: {
    q: {
      en: 'a mystery that smells like rain?',
      zh: '有没有一本闻得到雨味的悬疑？',
    },
    book: 'sleep',
  },
  11: {
    q: {
      en: 'one strange, beautiful world, please.',
      zh: '请给我一个奇异而美丽的世界。',
    },
    book: 'piranesi',
  },
};

/* ---------- quotes tab: tucked-away quotes ---------- */
export interface SavedQuote {
  x: Record<Lang, string>;
  book: BookId;
  d: Record<Lang, string>;
}
export const QUOTES: SavedQuote[] = [
  {
    x: {
      en: 'The house is vast. The tide keeps its own hours.',
      zh: '屋宇浩渺，潮水自有它的时辰。',
    },
    book: 'piranesi',
    d: { en: 'jun 9', zh: '6月9日' },
  },
  {
    x: {
      en: 'Confine yourself to the present.',
      zh: '把自己安放在当下。',
    },
    book: 'medit',
    d: { en: 'jun 6', zh: '6月6日' },
  },
  {
    x: {
      en: 'A wish made of winter walks out of the woods.',
      zh: '一个用冬天做成的愿望，从林中走了出来。',
    },
    book: 'snow',
    d: { en: 'jun 2', zh: '6月2日' },
  },
  {
    x: {
      en: 'Tiny votes, cast daily, for the person you’re becoming.',
      zh: '每天投下一张小小的选票，投给你正在成为的那个人。',
    },
    book: 'atomic',
    d: { en: 'may 28', zh: '5月28日' },
  },
  {
    x: {
      en: 'Rain, neon, and a case that will not stay closed.',
      zh: '雨、霓虹，和一桩不肯了结的案子。',
    },
    book: 'sleep',
    d: { en: 'may 19', zh: '5月19日' },
  },
];
