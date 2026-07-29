/* ============================================================
   owlry — snapshot → store shape.

   Kept apart from the store so both the store (reconciling after an
   action) and store/backend.ts (first paint) can use it without an
   import cycle.
   ============================================================ */
import { derive } from './engine';
import type {
  CalendarDay,
  QuoteRow,
  RadarPoint,
  Snapshot,
  StatsSnapshot,
  StubRecord,
} from './types';

export interface SnapshotPatch {
  totalXp: number;
  xp: number;
  xpMax: number;
  lv: number;
  ink: number;
  inkMax: number;
  coins: number;
  streak: number;
  inkDone?: boolean;
  savedIds: Snapshot['library']['saved'];
  readingIds: Snapshot['library']['reading'];
  finishedIds: Snapshot['library']['finished'];
  pagesRead: Record<string, number>;
  stubs?: StubRecord[];
  goods?: string[];
  inkAt: number;
  /** session-only profile read-models — guest keeps content seeds instead */
  profileRadar: RadarPoint[];
  profileCalendar: CalendarDay[];
  profileStats: StatsSnapshot;
  profileQuotes: QuoteRow[];
}

/**
 * The server's word, in the store's shape.
 *
 * Everything the seat map and the bars read is derived from `total_xp`, not
 * from the server's `level` — one unambiguous number. That also sidesteps the
 * live server's 0-indexed display level (the season-ledger migration returns
 * schema_v 2 and a 1-indexed level; older deployments report neither).
 * `derive` clamps the seat at the front row and turns the bar into encore
 * progress past it.
 */
export function snapshotPatch(s: Snapshot): SnapshotPatch | null {
  if (!s?.profile || !s.library) return null;
  const p = s.profile;
  const d = derive(p.total_xp);

  const patch: SnapshotPatch = {
    totalXp: p.total_xp,
    xp: d.xp,
    xpMax: d.xpMax,
    lv: d.lv,
    ink: p.ink,
    inkMax: p.ink_max,
    coins: p.coins,
    streak: p.streak,
    savedIds: s.library.saved,
    readingIds: s.library.reading,
    finishedIds: s.library.finished,
    pagesRead: s.library.pagesRead,
    // the server's clock is the one that counts; the local regen restarts here
    inkAt: Date.now(),
    // always replace — empty arrays mean a quiet new account, not "keep Mira's demo"
    profileRadar: Array.isArray(s.radar) ? s.radar : [],
    profileCalendar: Array.isArray(s.calendar) ? s.calendar : [],
    profileStats: s.stats ?? {
      books_read: 0,
      pages_turned: 0,
      highlights: 0,
      reading_minutes: 0,
    },
    profileQuotes: Array.isArray(s.quotes) ? s.quotes : [],
  };

  // the +50 latch is ledger-derived server-side, so the client copy can never
  // pay a second time
  if (typeof p.ink_done === 'boolean') patch.inkDone = p.ink_done;
  if (s.stubs) {
    patch.stubs = s.stubs.map((row) => ({
      id: row.id,
      ...(row.n === null || row.n === undefined ? {} : { n: row.n }),
      at: row.at,
    }));
  }
  if (s.goods) patch.goods = s.goods;
  return patch;
}
