/* ============================================================
   owlry — i18n React bindings. Components import from HERE
   (importing ./index directly won't re-render on switch).
   `useT()` subscribes to prefs.lang, so any component that calls
   it re-renders when the reader changes language in Settings.
   ============================================================ */
import { useStore } from '../store/useStore';
import { DICTS, type Dict, type Lang } from './index';

export function useLang(): Lang {
  return useStore((s) => s.prefs.lang ?? 'en');
}

export function useT(): Dict {
  return DICTS[useLang()];
}

export type { Dict, Lang };
