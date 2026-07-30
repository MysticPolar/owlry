import { useEffect } from 'react';

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinelLike>;
  };
};

/**
 * Keep the screen awake while `active` (ebook reading). Silent no-op when the
 * Wake Lock API is missing or the request is denied. Re-acquires after the
 * tab becomes visible again (browsers release the lock on hide).
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock?.request) return;

    let cancelled = false;
    let sentinel: WakeLockSentinelLike | null = null;

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        const next = await nav.wakeLock!.request('screen');
        if (cancelled) {
          void next.release();
          return;
        }
        sentinel = next;
        next.addEventListener('release', () => {
          if (sentinel === next) sentinel = null;
        });
      } catch {
        /* permission / power-save — stay quiet */
      }
    };

    void acquire();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      const held = sentinel;
      sentinel = null;
      if (held && !held.released) void held.release();
    };
  }, [active]);
}
