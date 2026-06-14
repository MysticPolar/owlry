/* Thin bridge kept for convenience: the snapshot→store mapping now lives in the
   store itself (useStore.applyServerSnapshot / syncFromServer) so there's a
   single source of truth and no store↔bridge import cycle. */
import { useStore } from './useStore';
import type { Snapshot } from '../lib/economy/types';

/** Map a server snapshot into the store's runtime shape (economy + library + profile). */
export function applySnapshot(s: Snapshot): void {
  useStore.getState().applyServerSnapshot(s);
}

/** Pull the latest snapshot from the server and apply it. */
export async function hydrateFromServer(): Promise<void> {
  await useStore.getState().syncFromServer();
}
