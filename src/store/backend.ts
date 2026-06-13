/* Bridge between the server snapshot and the Zustand store.
   Imported only when the backend is enabled — see docs/backend-integration.md. */
import { useStore } from './useStore';
import { getSnapshot } from '../lib/economy/api';
import type { Snapshot } from '../lib/economy/types';

/** Map a server snapshot into the store's runtime shape (economy + library). */
export function applySnapshot(s: Snapshot): void {
  if (!s?.profile) return;
  const p = s.profile;
  useStore.setState({
    xp: p.xp_into_level,
    xpMax: p.xp_for_next,
    lv: p.level,
    ink: p.ink,
    inkMax: p.ink_max,
    coins: p.coins,
    streak: p.streak,
    savedIds: s.library.saved,
    readingIds: s.library.reading,
    finishedIds: s.library.finished,
    pagesRead: s.library.pagesRead,
  });
}

/** Pull the latest snapshot from the server and apply it. */
export async function hydrateFromServer(): Promise<void> {
  applySnapshot(await getSnapshot());
}
