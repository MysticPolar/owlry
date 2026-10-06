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
import type { CastInfo, CastSeat, CouncilSession, Highlight, Message, Post, Progress, Segment, TextSize, Toast, UserProfile } from './types';
import * as engine from '../engine/council';
import { seedPosts, seedHighlights, FOLLOWING } from '../content/social';
import { liveBook, liveCast, liveFigure, liveOpen, liveTurn, type MindBook, type MindFigure, type MindSeat } from '../lib/councilClient';
import * as social from '../lib/social/api';
import { council, matchScore } from '../content/councils';
import { CURATED_FIGURE_NAMES, curatedFigure, curatedFigureId } from '../content/figures';
import { isCuratedBook } from '../content/books';
import { bookCard, bookSeedOf, castSeatOf, figureCard, registerBookCard, registerCast, registerFigureCard, registerMinds } from '../content/minds';
import { recalledBookId } from '../lib/minds';
import { isLiveCouncilConfigured } from '../../lib/supabase';
import { detectLang, getActiveLang, setActiveLang, type Lang } from '../i18n';
import { UI } from '../i18n/ui';

// the content accessors read the active language; seed content for a first
// visit follows the browser (the persisted choice, if any, is applied in main.tsx)
setActiveLang(detectLang());

/** the recalled cards this device holds, keyed `${id}|${lang}` — durable here, not synced (the server caches every card) */
export interface MindsSlice {
  figures: Record<string, MindFigure>;
  books: Record<string, MindBook>;
  /** `figure:${id}|${lang}` / `book:…` the model said it does not know, and when — not asked again for a day */
  unavailable?: Record<string, number>;
}

/** a question no script covers, while the live council seats it — transient, never persisted; the room shows it */
export interface Casting {
  question: string;
  area: Area;
  startedAt: number;
}

export interface StoreState {
  user: UserProfile;
  interests: Area[];
  onboarded: boolean;

  councils: Record<string, CouncilSession>;
  councilOrder: string[];
  activeCouncilId: string | null;
  casting: Casting | null;
  minds: MindsSlice;

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
  /** the session id for a scripted council; null while the live council is casting one (watch `casting`) */
  ask: (question: string, councilId?: string) => string | null;
  setActiveCouncil: (id: string | null) => void;
  /** the reader changed their mind while the live council was still seating: the room empties and a late cast is dropped */
  cancelCasting: () => void;
  joinDiscussion: (id: string) => void;
  reveal: (id: string) => void;
  revealAll: (id: string) => void;
  sendFollowUp: (id: string, text: string, target?: string) => void;
  addContext: (id: string, text: string) => void;
  replaceSeat: (id: string, seat: number, to?: string) => void;
  undoReplace: (id: string) => void;
  bringPassage: (bookId: string, text: string) => string | null;
  setCouncilSaved: (id: string, saved: boolean) => void;

  // --- minds (thinkers and books the catalogue lacks)
  /** fetch a recalled thinker's card in the active language, once; resolves when it is in the registry, or when it cannot be had */
  ensureFigure: (id: string, hint?: string) => Promise<void>;
  /** fetch a recalled book's card in the active language, once */
  ensureBook: (bookId: string) => Promise<void>;
  /** the cards of a cast session's three seats — asked for when the session is on screen, not before */
  ensureSeats: (sessionId: string) => void;
  /** the alternates' cards; when a cast session has none yet, one recast with the seats avoided (never retried) */
  ensureAlternates: (sessionId: string) => Promise<void>;
  /** register the casts' placeholders; only the active session's seats are asked for, the rest when their screens are reached */
  ensureMindsFor: (sessions: CouncilSession[]) => void;

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
    casting: null as Casting | null,
    minds: { figures: {}, books: {}, unavailable: {} } as MindsSlice,
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

/* ---------- the cast council ----------
   A question no script covers, with the live council ready: the model
   casts three thinkers (preferring our curated ones, whom it is told by
   name), the room fills from the cast at once — curated seats as
   themselves, the others as placeholders — and the recalled cards arrive
   behind them. The opening waits for those cards (their quotes go into
   the dossiers) but never past the cap; a card that never comes leaves a
   placeholder, which speaks in paraphrase only. Every failure lands on
   something already on screen: the scripted default, a placeholder. */

const CARD_WAIT_MS = 12_000;
/** the cast itself has a cap: a request that hangs lands on the scripted default, like one that failed */
const CAST_WAIT_MS = 20_000;
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// a reload or a closed tab aborts the cast's request, which looks exactly like the live council failing; the
// scripted fallback must not seat (and persist) a council in a page that is going away — casting is transient.
// A page restored from the back/forward cache comes back with its module state, so the flag is lifted again there.
let unloading = false;
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => { unloading = true; });
  window.addEventListener('pageshow', (e) => { if (e.persisted) unloading = false; });
}

/* at most three recall requests in flight at once, so a session's seats, alternates and books never burst the hourly cap */
const RECALL_SLOTS = 3;
let recallBusy = 0;
const recallQueue: (() => void)[] = [];
function recall<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      recallBusy++;
      fn()
        .then(resolve, reject)
        .finally(() => {
          recallBusy--;
          recallQueue.shift()?.();
        });
    };
    if (recallBusy < RECALL_SLOTS) run();
    else recallQueue.push(run);
  });
}

/* a thinker or book the model said it does not know is not asked for again for a day (per language) */
const UNAVAILABLE_FOR_MS = 86_400_000;
function isUnavailable(s: StoreState, k: string): boolean {
  const at = s.minds.unavailable?.[k];
  return at !== undefined && Date.now() - at < UNAVAILABLE_FOR_MS;
}
function markUnavailable(set: Setter, k: string) {
  set((s) => ({ minds: { ...s.minds, unavailable: { ...(s.minds.unavailable ?? {}), [k]: Date.now() } } }));
}
/** for a screen: the placeholder it shows is all there will be (the card was asked for and the model had none) */
export const selectMindUnavailable = (kind: 'figure' | 'book', id: string) => (s: StoreState) => isUnavailable(s, `${kind}:${id}|${s.lang}`);
const otherLang = (lang: Lang): Lang => (lang === 'zh' ? 'en' : 'zh');
const shortTitle = (q: string, n = 48) => (q.length > n ? q.slice(0, n - 1).trimEnd() + '…' : q);

/** a cast seat resolved against the catalogue: a curated thinker keeps their id, works and verified quotes */
function toCastSeat(seat: MindSeat): CastSeat {
  const base = { name: seat.name, canonicalName: seat.canonicalName, short: seat.short, label: seat.label, role: seat.role, why: seat.why, stance: seat.stance };
  const curatedId = curatedFigureId(seat);
  const f = curatedId ? curatedFigure(curatedId) : undefined;
  if (curatedId && f) {
    // the curated work the cast named, else the first with a book of ours, else a book to recall under the curated author
    const want = seat.book.title.trim().toLowerCase();
    const byTitle = want ? f.works.find((w) => w.title.trim().toLowerCase() === want) : undefined;
    const work = byTitle?.bookId ? byTitle : f.works.find((w) => w.bookId);
    if (work?.bookId) return { ...base, id: curatedId, bookId: work.bookId, bookTitle: work.title, bookYear: work.year };
    const title = seat.book.title || f.works[0]?.title || '';
    return { ...base, id: curatedId, bookId: title ? recalledBookId(title, curatedId) : '', bookTitle: title, bookYear: seat.book.year };
  }
  // a seat the cast gave no title for speaks without a book — no nameless placeholder that could never arrive
  const title = seat.book.title;
  return { ...base, id: seat.id, bookId: title ? recalledBookId(title, seat.id) : '', bookTitle: title, bookYear: seat.book.year };
}

/** the new session takes the room */
function seatSession(set: Setter, session: CouncilSession) {
  set((s) => ({
    councils: { ...s.councils, [session.id]: session },
    councilOrder: [session.id, ...s.councilOrder],
    activeCouncilId: session.id,
    casting: null,
    onboarded: true,
  }));
}

/** a recalled card landed: the cast sessions seating that thinker regenerate, so round two speaks in the card's voice */
function refreshSeated(set: Setter, figureId: string) {
  set((s) => {
    const councils: Record<string, CouncilSession> = {};
    let changed = false;
    for (const [id, c] of Object.entries(s.councils)) {
      const hit = !!c.cast && c.seats.includes(figureId);
      councils[id] = hit ? engine.rebuild(c) : c;
      changed = changed || hit;
    }
    return changed ? { councils } : {};
  });
}

async function castCouncil(set: Setter, get: () => StoreState, question: string, area: Area, startedAt: number, lang: Lang) {
  const cast = await Promise.race([liveCast(question, area, { known: CURATED_FIGURE_NAMES, avoid: [] }, lang), delay(CAST_WAIT_MS).then(() => null)]);
  // the reader asked something else while the council was being seated, or left the page
  if (unloading || get().casting?.startedAt !== startedAt) return;
  const seats = cast ? (cast.seats.map(toCastSeat) as CastInfo['seats']) : null;
  // three different people, or it is not a council (two of the model's names may resolve to one curated thinker)
  if (!cast || !seats || new Set(seats.map((x) => x.id)).size !== 3) {
    // the scripted default, exactly what the question gets with no live council
    const session = engine.createSession(question, get().interests);
    seatSession(set, session);
    requestOpening(set, session);
    return;
  }
  const info: CastInfo = { title: cast.title || shortTitle(question), seats, alternates: [] };
  registerCast(info);
  const session = engine.createCastSession(question, area, info);
  seatSession(set, session);
  // the opening waits for the recalled cards, whose quotes go into the dossiers — but not past the cap
  const recalled = seats.filter((x) => !curatedFigure(x.id));
  await Promise.race([Promise.all(recalled.map((x) => get().ensureFigure(x.id, x.role))), delay(CARD_WAIT_MS)]);
  const now = get().councils[session.id];
  // a Replace during the wait opens for its own seats; this opening is for the seats as cast
  if (now && now.seats.every((id, i) => id === session.seats[i])) requestOpening(set, now);
  // the books, in the background; nothing on the council screen waits for them
  for (const x of seats) if (x.bookId && !isCuratedBook(x.bookId)) void get().ensureBook(x.bookId);
}

/* one request per card and language at a time */
const inflightFigures = new Map<string, Promise<void>>();
const inflightBooks = new Map<string, Promise<void>>();
/** sessions whose one recast for alternates has been made — a failed or empty one is not tried again on the next sheet */
const recastTried = new Set<string>();
/** per session, which Replace is the latest, so only its deferred opening is requested */
const replaceTokens = new Map<string, number>();

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
        const areas = get().interests;
        // a typed question no script's keywords touch, with a live council to ask: cast one (the readiness check is inside liveCast)
        if (!councilId && isLiveCouncilConfigured() && matchScore(question, areas).score === 0) {
          const q = question.trim();
          const area: Area = areas[0] ?? 'other';
          const startedAt = Date.now();
          set({ casting: { question: q, area, startedAt }, activeCouncilId: null, onboarded: true });
          void castCouncil(set, get, q, area, startedAt, getActiveLang());
          return null;
        }
        const session = engine.createSession(question, areas, councilId);
        seatSession(set, session);
        requestOpening(set, session);
        return session.id;
      },
      setActiveCouncil: (id) => set({ activeCouncilId: id }),
      // castCouncil re-checks `casting.startedAt` after the call returns, so clearing it here is enough to abandon the cast
      cancelCasting: () => set({ casting: null }),
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
        if (c.source === 'live' || c.cast) {
          // the others' live replies name the old thinker — drop every live line (Undo brings them back) and re-open live
          const restore = { live: c.live, lines: liveLines(c) };
          const replaced = next.replaced.map((r, i) => (i === next.replaced.length - 1 ? { ...r, restore } : r));
          next = engine.rebuild({ ...next, replaced, live: undefined, messages: next.messages.map((m) => (m.live ? { ...m, live: undefined } : m)) });
          set((s) => ({ councils: { ...s.councils, [id]: next } }));
          const joined = next.cast?.seats[seat];
          if (joined) {
            // a cast session: the newcomer's card first (its quotes go into the dossier), within the cap; their book behind.
            // Replace → Undo → Replace within the wait leaves two of these deferred; only the latest may open
            const token = (replaceTokens.get(id) ?? 0) + 1;
            replaceTokens.set(id, token);
            const final = next;
            void Promise.race([get().ensureFigure(joined.id, joined.role), delay(CARD_WAIT_MS)]).then(() => {
              const now = get().councils[id];
              if (now && replaceTokens.get(id) === token && now.seats[seat] === final.seats[seat]) requestOpening(set, now);
            });
            if (joined.bookId && !isCuratedBook(joined.bookId)) void get().ensureBook(joined.bookId);
            return;
          }
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

      ensureFigure: (id, hint) => {
        if (curatedFigure(id)) return Promise.resolve();
        const lang = getActiveLang();
        const key = `${id}|${lang}`;
        if (get().minds.figures[key] || isUnavailable(get(), `figure:${key}`)) return Promise.resolve();
        const running = inflightFigures.get(key);
        if (running) return running;
        // the name to ask for: the canonical one, from the other language's card or the cast seat that named them
        const seed = castSeatOf(id);
        const other = figureCard(id, otherLang(lang));
        const name = other?.canonicalName || seed?.canonicalName || seed?.name;
        if (!name) return Promise.resolve();
        const p = recall(() => liveFigure(name, hint ?? seed?.role ?? '', lang))
          .then((card) => {
            if (card === 'unknown') {
              markUnavailable(set, `figure:${key}`);
              return;
            }
            // the wire names the language it answered in; a card in another one is not this request's and is not kept under its key
            if (!card || card.lang !== lang) return;
            // stored under the id the cast gave, whatever the server slugged the canonical name to
            const stored: MindFigure = { ...card, id, lang };
            registerFigureCard(stored);
            set((s) => ({ minds: { ...s.minds, figures: { ...s.minds.figures, [key]: stored } } }));
            refreshSeated(set, id);
          })
          .finally(() => inflightFigures.delete(key));
        inflightFigures.set(key, p);
        return p;
      },
      ensureBook: (bookId) => {
        if (!bookId || isCuratedBook(bookId)) return Promise.resolve();
        const lang = getActiveLang();
        const key = `${bookId}|${lang}`;
        if (get().minds.books[key] || isUnavailable(get(), `book:${key}`)) return Promise.resolve();
        const running = inflightBooks.get(key);
        if (running) return running;
        const seed = bookSeedOf(bookId);
        const other = bookCard(bookId, otherLang(lang));
        const title = other?.canonicalTitle || seed?.title;
        if (!title) return Promise.resolve();
        const author = other?.canonicalAuthor || seed?.authorName || '';
        const hint = other?.year ? String(other.year) : seed?.year ?? '';
        const p = recall(() => liveBook(title, author, hint, lang))
          .then((card) => {
            if (card === 'unknown') {
              markUnavailable(set, `book:${key}`);
              return;
            }
            if (!card || card.lang !== lang) return;
            // the client's id and author, decided by the cast before any card existed
            const stored: MindBook = { ...card, id: bookId, authorId: seed?.authorId || other?.authorId || card.authorId, lang };
            registerBookCard(stored);
            set((s) => ({ minds: { ...s.minds, books: { ...s.minds.books, [key]: stored } } }));
          })
          .finally(() => inflightBooks.delete(key));
        inflightBooks.set(key, p);
        return p;
      },
      ensureSeats: (sessionId) => {
        const c = get().councils[sessionId];
        if (!c?.cast || !isLiveCouncilConfigured()) return;
        for (const x of c.cast.seats) if (!curatedFigure(x.id)) void get().ensureFigure(x.id, x.role);
      },
      ensureAlternates: async (sessionId) => {
        const c = get().councils[sessionId];
        if (!c?.cast || !isLiveCouncilConfigured()) return;
        if (c.cast.alternates.length) {
          // the alternates are known; their cards are asked for now, when a sheet can show them (their books only once seated)
          for (const x of c.cast.alternates) if (!curatedFigure(x.id)) void get().ensureFigure(x.id, x.role);
          return;
        }
        if (recastTried.has(sessionId)) return;
        recastTried.add(sessionId);
        // the seats are avoided by the names the model knows them by — the curated ones in English
        const avoid = c.cast.seats.map((x) => curatedFigure(x.id)?.name ?? x.name);
        const cast = await liveCast(c.question, c.area, { known: CURATED_FIGURE_NAMES, avoid });
        const now = get().councils[sessionId];
        if (!cast || !now?.cast) return;
        const seated = new Set(now.seats);
        const alternates: CastSeat[] = [];
        for (const x of cast.seats.map(toCastSeat)) if (!seated.has(x.id) && !alternates.some((a) => a.id === x.id)) alternates.push(x);
        if (!alternates.length) return;
        registerCast({ ...now.cast, alternates });
        patch(set, sessionId, (cur) => (cur.cast ? { cast: { ...cur.cast, alternates } } : null));
        for (const x of alternates) if (!curatedFigure(x.id)) void get().ensureFigure(x.id, x.role);
      },
      ensureMindsFor: (sessions) => {
        for (const c of sessions) if (c.cast) registerCast(c.cast);
        // the cards are asked for as their screens are reached — a seat's with its discussion, an alternate's with the sheet,
        // a book's with the reading card or its page — so a reload, a sync pull or a language switch never bursts the hourly cap;
        // only what is in the room right now is asked for here
        const active = get().activeCouncilId;
        if (active) get().ensureSeats(active);
      },

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
          for (const [id, c] of Object.entries(s.councils)) councils[id] = engine.rebuild({ ...c, title: c.cast ? c.title : council(c.scriptId).title });
          return { lang, councils, prefsAt: Date.now() };
        });
        // the recalled cards in the new language (server cache hits, mostly)
        get().ensureMindsFor(Object.values(get().councils));
      },
      showToast: (text, action) => set({ toast: { id: uid('t'), text, action } }),
      dismissToast: () => set({ toast: null }),
      resetDemo: () => set({ ...seedState() }),
    }),
    {
      name: 'owlry-council-v1',
      // the `minds` slice was added without a bump: it is additive, the default merge fills it from the seed, and a blob
      // written here still loads in the build before it
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const { toast: _toast, casting: _casting, ...rest } = s;
        void _toast;
        void _casting;
        // functions are dropped by JSON anyway; keep the data slice — minus the transient "waiting on the live council" lists
        const councils: Record<string, CouncilSession> = {};
        for (const [id, c] of Object.entries(rest.councils)) {
          const { pending: _p, ...keep } = c;
          void _p;
          councils[id] = keep;
        }
        return { ...rest, councils } as unknown as StoreState;
      },
      // the content accessors read the registry, so the recalled cards go in before the first render; missing ones are re-asked for
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // the persisted language first: the cards are keyed by it, and main.tsx applies it only after this has run
        setActiveLang(state.lang);
        registerMinds(state.minds);
        state.ensureMindsFor(Object.values(state.councils));
      },
    },
  ),
);

// every change to the slice (a card landing, a cloud session with a cast) reaches the registry the accessors read
useStore.subscribe((s, prev) => {
  if (s.minds !== prev.minds) registerMinds(s.minds);
  if (s.councils !== prev.councils) {
    for (const c of Object.values(s.councils)) if (c.cast && c.cast !== prev.councils[c.id]?.cast) registerCast(c.cast);
  }
});

/* ---------- selectors ---------- */
export const selectCouncil = (id: string | null | undefined) => (s: StoreState) => (id ? s.councils[id] : undefined);
export const selectCouncils = (s: StoreState) => s.councilOrder.map((id) => s.councils[id]).filter(Boolean);
