/* ============================================================
   owlry — progress merge.

   The whole point of sync is to never lose progress, so when two
   devices' states meet we MERGE rather than pick a winner:
     • shelves   → union (a book you shelved anywhere stays shelved)
     • pagesRead → per-book max (never rewind your reading position)
     • level/xp  → the further-along side (level dominates, xp breaks ties)
     • coins/ink/streak → max (currencies never shrink on merge)
     • prefs     → from the further-along side; onboarded if either saw it

   Pure and deterministic — unit-tested in scripts/sync-smoke.ts.
   ============================================================ */
import type { PersistedState } from '../../store/types';
import type { BookId } from '../../content/types';

/** total advancement: level dominates, xp within the level breaks ties */
const advancement = (s: PersistedState): number => s.lv * 1_000_000 + s.xp;

const union = <T>(a: T[], b: T[]): T[] => Array.from(new Set([...a, ...b]));

export function mergeProgress(a: PersistedState, b: PersistedState): PersistedState {
  // scalars come from whichever side has progressed further
  const lead = advancement(a) >= advancement(b) ? a : b;

  // reading position: keep the furthest page reached for every book
  const pagesRead: Record<string, number> = { ...a.pagesRead };
  for (const [id, page] of Object.entries(b.pagesRead)) {
    pagesRead[id] = Math.max(pagesRead[id] ?? 0, page);
  }

  // shelves union; a finished book must not linger in "reading"
  const finishedIds = union(a.finishedIds, b.finishedIds) as BookId[];
  const savedIds = union(a.savedIds, b.savedIds) as BookId[];
  const readingIds = (union(a.readingIds, b.readingIds) as BookId[]).filter(
    (id) => !finishedIds.includes(id),
  );

  return {
    xp: lead.xp,
    xpMax: lead.xpMax,
    lv: lead.lv,
    coins: Math.max(a.coins, b.coins),
    ink: Math.max(a.ink, b.ink),
    inkMax: Math.max(a.inkMax, b.inkMax),
    inkDone: a.inkDone || b.inkDone,
    streak: Math.max(a.streak, b.streak),
    savedIds,
    readingIds,
    finishedIds,
    pagesRead,
    // prefs follow the further-along device, but "seen onboarding" is sticky
    prefs: { ...lead.prefs, onboarded: a.prefs.onboarded || b.prefs.onboarded },
  };
}
