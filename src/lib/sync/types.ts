/* ============================================================
   What goes to the cloud. CloudState is the durable slice of the store
   (one jsonb row in owlry_council_state); councils travel separately, one
   row each in owlry_council_sessions (see sessions.ts).
   ============================================================ */
import type { Area } from '../../content/types';
import type { Highlight, Progress, TextSize } from '../../store/types';

export interface CloudState {
  v: 1;
  /** when a preference (interests, text size, profile, lastRead) last changed — newer wins on merge */
  prefsAt: number;
  user: { name: string; handle: string; bio: string };
  interests: Area[];
  onboarded: boolean;
  textSize: TextSize;
  saved: string[];
  progress: Record<string, Progress>;
  bookmarks: Record<string, number[]>;
  highlights: Highlight[];
  lastRead: { bookId: string; councilId?: string } | null;
  liked: string[];
  savedPosts: string[];
  following: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** never trust a blob's shape — a row written by an older/newer client still has to load */
export function normalizeCloudState(raw: unknown): CloudState | null {
  if (!isObj(raw)) return null;
  const u = isObj(raw.user) ? raw.user : {};
  const progress: Record<string, Progress> = {};
  if (isObj(raw.progress)) {
    for (const [k, p] of Object.entries(raw.progress)) {
      if (!isObj(p)) continue;
      progress[k] = {
        pct: typeof p.pct === 'number' ? Math.min(1, Math.max(0, p.pct)) : 0,
        pos: typeof p.pos === 'number' ? p.pos : 0,
        lastReadAt: typeof p.lastReadAt === 'number' ? p.lastReadAt : 0,
        status: p.status === 'completed' ? 'completed' : 'reading',
      };
    }
  }
  const bookmarks: Record<string, number[]> = {};
  if (isObj(raw.bookmarks)) {
    for (const [k, v] of Object.entries(raw.bookmarks)) {
      if (Array.isArray(v)) bookmarks[k] = v.filter((n): n is number => typeof n === 'number');
    }
  }
  const highlights: Highlight[] = Array.isArray(raw.highlights)
    ? raw.highlights
        .filter(isObj)
        .filter((h) => typeof h.id === 'string' && typeof h.bookId === 'string' && typeof h.text === 'string')
        .map((h) => ({
          id: h.id as string,
          bookId: h.bookId as string,
          text: h.text as string,
          ts: typeof h.ts === 'number' ? h.ts : 0,
          ...(typeof h.note === 'string' ? { note: h.note } : {}),
          ...(typeof h.councilId === 'string' ? { councilId: h.councilId } : {}),
        }))
    : [];
  const lr = isObj(raw.lastRead) && typeof raw.lastRead.bookId === 'string'
    ? { bookId: raw.lastRead.bookId, ...(typeof raw.lastRead.councilId === 'string' ? { councilId: raw.lastRead.councilId } : {}) }
    : null;
  const AREAS = ['health', 'career', 'investing', 'relationships', 'literature', 'other'];
  return {
    v: 1,
    prefsAt: typeof raw.prefsAt === 'number' ? raw.prefsAt : 0,
    user: {
      name: typeof u.name === 'string' ? u.name : 'Reader',
      handle: typeof u.handle === 'string' ? u.handle : 'reader',
      bio: typeof u.bio === 'string' ? u.bio : '',
    },
    interests: strings(raw.interests).filter((a): a is Area => AREAS.includes(a)),
    onboarded: raw.onboarded === true,
    textSize: raw.textSize === 'S' || raw.textSize === 'L' ? raw.textSize : 'M',
    saved: strings(raw.saved),
    progress,
    bookmarks,
    highlights,
    lastRead: lr,
    liked: strings(raw.liked),
    savedPosts: strings(raw.savedPosts),
    following: strings(raw.following),
  };
}
