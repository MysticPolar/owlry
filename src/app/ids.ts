import { fmt, getActiveLang, localeTag } from '../i18n';
import { UI } from '../i18n/ui';

/** short, collision-safe ids for sessions, messages, highlights, posts */
export function uid(prefix = ''): string {
  const rnd =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return prefix ? `${prefix}_${rnd}` : rnd;
}

export function timeAgo(ts: number, now = Date.now()): string {
  const t = UI[getActiveLang()].time;
  const s = Math.max(1, Math.round((now - ts) / 1000));
  if (s < 60) return t.justNow;
  const m = Math.round(s / 60);
  if (m < 60) return fmt(t.m, { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return fmt(t.h, { n: h });
  const d = Math.round(h / 24);
  if (d < 7) return fmt(t.d, { n: d });
  const w = Math.round(d / 7);
  if (w < 5) return fmt(t.w, { n: w });
  return new Date(ts).toLocaleDateString(localeTag(), { month: 'short', day: 'numeric' });
}
