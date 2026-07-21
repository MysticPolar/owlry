/* ============================================================
   owlry — the home feed (Flat Playbill renovation).
   Scout is the implicit sole poster; each post is a catalog book
   whose one-line `q` tagline carries the voice. The order is a
   hand-tuned pass over the full 24-book catalog so the two-column
   waterfall opens with genre variety rather than clumps.
   ============================================================ */
import type { BookId, Genre } from './types';

/** Post order for the waterfall (all 24 catalog books, deduped, interleaved). */
export const FEED: BookId[] = [
  'piranesi', 'medit', 'snow', 'hail', 'rose', 'atomic',
  'goldfinch', 'tranq', 'none', 'gentle', 'circe', 'deep',
  'pachinko', 'kindred', 'sleep', 'frankl', 'cuckoo', 'beach',
  'remains', 'wws', 'oldman', 'spqr', 'pema', 'bird',
];

/** Tag-row genres in display order (each has ≥1 book). 'all' ("For you")
    is prepended by the UI. Labels come from i18n (today.home.tags). */
export const FEED_GENRES: Genre[] = ['fiction', 'life', 'scifi', 'mystery', 'history', 'romance'];

/**
 * A stable, plausible "kept by N readers" count for a feed post — derived
 * deterministically from the id so it never jumps between renders or reloads.
 * Placeholder social proof until a real signal exists; the like toggle itself
 * is session-local (matches the prototype's in-memory state).
 */
export function feedLikes(id: BookId): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 180 + (h % 1460); // 180–1639
}
