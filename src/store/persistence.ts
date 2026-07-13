/* ============================================================
   owlry — local persistence (the offline cache).

   The store keeps a local copy of the durable slice in IndexedDB,
   keyed by OWNER so a guest and each signed-in account never read
   each other's data on a shared device. Guests keep the original
   key, so existing local progress carries over untouched.

   Cloud sync (src/lib/sync/cloud.ts) layers on top for signed-in
   users; this file stays the always-on, offline-first cache.
   ============================================================ */
import { get, set } from 'idb-keyval';
import type { PersistedState } from './types';
import { normalizePersisted } from './normalize';

/** who owns a given local cache: the shared guest, or a user id */
export type Owner = 'guest' | string;

const GUEST_KEY = 'owlry/progress/v1';
const keyFor = (owner: Owner): string =>
  owner === 'guest' ? GUEST_KEY : `${GUEST_KEY}/${owner}`;

export async function loadLocal(owner: Owner): Promise<PersistedState | null> {
  try {
    const state = await get<unknown>(keyFor(owner));
    return state ? normalizePersisted(state) : null;
  } catch {
    return null;
  }
}

export async function saveLocal(owner: Owner, state: PersistedState): Promise<void> {
  try {
    await set(keyFor(owner), state);
  } catch {
    /* best-effort; private-mode / quota errors are non-fatal */
  }
}

export interface ProgressRepository {
  load(): Promise<PersistedState | null>;
  save(state: PersistedState): Promise<void>;
}

/** the guest-facing local repository (kept for the offline default path) */
export const repository: ProgressRepository = {
  load: () => loadLocal('guest'),
  save: (state) => saveLocal('guest', state),
};
