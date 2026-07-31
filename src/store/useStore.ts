/* ============================================================
   owlry — the store. Ports the mockup's game loop (XP, levels,
   ink, coins, streak, saved/reading/finished, reading progress)
   and the Owl Post conversation. Persists the durable slice to a
   local cache (IndexedDB) and, when signed in, syncs to the cloud.

   The chat runs the memory-backed pipeline: fetchOwlTurn() calls the
   owl-chat edge function (Haiku digest → Sonnet Scout, memory loaded
   server-side) and falls back to the offline brain on any failure;
   fetchLetter() calls owl-peek lazily, only when a card is tapped.
   Ink meters the LIVE owl (a live ask costs 1 ink; a tapped peek
   costs 5); a dry inkwell falls back to the free offline brain.

   Every reward verb goes through econ() — the season ledger's one
   guarded mutation (docs/gamification-design.md). Signed in, the
   server's ledger has the last word; as a guest the same engine
   runs locally, guards and all.
   ============================================================ */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

import { WX } from '../content/weather';
import { SAL, FLAVOR, START_CHIPS, AFTER_CHIPS, dayPart } from '../content/owl';
import { tOf, setActiveLang, syncDocumentLang, getActiveLang } from '../i18n';
import { newSession } from '../lib/owlBrain';
import type { OwlMessage } from '../lib/owlBrain';
import { fetchOwlTurn, fetchLetter } from '../lib/owlClient';
import type { OwlFallbackReason } from '../lib/owlClient';
import type { OwlDelivery } from '../lib/owlStatus';
import {
  clearDynamicRegistry,
  getActiveDynamicRegistryScope,
  getBook,
  getGuide,
  getPersistableBook,
  isActiveDynamicRegistryScope,
  registerBook,
  registerPersistedBooks,
  setActiveDynamicRegistryScope,
} from '../lib/bookRegistry';
import type { DynamicRegistryScope } from '../lib/bookRegistry';
import { supabase, isBackendConfigured, isLiveOwlConfigured } from '../lib/supabase';
import { getSnapshot } from '../lib/economy/api';
import { applyAction, derive, emptyDaily, localDay, settleInk, tzOffsetMinutes } from '../lib/economy/engine';
import type { ActionContext, EconomyState, EngineResult } from '../lib/economy/engine';
import { clearQueue, enqueue, flush } from '../lib/economy/queue';
import { snapshotPatch } from '../lib/economy/snapshot';
import type { CalendarDay, QuoteRow, RadarPoint, StatsSnapshot } from '../lib/economy/types';
import { CURVE_VERSION, DAILY_CAPS, ECONOMY_VERSION, STAND_LEVEL, goodFor } from '../lib/economy/config';
import { LV_CAP, cumulativeXp, rowFromLevel } from '../lib/economy/curve';
import { STUB_LABEL } from '../content/stubs';
import type { EconomyAction, Snapshot } from '../lib/economy/types';
import { getLocalWeather } from '../lib/weather';
import { dealHand, chipsForHand } from '../lib/dealHand';
import { rowsToChat, shelfFromPeeks } from '../lib/chatHydrate';
import type { ChatRow } from '../lib/chatHydrate';
import { resolvePublicDomain } from '../lib/ebook/resolve';
import {
  clearGuestEbookSession,
  getEbookStorageOwner,
  getPendingUploadSync,
  loadUpload,
  loadUploadSource,
  markStagedCloudRefreshReady,
  promoteReadyCloudRefresh,
  purgeLegacyEbookStorage,
  saveCloudRefreshIfCurrent,
  setEbookStorageOwner,
  stageCloudRefreshIfCurrent,
} from '../lib/ebook/storage';
import { compareCopySelection, pullCopy } from '../lib/ebook/cloudCopy';
import { retryPendingCopiesNow } from '../lib/ebook/uploadSync';
import {
  flushActiveReadingPosition,
  peekActiveReadingPosition,
} from '../lib/ebook/activePosition';
import type { ReadingPosition, ReadingSource } from '../lib/ebook/types';
import {
  maxReadingPercent,
  readingPositionKey,
} from '../lib/ebook/positionKey';
import { normalizeCopyFingerprint } from '../lib/ebook/fingerprint';
import { compareReadingPositionWrites } from '../lib/ebook/positionOrder';
import { deriveCover } from '../lib/cover';
import type { Book, BookRef } from '../content/types';

import {
  loadLocal,
  saveLocal,
  saveLocalStrict,
  type Owner,
} from './persistence';
import { mergeProgress } from '../lib/sync/mergeProgress';
import { cloudPull, cloudPush } from '../lib/sync/cloud';
import { SEED } from './seed';
import type {
  DeskMode,
  IntroKey,
  PersistedState,
  Prefs,
  Tab,
  LibTab,
  OwlState,
  OwlName,
  OwlReact,
  ReaderState,
  ToastState,
  ChatItem,
  PendingTurn,
  PersistedBook,
  ShelfFly,
} from './types';

/** lazy reading-letter state: the letter is generated only when the reader taps the card */
export type LetterStatus = 'idle' | 'loading' | 'ready';

/** A change to the numbers, published for the receipt strip to perform. Deltas
    only — the chips already hold the totals; this says what just moved, by how
    much, and which owl's desk it moved at. */
export interface StatFx {
  xp: number;
  ink: number;
  coins: number;
  /** leveled up — the chip pops, sparks fly, and the strip stamps LV */
  lv: boolean;
  /** the seat also moved forward — the strip stamps ROW in addition to LV */
  row: boolean;
  /** whose desk this happened at — that owl hands you the receipt */
  owl: OwlName;
  /** monotonic, so a repeat of the same delta still replays */
  n: number;
}

/** which owl owns each action: scout finds, peek tastes, scribe remembers,
    keeper keeps the shelves and the counter. Mirror is deliberately absent —
    she is a level-5 reveal, and the strip must not spoil her. */
export const ACTION_OWL: Record<EconomyAction, OwlName> = {
  turn_page: 'keeper',
  open: 'keeper',
  finish: 'keeper',
  save: 'keeper',
  unsave: 'keeper',
  chat: 'scout',
  preview: 'peek',
  quote_keep: 'scribe',
  checkin: 'keeper',
  purchase: 'keeper',
  onboard: 'keeper',
};

/** The real in-app reader (public-domain EPUB or an uploaded file). */
export type EbookStatus = 'resolving' | 'reading' | 'empty' | 'error';
export interface EbookState {
  open: boolean;
  bookId: BookRef | null;
  status: EbookStatus;
  source: ReadingSource | null;
  percent: number;
  secondsRead: number;
  error: string | null;
  uploadOpen: boolean;
  returnTo: { kind: 'letter' | 'sheet'; bookId: BookRef } | null;
}

/** the signed-in reader, once a backend is configured and a session exists */
export interface AuthUser {
  id: string;
  email: string | null;
}

/** The live owl answers when a backend is configured and the user hasn't pinned the mockup. */
const liveOwlEnabled = (prefs: Prefs): boolean => {
  return isLiveOwlConfigured() && prefs.owlEngine !== 'mockup';
};

export interface Store extends PersistedState {
  /* ephemeral UI / session */
  activeTab: Tab;
  libTab: LibTab;
  wxIndex: number;
  reader: ReaderState;
  sheetId: BookRef | null;
  letterId: BookRef | null;
  letterStatus: LetterStatus;
  toast: ToastState | null;
  owlReact: OwlReact | null;
  burstNonce: number;
  /** the last change to the numbers, so the chips can show it happening */
  statFx: StatFx | null;
  owl: OwlState;
  /** How the last completed ask was delivered; session-only UI truth. */
  owlDelivery: OwlDelivery;
  deskMode: DeskMode;
  /** bumped on every successful desk switch → the centered avatar hint replays */
  deskSwitchNonce: number;
  /** the first-use owl intro card on screen, or null; introAfter opens after peek's */
  introCard: IntroKey | null;
  introAfter: BookRef | null;
  /** owls waiting their turn behind the card on screen (session-only, never persisted) */
  pendingIntros: IntroKey[];
  showIntro: (key: IntroKey, afterLetter?: BookRef) => void;
  dismissIntro: () => void;
  saveQuote: (text: string, bookId?: BookRef) => void;
  /** the profile section is chained until level 5 — the pill opens this instead */
  mirrorRoomOpen: boolean;
  closeMirrorRoom: () => void;
  /** A user-authored starting point carried from Today into Scout's composer. */
  scoutDraft: string;
  /** opening night: playing when true (first run, or replayed from settings) */
  showOnboarding: boolean;
  openedLetters: BookRef[];
  /** a just-peeked book asking the shelf rail to fly its spine in (session-only) */
  shelfFly: ShelfFly | null;
  hydrated: boolean;
  settingsOpen: boolean;
  /** cross-device sync: 'off' as guest, else the live push state */
  syncStatus: 'off' | 'syncing' | 'synced' | 'error';
  /** Prevents edits while the first private-state pull is still ambiguous. */
  accountStorageBlocked: boolean;

  /* auth — null user + authReady:true whenever no backend is configured, so the
     app never gates on login unless VITE_SUPABASE_URL/ANON_KEY are set */
  authUser: AuthUser | null;
  authReady: boolean;
  signOut: () => Promise<void>;

  /* session-only profile read-models from owlry_get_snapshot.
     null = guest / mockup (UI falls back to content/profile.ts seeds).
     arrays (even empty) = signed-in server truth. */
  profileRadar: RadarPoint[] | null;
  profileCalendar: CalendarDay[] | null;
  profileStats: StatsSnapshot | null;
  profileQuotes: QuoteRow[] | null;

  /* the separate, read-only history list (past days; today lives in Discover) */
  historyOpen: boolean;
  openHistory: () => void;
  closeHistory: () => void;

  /* the real in-app reader (Open flow: uploaded copy → public-domain EPUB → upload) */
  ebook: EbookState;
  openBook: (id: BookRef) => Promise<void>;
  closeBook: () => void;
  openUpload: () => void;
  closeUpload: () => void;
  setUploadedSource: (id: BookRef, source: ReadingSource) => void;
  setReadingPosition: (position: ReadingPosition) => void;
  reportProgress: (percent: number, secondsRead: number) => void;

  /* actions */
  bootstrap: () => Promise<void>;
  setTab: (t: Tab) => void;
  startAsk: (id: BookRef) => void;
  askText: (text: string) => void;
  /** the line pulled from the selection bar, waiting for the reader's question */
  askQuote: string | null;
  beginAskQuote: (text: string) => void;
  cancelAskQuote: () => void;
  /** compose the held quote + the reader's question and send it straight to scout */
  submitAskQuote: (question: string) => void;
  clearScoutDraft: () => void;
  setLibTab: (t: LibTab) => void;
  toggleSave: (id: BookRef) => void;
  toggleDislike: (id: BookRef) => void;
  /** the one guarded economy mutation — every reward verb comes through here */
  econ: (action: EconomyAction, ctx?: EconCtx) => EngineResult;
  /** the day's first launch: a stamped ticket (+10 XP, +10 ink), once per local day */
  checkIn: () => void;
  /** the lobby stand */
  standOpen: boolean;
  openStand: () => void;
  closeStand: () => void;
  buyGood: (sku: string) => void;
  /** guest-only preview affordance: moves the seat, mints nothing */
  debugLevelUp: () => void;
  /** `owl` is whose desk the change happened at — it fronts the receipt strip */
  addXP: (n: number, owl?: OwlName) => void;
  addInk: (n: number, owl?: OwlName) => void;
  showToast: (icon: string, msg: string, owl?: OwlName) => void;
  triggerBurst: () => void;
  openReader: (id: BookRef, page?: number) => void;
  closeReader: () => void;
  nextPage: () => void;
  prevPage: () => void;
  finishBook: () => void;
  openSheet: (id: BookRef) => void;
  closeSheet: () => void;
  openLetter: (id: BookRef) => void;
  closeLetter: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  setPref: <K extends keyof Prefs>(key: K, value: Prefs[K]) => void;
  resetProgress: () => void;
  initChat: () => void;
  /** wipe the conversation and greet fresh (user-initiated "new chat") */
  restartChat: () => void;
  /** load today's persisted chat (authenticated + configured) or fall back to the greeting */
  hydrateChat: () => Promise<void>;
  sendToOwl: (text: string) => void;
  /** the calm stream finished typing Scout's reply → play the after-text beat
      (the letter, then the shelf flight, then the chips). Runs once per turn. */
  revealAfterText: (skipped: boolean) => void;
  /** merge shelf ids into the session rail (called when a spine lands) */
  collectBooks: (ids: BookRef[]) => void;
  setDeskMode: (mode: DeskMode) => void;
  openOnboarding: () => void;
  /** end opening night; when a first letter was sorted, plant it in the chat and open it */
  /** end opening night: the house opens at scout's desk, ready for the first ask */
  finishOnboarding: (firstAsk?: { label: string; guide: BookRef }) => void;
  /** sign-in: adopt an account — pull cloud progress, merge, and start syncing */
  adoptAccount: (userId: string) => Promise<void>;
  /** Explicitly pull, merge, and push the current account without changing owners. */
  syncAccountNow: () => Promise<void>;
  /** sign-out: stop syncing and fall back to the local guest cache */
  revertToGuest: () => Promise<void>;
}

let chatId = 0;
const nextId = () => ++chatId;

/* a monotonic "conversation generation" — bumped whenever the conversation is
   wiped or reloaded (restart, reset, hydrate, sign-out). A turn's deferred work
   (the ~620ms reveal) captures the generation at send time and bails if it has
   moved on, so a reply for a discarded question never lands in a fresh chat. */
let chatTurn = 0;
const bumpTurn = () => ++chatTurn;
let chatHydrationNonce = 0;

/* monotonic nonce so re-peeking the same book still triggers a fresh flight */
let shelfFlyNonce = 0;

/* per-book reading milestones, for throttling progress→XP awards (cosmetic) */
const progressMark = new Map<BookRef, number>();
const secondsMark = new Map<BookRef, number>();
const finishedMark = new Set<BookRef>();

const EBOOK_IDLE: EbookState = {
  open: false,
  bookId: null,
  status: 'resolving',
  source: null,
  percent: 0,
  secondsRead: 0,
  error: null,
  uploadOpen: false,
  returnTo: null,
};

let toastTimer: ReturnType<typeof setTimeout> | undefined;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let cloudTimer: ReturnType<typeof setTimeout> | undefined;

/* who owns the local cache + whether changes push to the cloud. 'guest' →
   local only (offline-first, as before); a user id → local + cloud sync. */
let owner: Owner = 'guest';
let ownerReady = true;
let ownerTransitionNonce = 0;
let ebookResolutionNonce = 0;
let bootstrapTask: Promise<void> | null = null;
let ownerTransitionSnapshot: { owner: Owner; state: PersistedState } | null = null;
let ownerTransitionTarget: Owner | null = null;
let cloudHydrationPending: {
  owner: Exclude<Owner, 'guest'>;
  /** Guest progress is adopted only after a successful pull proves no row exists. */
  freshAccountState: PersistedState;
} | null = null;
let cloudHydrationRetryTimer: ReturnType<typeof setTimeout> | undefined;
const cloudRefreshCommits = new Map<string, Promise<void>>();
const readerCloseBarriers = new Map<string, Promise<void>>();
const positionFingerprintBackfills = new Map<string, Promise<void>>();
let accountSyncTask: { owner: string; task: Promise<void> } | null = null;

/**
 * Revoke every open-world resolver and async chat generation before target
 * account state can register. Captured registry scopes keep late responses in
 * their now-inactive generation instead of leaking into the next owner.
 */
const beginAuthRegistryBoundary = (
  nextOwner: Owner,
): DynamicRegistryScope => {
  clearDynamicRegistry();
  const scope = setActiveDynamicRegistryScope(nextOwner);
  chatHydrationNonce += 1;
  bumpTurn();
  return scope;
};

const clearCloudHydrationRetry = () => {
  clearTimeout(cloudHydrationRetryTimer);
  cloudHydrationRetryTimer = undefined;
};

const stagedCloudKey = (refreshOwner: Exclude<Owner, 'guest'>, bookId: BookRef) =>
  `${refreshOwner}\n${bookId}`;

const queueCloudRefreshWork = (
  refreshOwner: Exclude<Owner, 'guest'>,
  bookId: BookRef,
  work: () => Promise<unknown>,
): Promise<void> => {
  const key = stagedCloudKey(refreshOwner, bookId);
  const previous = cloudRefreshCommits.get(key) ?? Promise.resolve();
  let task: Promise<void>;
  task = previous
    .catch(() => {})
    .then(async () => { await work(); })
    .finally(() => {
      if (cloudRefreshCommits.get(key) === task) cloudRefreshCommits.delete(key);
    });
  cloudRefreshCommits.set(key, task);
  return task;
};

/** On open, recover a page-hidden stage only when its old-copy anchor was
    durably fenced before the previous page ended. */
const promoteStagedCloudRefresh = (
  refreshOwner: Exclude<Owner, 'guest'>,
  bookId: BookRef,
): Promise<void> => queueCloudRefreshWork(
  refreshOwner,
  bookId,
  () => promoteReadyCloudRefresh(bookId, refreshOwner),
);

/** Finish a reader's durable cloud stage only after its final anchor succeeds. */
export const commitStagedReaderCloudRefresh = (
  refreshOwner: Exclude<Owner, 'guest'>,
  bookId: BookRef,
): Promise<void> => queueCloudRefreshWork(
  refreshOwner,
  bookId,
  async () => {
    if (await markStagedCloudRefreshReady(bookId, refreshOwner)) {
      await promoteReadyCloudRefresh(bookId, refreshOwner);
    }
  },
);

function extractPersisted(s: Store): PersistedState {
  return {
    totalXp: s.totalXp,
    xp: s.xp,
    xpMax: s.xpMax,
    ink: s.ink,
    inkMax: s.inkMax,
    coins: s.coins,
    lv: s.lv,
    inkDone: s.inkDone,
    streak: s.streak,
    savedIds: s.savedIds,
    readingIds: s.readingIds,
    finishedIds: s.finishedIds,
    quotedIds: s.quotedIds,
    dislikedIds: s.dislikedIds,
    savedAt: s.savedAt,
    pagesRead: s.pagesRead,
    readingPositions: s.readingPositions,
    libraryBooks: s.libraryBooks,
    daily: s.daily,
    earn: s.earn,
    stubs: s.stubs,
    quoteHashes: s.quoteHashes,
    goods: s.goods,
    streakLastDay: s.streakLastDay,
    darkNightAt: s.darkNightAt,
    inkAt: s.inkAt,
    curveV: s.curveV,
    economyVersion: s.economyVersion,
    prefs: s.prefs,
    prefsUpdatedAt: s.prefsUpdatedAt,
  };
}

const bookMetadataKey = (book: Book): string => JSON.stringify([
  book.t,
  book.a,
  book.c,
  book.tc ?? null,
  book.s,
  book.q,
  book.n,
  book.g,
  book.r ?? null,
  book.i ?? null,
  book.w ?? null,
  book.img ?? null,
  book.sub ?? null,
  book.pub ?? null,
  book.rn ?? null,
  book.rc ?? null,
  book.rsrc ?? null,
]);

/** Capture only Scout-introduced books; bundled catalog metadata needs no cloud copy. */
const rememberBookMetadata = (
  current: Record<BookRef, PersistedBook>,
  refs: Iterable<BookRef>,
): Record<BookRef, PersistedBook> => {
  let next = current;
  let timestamp = Date.now();
  for (const ref of refs) {
    const book = getPersistableBook(ref);
    if (!book) continue;
    const existing = current[ref];
    if (existing && bookMetadataKey(existing.book) === bookMetadataKey(book)) continue;
    if (next === current) next = { ...current };
    timestamp = Math.max(timestamp, (existing?.updatedAt ?? 0) + 1);
    next[ref] = { book, updatedAt: timestamp };
  }
  return next;
};

/** Register metadata before a hydrated state can ask React to paint its shelves. */
const registerStateBooks = (state: Pick<PersistedState, 'libraryBooks'>): void => {
  registerPersistedBooks(state.libraryBooks);
};

/**
 * Older account uploads predate the synced open-world catalog, but their small
 * owner-scoped metadata record already contains the original title and author.
 * Rebuild only missing shelf entries from that record; the book Blob is never
 * loaded or inspected by this migration.
 */
const recoverAccountUploadBooks = async (
  state: PersistedState,
  userId: string,
  registryScope: DynamicRegistryScope,
): Promise<PersistedState> => {
  registerPersistedBooks(state.libraryBooks, registryScope);
  const ids = new Set<BookRef>([
    ...state.savedIds,
    ...state.readingIds,
    ...state.finishedIds,
    ...Object.values(state.readingPositions).map((position) => position.bookId),
  ]);
  const recovered: BookRef[] = [];
  for (const id of ids) {
    if (!isActiveDynamicRegistryScope(registryScope)) return state;
    if (getBook(id)) continue;
    const source = await loadUploadSource(id, userId).catch(() => null);
    if (!isActiveDynamicRegistryScope(registryScope)) return state;
    const title = source?.title.trim();
    const author = source?.author.trim();
    if (!title || !author) continue;

    const pagesRead = Math.max(0, state.pagesRead[id] ?? 0);
    const percent = Math.min(100, maxReadingPercent(state.readingPositions, id));
    const estimatedPages = pagesRead > 0 && percent > 0.5
      ? Math.round((pagesRead * 100) / percent)
      : pagesRead;
    const book: Book = {
      t: title,
      a: author,
      q: tOf(getActiveLang()).reader.uploadedCopy,
      n: Math.max(1, pagesRead, estimatedPages),
      g: 'life',
      ...deriveCover(title, author),
    };
    registerBook(id, book, registryScope);
    recovered.push(id);
  }
  if (!recovered.length || !isActiveDynamicRegistryScope(registryScope)) {
    return state;
  }
  const libraryBooks = rememberBookMetadata(state.libraryBooks, recovered);
  return libraryBooks === state.libraryBooks ? state : { ...state, libraryBooks };
};

const nextPrefsUpdatedAt = (current: number): number =>
  Math.max(Date.now(), current + 1);

const withPendingReadingPosition = (
  state: PersistedState,
  stateOwner: Owner,
): PersistedState => {
  if (stateOwner === 'guest') return state;
  const pending = peekActiveReadingPosition(stateOwner);
  if (!pending) return state;
  const key = readingPositionKey(pending.bookId, pending.copyVersion);
  const existing = state.readingPositions[key];
  if (existing && compareReadingPositionWrites(pending, existing) <= 0) return state;
  return {
    ...state,
    readingPositions: {
      ...state.readingPositions,
      [key]: pending,
    },
  };
};

/* ---------- the economy seam ---------- */

/** what the store hands the engine, and what it takes back */
export interface EconCtx extends ActionContext {
  /** turn_page: the real page number, for the library bars (never the step) */
  page?: number;
  /** finish: the book's length */
  pages?: number;
  /** quote_keep: the line itself — the server keeps it, the ledger keeps a hash */
  text?: string;
  /** chat: the question text — ledger meta so the calendar can show "you asked" */
  q?: string;
  /** the server owns this spend (the peek is charged inside owl-peek) — apply
      the optimistic delta locally, but never enqueue a second charge */
  localOnly?: boolean;
  /** the grant lands and the ledger travels, but nothing performs — for
      moments a scene has already performed itself (onboarding's welcome) */
  quiet?: boolean;
}

const economyOf = (s: Store): EconomyState => ({
  totalXp: s.totalXp,
  ink: s.ink,
  inkMax: s.inkMax,
  coins: s.coins,
  streak: s.streak,
  inkDone: s.inkDone,
  daily: s.daily,
  earn: s.earn,
  stubs: s.stubs,
  quoteHashes: s.quoteHashes,
  goods: s.goods,
  streakLastDay: s.streakLastDay,
  darkNightAt: s.darkNightAt,
  inkAt: s.inkAt,
});

/** the engine's next state, in the store's shape (mirrors re-derived) */
function economyPatch(next: EconomyState): Partial<Store> {
  const d = derive(next.totalXp);
  return {
    totalXp: next.totalXp,
    xp: d.xp,
    xpMax: d.xpMax,
    lv: d.lv,
    ink: next.ink,
    coins: next.coins,
    streak: next.streak,
    inkDone: next.inkDone,
    daily: next.daily,
    earn: next.earn,
    stubs: next.stubs,
    quoteHashes: next.quoteHashes,
    goods: next.goods,
    streakLastDay: next.streakLastDay,
    darkNightAt: next.darkNightAt,
    inkAt: next.inkAt,
  };
}

/** a stable fingerprint for a kept line — local dedupe only; the server
    computes its own md5 over the text it stores */
function lineHash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h << 5) - h + text.charCodeAt(i);
    h |= 0;
  }
  return `h${(h >>> 0).toString(36)}:${text.length}`;
}

type Setter = (partial: Partial<Store> | ((s: Store) => Partial<Store>)) => void;

/** publish a change to the numbers. Deltas only, and never a no-op — a strip
    with nothing to say should stay still. */
function emitFx(
  set: Setter,
  xp: number,
  ink: number,
  coins: number,
  lv: boolean,
  owl: OwlName,
  row = false,
): void {
  if (!xp && !ink && !coins && !lv) return;
  set((st) => ({
    statFx: { xp, ink, coins, lv, row: lv && row, owl, n: (st.statFx?.n ?? 0) + 1 },
  }));
}

/** true when crossing from `before` into `after` moves the seat toward the stage */
function seatMoved(before: number, after: number): boolean {
  return after > before && rowFromLevel(after) < rowFromLevel(before);
}

type Getter = () => Store;

/** the two gates open on their level crossings */
function crossGates(get: Getter, before: number, after: number): void {
  if (before < 3 && after >= 3) setTimeout(() => get().showIntro('proscout'), 600);
  if (before < 5 && after >= 5) {
    // the chains fall (a burst), then mirror steps out of the glass to introduce itself
    setTimeout(() => get().triggerBurst(), 700);
    setTimeout(() => get().showIntro('mirror'), 1150);
  }
}

/** Re-arm a gate whose level was crossed but whose owl never got to speak.
    `crossGates` only fires on the crossing itself, so anything that swallowed
    the card — an app closed mid-queue, or the pre-queue drop bug — used to lose
    that introduction for good. Runs once per hydration, never during the
    curtain (opening night has its own cast call). */
function armMissedGates(get: Getter): void {
  if (get().showOnboarding) return;
  const seen = get().prefs.introsSeen ?? [];
  const lv = get().lv;
  if (lv >= 3 && !seen.includes('proscout')) get().showIntro('proscout');
  if (lv >= 5 && !seen.includes('mirror')) get().showIntro('mirror');
}

/** a level crossed — sparks fly; the strip stamps LV (+ ROW when the seat moved) */
function announceLevel(get: Getter, before: number, after: number): void {
  if (after <= before) return;
  get().triggerBurst();
}

/** The day's letters are spent, but keeper keeps slips behind the counter.
    Offered only when it is actually actionable — the stand is open, slips
    remain, and the brass is already in the purse. Returns true if it spoke. */
function offerSlip(get: Getter, set: Setter): boolean {
  const s = get();
  const slip = goodFor('peek-slip');
  if (!slip || s.lv < STAND_LEVEL) return false;
  if (s.daily.slips >= DAILY_CAPS.slip || s.coins < slip.price) return false;
  get().showToast('ti-ticket', L(s.prefs).peekSlipOffer(slip.price), 'keeper');
  setTimeout(() => set({ standOpen: true }), 1400);
  return true;
}

/** which twentieth of a book a position falls in (the ledger's step, 1..20) */
const stepOf = (percent: number): number => Math.min(20, Math.max(1, Math.ceil(percent / 5)));

/** take the server's word for the balances (after a spend it charged itself) */
async function refreshSnapshot(): Promise<void> {
  try {
    const patch = snapshotPatch(await getSnapshot());
    if (patch) useStore.setState(patch);
  } catch {
    /* offline — the local echo stands until the next successful call */
  }
}

/** the store's strings in the reader's language (call inside actions only) */
const L = (prefs: Prefs) => tOf(prefs.lang ?? 'en').store;

export const useStore = create<Store>()(
  subscribeWithSelector((set, get) => ({
    ...SEED,

    activeTab: 'today',
    libTab: 'reading',
    wxIndex: 0,
    reader: { open: false, id: null, p: 1 },
    sheetId: null,
    letterId: null,
    letterStatus: 'idle',
    toast: null,
    owlReact: null,
    burstNonce: 0,
    statFx: null,
    owl: {
      messages: [],
      chips: [],
      collected: [],
      lastBatch: null,
      session: newSession('rain'),
      busy: false,
      started: false,
      pending: null,
    },
    owlDelivery: 'none',
    deskMode: 'all',
    deskSwitchNonce: 0,
    introCard: null,
    introAfter: null,
    pendingIntros: [],
    mirrorRoomOpen: false,
    scoutDraft: '',
    askQuote: null,
    showOnboarding: false,
    openedLetters: [],
    shelfFly: null,
    hydrated: false,
    settingsOpen: false,
    syncStatus: 'off',
    accountStorageBlocked: false,

    // no backend configured → already "ready", with no user; the app never gates on login
    authUser: null,
    authReady: !supabase,

    // guest/mockup: null → ProfileScreen keeps the seeded Mira scenery
    profileRadar: null,
    profileCalendar: null,
    profileStats: null,
    profileQuotes: null,

    signOut: async () => {
      if (!supabase) return;
      const signingOutOwner = owner;
      if (
        ownerReady
        && signingOutOwner !== 'guest'
        && getEbookStorageOwner() === signingOutOwner
        && get().authUser?.id === signingOutOwner
        && cloudHydrationPending?.owner !== signingOutOwner
      ) {
        // Give an explicit sign-out the exact last CFI/page, then push it while
        // the old account's token is still valid. External session replacement
        // cannot be delayed, so the raw listener separately folds the pending
        // anchor into that owner's local snapshot for its next sync.
        // Storage failure must not trap someone in their account. The exact
        // anchor is already folded into PersistedState before the IDB attempt.
        await flushActiveReadingPosition(signingOutOwner).catch(() => {});
        const latest = extractPersisted(get());
        await saveLocal(signingOutOwner, latest).catch(() => {});
        await cloudPush(latest, signingOutOwner).catch(() => {});
      }
      await supabase.auth.signOut();
      // the module-level onAuthStateChange listener below clears authUser + resets the chat
    },

    historyOpen: false,
    openHistory: () => set({ historyOpen: true }),
    closeHistory: () => set({ historyOpen: false }),

    /* ---------- the real in-app reader (Open flow) ---------- */
    ebook: EBOOK_IDLE,

    openBook: async (id) => {
      // Capture and reserve intent before *any* await, including the metadata
      // recovery refresh below. Otherwise an older missing-book request can
      // resume after a later valid tap and incorrectly become the winner.
      const resolutionNonce = ++ebookResolutionNonce;
      const readingOwner = owner;
      const authOwner = get().authUser?.id ?? null;
      const storageOwner = getEbookStorageOwner();
      const requestIsCurrent = () => (
        ebookResolutionNonce === resolutionNonce
        && ownerReady
        && owner === readingOwner
        && getEbookStorageOwner() === storageOwner
        && storageOwner === readingOwner
        && (get().authUser?.id ?? null) === authOwner
        && (
          readingOwner === 'guest'
            ? authOwner === null
            : authOwner === readingOwner
        )
      );
      if (!requestIsCurrent()) return;
      let b = getBook(id);
      // A migrated account may have an old shelf id without its metadata. Give
      // a real account refresh one chance to hydrate the catalog before refusing
      // to open it.
      if (!b && readingOwner !== 'guest') {
        await get().syncAccountNow();
        if (!requestIsCurrent()) return;
        b = getBook(id);
      }
      if (!b) return;
      if (readingOwner !== 'guest') {
        const closeBarrier = readerCloseBarriers.get(
          stagedCloudKey(readingOwner, id),
        );
        if (closeBarrier) await closeBarrier.catch(() => {});
        // A cloud replacement downloaded during the previous session commits
        // only after that session's final position flush. Reopening waits for
        // the same commit so metadata and bytes start in lockstep.
        await promoteStagedCloudRefresh(readingOwner, id).catch(() => {});
        if (!requestIsCurrent()) return;
      }
      const resolutionIsCurrent = () => (
        requestIsCurrent()
        && get().ebook.bookId === id
      );
      const current = get();
      const returnTo = current.letterId
        ? { kind: 'letter' as const, bookId: current.letterId }
        : current.sheetId
          ? { kind: 'sheet' as const, bookId: current.sheetId }
          : null;
      const readingIds = current.readingIds.includes(id) ? current.readingIds : [id, ...current.readingIds];
      const totalPages = b.n || 1;
      const milestonePercent = Math.max(
        maxReadingPercent(current.readingPositions, id),
        ((current.pagesRead[id] ?? 0) / totalPages) * 100,
      );
      progressMark.set(id, Math.floor(milestonePercent / 5) * 5);
      secondsMark.set(id, 0);
      if (current.finishedIds.includes(id)) finishedMark.add(id);
      else finishedMark.delete(id);
      set({
        readingIds,
        libraryBooks: rememberBookMetadata(current.libraryBooks, [id]),
        letterId: null,
        letterStatus: 'idle',
        sheetId: null,
        ebook: {
          ...EBOOK_IDLE,
          open: true,
          bookId: id,
          status: 'resolving',
          percent: milestonePercent,
          returnTo,
        },
      });
      get().econ('open', { bookId: id }); // opening a book is worth something, once

      if (readingOwner !== 'guest') {
        // Keep the resolving surface visible while the account refresh runs,
        // and do not mount an engine until it settles. EbookReader snapshots
        // readingPositions when `source` arrives; a fire-and-forget refresh here
        // would let Foliate initialize at a stale anchor and ignore the cloud
        // position that lands a moment later.
        await get().syncAccountNow();
        if (!resolutionIsCurrent()) return;
        b = getBook(id) ?? b;
        const refreshed = get();
        const refreshedTotal = b.n || 1;
        const refreshedPercent = Math.max(
          maxReadingPercent(refreshed.readingPositions, id),
          ((refreshed.pagesRead[id] ?? 0) / refreshedTotal) * 100,
        );
        progressMark.set(id, Math.floor(refreshedPercent / 5) * 5);
        set({
          ebook: {
            ...refreshed.ebook,
            percent: refreshedPercent,
          },
        });
      }

      // 1) a copy already uploaded on this device wins — instant + offline
      try {
        const up = await loadUpload(id, readingOwner);
        if (!resolutionIsCurrent()) return;
        if (up) {
          const copyFingerprint = normalizeCopyFingerprint(up.source.copyFingerprint);
          const copyVersion = up.source.copyVersion;
          if (readingOwner !== 'guest' && copyFingerprint && copyVersion) {
            const key = readingPositionKey(id, copyVersion);
            const exact = get().readingPositions[key];
            if (
              exact
              && !normalizeCopyFingerprint(exact.copyFingerprint)
              && exact.bookId === id
              && exact.format === up.source.format
              && exact.copyVersion === copyVersion
            ) {
              // Annotate the exact old-version anchor once its local source has
              // a trustworthy content identity. A later same-file selection can
              // then find this anchor without weakening the primary version key.
              get().setReadingPosition({
                ...exact,
                copyFingerprint,
                updatedAt: exact.updatedAt,
              });
            }
          }
          set({ ebook: { ...get().ebook, status: 'reading', source: up.source } });
          if (readingOwner !== 'guest') {
            // Keep the offline cache as the instant path, then quietly compare
            // it with the newest immutable cloud version. A local pending upload
            // always wins until its own retry publishes successfully.
            void (async () => {
              try {
                if (await getPendingUploadSync(id, readingOwner)) return;
                const label = tOf(get().prefs.lang ?? 'en').settings.upload.sourceLabel;
                const cloud = await pullCopy(id, label, readingOwner);
                if (!cloud || !resolutionIsCurrent()) return;
                const sameVersion = (
                  !!up.source.copyVersion
                  && up.source.copyVersion === cloud.source.copyVersion
                );
                const remoteNewer = (
                  !sameVersion
                  && compareCopySelection(cloud.source, up.source) > 0
                );
                if (sameVersion || !remoteNewer) return;
                // Do not replace bytes/metadata underneath a live rendering
                // engine. Hold the immutable download in memory; closeBook
                // flushes the old exact anchor before committing this cache swap.
                const staged = await stageCloudRefreshIfCurrent(
                  id,
                  cloud.blob,
                  cloud.source,
                  readingOwner,
                  up.source.copyVersion,
                );
                if (!staged) return;
                // A background pull can finish after the tab has already emitted
                // its visibility event. Finish the active anchor and commit the
                // stage here too, rather than stranding it until another open.
                if (document.visibilityState === 'hidden') {
                  void flushActiveReadingPosition(readingOwner)
                    .then(() => persistAccountProgressNow(readingOwner))
                    .then(() => commitStagedReaderCloudRefresh(readingOwner, id))
                    .catch(() => {});
                }
              } catch {
                /* offline / signed out / bucket absent — cached reading continues */
              }
            })();
          }
          return;
        }
      } catch {
        /* ignore storage errors */
      }
      if (!resolutionIsCurrent()) return;

      // 2) signed in: another device may have shelved this copy on the
      //    account's private cloud folder — pull it and cache it locally
      if (readingOwner !== 'guest') {
        try {
          const label = tOf(get().prefs.lang ?? 'en').settings.upload.sourceLabel;
          const cloud = await pullCopy(id, label, readingOwner);
          if (!resolutionIsCurrent()) return;
          if (cloud) {
            await saveCloudRefreshIfCurrent(
              id,
              cloud.blob,
              cloud.source,
              readingOwner,
              undefined,
            );
            const currentCache = await loadUpload(id, readingOwner);
            if (!resolutionIsCurrent()) return;
            if (currentCache) {
              set({
                ebook: {
                  ...get().ebook,
                  status: 'reading',
                  source: currentCache.source,
                },
              });
              return;
            }
            // If a cross-tab deletion landed before the confirming read, fall
            // through to the public-domain/upload-empty resolution below.
          }
        } catch {
          /* offline / signed out / bucket absent — fall through */
        }
        if (!resolutionIsCurrent()) return;
      }

      // 3) resolve a public-domain EPUB by title + author (Gutendex)
      const source = await resolvePublicDomain(b.t, b.a);
      if (!resolutionIsCurrent()) return;
      set({
        ebook: source ? { ...get().ebook, status: 'reading', source } : { ...get().ebook, status: 'empty' },
      });
    },

    closeBook: () => {
      ebookResolutionNonce += 1;
      const closing = get().ebook;
      const { returnTo } = closing;
      const closingOwner = getEbookStorageOwner();
      // Capture the active flush promise before the React reader unregisters.
      // Any staged cloud replacement waits behind this exact old-copy anchor.
      const flushTask = (
        closingOwner !== 'guest'
        && closing.bookId
        && closing.source
      ) ? flushActiveReadingPosition(closingOwner) : Promise.resolve();
      if (closingOwner !== 'guest' && closing.bookId) {
        const key = stagedCloudKey(closingOwner, closing.bookId);
        const previousBarrier = readerCloseBarriers.get(key) ?? Promise.resolve();
        let barrier: Promise<void>;
        barrier = previousBarrier
          .catch(() => {})
          .then(() => flushTask)
          .then(() => persistAccountProgressNow(closingOwner))
          .then(() => commitStagedReaderCloudRefresh(closingOwner, closing.bookId as BookRef))
          .finally(() => {
            if (readerCloseBarriers.get(key) === barrier) {
              readerCloseBarriers.delete(key);
            }
          });
        // Register synchronously before clearing ebook so an immediate reopen
        // cannot overtake the final anchor or its staged metadata swap.
        readerCloseBarriers.set(key, barrier);
        // Preserve rejection for callers (so promotion stays fenced), while
        // observing it here to avoid an unhandled Promise on a close-and-leave.
        void barrier.catch(() => {});
      }
      set({
        ebook: EBOOK_IDLE,
        letterId: returnTo?.kind === 'letter' ? returnTo.bookId : null,
        letterStatus: returnTo?.kind === 'letter' ? 'ready' : 'idle',
        sheetId: returnTo?.kind === 'sheet' ? returnTo.bookId : null,
      });
    },
    openUpload: () => set({ ebook: { ...get().ebook, uploadOpen: true } }),
    closeUpload: () => set({ ebook: { ...get().ebook, uploadOpen: false } }),

    setUploadedSource: (id, source) => {
      const e = get().ebook;
      if (e.bookId !== id) return;
      ebookResolutionNonce += 1;
      set({ ebook: { ...e, source, status: 'reading', uploadOpen: false, error: null } });
    },

    setReadingPosition: (position) => {
      // Guest anchors live only in storage.ts's in-memory session map. Keeping
      // them out of PersistedState prevents upload metadata entering durable
      // guest browser storage while still allowing signed-in cloud resume.
      if (!ownerReady || owner === 'guest' || getEbookStorageOwner() !== owner) return;
      const key = readingPositionKey(position.bookId, position.copyVersion);
      const existing = get().readingPositions[key];
      if (existing && compareReadingPositionWrites(position, existing) <= 0) return;
      set({ readingPositions: { ...get().readingPositions, [key]: position } });
    },

    reportProgress: (percent, secondsRead) => {
      const e = get().ebook;
      const id = e.bookId;
      if (!id) return;
      // The active-reading timer reports every second. Only change React state
      // when the visible progress changed; seconds remain in the engine ref.
      if (Math.abs(e.percent - percent) >= 0.01) {
        set({ ebook: { ...e, percent, secondsRead } });
      }

      // bridge percent → pagesRead so the library bars, the RESUME label, and
      // cross-device sync (owlry_progress persists pagesRead, not the ephemeral
      // ebook state) all reflect real reading. Write only when a page boundary is
      // crossed — never regress on a scroll-back — so saves don't churn every second.
      const n = getBook(id)?.n ?? 1;
      const pages = Math.min(n, Math.round((percent / 100) * n));
      if (pages > (get().pagesRead[id] ?? 0)) set({ pagesRead: { ...get().pagesRead, [id]: pages } });

      // one "page turn" per 5% advanced, gated by ≥8s of active reading. The
      // ledger knows it as a step (1..20) — that's what dedupes a re-read —
      // while `page` keeps the library bars honest.
      const lastPct = progressMark.get(id) ?? 0;
      const lastSec = secondsMark.get(id) ?? 0;
      if (percent >= lastPct + 5 && secondsRead >= lastSec + 8) {
        progressMark.set(id, Math.floor(percent / 5) * 5);
        secondsMark.set(id, secondsRead);
        get().econ('turn_page', { bookId: id, step: stepOf(percent), page: pages });
      }

      // finishing near the end — requires real reading time (≥30s), so scrubbing
      // the bar to the end can't farm the finish. Fires once per open.
      if (percent >= 97 && secondsRead >= 30 && !finishedMark.has(id)) {
        finishedMark.add(id);
        const finishedIds = get().finishedIds.includes(id) ? get().finishedIds : [id, ...get().finishedIds];
        const readingIds = get().readingIds.filter((x) => x !== id);
        set({ finishedIds, readingIds, pagesRead: { ...get().pagesRead, [id]: n } });
        get().econ('finish', { bookId: id, pages: n }); // the strip is the trophy
      }
    },

    bootstrap: () => {
      // React StrictMode runs mount effects twice in development. Share one
      // bootstrap so a late duplicate cannot reset an already-adopted account
      // back to the guest ebook namespace.
      if (bootstrapTask) return bootstrapTask;
      bootstrapTask = (async () => {
        const [loaded, session] = await Promise.all([
          loadLocal('guest'),
          supabase ? supabase.auth.getSession().then((r) => r.data.session) : Promise.resolve(null),
          // Unscoped v1 ebook keys may contain old guest-uploaded bytes. They
          // cannot be assigned safely to any account, so remove only those exact
          // legacy prefixes before the app becomes interactive.
          purgeLegacyEbookStorage().catch(() => 0),
        ]);
        // Progress hydrates guest-first. App.tsx then adopts an authenticated
        // account as one guarded transition; keeping ebook storage guest-owned
        // until that point avoids a split-brain owner window.
        owner = 'guest';
        setEbookStorageOwner('guest');
        const guestState = loaded ?? SEED;
        if (session?.user) {
          // A raw Supabase session is known before the profile-backed auth store
          // finishes loading. Keep the guest state available for a legitimate
          // first-account carry, but show a neutral shell and block all owner
          // reads until App adopts that exact user.
          ownerReady = false;
          ownerTransitionSnapshot = {
            owner: 'guest',
            state: { ...guestState, readingPositions: {} },
          };
          set({
            ...SEED,
            readingPositions: {},
            ebook: EBOOK_IDLE,
            hydrated: true,
            showOnboarding: false,
            syncStatus: 'syncing',
            accountStorageBlocked: true,
          });
        } else {
          registerStateBooks(guestState);
          ownerReady = true;
          ownerTransitionSnapshot = null;
          set({ ...guestState, readingPositions: {}, hydrated: true });
          // the well regathers with time while the app is shut — settle it on
          // open, up to the resting line (pages and mornings fill it past that)
          const before = get();
          const settled = settleInk(economyOf(before), Date.now());
          if (settled.ink !== before.ink || settled.inkAt !== before.inkAt) {
            set({ ink: settled.ink, inkAt: settled.inkAt });
          }
        }
        // opening night, once — the curtain waits for first-timers
        if (!session?.user && !get().prefs.onboarded) set({ showOnboarding: true });
        if (supabase) {
          set({
            authUser: session?.user ? { id: session.user.id, email: session.user.email ?? null } : null,
            authReady: true,
          });
        }
        // An authenticated session is still behind the neutral owner gate here.
        // adoptAccount() hydrates its chat only after that account's local/cloud
        // state and dynamic registry are active.
        // a guest's day starts here; a signed-in reader's ticket is stamped at
        // the end of adoptAccount instead, so the server's snapshot lands first
        if (!session?.user) {
          // opening night owns the stage (finishOnboarding stamps day one);
          // otherwise wait out the curtain so the ticket lands on the open set
          if (!get().showOnboarding) {
            const delay = get().prefs.reduceMotion ? 0 : 2000;
            setTimeout(() => {
              if (!get().showOnboarding) get().checkIn();
              armMissedGates(get);
            }, delay);
          }
          await get().hydrateChat();
        }
      })();
      return bootstrapTask;
    },

    hydrateChat: async () => {
      const s = get();
      const userId = s.authUser?.id ?? null;
      const registryScope = getActiveDynamicRegistryScope();
      const hydrationNonce = ++chatHydrationNonce;
      const hydrationIsCurrent = () => (
        chatHydrationNonce === hydrationNonce
        && isActiveDynamicRegistryScope(registryScope)
        && (get().authUser?.id ?? null) === userId
        && ownerReady
        && getEbookStorageOwner() === owner
        && (
          userId
            ? owner === userId
            : owner === 'guest'
        )
      );
      // reloading today's chat abandons any in-flight turn — clear the turn lock
      // so a mid-stream auth refresh can never leave the composer stuck busy
      bumpTurn();
      if (s.owl.busy || s.owl.pending || s.shelfFly) set((st) => ({ shelfFly: null, owl: { ...st.owl, busy: false, pending: null } }));
      // During bootstrap/auth transitions the visible state is deliberately
      // neutral. The completed owner transition calls hydrateChat again.
      if (!hydrationIsCurrent()) return;
      if (!supabase || !userId) {
        if (hydrationIsCurrent()) get().initChat();
        return;
      }

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('owlry_chat_messages')
        .select('id, who, kind, payload, created_at')
        .eq('user_id', userId)
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: true });

      if (!hydrationIsCurrent()) return;
      if (error || !data || !data.length) {
        if (hydrationIsCurrent()) get().initChat();
        return;
      }

      const hydrated = rowsToChat(
        data as unknown as ChatRow[],
        registryScope,
      );
      if (!hydrationIsCurrent()) return;
      chatId = Math.max(chatId, hydrated.maxId); // never collide with hydrated row ids
      // shelf = peeked ∩ Scout-named today — never auto-shelve the whole hand
      const collected = shelfFromPeeks(get().openedLetters, hydrated.mentioned);
      set((st) => ({
        libraryBooks: rememberBookMetadata(st.libraryBooks, hydrated.mentioned),
        owl: {
          ...st.owl,
          started: true,
          messages: hydrated.messages,
          collected,
          lastBatch: hydrated.lastBatch,
          chips: hydrated.chips,
        },
      }));
    },

      setTab: (t) => {
      // the profile section is chained until level 5 — the pill opens the
      // locked room instead of switching (mirror's tone, the sealed chart)
      if (t === 'profile' && get().lv < 5) {
        set({ mirrorRoomOpen: true });
        return;
      }
      set({ activeTab: t, mirrorRoomOpen: false });
    },
    closeMirrorRoom: () => set({ mirrorRoomOpen: false }),

    showIntro: (key, afterLetter) => {
      const seen = get().prefs.introsSeen ?? [];
      if (seen.includes(key)) return; // once, ever
      // one card at a time — but a second owl WAITS rather than being dropped.
      // On the learning curve a single act can cross LV3 and LV5 together, and
      // a dropped card is gone for good: crossGates only fires on the crossing,
      // so mirror would never introduce herself while her chains fell anyway.
      if (get().introCard) {
        if (get().introCard !== key && !get().pendingIntros.includes(key)) {
          set((s) => ({ pendingIntros: [...s.pendingIntros, key] }));
        }
        return;
      }
      set((s) => ({
        prefs: { ...s.prefs, introsSeen: [...seen, key] },
        prefsUpdatedAt: nextPrefsUpdatedAt(s.prefsUpdatedAt),
        introCard: key,
        introAfter: afterLetter ?? null,
      }));
    },

    dismissIntro: () => {
      const after = get().introAfter;
      const [next, ...rest] = get().pendingIntros;
      set({ introCard: null, introAfter: null, pendingIntros: rest });
      if (after) get().openLetter(after); // 'peek' is now seen → the letter opens for real
      // let the card finish leaving before the next owl steps in
      else if (next) setTimeout(() => get().showIntro(next), 400);
    },

    saveQuote: (text, bookId) => {
      // scribe reveals herself the first time a line is kept; after that, a quiet toast
      const firstKeep = !(get().prefs.introsSeen ?? []).includes('scribe');
      if (firstKeep) get().showIntro('scribe');
      // signed in, the line really lands in owlry_quotes (the ledger keeps only
      // its fingerprint). The keep needs a book — explicit id first, else whichever
      // surface the line was lifted from. The sheet outranks the letter: they only
      // coexist when a sheet opens OVER a letter (openLetter clears sheetId), and
      // then the sheet is the surface being quoted.
      const st = get();
      const book = bookId ?? (st.ebook.open ? st.ebook.bookId : null) ?? st.sheetId ?? st.letterId;
      const line = text.trim().slice(0, 1000); // a kept line, not a kept chapter
      if (!line || !book) return;
      // remembered locally either way: a kept line is a strong sign of favour,
      // and the shelf reads it whether or not the reader is signed in
      const { quotedIds } = st;
      if (!quotedIds.includes(book)) set({ quotedIds: [...quotedIds, book] });
      get().econ('quote_keep', { bookId: book, hash: lineHash(line), text: line });
    },
    startAsk: (id) => {
      const b = getBook(id);
      if (!b) return;
      set({
        activeTab: 'discover',
        deskMode: 'all',
        scoutDraft: `I'm thinking about this line from ${b.t} by ${b.a}: “${b.q}” — what should I notice?`,
      });
    },
    // selection → composer: carry any highlighted text to scout's desk as a draft
    askText: (text) => {
      const q = text.trim().slice(0, 240);
      if (!q) return;
      set({ activeTab: 'discover', scoutDraft: q });
    },
    // selection → "Ask": hold the line while the reader writes their question
    beginAskQuote: (text) => {
      const q = text.trim().slice(0, 240);
      if (!q) return;
      set({ askQuote: q });
    },
    cancelAskQuote: () => set({ askQuote: null }),
    // the reader's question lands: quote + question compose into one line that
    // goes straight to scout's desk (the “…” renders as an excerpt in the pill)
    submitAskQuote: (question) => {
      const quote = get().askQuote;
      if (!quote) return;
      const q = question.trim();
      const composed = q ? `“${quote}” — ${q}` : `“${quote}”`;
      set({ askQuote: null, activeTab: 'discover', deskMode: 'all' });
      get().sendToOwl(composed);
    },
    clearScoutDraft: () => set({ scoutDraft: '' }),
    setLibTab: (t) => set({ libTab: t }),

    toggleSave: (id) => {
      const { savedIds, savedAt, libraryBooks } = get();
      const remembered = rememberBookMetadata(libraryBooks, [id]);
      const t = L(get().prefs);
      if (savedIds.includes(id)) {
        const { [id as string]: _dropped, ...rest } = savedAt;
        set({
          savedIds: savedIds.filter((x) => x !== id),
          savedAt: rest,
          libraryBooks: remembered,
        });
        get().econ('unsave', { bookId: id }); // the shelf travels to the ledger too
        get().showToast('ti-heart-broken', t.unshelved, 'keeper');
      } else {
        // stamped so the shelf can rank by how lately a book was hearted
        set({
          savedIds: [...savedIds, id],
          savedAt: { ...savedAt, [id as string]: Date.now() },
          libraryBooks: remembered,
        });
        get().econ('save', { bookId: id }); // the strip carries the +5
      }
    },

    // the quiet "not for me" — written down so the taste survives a reload
    toggleDislike: (id) => {
      const { dislikedIds } = get();
      set({
        dislikedIds: dislikedIds.includes(id)
          ? dislikedIds.filter((x) => x !== id)
          : [...dislikedIds, id],
      });
    },

    /* ---------- the one guarded economy mutation ----------
       Every reward verb comes through here. The engine runs the same grants
       and guards the server does, so a guest plays the real economy and a
       signed-in reader gets an honest optimistic delta — which the ledger's
       answer then overrules. */
    econ: (action, ctx = {}) => {
      const s = get();
      const now = Date.now();
      const res = applyAction(economyOf(s), action, { ...ctx, now, finishedCount: s.finishedIds.length });

      // a refusal is never a wall — the caller decides what to say, and every
      // dry-well path falls through to the free offline owl
      if (res.refused) return res;

      const before = s.lv;
      set(economyPatch(res.next));
      const after = get().lv;
      crossGates(get, before, after);
      // ctx.quiet: the grant lands, the ledger travels, but nothing performs —
      // for moments a scene has already performed itself (onboarding's welcome)
      if (!ctx.quiet) {
        // the strip is the econ voice: deltas, well-full, and the LV/ROW stamps
        // are its lines. Toasts speak only what numbers can't — a full house, a stub.
        emitFx(
          set,
          res.granted.xp,
          res.granted.ink,
          res.granted.coins,
          after > before,
          ACTION_OWL[action],
          seatMoved(before, after),
        );
        const t = L(get().prefs);
        if (after > before) get().triggerBurst();
        if (res.next.daily.fullHouse && !s.daily.fullHouse) {
          get().showToast('ti-sparkles', t.fullHouse, 'keeper');
        }
        // one stub at a time, after the strip's beat — the album keeps the rest
        const stub = res.newStubs.find((x) => x.id !== 'encore');
        if (stub) {
          const label = STUB_LABEL[stub.id]?.[get().prefs.lang ?? 'en'];
          if (label) setTimeout(() => get().showToast('ti-ticket', t.stubEarned(label), 'keeper'), 2200);
        }
      }

      // the server has the last word. Queued, so a tunnel costs nobody their
      // XP; reconciled against `granted`, never against what was asked for.
      if (!ctx.localOnly && s.authUser && isBackendConfigured()) {
        const meta: Record<string, unknown> = {
          occurred_at: new Date(now).toISOString(),
          tz: tzOffsetMinutes(),
        };
        if (ctx.step !== undefined) meta.step = ctx.step;
        if (ctx.page !== undefined) meta.page = ctx.page;
        if (ctx.pages !== undefined) meta.pages = ctx.pages;
        if (ctx.sku) meta.sku = ctx.sku;
        if (ctx.text) meta.text = ctx.text;
        if (ctx.q) meta.q = ctx.q.slice(0, 280);
        void enqueue(s.authUser.id, action, ctx.bookId ?? null, meta)
          .then((r) => {
            if (!r?.ok) return;
            const patch = snapshotPatch(r as Snapshot);
            if (patch) set(patch);
          })
          .catch(() => {});
      }
      return res;
    },

    // the day's first launch — a stamped ticket, then the flame reports in
    checkIn: () => {
      const prevDark = get().darkNightAt;
      const prevStreak = get().streak;
      if (get().econ('checkin').refused) return;
      const t = L(get().prefs);
      // the strip stamps the ticket (+10 ⚡ +10 💧); the flame reports after its beat
      setTimeout(() => {
        const s = get();
        if (s.darkNightAt !== prevDark) get().showToast('ti-flame', t.flameKept, 'keeper');
        else if (s.streak !== prevStreak) {
          get().showToast(
            'ti-flame',
            s.streak > 0 && s.streak % 7 === 0 ? t.flameSeven(s.streak) : t.flameNight(s.streak),
            'keeper',
          );
        }
      }, 2200);
    },

    standOpen: false,
    openStand: () => {
      if (get().lv >= STAND_LEVEL) set({ standOpen: true });
    },
    closeStand: () => set({ standOpen: false }),

    buyGood: (sku) => {
      const good = goodFor(sku);
      if (!good) return;
      const res = get().econ('purchase', { sku });
      const t = L(get().prefs);
      if (res.refused === 'insufficient_coins') return get().showToast('ti-coin', t.purseLight, 'keeper');
      if (res.refused === 'rate_limited') return get().showToast('ti-inkdrop', t.standShut, 'keeper');
      // a successful purchase is the strip's line (−coins, +ink for a bottle)
    },

    // the guest preview affordance: the seat moves, but no brass is minted and
    // the well isn't topped — so adoptAccount can't launder a cheat into an account
    debugLevelUp: () => {
      const before = get().lv;
      const d = derive(cumulativeXp(Math.min(LV_CAP, before + 1)));
      set({ totalXp: cumulativeXp(Math.min(LV_CAP, before + 1)), xp: d.xp, xpMax: d.xpMax, lv: d.lv });
      // the seat still pops; no brass is minted
      emitFx(set, 0, 0, 0, d.lv > before, 'keeper', seatMoved(before, d.lv));
      announceLevel(get, before, d.lv);
      crossGates(get, before, d.lv);
    },

    addXP: (n, owl = 'keeper') => {
      const before = get().lv;
      const totalXp = Math.max(0, get().totalXp + n);
      const d = derive(totalXp);
      set({ totalXp, xp: d.xp, xpMax: d.xpMax, lv: d.lv });
      emitFx(set, n, 0, 0, d.lv > before, owl, seatMoved(before, d.lv));
      announceLevel(get, before, d.lv);
      crossGates(get, before, d.lv);
    },

    // a primitive: the well moves, nothing is minted. The once-ever +50 is the
    // engine's to grant (and, signed in, the ledger's).
    addInk: (n, owl = 'keeper') => {
      const { ink, inkMax } = get();
      const next = Math.min(inkMax, Math.max(0, ink + n));
      set({ ink: next });
      emitFx(set, 0, next - ink, 0, false, owl);
    },

    showToast: (icon, msg, owl) => {
      const key = nextId();
      set((st) => ({
        toast: { icon, msg, key, owl },
        // the owning owl reacts wherever it's perched (any mounted CastOwl pops)
        owlReact: owl ? { owl, nonce: (st.owlReact?.nonce ?? 0) + 1 } : st.owlReact,
      }));
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        if (get().toast?.key === key) set({ toast: null });
      }, 2000);
    },

    triggerBurst: () => set((s) => ({ burstNonce: s.burstNonce + 1 })),

    openReader: (id, page) => {
      const s = get();
      const finishedIds = s.finishedIds.filter((x) => x !== id);
      const readingIds = s.readingIds.includes(id) ? s.readingIds : [id, ...s.readingIds];
      const pagesRead = { ...s.pagesRead };
      if (page) pagesRead[id] = page - 1;
      const n = getBook(id)?.n ?? 1;
      const p = Math.min(Math.max(page ?? (pagesRead[id] ?? 0) + 1, 1), n);
      set({
        finishedIds,
        readingIds,
        pagesRead,
        libraryBooks: rememberBookMetadata(s.libraryBooks, [id]),
        reader: { open: true, id, p },
      });
    },

    closeReader: () => set((s) => ({ reader: { ...s.reader, open: false } })),

    nextPage: () => {
      const s = get();
      const id = s.reader.id;
      if (!id) return;
      const n = getBook(id)?.n ?? 1;
      if (s.reader.p >= n) {
        get().finishBook();
        return;
      }
      const p = s.reader.p + 1;
      const pagesRead = { ...s.pagesRead, [id]: Math.max(s.pagesRead[id] ?? 0, p - 1) };
      set({ reader: { ...s.reader, p }, pagesRead });
      get().econ('turn_page', { bookId: id, step: stepOf((p / n) * 100), page: p });
    },

    prevPage: () => {
      const s = get();
      if (s.reader.p <= 1) return;
      set({ reader: { ...s.reader, p: s.reader.p - 1 } });
    },

    finishBook: () => {
      const s = get();
      const id = s.reader.id;
      if (!id) return;
      const pages = getBook(id)?.n ?? s.reader.p;
      const pagesRead = { ...s.pagesRead, [id]: pages };
      const readingIds = s.readingIds.filter((x) => x !== id);
      const finishedIds = s.finishedIds.includes(id) ? s.finishedIds : [id, ...s.finishedIds];
      set({ pagesRead, readingIds, finishedIds, reader: { open: false, id: null, p: 1 } });
      get().econ('finish', { bookId: id, pages }); // the strip is the trophy
    },

    openSheet: (id) => set((s) => ({
      sheetId: id,
      libraryBooks: rememberBookMetadata(s.libraryBooks, [id]),
    })),
    closeSheet: () => set({ sheetId: null }),

    // the letter is GENERATED on tap (never before): open the overlay, then resolve
    // its content lazily via owl-peek. Already-generated letters resolve instantly
    // (generate-once). A cache-miss generation meters ink; re-opening is free.
    openLetter: (id) => {
      const registryScope = getActiveDynamicRegistryScope();
      const remembered = rememberBookMetadata(get().libraryBooks, [id]);
      if (remembered !== get().libraryBooks) set({ libraryBooks: remembered });
      // peek introduces herself the very first time a letter is opened, then the
      // letter opens on dismiss (dismissIntro re-calls openLetter — now seen)
      if (!(get().prefs.introsSeen ?? []).includes('peek')) {
        get().showIntro('peek', id);
        return;
      }
      const ready = !!getGuide(id);
      set({ letterId: id, sheetId: null, letterStatus: ready ? 'ready' : 'loading' });

      const { openedLetters } = get();
      if (!openedLetters.includes(id)) {
        set({ openedLetters: [...openedLetters, id] });
        get().showToast('ti-mail-opened', L(get().prefs).peekOpened, 'peek');
      }

      if (ready) return;

      // a cache-miss peek is written live (owl-peek) — that costs ink, and the
      // desk only writes so many letters a day. A dry well or a spent day never
      // blocks: the letter simply waits, and scout says so.
      const willGenerate = liveOwlEnabled(get().prefs);
      if (willGenerate) {
        // signed in, owl-peek does the real charging server-side, so this is an
        // optimistic local echo only — never a second charge
        const held = get().econ('preview', { bookId: id, localOnly: true });
        if (held.refused) {
          const t = L(get().prefs);
          // a spent day is the one refusal brass can answer — keeper offers a
          // slip before scout resigns the reader to tomorrow
          if (!(held.refused === 'rate_limited' && offerSlip(get, set))) {
            get().showToast('ti-pencil', held.refused === 'rate_limited' ? t.peekRested : t.inkwellDry, 'scout');
          }
          if (get().letterId === id) set({ letterStatus: 'idle' });
          return;
        }
      }

      void (async () => {
        const outcome = await fetchLetter(id, { registryScope });
        const authed = !!get().authUser && isBackendConfigured();
        if (
          !isActiveDynamicRegistryScope(registryScope)
          || get().letterId !== id
        ) {
          // closed, replaced, or completed for a different account — still
          // reconcile, because the charge was real
          if (authed) void refreshSnapshot();
          return;
        }
        if (outcome.kind === 'ready') {
          set({ letterStatus: 'ready' });
        } else {
          // refused or failed: the desk gives the drops back and the letter
          // waits. The refund performs only while the letter is still open —
          // an orphan Keeper receipt over some other screen would be noise.
          if (willGenerate) {
            if (get().letterId === id) get().addInk(5, 'peek');
            else set((st) => ({ ink: Math.min(st.inkMax, st.ink + 5) }));
          }
          if (outcome.kind === 'refused') {
            const t = L(get().prefs);
            // same offer on the server's refusal as on the local one
            if (!(outcome.why === 'rate_limited' && offerSlip(get, set))) {
              get().showToast('ti-pencil', outcome.why === 'rate_limited' ? t.peekRested : t.inkwellDry, 'scout');
            }
          }
          set({ letterStatus: 'idle' });
        }
        if (authed) void refreshSnapshot(); // the server's ink is the real ink
      })();
    },

    closeLetter: () => {
      // the shelf records only a successful peek: letter must be ready (cache hit
      // or generated), and not yet shelved — then it flies onto the rail
      const id = get().letterId;
      const ready = get().letterStatus === 'ready';
      const shelf =
        id && ready && !get().owl.collected.includes(id)
          ? { id, n: ++shelfFlyNonce }
          : get().shelfFly;
      set({ letterId: null, letterStatus: 'idle', shelfFly: shelf });
    },

    openSettings: () => set({ settingsOpen: true }),
    closeSettings: () => set({ settingsOpen: false }),
    setPref: (key, value) => set((s) => ({
      prefs: { ...s.prefs, [key]: value },
      prefsUpdatedAt: nextPrefsUpdatedAt(s.prefsUpdatedAt),
      ...(key === 'owlEngine' ? { owlDelivery: 'none' as const } : {}),
    })),
    // A true first-run reset — NOT the SEED demo state (level 7 with books
    // already shelved). Level 1, empty shelves, every gate re-locked, the owl
    // intros re-armed, and the ENTIRE opening night replays as if this were a
    // brand-new reader: onboarded + name cleared and showOnboarding raised, so
    // the door, the name entry, the curtain and scout's first flight all play
    // again. Keeps the reader's device settings (font, motion, mode).
    resetProgress: () => (
      bumpTurn(),
      set((s) => ({
        totalXp: 0,
        xp: 0,
        xpMax: cumulativeXp(2) - cumulativeXp(1), // row 13 costs 200 to leave
        ink: 10, // the welcome bundle, so scout is still askable from zero
        inkMax: 120,
        coins: 0,
        lv: 1,
        inkDone: false,
        streak: 0,
        savedIds: [],
        readingIds: [],
        finishedIds: [],
        quotedIds: [],
        dislikedIds: [],
        savedAt: {},
        pagesRead: {},
        readingPositions: {},
        libraryBooks: {},
        // the ledger side goes back to an empty sheet too — no counters, no
        // marks, no album, no flame memory
        daily: emptyDaily(localDay()),
        earn: {},
        stubs: [],
        quoteHashes: [],
        goods: [],
        streakLastDay: null,
        darkNightAt: null,
        inkAt: Date.now(),
        curveV: CURVE_VERSION,
        economyVersion: ECONOMY_VERSION,
        standOpen: false,
        prefs: { ...s.prefs, introsSeen: [], onboarded: false, name: undefined },
        prefsUpdatedAt: nextPrefsUpdatedAt(s.prefsUpdatedAt),
        showOnboarding: true,
        activeTab: 'today',
        deskMode: 'all',
        mirrorRoomOpen: false,
        pendingIntros: [],
        introCard: null,
        introAfter: null,
        shelfFly: null,
        owlDelivery: 'none',
        owl: { ...s.owl, messages: [], chips: [], collected: [], lastBatch: null, started: false, busy: false, pending: null },
      }))
    ),

    initChat: () => {
      if (get().owl.started) return;
      const dp = dayPart();
      const wxKey = WX[get().wxIndex].k;
      const lang = get().prefs.lang ?? 'en';

      // the greeting is local + instant (Scout's canned welcome, zero tokens) —
      // the live pipeline answers real asks, but the door always opens the same way.
      const greeting: OwlMessage = [
        {
          t: 'text',
          v: L(get().prefs).greeting(SAL[lang][dp], FLAVOR[lang][wxKey]),
        },
      ];
      const liveReady = liveOwlEnabled(get().prefs) && !!get().authUser;
      console.info('[owlry] owl engine →', liveReady ? 'LIVE (Scout + memory)' : 'offline guide');
      set((s) => ({
        owl: {
          ...s.owl,
          started: true,
          messages: [{ kind: 'msg', id: nextId(), who: 'owl', nodes: greeting }],
          chips: START_CHIPS[lang][dp],
          session: { ...s.owl.session, wxKey },
        },
      }));

      // best-effort: seed the theme from the real local sky (never blocks the greeting)
      if (liveReady) {
        void getLocalWeather()
          .then((w) => {
            if (!w) return;
            const idx = WX.findIndex((x) => x.k === w.wxKey);
            if (idx >= 0) set({ wxIndex: idx });
          })
          .catch(() => {});
      }
    },

    restartChat: () => {
      bumpTurn(); // abandon any in-flight turn so its reply can't land here
      set((s) => ({
        shelfFly: null,
        owlDelivery: 'none',
        owl: {
          ...s.owl,
          started: false,
          messages: [],
          chips: [],
          collected: [],
          lastBatch: null,
          busy: false,
          pending: null,
          session: newSession(WX[get().wxIndex].k),
        },
      }));
      get().initChat();
    },

    openOnboarding: () => set({ showOnboarding: true, settingsOpen: false }),

    adoptAccount: async (userId) => {
      if (get().authUser?.id !== userId) return;
      const pendingCloudHydration = cloudHydrationPending?.owner === userId
        ? cloudHydrationPending
        : null;
      const recoveringCloudHydration = !!pendingCloudHydration;
      if (
        ownerReady
        && owner === userId
        && getEbookStorageOwner() === userId
        && !recoveringCloudHydration
      ) return;
      if (ownerTransitionTarget === userId) return;
      const transitionNonce = ++ownerTransitionNonce;
      ownerTransitionTarget = userId;
      const registryScope = beginAuthRegistryBoundary(userId);
      const previousOwner = owner;
      const previousOwnerWasReady = ownerReady;
      const freshAccountState = recoveringCloudHydration
        ? pendingCloudHydration.freshAccountState
        : previousOwner === 'guest'
          ? (ownerTransitionSnapshot?.owner === previousOwner
              ? ownerTransitionSnapshot.state
              : extractPersisted(get()))
          : SEED;
      const current = ownerTransitionSnapshot?.owner === previousOwner
        ? ownerTransitionSnapshot.state
        : extractPersisted(get());
      ownerTransitionSnapshot = null;
      const transitionIsCurrent = () => (
        ownerTransitionNonce === transitionNonce
        && owner === userId
        && getEbookStorageOwner() === userId
        && get().authUser?.id === userId
        && isActiveDynamicRegistryScope(registryScope)
      );

      try {
        clearTimeout(saveTimer);
        clearTimeout(cloudTimer);
        ebookResolutionNonce += 1;
        ownerReady = false;
        set((st) => ({
          shelfFly: null,
          owlDelivery: 'none',
          owl: {
            ...st.owl,
            started: false,
            messages: [],
            chips: [],
            collected: [],
            lastBatch: null,
            busy: false,
            pending: null,
          },
        }));
        // Preserve the departing owner's latest local state under its explicit
        // namespace. If another owner transition is already loading, the visible
        // slice still belongs to that transition's predecessor (or is the neutral
        // seed), so never write it into the provisional owner's namespace.
        if (previousOwnerWasReady && !recoveringCloudHydration) {
          void saveLocal(previousOwner, current);
        }
        if (previousOwner !== 'guest' && previousOwner !== userId) {
          // Do not leave account A's library/profile visible while account B is
          // loading on a shared device.
          set({
            ...SEED,
            ebook: EBOOK_IDLE,
            syncStatus: 'syncing',
            accountStorageBlocked: true,
          });
        } else {
          set({
            ebook: EBOOK_IDLE,
            syncStatus: 'syncing',
            accountStorageBlocked: true,
          });
        }
        if (previousOwner === 'guest') clearGuestEbookSession();
        owner = userId;
        setEbookStorageOwner(userId);
        const [userLocal, cloudResult] = await Promise.all([
          loadLocal(userId),
          cloudPull(userId).then(
            (state) => ({ state, error: null }),
            (error: unknown) => ({ state: null, error }),
          ),
        ]);
        if (!transitionIsCurrent()) return;
        const cloud = cloudResult.state;

        // With no trusted account-local cache, a failed pull cannot prove that
        // the cloud row is absent. Never seed/push guest demo state in that
        // ambiguous case. Keep a private in-memory candidate and retry the pull;
        // only a successful null result may establish a genuinely fresh account.
        if (cloudResult.error && !userLocal) {
          cloudHydrationPending = {
            owner: userId,
            freshAccountState,
          };
          set({
            ...SEED,
            ebook: EBOOK_IDLE,
            showOnboarding: false,
            syncStatus: 'error',
            accountStorageBlocked: true,
          });
          ownerReady = false;
          clearCloudHydrationRetry();
          cloudHydrationRetryTimer = setTimeout(() => {
            cloudHydrationRetryTimer = undefined;
            if (
              cloudHydrationPending?.owner === userId
              && get().authUser?.id === userId
            ) void get().adoptAccount(userId);
          }, 3_000);
          console.warn('[sync] cloud progress is unavailable; account adoption will retry:', cloudResult.error);
          return;
        }

        // brand-new account on a fresh device (nothing local, nothing in the
        // cloud) → carry over the current guest progress as its starting point.
        // Otherwise adopt the account's own data (this device's cache merged with
        // the cloud), never folding in the transient guest/demo state.
        let next: PersistedState;
        if (recoveringCloudHydration) {
          next = cloud ?? userLocal ?? freshAccountState;
          if (cloud && userLocal) next = mergeProgress(userLocal, cloud);
        } else if (previousOwner === userId) {
          next = mergeProgress(current, userLocal ?? SEED);
          if (cloud) next = mergeProgress(next, cloud);
        } else if (!userLocal && !cloud) {
          next = previousOwner === 'guest' ? current : SEED;
        } else {
          const base = userLocal ?? (cloud as PersistedState);
          next = cloud ? mergeProgress(base, cloud) : base;
        }

        next = await recoverAccountUploadBooks(next, userId, registryScope);
        if (!transitionIsCurrent()) return;

        // THE SERVER GETS THE LAST WORD, BEFORE ANYTHING IS WRITTEN BACK.
        // The blob merges by max-wins, and a demo-seeded guest blob reads as row
        // 7 with 240 coins — so if that were persisted and pushed first, it
        // would out-rank the account's real ledger and come back every cold
        // start. Snapshot first; if it can't be had, mark the state dirty and
        // write NOTHING, so the next launch tries again from clean ground.
        let profilePatch: Pick<
          NonNullable<ReturnType<typeof snapshotPatch>>,
          'profileRadar' | 'profileCalendar' | 'profileStats' | 'profileQuotes'
        > | null = null;
        if (isBackendConfigured()) {
          let patch: ReturnType<typeof snapshotPatch> = null;
          try {
            patch = snapshotPatch(await getSnapshot());
          } catch {
            patch = null;
          }
          if (!transitionIsCurrent()) return;
          // a snapshot that never arrived — or arrived unusable ({ok:false}
          // comes back as a RESOLVED rpc, not a throw) — must not be treated as
          // truth. Keep the gate up and write nothing, so the next launch
          // retries from clean ground instead of persisting a guess.
          if (!patch) {
            set({ syncStatus: 'error', accountStorageBlocked: true });
            return;
          }
          // THE LIBRARY IS MERGED, NOT REPLACED. A reader from before the ledger
          // has their shelves only in the blob (owlry_user_books was never
          // written, because performAction had no call sites). The migration
          // backfills it, but if that has not run yet the snapshot's empty
          // library would wipe the shelf — and the writes below would persist
          // the wipe to both caches. Union the shelves; keep the furthest page.
          next = mergeProgress(next, { ...next, ...patch } as PersistedState);
          profilePatch = {
            profileRadar: patch.profileRadar,
            profileCalendar: patch.profileCalendar,
            profileStats: patch.profileStats,
            profileQuotes: patch.profileQuotes,
          };
        }

        cloudHydrationPending = null;
        clearCloudHydrationRetry();
        ownerReady = true;
        registerStateBooks(next);
        set({
          ...next,
          showOnboarding: !next.prefs.onboarded,
          accountStorageBlocked: false,
          ...(profilePatch ?? {
            profileRadar: [],
            profileCalendar: [],
            profileStats: { books_read: 0, pages_turned: 0, highlights: 0, reading_minutes: 0 },
            profileQuotes: [],
          }),
        });
        void backfillLegacyPositionFingerprints(userId);
        void get().hydrateChat();
        await saveLocal(userId, next);
        if (!transitionIsCurrent()) return;
        // A failed pull is not the same as an empty account. cloudPush performs
        // its own revision-fenced read/merge, so it is safe to reconcile after
        // a transient download failure without replacing an existing row.
        try {
          const committed = await cloudPush(next, userId);
          if (transitionIsCurrent()) {
            // The CAS write may have met another device after our initial pull.
            // Reconcile the exact committed union back into this device instead
            // of displaying a stale local slice with a misleading "synced".
            const reconciled = committed
              ? mergeProgress(extractPersisted(get()), committed)
              : extractPersisted(get());
            registerStateBooks(reconciled);
            set({ ...reconciled, syncStatus: 'synced' });
            await saveLocal(userId, reconciled);
          }
        } catch {
          if (transitionIsCurrent()) set({ syncStatus: 'error' });
        }
        if (cloudResult.error) {
          console.warn('[sync] initial cloud progress download failed; revision-fenced retry used:', cloudResult.error);
        }
        if (transitionIsCurrent()) void retryPendingCopiesNow(userId);
      } catch (error) {
        if (transitionIsCurrent()) {
          // Keep the state-changing surface covered when account ownership is
          // still untrusted. The gate always offers retry and sign-out.
          set({ syncStatus: 'error', accountStorageBlocked: true });
        }
        console.warn('[sync] could not adopt account storage:', error);
      } finally {
        if (
          ownerTransitionNonce === transitionNonce
          && ownerTransitionTarget === userId
        ) ownerTransitionTarget = null;
      }
      void flush(userId); // anything this device queued offline goes up now
      get().checkIn(); // the day's first ticket, if it hasn't been stamped yet
    },

    syncAccountNow: () => {
      const userId = get().authUser?.id;
      if (
        !supabase
        || !userId
        || !ownerReady
        || owner !== userId
        || getEbookStorageOwner() !== userId
        || cloudHydrationPending?.owner === userId
      ) return Promise.resolve();
      if (accountSyncTask?.owner === userId) return accountSyncTask.task;

      const stillCurrent = () => (
        ownerReady
        && owner === userId
        && getEbookStorageOwner() === userId
        && get().authUser?.id === userId
        && cloudHydrationPending?.owner !== userId
      );

      let task: Promise<void>;
      task = (async () => {
        set({ syncStatus: 'syncing' });
        try {
          // Fold the exact live CFI/page into the durable slice before merging
          // another device. This is a refresh, not an ownership transition, so
          // the reader may remain open throughout.
          await flushActiveReadingPosition(userId);
          if (!stillCurrent()) return;
          const cloud = await cloudPull(userId);
          if (!stillCurrent()) return;

          const live = extractPersisted(get());
          const merged = cloud ? mergeProgress(live, cloud) : live;
          registerStateBooks(merged);
          set({ ...merged });
          void backfillLegacyPositionFingerprints(userId);
          await saveLocal(userId, merged);
          if (!stillCurrent()) return;

          // cloudPush performs its own revision-fenced read/merge. Reconcile the
          // exact committed union because another device may write between this
          // refresh's pull and push.
          const committed = await cloudPush(merged, userId);
          if (!stillCurrent()) return;
          const current = extractPersisted(get());
          const reconciled = committed ? mergeProgress(current, committed) : current;
          registerStateBooks(reconciled);
          set({ ...reconciled, syncStatus: 'synced' });
          await saveLocal(userId, reconciled);
          if (stillCurrent()) void retryPendingCopiesNow(userId);
        } catch (error) {
          if (stillCurrent()) set({ syncStatus: 'error' });
          console.warn('[sync] account refresh failed:', error);
        }
      })().finally(() => {
        if (accountSyncTask?.task === task) accountSyncTask = null;
      });
      accountSyncTask = { owner: userId, task };
      return task;
    },

    revertToGuest: async () => {
      if (get().authUser !== null) return;
      if (
        ownerReady
        && owner === 'guest'
        && getEbookStorageOwner() === 'guest'
      ) return;
      if (ownerTransitionTarget === 'guest') return;
      const transitionNonce = ++ownerTransitionNonce;
      ownerTransitionTarget = 'guest';
      const registryScope = beginAuthRegistryBoundary('guest');
      const previousCloudHydrationWasPending =
        cloudHydrationPending?.owner === owner;
      cloudHydrationPending = null;
      clearCloudHydrationRetry();
      const previousOwner = owner;
      const previousOwnerWasReady = ownerReady;
      const current = ownerTransitionSnapshot?.owner === previousOwner
        ? ownerTransitionSnapshot.state
        : extractPersisted(get());
      ownerTransitionSnapshot = null;
      try {
        clearTimeout(saveTimer);
        clearTimeout(cloudTimer);
        ebookResolutionNonce += 1;
        ownerReady = false;
        set((st) => ({
          shelfFly: null,
          owlDelivery: 'none',
          owl: {
            ...st.owl,
            started: false,
            messages: [],
            chips: [],
            collected: [],
            lastBatch: null,
            busy: false,
            pending: null,
          },
        }));
        if (
          previousOwnerWasReady
          && !previousCloudHydrationWasPending
        ) void saveLocal(previousOwner, current);
        // an account's queued actions never leak into the next session
        if (previousOwner !== 'guest') void clearQueue(previousOwner);
        // Block access to the departing account's ebook namespace immediately,
        // but do not label its still-visible progress state as guest-owned until
        // the guest cache has actually loaded.
        setEbookStorageOwner('guest');
        set({
          ebook: EBOOK_IDLE,
          syncStatus: 'off',
          accountStorageBlocked: true,
        });
        const guest = await loadLocal('guest');
        if (
          ownerTransitionNonce !== transitionNonce
          || owner !== previousOwner
          || getEbookStorageOwner() !== 'guest'
          || get().authUser !== null
          || !isActiveDynamicRegistryScope(registryScope)
        ) return;
        owner = 'guest';
        ownerReady = true;
        clearGuestEbookSession();
        registerStateBooks(guest ?? SEED);
        // show the guest cache again (or the fresh seed) so an account's data
        // doesn't linger on screen after signing out
        set({
          ...(guest ?? SEED),
          readingPositions: {},
          accountStorageBlocked: false,
          // drop the account's radar/calendar/quotes — guest scenery resumes
          profileRadar: null,
          profileCalendar: null,
          profileStats: null,
          profileQuotes: null,
        });
        void get().hydrateChat();
      } catch (error) {
        if (get().authUser === null) set({ syncStatus: 'error' });
        console.warn('[sync] could not restore guest storage:', error);
      } finally {
        if (
          ownerTransitionNonce === transitionNonce
          && ownerTransitionTarget === 'guest'
        ) ownerTransitionTarget = null;
      }
    },

    finishOnboarding: (firstAsk) => {
      // the house opens at scout's desk. if the reader made a first ask during
      // the flight, land the conversation already in motion: their line, scout's
      // reply, and the first peek waiting to be opened (free).
      set((s) => ({
        showOnboarding: false,
        activeTab: 'discover',
        prefs: { ...s.prefs, onboarded: true },
        prefsUpdatedAt: nextPrefsUpdatedAt(s.prefsUpdatedAt),
      }));
      if (!firstAsk) {
        get().checkIn(); // day one's ticket, now that the stage is open
        return;
      }
      const meNodes: OwlMessage = [{ t: 'text', v: firstAsk.label }];
      const owlNodes: OwlMessage = [
        { t: 'text', v: L(get().prefs).firstSorted },
        { t: 'em', v: L(get().prefs).firstTaste },
      ];
      set((st) => ({
        libraryBooks: rememberBookMetadata(st.libraryBooks, [firstAsk.guide]),
        owl: {
          ...st.owl,
          started: true,
          messages: [
            ...st.owl.messages,
            { kind: 'msg', id: nextId(), who: 'me', nodes: meNodes },
            { kind: 'msg', id: nextId(), who: 'owl', nodes: owlNodes },
            { kind: 'deal', id: nextId(), books: dealHand([firstAsk.guide]) },
          ],
          // the shelf stays empty until the reader peeks this first letter
          chips: AFTER_CHIPS[get().prefs.lang ?? 'en'],
        },
      }));
      // the welcome bundle, made real — quiet, because the scene's own
      // xp-fly and confetti already performed this exact grant
      get().econ('onboard', { quiet: true });
      get().checkIn(); // day one's ticket, now that the stage is open
    },

    setDeskMode: (mode) => {
      if (get().deskMode === mode) return;
      // don't switch desks mid-reply — the ack line would wedge into the
      // still-streaming turn and clobber its pending chips
      if (get().owl.busy) return;
      // office hours — the non-fiction desk — opens at level 3; before that,
      // tapping it summons scout pro to explain (the desk stays shut)
      if (mode === 'pro' && get().lv < 3) {
        get().showIntro('proscoutLocked');
        return;
      }
      set({ deskMode: mode });
      // scout acknowledges the switch in voice — canned, zero tokens
      const ack: OwlMessage = [
        {
          t: 'text',
          v: mode === 'pro' ? L(get().prefs).deskPro : L(get().prefs).deskAll,
        },
      ];
      // the desk-switch ack is a reply context — keep it to three quiet chips
      const chips =
        mode === 'pro' ? ['need focus', 'build a habit', 'career'] : ['rest', 'cozy escape', 'feeling stuck'];
      set((st) => ({
        owl: {
          ...st.owl,
          chips,
          messages: [...st.owl.messages, { kind: 'msg', id: nextId(), who: 'owl', nodes: ack }],
        },
        owlReact: { owl: 'scout', nonce: (st.owlReact?.nonce ?? 0) + 1 },
        deskSwitchNonce: st.deskSwitchNonce + 1,
      }));
    },

    sendToOwl: (raw) => {
      const text = (raw ?? '').trim();
      const s = get();
      if (!text || s.owl.busy) return;
      const meId = nextId();
      const typingId = nextId();
      const wxKey = WX[s.wxIndex].k;
      const registryScope = getActiveDynamicRegistryScope();
      const deskMode = s.deskMode;

      // t=0 — the user's line (a quiet pill), chips cleared, the typing dots
      set((st) => ({
        owl: {
          ...st.owl,
          busy: true,
          chips: [],
          pending: null,
          messages: [
            ...st.owl.messages,
            { kind: 'msg', id: meId, who: 'me', nodes: [{ t: 'text', v: text }] },
            { kind: 'typing', id: typingId },
          ],
        },
      }));

      const t0 = Date.now();
      const myTurn = chatTurn; // if the conversation is wiped mid-flight, this reply is stale

      void (async () => {
        // ink meters the LIVE owl (−1 ink, +3 XP). A dry inkwell → the free
        // offline brain answers instead (never charged), so chat never breaks.
        const current = get();
        const liveConfigured = isLiveOwlConfigured();
        const wantsLive = current.prefs.owlEngine !== 'mockup';
        const signedIn = !!current.authUser;
        const hasInk = current.ink >= 1;
        const spend = liveConfigured && wantsLive && signedIn && hasInk;
        const shouldExplainFallback =
          current.owlDelivery === 'none' || current.owlDelivery === 'live';
        const offlineReason: OwlFallbackReason | undefined =
          !liveConfigured
            ? 'backend-unavailable'
            : !wantsLive
              ? 'classic'
              : !signedIn
                ? 'sign-in'
                : !hasInk
                  ? 'ink-dry'
                  : undefined;
        if (offlineReason === 'ink-dry' && shouldExplainFallback) {
          get().showToast('ti-pencil', L(current.prefs).inkwellDry, 'scout');
        }

        const { reply, session, live, fallbackReason } = await fetchOwlTurn(
          text,
          { session: s.owl.session, wxKey, desk: deskMode },
          { offline: !spend, offlineReason, registryScope },
        );
        if (
          chatTurn !== myTurn
          || !isActiveDynamicRegistryScope(registryScope)
        ) return;
        set({
          owlDelivery:
            live
              ? 'live'
              : fallbackReason === 'auth-required'
                ? 'auth-required'
                : 'fallback',
        });
        if (!live && shouldExplainFallback) {
          const copy = L(get().prefs);
          if (fallbackReason === 'backend-unavailable') {
            get().showToast('ti-wifi-off', copy.owlOffline, 'scout');
          } else if (fallbackReason === 'sign-in' || fallbackReason === 'auth-required') {
            get().showToast('ti-user', copy.owlSignIn, 'scout');
          } else if (fallbackReason === 'rate-limited') {
            get().showToast('ti-hourglass', copy.owlResting, 'scout');
          } else if (fallbackReason === 'invalid-response' || fallbackReason === 'service-unavailable') {
            get().showToast('ti-wifi', copy.owlFallback, 'scout');
          }
        }
        // charged only when the live Scout actually answered — an offline
        // fallback costs nothing. Past the day's sixth ask the ink still spends
        // (the owl still writes); it just stops paying XP.
        if (live) get().econ('chat', { q: text });

        // the dots hold for ~620ms (the mockup's beat) before Scout's line streams
        // in — but never longer, so a slow live turn doesn't double-wait
        const wait = Math.max(0, 620 - (Date.now() - t0));

        // which books (if any) get dealt as cards — main first, then the rest of
        // the batch. The shelf only records books the reader actually peeks (see
        // openLetter/closeLetter), never the whole hand, so nothing is
        // auto-collected here
        const bookIds = reply.batch
          ? [reply.batch.main, ...reply.batch.also]
          : reply.letter
            ? [reply.letter]
            : [];
        const speaker: 'scout' | 'scout pro' = deskMode === 'pro' ? 'scout pro' : 'scout';

        setTimeout(() => {
          if (
            chatTurn !== myTurn
            || !isActiveDynamicRegistryScope(registryScope)
          ) return; // reset, owner switch, or stale registry generation
          const st = get();
          // drop the dots, stream Scout's line(s) — first line wears the speaker label
          const messages = st.owl.messages.filter((m) => m.id !== typingId);
          reply.msgs.forEach((nodes, i) => {
            messages.push({
              kind: 'msg',
              id: nextId(),
              who: 'owl',
              nodes,
              stream: true,
              ...(i === 0 ? { speaker } : {}),
            });
          });

          const pending: PendingTurn = {
            bookIds,
            chips: reply.chips,
            note: reply.note,
          };

          set((st2) => ({
            libraryBooks: rememberBookMetadata(st2.libraryBooks, bookIds),
            owl: {
              ...st.owl,
              messages,
              lastBatch: reply.batch ?? st.owl.lastBatch,
              session,
              pending,
            },
            owlReact: { owl: 'scout', nonce: (st2.owlReact?.nonce ?? 0) + 1 },
          }));

          // safety: a reply with no streamable line still needs its after-text beat
          if (!reply.msgs.length) get().revealAfterText(false);
        }, wait);
      })();
    },

    // the typewriter finished — deal Scout's real picks (1–3), then chips.
    // Spines land only after a successful Peek (closeLetter → shelfFly).
    revealAfterText: (skipped) => {
      const pending = get().owl.pending;
      if (!pending) return; // already played (guards double-fire across stream lines)
      set((st) => ({ owl: { ...st.owl, pending: null } }));

      const appendNote = (msgs: ChatItem[]): ChatItem[] =>
        pending.note
          ? [...msgs, { kind: 'msg', id: nextId(), who: 'owl', nodes: [{ t: 'text', v: pending.note! }], tone: 'note' }]
          : msgs;

      const books = dealHand(pending.bookIds);
      const chips = chipsForHand(pending.chips, books.length, getActiveLang());
      const finish = () =>
        set((st) => ({ owl: { ...st.owl, busy: false, chips } }));

      if (books.length) {
        // the hand is dealt a beat after the words settle (sooner if skipped)
        setTimeout(() => {
          set((st) => ({
            owl: {
              ...st.owl,
              messages: appendNote([...st.owl.messages, { kind: 'deal', id: nextId(), books }]),
            },
          }));
          // chips after the jackets land — shelf stays empty until Peek
          setTimeout(finish, 700);
        }, skipped ? 40 : 170);
      } else {
        setTimeout(() => {
          set((st) => ({ owl: { ...st.owl, messages: appendNote(st.owl.messages) } }));
          finish();
        }, 120);
      }
    },

    collectBooks: (ids) => {
      if (!ids.length) return;
      set((st) => {
        const collected = [...st.owl.collected];
        ids.forEach((id) => {
          if (!collected.includes(id)) collected.unshift(id);
        });
        return {
          libraryBooks: rememberBookMetadata(st.libraryBooks, ids),
          owl: { ...st.owl, collected },
        };
      });
    },
  })),
);

const accountProgressOwnerIsCurrent = (
  expectedOwner: Exclude<Owner, 'guest'>,
): boolean => (
  expectedOwner !== 'guest'
  && ownerReady
  && owner === expectedOwner
  && getEbookStorageOwner() === expectedOwner
  && useStore.getState().authUser?.id === expectedOwner
  && cloudHydrationPending?.owner !== expectedOwner
);

/**
 * Persist the current account's exact progress immediately.
 *
 * Copy replacement and cloud-stage promotion use this as a hard barrier after
 * flushing the reader. It rejects on either an owner transition or an IndexedDB
 * failure, leaving the old copy/version fence intact for a later retry.
 */
export async function persistAccountProgressNow(
  expectedOwner: Exclude<Owner, 'guest'>,
): Promise<void> {
  if (!accountProgressOwnerIsCurrent(expectedOwner)) {
    throw new Error('The reading account changed before progress could be saved.');
  }

  let snapshot = extractPersisted(useStore.getState());
  snapshot = withPendingReadingPosition(snapshot, expectedOwner);
  if (snapshot.readingPositions !== useStore.getState().readingPositions) {
    // Keep the in-memory durable slice and the strict IndexedDB snapshot in
    // lockstep when the active reader still has a newer debounced anchor.
    useStore.setState({ readingPositions: snapshot.readingPositions });
    snapshot = extractPersisted(useStore.getState());
  }

  // A previously scheduled best-effort save must not land an older slice after
  // this barrier. The state update above may itself have scheduled a fresh one.
  clearTimeout(saveTimer);
  if (!accountProgressOwnerIsCurrent(expectedOwner)) {
    throw new Error('The reading account changed before progress could be saved.');
  }
  await saveLocalStrict(expectedOwner, snapshot);
  if (!accountProgressOwnerIsCurrent(expectedOwner)) {
    throw new Error('The reading account changed while progress was being saved.');
  }
}

/**
 * Upgrade exact legacy anchors as soon as their account cache exposes a
 * fingerprinted source. Each owner/version lookup is deduped and stays in the
 * background, so adoption never waits on a long IndexedDB walk.
 */
function backfillLegacyPositionFingerprints(userId: string): void {
  if (
    owner !== userId
    || getEbookStorageOwner() !== userId
    || useStore.getState().authUser?.id !== userId
  ) return;
  const candidates = Object.values(useStore.getState().readingPositions).filter(
    (position) => (
      !!position.copyVersion
      && !normalizeCopyFingerprint(position.copyFingerprint)
    ),
  );
  for (const candidate of candidates) {
    const copyVersion = candidate.copyVersion;
    if (!copyVersion) continue;
    const positionKey = readingPositionKey(candidate.bookId, copyVersion);
    const runKey = `${userId}\n${positionKey}`;
    if (positionFingerprintBackfills.has(runKey)) continue;

    let task: Promise<void>;
    task = (async () => {
      const upload = await loadUpload(candidate.bookId, userId, {
        copyVersion,
        format: candidate.format,
      });
      const copyFingerprint = normalizeCopyFingerprint(upload?.source.copyFingerprint);
      if (!upload || !copyFingerprint) return;
      const state = useStore.getState();
      const exact = state.readingPositions[positionKey];
      if (
        owner !== userId
        || getEbookStorageOwner() !== userId
        || state.authUser?.id !== userId
        || !exact
        || exact.bookId !== candidate.bookId
        || exact.format !== candidate.format
        || exact.copyVersion !== copyVersion
        || normalizeCopyFingerprint(exact.copyFingerprint)
      ) return;
      state.setReadingPosition({
        ...exact,
        copyFingerprint,
        updatedAt: exact.updatedAt,
      });
    })()
      .catch(() => {
        /* best-effort migration; reopening/syncing can retry later */
      })
      .finally(() => {
        if (positionFingerprintBackfills.get(runKey) === task) {
          positionFingerprintBackfills.delete(runKey);
        }
      });
    positionFingerprintBackfills.set(runKey, task);
  }
}

/* ── persist the durable slice (debounced) whenever it changes ── */
/* local cache always (offline-first); a longer-debounced cloud push too when
   signed in, so progress follows the account across devices */
function scheduleCloudPush(slice: PersistedState, scheduledOwner: Exclude<Owner, 'guest'>) {
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    if (owner !== scheduledOwner || getEbookStorageOwner() !== scheduledOwner) return;
    useStore.setState({ syncStatus: 'syncing' });
    void cloudPush(slice, scheduledOwner)
      .then((committed) => {
        if (owner === scheduledOwner && getEbookStorageOwner() === scheduledOwner) {
          const live = extractPersisted(useStore.getState());
          const reconciled = committed ? mergeProgress(live, committed) : live;
          if (JSON.stringify(reconciled) === JSON.stringify(live)) {
            useStore.setState({ syncStatus: 'synced' });
          } else {
            registerStateBooks(reconciled);
            useStore.setState({ ...reconciled, syncStatus: 'synced' });
            void saveLocal(scheduledOwner, reconciled);
          }
        }
      })
      .catch(() => {
        if (owner === scheduledOwner && getEbookStorageOwner() === scheduledOwner) {
          useStore.setState({ syncStatus: 'error' });
        }
      });
  }, 1400);
}

/* ── mirror prefs.lang into the i18n module so non-React code (book registry,
   owl brain, owl client) always resolves content in the reader's language ── */
useStore.subscribe(
  (s) => s.prefs.lang ?? 'en',
  (lang) => setActiveLang(lang),
);
setActiveLang(useStore.getState().prefs.lang ?? 'en');
syncDocumentLang();

useStore.subscribe(
  (s) => extractPersisted(s),
  (slice) => {
    if (!useStore.getState().hydrated || !ownerReady) return;
    const scheduledOwner = owner;
    // While the first cloud read is ambiguous, even a local write would turn
    // the neutral placeholder into "trusted" account data on the next retry.
    // Keep it ephemeral until a successful pull establishes cloud-vs-fresh.
    if (cloudHydrationPending?.owner === scheduledOwner) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void saveLocal(scheduledOwner, slice);
    }, 250);
    if (scheduledOwner !== 'guest') scheduleCloudPush(slice, scheduledOwner);
  },
  { equalityFn: shallow },
);

/* ── keep authUser + the chat in sync with Supabase's own session lifecycle.
   The raw session is the immediate privacy boundary: it revokes a departing
   owner's visible/cache state before the profile-backed auth store finishes.
   Once hydration exists it also starts the matching owner transition in a
   microtask; App.tsx may request the same transition later, but the transition
   target/ready guards make that call an idempotent no-op. ── */
if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ? { id: session.user.id, email: session.user.email ?? null } : null;
    const sessionOwner = user?.id ?? null;
    const activeOwner = owner === 'guest' ? null : owner;
    if (sessionOwner !== activeOwner) {
      // Supabase exposes the raw auth ID before the profile-backed auth store
      // finishes its network lookup. Revoke the departing namespace and visible
      // progress immediately so account B can never browse account A's cached
      // library or keep A's reader open during that delay.
      const visibleState = useStore.getState();
      const departing = withPendingReadingPosition(
        extractPersisted(visibleState),
        owner,
      );
      beginAuthRegistryBoundary(user?.id ?? 'guest');
      if (
        visibleState.hydrated
        && ownerReady
        && cloudHydrationPending?.owner !== owner
      ) {
        ownerTransitionSnapshot = { owner, state: departing };
        void saveLocal(owner, departing);
      }
      clearTimeout(saveTimer);
      clearTimeout(cloudTimer);
      cloudHydrationPending = null;
      clearCloudHydrationRetry();
      ownerTransitionNonce += 1;
      ownerTransitionTarget = null;
      ebookResolutionNonce += 1;
      ownerReady = false;
      setEbookStorageOwner('guest');
      if (owner === 'guest') clearGuestEbookSession();
      useStore.setState({
        ...SEED,
        readingPositions: {},
        ebook: EBOOK_IDLE,
        reader: { open: false, id: null, p: 1 },
        sheetId: null,
        letterId: null,
        letterStatus: 'idle',
        openedLetters: [],
        shelfFly: null,
        askQuote: null,
        owlDelivery: 'none',
        owl: {
          messages: [],
          chips: [],
          collected: [],
          lastBatch: null,
          session: newSession(WX[visibleState.wxIndex].k),
          busy: false,
          started: false,
          pending: null,
        },
        showOnboarding: false,
        syncStatus: user ? 'syncing' : 'off',
        accountStorageBlocked: !!user,
        authUser: user,
        authReady: true,
        // real accounts never inherit Mira's seeded radar/calendar/quotes —
        // empty until owlry_get_snapshot lands; guests keep null → mock scenery
        profileRadar: user ? [] : null,
        profileCalendar: user ? [] : null,
        profileStats: user
          ? { books_read: 0, pages_turned: 0, highlights: 0, reading_minutes: 0 }
          : null,
        profileQuotes: user ? [] : null,
      });
    } else {
      useStore.setState({ authUser: user, authReady: true });
    }

    const storageOwner = getEbookStorageOwner();
    const needsOwnerRecovery = useStore.getState().hydrated && (
      user
        ? (!ownerReady || owner !== user.id || storageOwner !== user.id)
        : (!ownerReady || owner !== 'guest' || storageOwner !== 'guest')
    );
    if (needsOwnerRecovery) {
      // Leave Supabase's auth callback before starting IndexedDB/network work.
      queueMicrotask(() => {
        const store = useStore.getState();
        if (user) {
          if (store.authUser?.id === user.id) void store.adoptAccount(user.id);
        } else if (store.authUser === null) {
          void store.revertToGuest();
        }
      });
    }

    if (!needsOwnerRecovery && user) {
      void useStore.getState().hydrateChat();
    }
  });
}

if (typeof window !== 'undefined') {
  let lastForegroundSyncAt = 0;
  const refreshCurrentAccount = (force = false) => {
    const now = Date.now();
    if (!force && now - lastForegroundSyncAt < 5_000) return;
    const store = useStore.getState();
    const userId = store.authUser?.id;
    if (!userId || owner !== userId || getEbookStorageOwner() !== userId) return;
    lastForegroundSyncAt = now;
    void store.syncAccountNow();
  };

  window.addEventListener('online', () => {
    const ebookOwner = getEbookStorageOwner();
    if (ebookOwner !== 'guest') {
      void retryPendingCopiesNow(ebookOwner);
      refreshCurrentAccount(true);
    }
  });
  window.addEventListener('pageshow', () => refreshCurrentAccount());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshCurrentAccount();
  });
}
