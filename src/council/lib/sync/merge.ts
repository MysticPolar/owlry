/* ============================================================
   Merging two copies of a reader's state. Same principle as the classic
   app's mergeProgress: never lose progress, so two devices' states MERGE
   rather than pick a winner.
     • saved books, bookmarks, highlights, liked/saved posts, follows → union
     • reading progress → per book: the furthest pct, the newest position,
       completed is sticky
     • interests, text size, profile, lastRead → the newer write wins
       (`prefsAt` stamps every preference change)
     • onboarded → true if either side saw it
   Council sessions are merged per id by updatedAt in sessions.ts.

   EVERY field of CloudState must be named here — the returned object is
   an explicit literal, so anything omitted is silently dropped on login.
   ============================================================ */
import type { CloudState } from './types';
import type { Highlight, Progress } from '../../store/types';

const union = <T>(a: T[], b: T[]): T[] => Array.from(new Set([...a, ...b]));

function mergeProgress(a: Record<string, Progress>, b: Record<string, Progress>): Record<string, Progress> {
  const out: Record<string, Progress> = {};
  for (const id of union(Object.keys(a), Object.keys(b))) {
    const x = a[id];
    const y = b[id];
    if (!x || !y) {
      out[id] = x ?? y;
      continue;
    }
    const newer = x.lastReadAt >= y.lastReadAt ? x : y;
    out[id] = {
      pct: Math.max(x.pct, y.pct),
      pos: newer.pos,
      lastReadAt: Math.max(x.lastReadAt, y.lastReadAt),
      status: x.status === 'completed' || y.status === 'completed' ? 'completed' : 'reading',
    };
  }
  return out;
}

function mergeBookmarks(a: Record<string, number[]>, b: Record<string, number[]>): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const id of union(Object.keys(a), Object.keys(b))) {
    out[id] = union(a[id] ?? [], b[id] ?? []).sort((p, q) => p - q);
  }
  return out;
}

function mergeHighlights(a: Highlight[], b: Highlight[]): Highlight[] {
  const byId = new Map<string, Highlight>();
  for (const h of [...b, ...a]) byId.set(h.id, h); // local (a) wins on the same id — its note may be newer
  return Array.from(byId.values()).sort((x, y) => y.ts - x.ts);
}

export function mergeState(local: CloudState, cloud: CloudState): CloudState {
  const newer = local.prefsAt >= cloud.prefsAt ? local : cloud;
  return {
    v: 1,
    prefsAt: Math.max(local.prefsAt, cloud.prefsAt),
    user: { ...newer.user },
    interests: [...newer.interests],
    onboarded: local.onboarded || cloud.onboarded,
    textSize: newer.textSize,
    ...(newer.lang ?? local.lang ?? cloud.lang ? { lang: newer.lang ?? local.lang ?? cloud.lang } : {}),
    saved: union(local.saved, cloud.saved),
    progress: mergeProgress(local.progress, cloud.progress),
    bookmarks: mergeBookmarks(local.bookmarks, cloud.bookmarks),
    highlights: mergeHighlights(local.highlights, cloud.highlights),
    lastRead: newer.lastRead ? { ...newer.lastRead } : (local.lastRead ?? cloud.lastRead),
    liked: union(local.liked, cloud.liked),
    savedPosts: union(local.savedPosts, cloud.savedPosts),
    following: union(local.following, cloud.following),
  };
}

/** a structural equality good enough to skip no-op pushes */
export const sameState = (a: CloudState, b: CloudState): boolean => JSON.stringify(a) === JSON.stringify(b);
