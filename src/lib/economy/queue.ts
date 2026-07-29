/* ============================================================
   owlry — the offline action queue.

   Reading happens on trains. Every economy action a signed-in reader
   takes is appended here first and drained in order, so a tunnel costs
   nobody their XP. Two properties make the replay safe:

   • every entry carries an idempotency key (device + sequence), and the
     ledger has a unique partial index on it — a retry can never pay twice;
   • every entry carries meta.occurred_at, and the server's guards
     evaluate THAT rather than arrival time — so a day's reading flushed
     in one burst isn't refused as "sixty seconds apart, please".
   ============================================================ */
import { get, set } from 'idb-keyval';
import { performAction } from './api';
import type { ActionResult, EconomyAction } from './types';

const QUEUE_KEY = 'owlry/econ-queue/v1';
const DEVICE_KEY = 'owlry/device/v1';

export interface QueuedAction {
  seq: number;
  action: EconomyAction;
  bookId: string | null;
  meta: Record<string, unknown>;
}

const keyFor = (userId: string): string => `${QUEUE_KEY}/${userId}`;

let deviceId: string | null = null;
let seq = 0;
/** one drain at a time — a second call rides the first one's tail */
let draining: Promise<ActionResult | null> = Promise.resolve(null);

async function device(): Promise<string> {
  if (deviceId) return deviceId;
  try {
    const stored = await get<string>(DEVICE_KEY);
    if (stored) {
      deviceId = stored;
      return stored;
    }
  } catch {
    /* private mode — fall through to an ephemeral id */
  }
  const fresh =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `d${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  deviceId = fresh;
  try {
    await set(DEVICE_KEY, fresh);
  } catch {
    /* best effort */
  }
  return fresh;
}

async function readQueue(userId: string): Promise<QueuedAction[]> {
  try {
    return (await get<QueuedAction[]>(keyFor(userId))) ?? [];
  } catch {
    return [];
  }
}

async function writeQueue(userId: string, items: QueuedAction[]): Promise<void> {
  try {
    await set(keyFor(userId), items);
  } catch {
    /* best effort */
  }
}

/**
 * Append an action and try to drain. Resolves with the last server result
 * (so the caller can reconcile), or null if nothing reached the server —
 * offline is not an error here, it's Tuesday.
 */
export async function enqueue(
  userId: string,
  action: EconomyAction,
  bookId: string | null,
  meta: Record<string, unknown>,
): Promise<ActionResult | null> {
  const dev = await device();
  seq += 1;
  const entry: QueuedAction = {
    seq,
    action,
    bookId,
    meta: { ...meta, idem: `${dev}:${Date.now().toString(36)}:${seq}` },
  };
  const items = await readQueue(userId);
  items.push(entry);
  await writeQueue(userId, items);
  return flush(userId);
}

/** Drain the queue in order. Stops at the first transport failure and keeps
    the remainder for the next attempt — order is the whole point. */
export function flush(userId: string): Promise<ActionResult | null> {
  draining = draining.then(async () => {
    let items = await readQueue(userId);
    let last: ActionResult | null = null;
    while (items.length) {
      const head = items[0];
      try {
        last = await performAction(head.action, head.bookId, head.meta);
      } catch {
        // transport failure — keep the queue intact and try again later
        return last;
      }
      items = (await readQueue(userId)).filter((q) => q.seq !== head.seq);
      await writeQueue(userId, items);
    }
    return last;
  });
  return draining;
}

/** how many actions are still waiting (for a quiet sync indicator) */
export async function pending(userId: string): Promise<number> {
  return (await readQueue(userId)).length;
}

/** drop a user's queue — used when signing out so nothing leaks across accounts */
export async function clearQueue(userId: string): Promise<void> {
  await writeQueue(userId, []);
}
