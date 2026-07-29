/* Bridge between the server snapshot and the Zustand store.
   For a signed-in reader the server is the authority: this is where its word
   replaces the optimistic local delta — economy, library, AND the profile
   read-models (radar / calendar / stats / quotes). The mapping itself lives
   in lib/economy/snapshot.ts so the store can use it too, without a cycle. */
import { useStore } from './useStore';
import { getSnapshot } from '../lib/economy/api';
import { snapshotPatch } from '../lib/economy/snapshot';
import type { Snapshot } from '../lib/economy/types';

/** Map a server snapshot into the store's runtime shape (economy + library). */
export function applySnapshot(s: Snapshot): void {
  const patch = snapshotPatch(s);
  if (patch) useStore.setState(patch);
}

/** Pull the latest snapshot from the server and apply it. */
export async function hydrateFromServer(): Promise<void> {
  applySnapshot(await getSnapshot());
}
