/* ============================================================
   i18n core — no app imports, safe for the store, the engine and lib
   code. Same split as the classic app: React components use useT() /
   useLang() from ./react (so they re-render on a switch); everything
   else reads the active language here.

   Two kinds of text are localised:
   • the interface — one dictionary per language in ./ui.ts, identical
     shape, `en` byte-for-byte the original copy;
   • the content — figures, books, councils, areas, feed seeds — which
     keep English as the source of truth in src/content and carry Chinese
     as overrides in src/content/zh, merged by the content accessors
     through loc().
   Verbatim quotes are never translated in place: they stay in the
   language they were verified in, and Chinese readers see a gloss under
   them, marked as such.
   ============================================================ */
export type Lang = 'en' | 'zh';

export const LANGS: { id: Lang; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'zh', label: 'Chinese', native: '中文' },
];

let activeLang: Lang = 'en';

export const getActiveLang = (): Lang => activeLang;
export const isZh = (): boolean => activeLang === 'zh';

/** stamp <html lang> too, so the browser picks CJK line-breaking, fonts and voices */
export function setActiveLang(l: Lang): void {
  activeLang = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
}

/** the browser's preference, for a first visit */
export function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'en';
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
  return langs.some((l) => /^zh\b/i.test(l ?? '')) ? 'zh' : 'en';
}

/** `{name}` placeholders */
export function fmt(s: string, vars: Record<string, string | number> = {}): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** a localised content value: the Chinese override when the app is in Chinese and one exists, else the English source */
export function loc<T>(en: T, zh: T | undefined | null): T {
  return activeLang === 'zh' && zh !== undefined && zh !== null ? zh : en;
}

/** the locale tag for Intl */
export const localeTag = (): string => (activeLang === 'zh' ? 'zh-CN' : 'en');
