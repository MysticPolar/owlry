/* ============================================================
   owlry — persistence layer.

   The store talks to a ProgressRepository, never to storage
   directly. v1 ships an IndexedDB implementation; swapping the one
   exported `repository` line for an `ApiRepository` moves the whole
   app to a backend with zero UI or store-shape changes.
   ============================================================ */
import { get, set } from 'idb-keyval';
import type { PersistedState } from './types';

const KEY = 'owlry/progress/v1';

export interface ProgressRepository {
  load(): Promise<PersistedState | null>;
  save(state: PersistedState): Promise<void>;
}

class IndexedDbRepository implements ProgressRepository {
  async load(): Promise<PersistedState | null> {
    try {
      return (await get<PersistedState>(KEY)) ?? null;
    } catch {
      return null;
    }
  }
  async save(state: PersistedState): Promise<void> {
    try {
      await set(KEY, state);
    } catch {
      /* best-effort; private-mode / quota errors are non-fatal */
    }
  }
}

// ── swap this single binding to move persistence to a backend ──
export const repository: ProgressRepository = new IndexedDbRepository();
