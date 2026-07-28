/* ============================================================
   owlry — progress merge.

   The whole point of sync is to never lose progress, so when two
   devices' states meet we MERGE rather than pick a winner:
     • shelves   → union (a book you shelved anywhere stays shelved)
     • pagesRead → per-book max (never lose the furthest milestone)
     • readingPositions → newest exact anchor per uploaded copy
     • level/xp  → the further-along side (level dominates, xp breaks ties)
     • coins/ink/streak → max (currencies never shrink on merge)
     • prefs     → newest preference write; onboarded if either saw it

   Pure and deterministic — unit-tested in scripts/sync-smoke.ts.
   ============================================================ */
import type { PersistedState } from '../../store/types';
import type { BookId } from '../../content/types';

/** total advancement: level dominates, xp within the level breaks ties */
const advancement = (s: PersistedState): number => s.lv * 1_000_000 + s.xp;

const compareText = (a: string, b: string): number => (
  a < b ? -1 : a > b ? 1 : 0
);

// Keep the primary device's established display order: several existing UI
// surfaces intentionally interpret these arrays as recency-ordered. Membership
// is the synced set; presentation order remains local when devices disagree.
const union = <T>(a: T[], b: T[]): T[] => Array.from(new Set([...a, ...b]));

/** Canonical JSON order gives same-millisecond leaf writes a stable final
    tie-break without requiring an already-deployed device-id field. */
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, canonical(child)]),
  );
};

const tieKey = (value: unknown): string => JSON.stringify(canonical(value));

const prefsTieKey = (prefs: PersistedState['prefs']): string => {
  // These fields have their own monotonic joins below and must not influence
  // which non-sticky preference payload wins an equal timestamp.
  const { onboarded: _onboarded, introsSeen: _introsSeen, ...rest } = prefs;
  return tieKey(rest);
};

export function mergeProgress(a: PersistedState, b: PersistedState): PersistedState {
  // scalars come from whichever side has progressed further
  const advancementOrder = advancement(a) - advancement(b) || a.xpMax - b.xpMax;
  const lead = advancementOrder >= 0 ? a : b;

  // reading position: keep the furthest page reached for every book
  const pagesRead: Record<string, number> = { ...a.pagesRead };
  for (const [id, page] of Object.entries(b.pagesRead)) {
    pagesRead[id] = Math.max(pagesRead[id] ?? 0, page);
  }

  // Exact resume anchors are intentionally not monotonic: a reader may move
  // backward and expect another device to reopen there. Each book-copy key gets
  // its own newest-write-wins slot, so an offline old edition cannot erase the
  // current edition's anchor.
  const readingPositions = { ...a.readingPositions };
  for (const [id, position] of Object.entries(b.readingPositions)) {
    const current = readingPositions[id];
    if (
      !current
      || position.updatedAt > current.updatedAt
      || (
        position.updatedAt === current.updatedAt
        && compareText(tieKey(position), tieKey(current)) > 0
      )
    ) {
      readingPositions[id] = position;
    }
  }

  // shelves union; a finished book must not linger in "reading"
  const finishedIds = union(a.finishedIds, b.finishedIds) as BookId[];
  const savedIds = union(a.savedIds, b.savedIds) as BookId[];
  const readingIds = (union(a.readingIds, b.readingIds) as BookId[]).filter(
    (id) => !finishedIds.includes(id),
  );
  const prefsOrder = a.prefsUpdatedAt - b.prefsUpdatedAt
    || compareText(prefsTieKey(a.prefs), prefsTieKey(b.prefs));
  const prefsLead = prefsOrder >= 0 ? a : b;

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
    readingPositions,
    prefsUpdatedAt: Math.max(a.prefsUpdatedAt, b.prefsUpdatedAt),
    // Preferences have their own write order; sticky completion/intros merge.
    prefs: {
      ...prefsLead.prefs,
      onboarded: a.prefs.onboarded || b.prefs.onboarded,
      introsSeen: union(a.prefs.introsSeen ?? [], b.prefs.introsSeen ?? []),
    },
  };
}
