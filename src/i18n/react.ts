/* ============================================================
   i18n React bindings. Components import from HERE: useT() subscribes to
   the store's language, so a component that calls it re-renders when
   the reader switches language in Settings.
   ============================================================ */
import { useStore } from '../store/useStore';
import { UI, type Dict } from './ui';
import { fmt, type Lang } from './index';

export function useLang(): Lang {
  return useStore((s) => s.lang);
}

export function useT(): Dict {
  return UI[useLang()];
}

export { fmt };
export type { Dict, Lang };
