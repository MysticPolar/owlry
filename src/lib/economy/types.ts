/* TypeScript mirror of the jsonb returned by the owlry_* RPCs. */
import type { BookId } from '../../content/types';

export type EconomyAction =
  | 'chat'
  | 'open'
  | 'turn_page'
  | 'preview'
  | 'finish'
  | 'save'
  | 'unsave'
  | 'checkin';

export type ActionReason =
  | 'insufficient_ink'
  | 'insufficient_coins'
  | 'unknown_action'
  | 'not_authenticated';

export interface ProfileSnapshot {
  total_xp: number;
  level: number;
  xp_into_level: number;
  xp_for_next: number;
  ink: number;
  ink_max: number;
  coins: number;
  streak: number;
  username: string | null;
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
  day: string; // YYYY-MM-DD (UTC)
  owl_posts: number;
  previewed_book: BookId | null;
  asked: string | null;
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

export interface Snapshot {
  ok: boolean;
  profile: ProfileSnapshot;
  library: LibrarySnapshot;
  radar: RadarPoint[];
  calendar: CalendarDay[];
  stats: StatsSnapshot;
  quotes: QuoteRow[];
}

/** Result of owlry_perform_action — a Snapshot plus the action outcome. */
export interface ActionResult extends Partial<Snapshot> {
  ok: boolean;
  reason?: ActionReason;
  leveled_up?: boolean;
}
