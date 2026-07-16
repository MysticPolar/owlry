/* ============================================================
   owlry — i18n core (no app imports; safe for store & lib code).

   Two audiences:
   • React components — use useT()/useLang() from src/i18n/react.ts
   • non-React modules (store actions, owl brain, book registry) —
     read the current language with getActiveLang() / tOf().

   Dictionaries live in src/i18n/dicts/*, one namespace per surface,
   each exporting { en, zh } of identical shape (zh: typeof en).
   ============================================================ */
import { today } from './dicts/today';
import { discover } from './dicts/discover';
import { profile } from './dicts/profile';
import { settings } from './dicts/settings';
import { reader } from './dicts/reader';
import { onboarding } from './dicts/onboarding';
import { store } from './dicts/store';

export type Lang = 'en' | 'zh';
export const LANGS: Lang[] = ['en', 'zh'];

const bundle = (l: Lang) => ({
  today: today[l],
  discover: discover[l],
  profile: profile[l],
  settings: settings[l],
  reader: reader[l],
  onboarding: onboarding[l],
  store: store[l],
});

export type Dict = ReturnType<typeof bundle>;
export const DICTS: Record<Lang, Dict> = { en: bundle('en'), zh: bundle('zh') };
export const tOf = (l: Lang): Dict => DICTS[l];

/* ---------- the active language (mirrors prefs.lang) ----------
   Kept as a module-level value so non-React code (bookRegistry,
   owlBrain, owlClient) can read it without importing the store.
   The store syncs it on every state change (useStore.subscribe). */
let activeLang: Lang = 'en';

export const getActiveLang = (): Lang => activeLang;

export function setActiveLang(l: Lang): void {
  if (l === activeLang) return;
  activeLang = l;
  syncDocumentLang(l);
}

/** stamp <html lang> so the UA picks CJK line-breaking, fonts, a11y voices */
export function syncDocumentLang(l: Lang = activeLang): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
  }
}
