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
import type { CouncilSession, Highlight, Post, Progress, TextSize, Toast, UserProfile } from './types';
import * as engine from '../engine/council';
import { seedPosts, FOLLOWING } from '../content/social';

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
  toggleLike: (id: string) => void;
  toggleSavePost: (id: string) => void;
  toggleFollow: (handle: string) => void;

  // --- prefs + ui
  setTextSize: (s: TextSize) => void;
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
  const highlights: Highlight[] = [
    {
      id: 'h_seed1',
      bookId: 'meditations',
      text: 'Am I then yet unwilling to go about that, for which I myself was born and brought forth into this world?',
      ts: now - 3 * 86400_000,
    },
    {
      id: 'h_seed2',
      bookId: 'atomic-habits',
      text: 'Every action you take is a vote for the type of person you wish to become.',
      ts: now - 6 * 86400_000,
      note: 'Tuesday votes.',
    },
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
  };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...seedState(),

      setProfile: (p) => set((s) => ({ user: { ...s.user, ...p } })),
      signIn: (name, handle) =>
        set((s) => ({
          user: {
            ...s.user,
            name: name || s.user.name,
            handle: handle || s.user.handle,
            initial: (name || s.user.name).trim().charAt(0).toUpperCase() || 'G',
            signedIn: true,
          },
        })),
      signOut: () => set((s) => ({ user: { ...s.user, signedIn: false } })),
      setInterests: (areas) => set({ interests: areas }),
      setOnboarded: (v) => set({ onboarded: v }),

      ask: (question, councilId) => {
        const session = engine.createSession(question, get().interests, councilId);
        set((s) => ({
          councils: { ...s.councils, [session.id]: session },
          councilOrder: [session.id, ...s.councilOrder],
          activeCouncilId: session.id,
          onboarded: true,
        }));
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
          const revealed = c.revealed + 1;
          const stage = revealed >= c.messages.length ? 'summarized' : c.stage === 'convening' ? 'live' : c.stage;
          return { councils: { ...s.councils, [id]: { ...c, revealed, stage } } };
        }),
      revealAll: (id) =>
        set((s) => {
          const c = s.councils[id];
          if (!c) return {};
          return { councils: { ...s.councils, [id]: { ...c, revealed: c.messages.length, stage: 'summarized' } } };
        }),
      sendFollowUp: (id, text, target) =>
        set((s) => {
          const c = s.councils[id];
          if (!c || !text.trim()) return {};
          const next = engine.followUp({ ...c, revealed: c.messages.length }, text, target);
          // the user's line shows at once; the replies type in
          return { councils: { ...s.councils, [id]: { ...next, revealed: c.messages.length + 1, stage: 'summarized' } } };
        }),
      addContext: (id, text) =>
        set((s) => {
          const c = s.councils[id];
          if (!c || !text.trim()) return {};
          const next = engine.addContext({ ...c, revealed: c.messages.length }, text);
          return { councils: { ...s.councils, [id]: { ...next, revealed: c.messages.length + 1, stage: 'summarized' } } };
        }),
      replaceSeat: (id, seat, to) =>
        set((s) => {
          const c = s.councils[id];
          if (!c) return {};
          return { councils: { ...s.councils, [id]: engine.replaceSeat(c, seat, to) } };
        }),
      undoReplace: (id) =>
        set((s) => {
          const c = s.councils[id];
          if (!c) return {};
          return { councils: { ...s.councils, [id]: engine.undoReplace(c) } };
        }),
      bringPassage: (bookId, text) => {
        const s = get();
        const id = s.lastRead?.councilId ?? s.activeCouncilId ?? s.councilOrder[0];
        const c = id ? s.councils[id] : undefined;
        if (!c) return null;
        const next = engine.bringPassage({ ...c, revealed: c.messages.length }, bookId, text);
        set((st) => ({
          councils: { ...st.councils, [c.id]: { ...next, revealed: c.messages.length + 1, stage: 'summarized' } },
          activeCouncilId: c.id,
        }));
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

      addPost: (p) =>
        set((s) => ({
          posts: [
            {
              ...p,
              id: uid('p'),
              ts: Date.now(),
              likes: 0,
              comments: 0,
              mine: true,
              author: { handle: s.user.handle, name: s.user.name, color: '#FFD100', initial: s.user.initial },
            },
            ...s.posts,
          ],
        })),
      toggleLike: (id) =>
        set((s) => {
          const on = s.liked.includes(id);
          return {
            liked: on ? s.liked.filter((x) => x !== id) : [...s.liked, id],
            posts: s.posts.map((p) => (p.id === id ? { ...p, likes: p.likes + (on ? -1 : 1) } : p)),
          };
        }),
      toggleSavePost: (id) =>
        set((s) => ({ savedPosts: s.savedPosts.includes(id) ? s.savedPosts.filter((x) => x !== id) : [...s.savedPosts, id] })),
      toggleFollow: (handle) =>
        set((s) => ({ following: s.following.includes(handle) ? s.following.filter((h) => h !== handle) : [...s.following, handle] })),

      setTextSize: (textSize) => set({ textSize }),
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
        // functions are dropped by JSON anyway; keep the data slice
        return rest as unknown as StoreState;
      },
    },
  ),
);

/* ---------- selectors ---------- */
export const selectCouncil = (id: string | null | undefined) => (s: StoreState) => (id ? s.councils[id] : undefined);
export const selectCouncils = (s: StoreState) => s.councilOrder.map((id) => s.councils[id]).filter(Boolean);
