import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';

/* ============================================================
   The lighting rig: evening (dark) or matinée (light). The reader's
   choice lives in the store (device-local, like a text size); with none
   made, the OS colour scheme decides. The rig is a `data-rig` attribute
   on <html>, which tokens.css reads — so it is set once before the first
   render (main.tsx) and kept in step from then on.
   ============================================================ */
export type Rig = 'evening' | 'matinee';

const LIGHT = '(prefers-color-scheme: light)';

export function systemRig(): Rig {
  return typeof window !== 'undefined' && window.matchMedia(LIGHT).matches ? 'matinee' : 'evening';
}

export function resolveRig(choice: Rig | null): Rig {
  return choice ?? systemRig();
}

export function applyRig(rig: Rig) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.rig = rig;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = rig === 'evening' ? '#070B17' : '#E9E1CC';
}

/** keep <html data-rig> in step with the store and the OS; call once at boot */
export function watchRig() {
  applyRig(resolveRig(useStore.getState().rig));
  useStore.subscribe((s, prev) => {
    if (s.rig !== prev.rig) applyRig(resolveRig(s.rig));
  });
  if (typeof window !== 'undefined') {
    window.matchMedia(LIGHT).addEventListener('change', () => {
      if (useStore.getState().rig === null) applyRig(systemRig());
    });
  }
}

/** the rig in effect, for components (the toggle in the app bar, the Settings row) */
export function useRig(): { rig: Rig; choice: Rig | null; set: (r: Rig) => void; toggle: () => void } {
  const choice = useStore((s) => s.rig);
  const set = useStore((s) => s.setRig);
  const [system, setSystem] = useState<Rig>(systemRig);
  useEffect(() => {
    const mq = window.matchMedia(LIGHT);
    const on = () => setSystem(mq.matches ? 'matinee' : 'evening');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const rig = choice ?? system;
  return { rig, choice, set, toggle: () => set(rig === 'evening' ? 'matinee' : 'evening') };
}
