/* ============================================================
   The store. Zustand, persisted to localStorage so "save and return"
   works across reloads. Persistence is the first seam for the backend:
   swap the storage adapter (or sync the persisted slice) without touching
   the screens.
   ============================================================ */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { uid } from '../app/ids';
import type { Area } from '../content/types';
import type { CouncilSession, Highlight, Message, Post, Progress, Segment, TextSize, Toast, UserProfile } from './types';
import * as engine from '../engine/council';
import { seedPosts, seedHighlights, FOLLOWING } from '../content/social';
import { liveOpen, liveTurn } from '../lib/councilClient';
import * as social from '../lib/social/api';
import { council } from '../content/councils';
import { detectLang, getActiveLang, setActiveLang, type Lang } from '../i18n';
import { UI } from '../i18n/ui';

// the content accessors read the active language; seed content for a first
// visit follows the browser (the persisted choice, if any, is applied in main.tsx)
setActiveLang(detectLang());

export interface StoreState {
  user: UserProfile;
  interests: Area[];
  onboarded: boolean;

  councils: Record<string, CouncilSession>;
  councilOrder: string[];
  activeCouncilId: string | null;

  saved: string[];
  progress: Record<string, Progress>;
  bookmarks: Record<string, number[]>;
  highlights: Highlight[];
  lastRead: { bookId: string; councilId?: string } | null;

  posts: Post[];
  liked: string[];
  savedPosts: string[];
  following: string[];

  textSize: TextSize;
  toast: Toast | null;
  /** the interface + content language; the councils' scripted lines are rebuilt when it changes */
  lang: Lang;
  /** when a preference (interests, text size, profile, lastRead) last changed — newer wins when devices merge */
  prefsAt: number;

  // --- account
  setProfile: (p: Partial<UserProfile>) => void;
  signIn: (name: string, handle?: string) => void;
  signOut: () => void;
  setInterests: (areas: Area[]) => void;
  setOnboarded: (v: boolean) => void;

  // --- council
  ask: (question: string, councilId?: string) => string;
  setActiveCouncil: (id: string | null) => void;
  joinDiscussion: (id: string) => void;
  reveal: (id: string) => void;
  revealAll: (id: string) => void;
  sendFollowUp: (id: string, text: string, target?: string) => void;
  addContext: (id: string, text: string) => void;
  replaceSeat: (id: string, seat: number, to?: string) => void;
  undoReplace: (id: string) => void;
  bringPassage: (bookId: string, text: string) => string | null;
  setCouncilSaved: (id: string, saved: boolean) => void;

  // --- library
  toggleSaved: (bookId: string) => void;
  setProgress: (bookId: string, pct: number, pos: number, councilId?: string) => void;
  markCompleted: (bookId: string) => void;
  toggleBookmark: (bookId: string, pos: number) => void;
  addHighlight: (bookId: string, text: string, councilId?: string) => Highlight;
  removeHighlight: (id: string) => void;

  // --- social
  addPost: (p: Omit<Post, 'id' | 'ts' | 'likes' | 'comments' | 'mine' | 'author'>) => void;
  /** replace the cloud half of the feed (seed posts stay) */
  applyFeed: (feed: social.Feed) => void;
  toggleLike: (id: string) => void;
  toggleSavePost: (id: string) => void;
  toggleFollow: (handle: string) => void;

  // --- prefs + ui
  setTextSize: (s: TextSize) => void;
  setLang: (l: Lang) => void;
  showToast: (text: string, action?: Toast['action']) => void;
  dismissToast: () => void;
  resetDemo: () => void;
}

const DEMO_USER: UserProfile = { name: 'Good Reader', handle: 'goodreader', bio: 'A curious life.', signedIn: false, initial: 'G' };

function seedState() {
  const now = Date.now();
  // a council from "two days ago", already summarised, so the library and profile have history to show
  let past = engine.createSession('What is a good life?', ['other'], 'good-life');
  past = { ...past, revealed: past.messages.length, stage: 'summarized', createdAt: now - 2 * 86400_000, updatedAt: now - 2 * 86400_000, saved: true };
  const seeds = seedHighlights();
  const highlights: Highlight[] = [
    { id: 'h_seed1', bookId: 'meditations', text: seeds.meditations, ts: now - 3 * 86400_000 },
    { id: 'h_seed2', bookId: 'atomic-habits', text: seeds.atomicHabits, ts: now - 6 * 86400_000, note: seeds.note },
  ];
  return {
    user: DEMO_USER,
    interests: [] as Area[],
    onboarded: false,
    councils: { [past.id]: past },
    councilOrder: [past.id],
    activeCouncilId: null,
    saved: ['meditations', 'almanack', 'second-sex', 'sapiens', 'atomic-habits', 'daily-stoic'],
    progress: {
      meditations: { pct: 0.35, pos: 0, lastReadAt: now - 1 * 86400_000, status: 'reading' as const },
      'atomic-habits': { pct: 1, pos: 0, lastReadAt: now - 6 * 86400_000, status: 'completed' as const },
      sapiens: { pct: 0.6, pos: 0, lastReadAt: now - 9 * 86400_000, status: 'reading' as const },
      'daily-stoic': { pct: 0.12, pos: 0, lastReadAt: now - 12 * 86400_000, status: 'reading' as const },
    } as Record<string, Progress>,
    bookmarks: {} as Record<string, number[]>,
    highlights,
    lastRead: { bookId: 'meditations' } as { bookId: string; councilId?: string } | null,
    posts: seedPosts(now),
    liked: [] as string[],
    savedPosts: [] as string[],
    following: [...FOLLOWING],
    textSize: 'M' as TextSize,
    toast: null as Toast | null,
    lang: getActiveLang(),
    prefsAt: 0,
  };
}

/* ---------- the live council ----------
   The scripted session is created first and shown at once; the live words
   overlay the same messages when they arrive. While a message waits, playback
   pauses on it (see reveal). A failed call simply clears the wait. */

type Setter = (fn: (s: StoreState) => Partial<StoreState>) => void;

function patch(set: Setter, id: string, fn: (c: CouncilSession) => Partial<CouncilSession> | null) {
  set((s) => {
    const c = s.councils[id];
    if (!c) return {};
    const p = fn(c);
    if (!p) return {};
    return { councils: { ...s.councils, [id]: engine.rebuild({ ...c, ...p }) } };
  });
}

/** ask the live council for the opening; overlay r1/r2 and the cards when it answers */
function requestOpening(set: Setter, session: CouncilSession) {
  const waiting = session.messages.filter((m) => m.kind === 'figure' && (m.slot === 'r1' || m.slot === 'r2')).map((m) => m.id);
  patch(set, session.id, () => ({ pending: waiting }));
  void liveOpen(session).then((res) => {
    patch(set, session.id, (c) => {
      const pending = (c.pending ?? []).filter((id) => !waiting.includes(id));
      // the seats moved on (replace/undo) while we waited — those words are for another council
      if (!res || !res.overrides.seats.every((id, i) => id === c.seats[i])) return { pending };
      const bySeat = new Map(res.lines.map((l) => [`${l.slot}:${l.seat}`, l.segments]));
      const messages = c.messages.map((m) => {
        if (m.kind !== 'figure' || m.seat === undefined || (m.slot !== 'r1' && m.slot !== 'r2')) return m;
        const live = bySeat.get(`${m.slot}:${m.seat}`);
        return live ? { ...m, live } : m;
      });
      return { messages, live: res.overrides, source: 'live', pending, updatedAt: Date.now() };
    });
  });
}

/** ask the live council for the replies to the newest user message */
function requestTurn(set: Setter, session: CouncilSession) {
  const targets = engine.latestFigureMessages(session);
  let user: Message | undefined;
  for (let i = session.messages.length - 1; i >= 0; i--) {
    if (session.messages[i].kind === 'user') {
      user = session.messages[i];
      break;
    }
  }
  if (!user || !targets.length) return;
  const waiting = targets.map((m) => m.id);
  patch(set, session.id, () => ({ pending: waiting }));
  void liveTurn(session, user, targets).then((res) => {
    patch(set, session.id, (c) => {
      const pending = (c.pending ?? []).filter((id) => !waiting.includes(id));
      if (!res) return { pending };
      const messages = c.messages.map((m) => (res[m.id] && m.figureId === session.seats[m.seat ?? 0] ? { ...m, live: res[m.id] } : m));
      return { pending, messages, source: 'live', updatedAt: Date.now() };
    });
  });
}

/** the live words a session currently holds, keyed by message id — stashed on Replace so Undo can restore them */
function liveLines(c: CouncilSession): Record<string, Segment[]> {
  const out: Record<string, Segment[]> = {};
  for (const m of c.messages) if (m.live) out[m.id] = m.live;
  return out;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...seedState(),

      setProfile: (p) => set((s) => ({ user: { ...s.user, ...p }, prefsAt: Date.now() })),
      signIn: (name, handle) =>
        set((s) => ({
          user: {
            ...s.user,
            name: name || s.user.name,
            handle: handle || s.user.handle,
            initial: (name || s.user.name).trim().charAt(0).toUpperCase() || 'G',
            signedIn: true,
          },
          prefsAt: Date.now(),
        })),
      signOut: () => set((s) => ({ user: { ...s.user, signedIn: false, id: undefined, email: undefined }, prefsAt: Date.now() })),
      setInterests: (areas) => set({ interests: areas, prefsAt: Date.now() }),
      setOnboarded: (v) => set({ onboarded: v }),

      ask: (question, councilId) => {
        const session = engine.createSession(question, get().interests, councilId);
        set((s) => ({
          councils: { ...s.councils, [session.id]: session },
          councilOrder: [session.id, ...s.councilOrder],
          activeCouncilId: session.id,
          onboarded: true,
        }));
        requestOpening(set, session);
        return session.id;
      },
      setActiveCouncil: (id) => set({ activeCouncilId: id }),
      joinDiscussion: (id) =>
        set((s) => {
          const c = s.councils[id];
          if (!c || c.stage !== 'convening') return {};
          return { councils: { ...s.councils, [id]: { ...c, stage: 'live', updatedAt: Date.now() } }, activeCouncilId: id };
        }),
      reveal: (id) =>
        set((s) => {
          const c = s.councils[id];
          if (!c || c.revealed >= c.messages.length) return {};
          // the next line is still being written by the live council — keep the typing indicator up
          if (c.pending?.includes(c.messages[c.revealed].id)) return {};
          const revealed = c.revealed + 1;
          const stage = revealed >= c.messages.length ? 'summarized' : c.stage === 'convening' ? 'live' : c.stage;
          return { councils: { ...s.councils, [id]: { ...c, revealed, stage } } };
        }),
      revealAll: (id) =>
        set((s) => {
          const c = s.councils[id];
          if (!c) return {};
          // "View summary" doesn't wait on the live council: what it has not written yet stays scripted
          return { councils: { ...s.councils, [id]: { ...c, revealed: c.messages.length, stage: 'summarized', pending: [] } } };
        }),
      sendFollowUp: (id, text, target) => {
        const c = get().councils[id];
        if (!c || !text.trim()) return;
        const next = engine.followUp({ ...c, revealed: c.messages.length }, text, target);
        // the user's line shows at once; the replies type in
        const session: CouncilSession = { ...next, revealed: c.messages.length + 1, stage: 'summarized' };
        set((s) => ({ councils: { ...s.councils, [id]: session } }));
        requestTurn(set, session);
      },
      addContext: (id, text) => {
        const c = get().councils[id];
        if (!c || !text.trim()) return;
        const next = engine.addContext({ ...c, revealed: c.messages.length }, text);
        const session: CouncilSession = { ...next, revealed: c.messages.length + 1, stage: 'summarized' };
        set((s) => ({ councils: { ...s.councils, [id]: session } }));
        requestTurn(set, session);
      },
      replaceSeat: (id, seat, to) => {
        const c = get().councils[id];
        if (!c) return;
        let next = engine.replaceSeat(c, seat, to);
        if (next === c) return;
        if (c.source === 'live') {
          // the others' live replies name the old thinker — drop every live line (Undo brings them back) and re-open live
          const restore = { live: c.live, lines: liveLines(c) };
          const replaced = next.replaced.map((r, i) => (i === next.replaced.length - 1 ? { ...r, restore } : r));
          next = engine.rebuild({ ...next, replaced, live: undefined, messages: next.messages.map((m) => (m.live ? { ...m, live: undefined } : m)) });
          set((s) => ({ councils: { ...s.councils, [id]: next } }));
          requestOpening(set, next);
          return;
        }
        set((s) => ({ councils: { ...s.councils, [id]: next } }));
      },
      undoReplace: (id) => {
        const c = get().councils[id];
        if (!c) return;
        const last = c.replaced[c.replaced.length - 1];
        let next = engine.undoReplace(c);
        if (last?.restore) {
          const lines = last.restore.lines;
          next = engine.rebuild({
            ...next,
            live: last.restore.live,
            pending: [],
            messages: next.messages.map((m) => (lines[m.id] ? { ...m, live: lines[m.id] } : m)),
          });
        }
        set((s) => ({ councils: { ...s.councils, [id]: next } }));
      },
      bringPassage: (bookId, text) => {
        const s = get();
        const id = s.lastRead?.councilId ?? s.activeCouncilId ?? s.councilOrder[0];
        const c = id ? s.councils[id] : undefined;
        if (!c) return null;
        const next = engine.bringPassage({ ...c, revealed: c.messages.length }, bookId, text);
        const session: CouncilSession = { ...next, revealed: c.messages.length + 1, stage: 'summarized' };
        set((st) => ({ councils: { ...st.councils, [c.id]: session }, activeCouncilId: c.id }));
        requestTurn(set, session);
        return c.id;
      },
      setCouncilSaved: (id, saved) =>
        set((s) => {
          const c = s.councils[id];
          if (!c) return {};
          return { councils: { ...s.councils, [id]: { ...c, saved } } };
        }),

      toggleSaved: (bookId) =>
        set((s) => ({ saved: s.saved.includes(bookId) ? s.saved.filter((b) => b !== bookId) : [bookId, ...s.saved] })),
      setProgress: (bookId, pct, pos, councilId) =>
        set((s) => {
          const prev = s.progress[bookId];
          const status = prev?.status === 'completed' || pct >= 0.98 ? 'completed' : 'reading';
          return {
            progress: { ...s.progress, [bookId]: { pct: Math.max(prev?.pct ?? 0, pct), pos, lastReadAt: Date.now(), status } },
            lastRead: { bookId, councilId: councilId ?? s.lastRead?.councilId },
            prefsAt: Date.now(),
          };
        }),
      markCompleted: (bookId) =>
        set((s) => ({ progress: { ...s.progress, [bookId]: { ...(s.progress[bookId] ?? { pos: 0 }), pct: 1, lastReadAt: Date.now(), status: 'completed' } } })),
      toggleBookmark: (bookId, pos) =>
        set((s) => {
          const list = s.bookmarks[bookId] ?? [];
          const near = list.find((p) => Math.abs(p - pos) < 40);
          const next = near !== undefined ? list.filter((p) => p !== near) : [...list, pos].sort((a, b) => a - b);
          return { bookmarks: { ...s.bookmarks, [bookId]: next } };
        }),
      addHighlight: (bookId, text, councilId) => {
        const h: Highlight = { id: uid('h'), bookId, text: text.trim(), ts: Date.now(), councilId };
        set((s) => ({ highlights: [h, ...s.highlights] }));
        return h;
      },
      removeHighlight: (id) => set((s) => ({ highlights: s.highlights.filter((h) => h.id !== id) })),

      addPost: (p) => {
        const s = get();
        const local = (id: string, remote: boolean): Post => ({
          ...p,
          id,
          ts: Date.now(),
          likes: 0,
          comments: 0,
          mine: true,
          remote,
          author: { handle: s.user.handle, name: s.user.name, color: '#FFD100', initial: s.user.initial },
        });
        if (s.user.id) {
          // signed in: the post lives in the cloud feed; shown at once, taken back if the write fails
          const tempId = uid('p');
          set((st) => ({ posts: [local(tempId, true), ...st.posts] }));
          void social
            .createPost(p)
            .then((id) => {
              if (id) set((st) => ({ posts: st.posts.map((x) => (x.id === tempId ? { ...x, id } : x)) }));
            })
            .catch(() => {
              set((st) => ({ posts: st.posts.filter((x) => x.id !== tempId), toast: { id: uid('t'), text: UI[st.lang].social.cantShare } }));
            });
          return;
        }
        set((st) => ({ posts: [local(uid('p'), false), ...st.posts] }));
      },
      toggleLike: (id) => {
        const s = get();
        const on = s.liked.includes(id);
        set({
          liked: on ? s.liked.filter((x) => x !== id) : [...s.liked, id],
          posts: s.posts.map((p) => (p.id === id ? { ...p, likes: Math.max(0, p.likes + (on ? -1 : 1)) } : p)),
        });
        if (s.user.id && s.posts.find((p) => p.id === id)?.remote) void social.setLike(id, !on).catch(() => {});
      },
      toggleSavePost: (id) =>
        set((s) => ({ savedPosts: s.savedPosts.includes(id) ? s.savedPosts.filter((x) => x !== id) : [...s.savedPosts, id] })),
      toggleFollow: (handle) => {
        const s = get();
        const on = s.following.includes(handle);
        set({ following: on ? s.following.filter((h) => h !== handle) : [...s.following, handle] });
        if (s.user.id) void social.setFollow(handle, !on).catch(() => {});
      },
      applyFeed: (feed) =>
        set((s) => {
          const seeds = s.posts.filter((p) => !p.remote);
          const seedIds = new Set(seeds.map((p) => p.id));
          return {
            posts: [...feed.posts, ...seeds].sort((a, b) => b.ts - a.ts),
            liked: Array.from(new Set([...s.liked.filter((id) => seedIds.has(id)), ...feed.liked])),
            following: Array.from(new Set([...s.following, ...feed.following])),
          };
        }),

      setTextSize: (textSize) => set({ textSize, prefsAt: Date.now() }),
      setLang: (lang) => {
        if (lang === get().lang && lang === getActiveLang()) return;
        setActiveLang(lang);
        // every scripted line, title and card is regenerated from the localised scripts; live lines stay as written
        set((s) => {
          const councils: Record<string, CouncilSession> = {};
          for (const [id, c] of Object.entries(s.councils)) councils[id] = engine.rebuild({ ...c, title: council(c.scriptId).title });
          return { lang, councils, prefsAt: Date.now() };
        });
      },
      showToast: (text, action) => set({ toast: { id: uid('t'), text, action } }),
      dismissToast: () => set({ toast: null }),
      resetDemo: () => set({ ...seedState() }),
    }),
    {
      name: 'owlry-council-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const { toast: _toast, ...rest } = s;
        void _toast;
        // functions are dropped by JSON anyway; keep the data slice — minus the transient "waiting on the live council" lists
        const councils: Record<string, CouncilSession> = {};
        for (const [id, c] of Object.entries(rest.councils)) {
          const { pending: _p, ...keep } = c;
          void _p;
          councils[id] = keep;
        }
        return { ...rest, councils } as unknown as StoreState;
      },
    },
  ),
);

/* ---------- selectors ---------- */
export const selectCouncil = (id: string | null | undefined) => (s: StoreState) => (id ? s.councils[id] : undefined);
export const selectCouncils = (s: StoreState) => s.councilOrder.map((id) => s.councils[id]).filter(Boolean);
