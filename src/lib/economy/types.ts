/* TypeScript mirror of the jsonb returned by the owlry_* RPCs, plus the
   client-side economy shapes shared by the guest simulation and the store. */
import type { BookId } from '../../content/types';

export type EconomyAction =
  | 'chat'
  | 'open'
  | 'turn_page'
  | 'preview'
  | 'finish'
  | 'save'
  | 'unsave'
  | 'checkin'
  | 'quote_keep'
  | 'purchase'
  | 'onboard';

export type ActionReason =
  | 'insufficient_ink'
  | 'insufficient_coins'
  | 'unknown_action'
  | 'not_authenticated';

/** A guard outcome. These are PARTIAL SUCCESSES — the library write landed,
    the grant did not — so `ok` stays true and the client reconciles against
    `granted`, never against what it asked for. */
export type WithheldReason =
  | 'rate_limited'
  | 'duplicate'
  | 'unverified'
  | 'insufficient_ink'
  | 'insufficient_coins';

/** what actually happened, as opposed to what the action is worth on paper */
export interface Granted {
  xp: number;
  ink: number;
  coins: number;
}

export interface ProfileSnapshot {
  /** 2 once the season-ledger migration is deployed; absent on the old 0-indexed server */
  schema_v?: number;
  total_xp: number;
  level: number;
  xp_into_level: number;
  xp_for_next: number;
  ink: number;
  ink_max: number;
  /** the resting line regen seeps up to */
  ink_rest?: number;
  coins: number;
  streak: number;
  username: string | null;
  /** the once-ever full-well bonus has been paid (ledger-derived) */
  ink_done?: boolean;
  season?: number;
}

export interface LibrarySnapshot {
  saved: BookId[];
  reading: BookId[];
  finished: BookId[];
  pagesRead: Record<string, number>;
}

export interface RadarPoint {
  dimension: string;
  value: number;
}

export interface CalendarDay {
  day: string; // YYYY-MM-DD
  owl_posts: number;
  previewed_book: BookId | null;
  /** the latest question asked that day (owlry_calendar_question migration) */
  asked?: string | null;
}

export interface StatsSnapshot {
  books_read: number;
  pages_turned: number;
  highlights: number;
  reading_minutes: number;
}

export interface QuoteRow {
  id: number;
  book: BookId;
  text: string;
  kept_at: string;
}

/** a ticket stub in the album. `n` distinguishes repeatable stubs (encore ×N). */
export interface StubRow {
  id: string;
  n?: number | null;
  at: string;
  season?: number;
}

export interface Snapshot {
  ok: boolean;
  profile: ProfileSnapshot;
  library: LibrarySnapshot;
  radar: RadarPoint[];
  calendar: CalendarDay[];
  stats: StatsSnapshot;
  quotes: QuoteRow[];
  stubs?: StubRow[];
  /** skus owned at the lobby stand (consumables excluded) */
  goods?: string[];
}

/** Result of owlry_perform_action — a Snapshot plus the action outcome. */
export interface ActionResult extends Partial<Snapshot> {
  ok: boolean;
  reason?: ActionReason;
  granted?: Granted;
  withheld?: WithheldReason | null;
  leveled_up?: boolean;
}

/* ---------- client-side (guest simulation + optimistic local delta) ---------- */

/** the lobby stand's stock */
export interface StandGood {
  sku: string;
  /** `bottle` and `slip` are consumables — bought again, never "owned" */
  kind: 'stationery' | 'marquee' | 'cushion' | 'bottle' | 'slip';
  price: number;
  /** null = evergreen; else only on sale that season */
  season: number | null;
}

/** a stub the reader has earned, kept locally for guests */
export interface StubRecord {
  id: string;
  /** repeatable stubs (encore) carry an index */
  n?: number;
  /** ISO timestamp — the album groups by season using this */
  at: string;
}

/** per-book earn marks, so a re-read can't re-earn what it already paid */
export interface BookEarn {
  /** highest 5% step (1..20) that has paid XP for this book */
  step?: number;
  open?: 1;
  save?: 1;
  finish?: 1;
}

/** one local day's counters — the guest side of the server's ledger guards */
export interface DailyCounters {
  /** local YYYY-MM-DD; a new day resets everything below */
  day: string;
  /** total XP granted today (the 150 ceiling) */
  xp: number;
  turn_page: number;
  open: number;
  chat: number;
  preview: number;
  quote_keep: number;
  checkin: boolean;
  /** an XP-bearing act before 18:00 local */
  matinee: boolean;
  /** an XP-bearing act at or after 18:00 local */
  evening: boolean;
  fullHouse: boolean;
  /** the daily small bottle has been bought */
  bottle: boolean;
  /** peek slips bought today — each one raises the day's letter ceiling by 1 */
  slips: number;
  /** epoch ms of the last XP-bearing page step (the 60s floor) */
  lastStepAt: number;
  /** epoch ms of this day's first and last XP-bearing acts (the marathon span) */
  firstAt: number;
  lastAt: number;
}
