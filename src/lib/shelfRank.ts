/* ============================================================
   owlry — shelf ranking (the "my shelf" view on the home stage).

   Orders everything that is the reader's — reading, saved and finished
   merged into one pile — by how likely they are to want THIS one next,
   warmest first. The shelf is a pile, not a queue: a book you're 80
   pages into outranks one you hearted last night and never opened, and
   a book you've already finished sinks below both.

   Signal honesty (read this before adding weights):
   Only four inputs actually survive a reload — savedIds, readingIds,
   finishedIds and pagesRead are the ones extractPersisted() writes
   (src/store/useStore.ts). `peeked` (openedLetters) and `fromScout`
   (owl.collected) are session state: spines from successful Peeks at
   Scout's desk this session, empty on a cold load before any Peek.
   So they are deliberately small nudges — they refine
   an order that already stands up without them. If they ever become
   persisted, their weights can grow; until then nothing here silently
   depends on data that may not be there.

   The one thing we cannot do yet is rank by what the reader has
   TALKED ABOUT: OwlSession carries no topic memory, and dislikes are
   never written down. `fromScout` is the nearest honest proxy — it
   marks books the reader actually Peeked from a Scout recommendation.
   ============================================================ */
import type { BookRef, Genre } from '../content/types';
import { getBook } from './bookRegistry';

export interface ShelfSignals {
  /** the shelf itself — toggleSave APPENDS, so the newest save sits LAST */
  savedIds: BookRef[];
  readingIds: BookRef[];
  finishedIds: BookRef[];
  /** books the reader kept a line from */
  quotedIds: BookRef[];
  /** books waved off — they sink, and never seed the taste */
  dislikedIds: BookRef[];
  /** epoch ms per save; falls back to savedIds order when a stamp is missing */
  savedAt: Record<string, number>;
  pagesRead: Record<string, number>;
  /** session-only: letters the reader opened (a taste taken) */
  peeked?: BookRef[];
  /** session-only: books that arrived through a Scout conversation */
  fromScout?: BookRef[];
}

/* ---- weights ----
   Tuned so the tiers can't be climbed by accumulation: an untouched
   save can gather at most recency + genre + the two session nudges
   (85) and still sits below anything you've actually opened (100+). */
const W_READING = 100; // open right now — the strongest thing we know
const W_PROGRESS = 30; // how far in, on top of W_READING
const W_QUOTED = 45; // kept a line from it — favour, in the reader's own hand
const W_FINISHED = -55; // still yours, but you're done — sinks below the live shelf
const W_DISLIKED = -80; // waved off — stays reachable, sits last
const W_GENRE = 30; // matches the taste your own shelf describes
const W_RECENCY = 25; // hearted lately
const W_PEEKED = 12; // session-only nudge
const W_SCOUT = 18; // session-only nudge

/** what the shelf says the reader likes: genre → share of shelf (0..1) */
export function genreAffinity(s: ShelfSignals): Map<Genre, number> {
  const counts = new Map<Genre, number>();
  let total = 0;
  for (const id of [...s.savedIds, ...s.readingIds, ...s.finishedIds, ...s.quotedIds]) {
    if (s.dislikedIds.includes(id)) continue; // a waved-off book never seeds the taste
    const g = getBook(id)?.g;
    if (!g) continue;
    counts.set(g, (counts.get(g) ?? 0) + 1);
    total++;
  }
  if (!total) return counts;
  for (const [g, n] of counts) counts.set(g, n / total);
  return counts;
}

/**
 * Score one shelved book. `recency` is 0 (oldest save) → 1 (newest).
 * Exported so the ordering can be asserted directly in a smoke test.
 */
export function scoreShelfBook(
  id: BookRef,
  s: ShelfSignals,
  affinity: Map<Genre, number>,
  recency: number,
): number {
  const b = getBook(id);
  const finished = s.finishedIds.includes(id);
  let score = 0;

  // "reading" means open and unfinished — a finished book is done, not in progress
  if (s.readingIds.includes(id) && !finished) {
    score += W_READING;
    // progress only counts when we know the length (open-world slugs may not)
    const pages = s.pagesRead[id as string] ?? 0;
    if (b?.n) score += W_PROGRESS * Math.min(1, pages / b.n);
  }
  if (s.quotedIds.includes(id)) score += W_QUOTED;
  if (finished) score += W_FINISHED;
  if (s.dislikedIds.includes(id)) score += W_DISLIKED;

  if (b?.g) score += W_GENRE * (affinity.get(b.g) ?? 0);
  score += W_RECENCY * recency;

  if (s.peeked?.includes(id)) score += W_PEEKED;
  if (s.fromScout?.includes(id)) score += W_SCOUT;

  return score;
}

/**
 * Everything that is the reader's: reading + saved + finished, deduped.
 * A book you're 100 pages into belongs on your shelf whether or not you
 * ever tapped the heart, so the home shelf merges what the Library screen
 * keeps as three separate tabs.
 */
export function shelfContents(s: ShelfSignals): BookRef[] {
  // a book you've finished is no longer "in progress", so it leaves the reading bucket
  const reading = s.readingIds.filter((id) => !s.finishedIds.includes(id));
  // baseline order before scoring: open books, newest saves, quoted, then finished
  return [
    ...new Set([...reading, ...[...s.savedIds].reverse(), ...s.quotedIds, ...s.finishedIds]),
  ];
}

/**
 * Save recency as 0 (oldest) → 1 (newest). Prefers real `savedAt` stamps and
 * falls back to append order for profiles saved before stamping existed —
 * an unstamped save is treated as older than any stamped one, which is what
 * it is.
 */
function savedRecency(s: ShelfSignals): Map<BookRef, number> {
  const ordered = s.savedIds
    .map((id, i) => ({ id, i, at: s.savedAt[id as string] }))
    .sort((a, b) => {
      if (a.at != null && b.at != null) return a.at - b.at;
      if (a.at != null) return 1;
      if (b.at != null) return -1;
      return a.i - b.i;
    });
  const last = ordered.length - 1;
  const out = new Map<BookRef, number>();
  ordered.forEach((e, i) => out.set(e.id, last > 0 ? i / last : 1));
  return out;
}

/**
 * The shelf, warmest first. Ties fall back to the baseline order above
 * (Array.sort is stable), so the order holds still across renders — no
 * reshuffling under the reader's thumb.
 */
export function rankShelf(s: ShelfSignals): BookRef[] {
  const affinity = genreAffinity(s);
  const recencyOf = savedRecency(s);

  return shelfContents(s)
    .map((id) => ({ id, score: scoreShelfBook(id, s, affinity, recencyOf.get(id) ?? 0) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.id);
}
