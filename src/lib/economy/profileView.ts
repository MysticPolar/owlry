/* ============================================================
   owlry — profile read-model helpers (radar districts, week bars,
   report card, radar note). Guest UI keeps content/profile.ts
   seeds; signed-in UI builds from the server snapshot in the store.
   ============================================================ */
import type { Lang } from '../../i18n';
import type { RadarDim, WeekBar } from '../../content/profile';
import type { CalendarDay, RadarPoint, StatsSnapshot } from './types';

/** fixed district order matching the radar geometry (pentagon) */
export const RADAR_ORDER = [
  'health',
  'wealth',
  'love',
  'happiness',
  'wonder',
] as const;

export type RadarKey = (typeof RADAR_ORDER)[number];

export const RADAR_LABELS: Record<Lang, Record<RadarKey, string>> = {
  en: {
    health: 'health',
    wealth: 'wealth',
    love: 'love',
    happiness: 'happiness',
    wonder: 'wonder',
  },
  zh: {
    health: '健康',
    wealth: '财富',
    love: '爱',
    happiness: '幸福',
    wonder: '惊奇',
  },
};

/** Map server radar points into the chart's [label, value] pairs. */
export function radarDimsFromSnapshot(radar: RadarPoint[], lang: Lang): RadarDim[] {
  const byKey = new Map(radar.map((p) => [p.dimension, Math.max(0, Math.min(100, p.value))] as const));
  return RADAR_ORDER.map((key) => [RADAR_LABELS[lang][key], byKey.get(key) ?? 0]);
}

/** One calm line naming the quietest district — Mirror's voice. */
export function radarNoteFromDims(dims: RadarDim[], lang: Lang): string {
  if (!dims.length) {
    return lang === 'zh' ? '五座架子还空着 — 读几页，轮廓就会长出来。' : 'five empty shelves — a few pages and the shape will grow.';
  }
  const total = dims.reduce((n, [, v]) => n + v, 0);
  if (total === 0) {
    return lang === 'zh' ? '五座架子还空着 — 读几页，轮廓就会长出来。' : 'five empty shelves — a few pages and the shape will grow.';
  }
  let quiet = dims[0]!;
  for (const d of dims) if (d[1] < quiet[1]) quiet = d;
  let loud = dims[0]!;
  for (const d of dims) if (d[1] > loud[1]) loud = d;
  if (lang === 'zh') {
    if (loud[1] === quiet[1]) return '五座架子齐平 — 接着读，轮廓还会动。';
    return `${loud[0]}一枝独秀 — ${quiet[0]}区还差一章。`;
  }
  if (loud[1] === quiet[1]) return 'the five shelves are even — keep reading and the shape will shift.';
  return `${loud[0]} is carrying the team — ${quiet[0]} could use a chapter.`;
}

export function formatReadingMinutes(mins: number, lang: Lang): string {
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return lang === 'zh' ? `${m}分` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (lang === 'zh') return rem ? `${h}小时${rem}分` : `${h}小时`;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

export function formatPages(n: number, lang: Lang): string {
  const v = Math.max(0, Math.round(n));
  if (lang === 'zh') return v.toLocaleString('zh-CN');
  return v.toLocaleString('en-US');
}

export function reportFromStats(
  stats: StatsSnapshot,
  lang: Lang,
): { n: string; l: string }[] {
  const labels =
    lang === 'zh'
      ? (['读过的书', '翻过的页数', '阅读时长', '划线'] as const)
      : (['BOOKS READ', 'PAGES TURNED', 'TIME READING', 'HIGHLIGHTS'] as const);
  return [
    { n: String(stats.books_read ?? 0), l: labels[0] },
    { n: formatPages(stats.pages_turned ?? 0, lang), l: labels[1] },
    { n: formatReadingMinutes(stats.reading_minutes ?? 0, lang), l: labels[2] },
    { n: String(stats.highlights ?? 0), l: labels[3] },
  ];
}

/** Local YYYY-MM-DD for a Date (not UTC). */
export function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Monday-first index 0..6 for a Date. */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/**
 * Build this week's activity bars from calendar owl_posts (Scout asks + peeks).
 * Heights are relative to the busiest day in the week (min 12% when any activity).
 */
export function weekBarsFromCalendar(calendar: CalendarDay[]): { bars: WeekBar[]; posts: number } {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayIndex(today));

  const byDay = new Map(calendar.map((c) => [c.day, c.owl_posts] as const));
  const counts: number[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    counts.push(byDay.get(localDayKey(d)) ?? 0);
  }
  const max = Math.max(0, ...counts);
  const todayKey = localDayKey(today);
  const bars: WeekBar[] = counts.map((n, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const h = max <= 0 ? 0 : Math.max(12, Math.round((n / max) * 100));
    return {
      h: n === 0 ? 0 : h,
      ...(localDayKey(d) === todayKey ? { today: true } : {}),
    };
  });
  return { bars, posts: counts.reduce((a, b) => a + b, 0) };
}

export function monthLabel(d: Date, lang: Lang): string {
  if (lang === 'zh') {
    return `${d.getMonth() + 1}月`;
  }
  return d.toLocaleString('en-US', { month: 'long' }).toLowerCase();
}
