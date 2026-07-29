/* ============================================================
   owlry — progress merge.

   The whole point of sync is to never lose progress, so when two
   devices' states meet we MERGE rather than pick a winner:
     • shelves   → union (a book you shelved anywhere stays shelved)
     • pagesRead → per-book max (never lose the furthest milestone)
     • readingPositions → newest exact anchor per uploaded copy
     • libraryBooks → newest capture per open-world slug
     • totalXp   → max, and the level is re-derived from it
     • coins/ink → max (currencies never shrink on merge)
     • streak    → travels with the later flame day, so a relight or an
                   honest reset can't be resurrected by a stale device
     • daily     → the later day wins; on the same day, per-counter max, so
                   device-hopping can't dodge a cap
     • earn/stubs/goods → union (an earned thing stays earned)
     • prefs     → newest preference write; onboarded if either saw it

   EVERY persisted field must be named here — the returned object is an
   explicit literal, so anything omitted is silently dropped on login.

   Pure and deterministic — unit-tested in scripts/sync-smoke.ts.
   ============================================================ */
import { QUOTE_HASH_MEMORY } from '../economy/config';
import { derive } from '../economy/engine';
import type { BookEarn, DailyCounters, StubRecord } from '../economy/types';
import type { PersistedState } from '../../store/types';
import type { BookId } from '../../content/types';
import { compareReadingPositionWrites } from '../ebook/positionOrder';

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

/** the later of two YYYY-MM-DD stamps (nulls lose) */
const laterDay = (a: string | null, b: string | null): string | null => {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
};

/** counters: the later day wins outright; a shared day takes the busier count */
function mergeDaily(a: DailyCounters, b: DailyCounters): DailyCounters {
  if (a.day !== b.day) return a.day >= b.day ? a : b;
  return {
    day: a.day,
    xp: Math.max(a.xp, b.xp),
    turn_page: Math.max(a.turn_page, b.turn_page),
    open: Math.max(a.open, b.open),
    chat: Math.max(a.chat, b.chat),
    preview: Math.max(a.preview, b.preview),
    quote_keep: Math.max(a.quote_keep, b.quote_keep),
    checkin: a.checkin || b.checkin,
    matinee: a.matinee || b.matinee,
    evening: a.evening || b.evening,
    fullHouse: a.fullHouse || b.fullHouse,
    bottle: a.bottle || b.bottle,
    lastStepAt: Math.max(a.lastStepAt, b.lastStepAt),
    // `Math.min(Infinity, Infinity) || 0` is Infinity — Infinity is truthy — so
    // the guard has to be explicit or a day with no acts yet poisons the
    // marathon span (and serialises to null in the blob)
    firstAt: [a.firstAt, b.firstAt].filter(Boolean).length
      ? Math.min(...[a.firstAt, b.firstAt].filter(Boolean))
      : 0,
    lastAt: Math.max(a.lastAt, b.lastAt),
  };
}

/** per-book earn marks: the furthest paid step, every step ever seen, all flags */
function mergeEarn(
  a: Record<string, BookEarn & { mask?: number }>,
  b: Record<string, BookEarn & { mask?: number }>,
): Record<string, BookEarn & { mask?: number }> {
  const out: Record<string, BookEarn & { mask?: number }> = {};
  for (const id of union(Object.keys(a), Object.keys(b))) {
    const x = a[id] ?? {};
    const y = b[id] ?? {};
    const mark: BookEarn & { mask?: number } = {};
    const step = Math.max(x.step ?? 0, y.step ?? 0);
    const mask = (x.mask ?? 0) | (y.mask ?? 0);
    if (step) mark.step = step;
    if (mask) mark.mask = mask;
    if (x.open || y.open) mark.open = 1;
    if (x.save || y.save) mark.save = 1;
    if (x.finish || y.finish) mark.finish = 1;
    out[id] = mark;
  }
  return out;
}

/** the album only ever gains; a stub keeps the earliest night it was earned */
function mergeStubs(a: StubRecord[], b: StubRecord[]): StubRecord[] {
  const byKey = new Map<string, StubRecord>();
  for (const s of [...a, ...b]) {
    const key = `${s.id}:${s.n ?? ''}`;
    const seen = byKey.get(key);
    if (!seen || s.at < seen.at) byKey.set(key, s);
  }
  return [...byKey.values()].sort((x, y) => (x.at < y.at ? -1 : 1));
}

export function mergeProgress(a: PersistedState, b: PersistedState): PersistedState {
  // No "further-along side" wins any more: every scalar is either max'd or
  // re-derived from the merged lifetime total, and prefs follow their own
  // write clock (prefsUpdatedAt) rather than progress.

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
      || compareReadingPositionWrites(position, current) > 0
    ) {
      readingPositions[id] = position;
    }
  }

  // Open-world metadata follows the account too. Prefer the newest capture;
  // canonical metadata breaks equal-clock ties so devices converge.
  const libraryBooks = { ...a.libraryBooks };
  for (const [id, persisted] of Object.entries(b.libraryBooks)) {
    const current = libraryBooks[id];
    if (
      !current
      || persisted.updatedAt > current.updatedAt
      || (
        persisted.updatedAt === current.updatedAt
        && compareText(tieKey(persisted.book), tieKey(current.book)) > 0
      )
    ) libraryBooks[id] = persisted;
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

  const quotedIds = union(a.quotedIds, b.quotedIds) as BookId[];
  const dislikedIds = union(a.dislikedIds, b.dislikedIds) as BookId[];

  // save stamps: the earliest wins (when the book was first hearted), and a
  // stamp only survives while its book is still on the shelf
  const savedAt: Record<string, number> = {};
  for (const [id, at] of [...Object.entries(a.savedAt), ...Object.entries(b.savedAt)]) {
    if (!savedIds.includes(id as BookId)) continue;
    savedAt[id] = Math.min(savedAt[id] ?? Infinity, at);
  }

  // the ratchet: lifetime XP only ever goes up, and the seat follows from it
  const totalXp = Math.max(a.totalXp, b.totalXp);
  const d = derive(totalXp);

  // the flame travels with the device that tended it most recently — so a
  // paid-for relight, or an honest reset to 1, can't be undone by a stale blob
  const streakLastDay = laterDay(a.streakLastDay, b.streakLastDay);
  const flame =
    a.streakLastDay === b.streakLastDay
      ? Math.max(a.streak, b.streak)
      : (a.streakLastDay === streakLastDay ? a : b).streak;

  return {
    totalXp,
    xp: d.xp,
    xpMax: d.xpMax,
    lv: d.lv,
    coins: Math.max(a.coins, b.coins),
    ink: Math.max(a.ink, b.ink),
    inkMax: Math.max(a.inkMax, b.inkMax),
    inkDone: a.inkDone || b.inkDone,
    streak: flame,
    savedIds,
    readingIds,
    finishedIds,
    quotedIds,
    dislikedIds,
    savedAt,
    pagesRead,
    readingPositions,
    libraryBooks,
    prefsUpdatedAt: Math.max(a.prefsUpdatedAt, b.prefsUpdatedAt),
    daily: mergeDaily(a.daily, b.daily),
    earn: mergeEarn(a.earn, b.earn),
    stubs: mergeStubs(a.stubs, b.stubs),
    quoteHashes: union(a.quoteHashes, b.quoteHashes).slice(-QUOTE_HASH_MEMORY),
    goods: union(a.goods, b.goods),
    streakLastDay,
    darkNightAt: laterDay(a.darkNightAt, b.darkNightAt),
    inkAt: Math.max(a.inkAt, b.inkAt),
    curveV: Math.max(a.curveV, b.curveV),
    economyVersion: Math.max(a.economyVersion, b.economyVersion),
    // Preferences have their own write order; sticky completion/intros merge.
    prefs: {
      ...prefsLead.prefs,
      onboarded: a.prefs.onboarded || b.prefs.onboarded,
      introsSeen: union(a.prefs.introsSeen ?? [], b.prefs.introsSeen ?? []),
    },
  };
}
