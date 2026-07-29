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
   costs 2); a dry inkwell falls back to the free offline brain.
   ============================================================ */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

import { WX } from '../content/weather';
import { SAL, FLAVOR, START_CHIPS, AFTER_CHIPS, dayPart } from '../content/owl';
import { tOf, setActiveLang, syncDocumentLang } from '../i18n';
import { newSession } from '../lib/owlBrain';
import type { OwlMessage } from '../lib/owlBrain';
import { fetchOwlTurn, fetchLetter } from '../lib/owlClient';
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
import { FEED } from '../content/feed';
import { supabase, isBackendConfigured } from '../lib/supabase';
import { saveQuote as persistQuote } from '../lib/economy/api';
import { getLocalWeather } from '../lib/weather';
import { rowsToChat } from '../lib/chatHydrate';
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
  if (!isBackendConfigured() || prefs.owlEngine === 'mockup') return false;
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_OWL_LIVE !== 'off';
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
  owl: OwlState;
  deskMode: DeskMode;
  /** bumped on every successful desk switch → the centered avatar hint replays */
  deskSwitchNonce: number;
  /** the first-use owl intro card on screen, or null; introAfter opens after peek's */
  introCard: IntroKey | null;
  introAfter: BookRef | null;
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
  addXP: (n: number) => void;
  addInk: (n: number) => void;
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

/* fill scout's hand to three cards: the turn's own picks lead, then catalog
   neighbours of the lead book's genre (feed order), never repeating. Keeps a
   thin live/offline reply from dealing a lonely card. */
const dealHand = (ids: BookRef[]): BookRef[] => {
  const hand = [...new Set(ids)].slice(0, 3);
  if (hand.length >= 3 || !hand.length) return hand;
  const lead = getBook(hand[0]);
  const pool = [...FEED.filter((id) => lead && getBook(id)?.g === lead.g), ...FEED];
  for (const id of pool) {
    if (hand.length >= 3) break;
    if (!hand.includes(id)) hand.push(id);
  }
  return hand;
};

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
    pagesRead: s.pagesRead,
    readingPositions: s.readingPositions,
    libraryBooks: s.libraryBooks,
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
      q: 'Your private uploaded copy.',
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
    deskMode: 'all',
    deskSwitchNonce: 0,
    introCard: null,
    introAfter: null,
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

      // cosmetic XP: one "page turn" per 5% advanced, gated by ≥8s of active reading —
      // the same economics as the mock reader's nextPage (+2 XP, +2 ink).
      const lastPct = progressMark.get(id) ?? 0;
      const lastSec = secondsMark.get(id) ?? 0;
      if (percent >= lastPct + 5 && secondsRead >= lastSec + 8) {
        progressMark.set(id, Math.floor(percent / 5) * 5);
        secondsMark.set(id, secondsRead);
        get().addXP(2);
        get().addInk(2);
      }

      // finishing near the end — requires real reading time (≥30s), so scrubbing
      // the bar to the end can't farm the +40. Fires once per open.
      if (percent >= 97 && secondsRead >= 30 && !finishedMark.has(id)) {
        finishedMark.add(id);
        const finishedIds = get().finishedIds.includes(id) ? get().finishedIds : [id, ...get().finishedIds];
        const readingIds = get().readingIds.filter((x) => x !== id);
        set({ finishedIds, readingIds, pagesRead: { ...get().pagesRead, [id]: n } });
        get().showToast('ti-trophy', L(get().prefs).finishedTwice, 'keeper');
        get().addXP(40);
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
        if (!session?.user) await get().hydrateChat();
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
      set((st) => ({
        libraryBooks: rememberBookMetadata(st.libraryBooks, hydrated.collected),
        owl: {
          ...st.owl,
          started: true,
          messages: hydrated.messages,
          collected: hydrated.collected,
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
      if (seen.includes(key) || get().introCard) return; // once, ever; one at a time
      set((s) => ({
        prefs: { ...s.prefs, introsSeen: [...seen, key] },
        prefsUpdatedAt: nextPrefsUpdatedAt(s.prefsUpdatedAt),
        introCard: key,
        introAfter: afterLetter ?? null,
      }));
    },

    dismissIntro: () => {
      const after = get().introAfter;
      set({ introCard: null, introAfter: null });
      if (after) get().openLetter(after); // 'peek' is now seen → the letter opens for real
    },

    saveQuote: (text, bookId) => {
      // scribe reveals herself the first time a line is kept; after that, a quiet toast
      if (!(get().prefs.introsSeen ?? []).includes('scribe')) get().showIntro('scribe');
      else get().showToast('ti-quote', L(get().prefs).lineSaved, 'scribe');
      // signed in, the line really lands in owlry_quotes; guests keep the ritual only.
      // owlry_save_quote needs a book — explicit id first, else whichever book
      // surface the line was lifted from. The sheet outranks the letter: they only
      // coexist when a sheet opens OVER a letter (openLetter clears sheetId), and
      // then the sheet is the surface being quoted.
      const st = get();
      const book = bookId ?? (st.ebook.open ? st.ebook.bookId : null) ?? st.sheetId ?? st.letterId;
      const line = text.trim().slice(0, 1000); // a kept line, not a kept chapter
      if (!line || !book || !st.authUser || !isBackendConfigured()) return;
      void persistQuote(book, line).catch(() => {});
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
      const { savedIds, libraryBooks } = get();
      const remembered = rememberBookMetadata(libraryBooks, [id]);
      if (savedIds.includes(id)) {
        set({ savedIds: savedIds.filter((x) => x !== id), libraryBooks: remembered });
        get().showToast('ti-heart-broken', L(get().prefs).unshelved, 'keeper');
      } else {
        set({ savedIds: [...savedIds, id], libraryBooks: remembered });
        get().showToast('ti-heart', L(get().prefs).shelved, 'keeper');
        get().addXP(5);
      }
    },

    addXP: (n) => {
      let { xp, lv } = get();
      const { xpMax } = get();
      const before = lv;
      xp += n;
      let leveled = false;
      while (xp >= xpMax) {
        xp -= xpMax;
        lv += 1;
        leveled = true;
      }
      set({ xp, lv });
      if (leveled) {
        get().showToast('ti-sparkles', L(get().prefs).levelUp(lv));
        get().triggerBurst();
      }
      // the two gates open on their level crossings
      if (before < 3 && lv >= 3) setTimeout(() => get().showIntro('proscout'), 600);
      if (before < 5 && lv >= 5) {
        // the chains fall (a burst), then mirror steps out of the glass to introduce itself
        setTimeout(() => get().triggerBurst(), 700);
        setTimeout(() => get().showIntro('mirror'), 1150);
      }
    },

    addInk: (n) => {
      const { ink, inkMax, inkDone, coins } = get();
      const next = Math.min(ink + n, inkMax);
      if (next >= inkMax && !inkDone) {
        set({ ink: next, inkDone: true, coins: coins + 50 });
        get().showToast('ti-coin', L(get().prefs).inkFull);
      } else {
        set({ ink: next });
      }
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
      get().addXP(2);
      get().addInk(2);
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
      const pagesRead = { ...s.pagesRead, [id]: getBook(id)?.n ?? s.reader.p };
      const readingIds = s.readingIds.filter((x) => x !== id);
      const finishedIds = s.finishedIds.includes(id) ? s.finishedIds : [id, ...s.finishedIds];
      set({ pagesRead, readingIds, finishedIds, reader: { open: false, id: null, p: 1 } });
      get().showToast('ti-trophy', L(get().prefs).finishedTwice, 'keeper');
      get().addXP(40);
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
        get().addXP(5);
      }

      if (ready) return;

      // a cache-miss peek is written live (owl-peek) — that costs ink; a dry well
      // holds the letter until reading a few pages refills it.
      const willGenerate = liveOwlEnabled(get().prefs);
      if (willGenerate && get().ink < 2) {
        get().showToast('ti-pencil', L(get().prefs).inkwellDry, 'scout');
        if (get().letterId === id) set({ letterStatus: 'idle' });
        return;
      }
      if (willGenerate) get().addInk(-2); // spend up front; refunded if it fails

      void (async () => {
        const guide = await fetchLetter(id, { registryScope });
        if (
          !isActiveDynamicRegistryScope(registryScope)
          || get().letterId !== id
        ) return; // closed, replaced, or completed for a different account
        if (guide) {
          set({ letterStatus: 'ready' });
        } else {
          if (willGenerate) get().addInk(2); // the desk refunds a failed letter
          set({ letterStatus: 'idle' });
        }
      })();
    },

    closeLetter: () => {
      // the shelf records only what the reader peeks: on closing a first peek
      // (opened, not yet shelved) the book flies onto the rail from its card
      const id = get().letterId;
      const shelf =
        id && get().openedLetters.includes(id) && !get().owl.collected.includes(id)
          ? { id, n: ++shelfFlyNonce }
          : get().shelfFly;
      set({ letterId: null, letterStatus: 'idle', shelfFly: shelf });
    },

    openSettings: () => set({ settingsOpen: true }),
    closeSettings: () => set({ settingsOpen: false }),
    setPref: (key, value) => set((s) => ({
      prefs: { ...s.prefs, [key]: value },
      prefsUpdatedAt: nextPrefsUpdatedAt(s.prefsUpdatedAt),
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
        xp: 0,
        xpMax: 400,
        ink: 10, // the welcome bundle, so scout is still askable from zero
        inkMax: 120,
        coins: 0,
        lv: 1,
        inkDone: false,
        streak: 0,
        savedIds: [],
        readingIds: [],
        finishedIds: [],
        pagesRead: {},
        readingPositions: {},
        libraryBooks: {},
        prefs: { ...s.prefs, introsSeen: [], onboarded: false, name: undefined },
        prefsUpdatedAt: nextPrefsUpdatedAt(s.prefsUpdatedAt),
        showOnboarding: true,
        activeTab: 'today',
        deskMode: 'all',
        mirrorRoomOpen: false,
        introCard: null,
        introAfter: null,
        shelfFly: null,
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
      console.info('[owlry] owl engine →', liveOwlEnabled(get().prefs) ? 'LIVE (Scout + memory)' : 'mockup (offline)');
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
      if (liveOwlEnabled(get().prefs)) {
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
        cloudHydrationPending = null;
        clearCloudHydrationRetry();
        ownerReady = true;
        registerStateBooks(next);
        set({
          ...next,
          showOnboarding: !next.prefs.onboarded,
          accountStorageBlocked: false,
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
      if (!firstAsk) return;
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
      // the welcome bundle, made real — a few drops in the well to start
      get().addInk(10);
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
        const canLive = liveOwlEnabled(get().prefs);
        const spend = canLive && get().ink >= 1;
        if (canLive && !spend) get().showToast('ti-pencil', L(get().prefs).inkwellDry, 'scout');

        const { reply, session, live } = await fetchOwlTurn(
          text,
          { session: s.owl.session, wxKey, desk: deskMode },
          { offline: !spend, registryScope },
        );
        if (
          chatTurn !== myTurn
          || !isActiveDynamicRegistryScope(registryScope)
        ) return;
        if (live) {
          get().addInk(-1); // charged only when the live Scout actually answered
          get().addXP(3);
        }

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

    // the typewriter finished — deal the hand, then (via the rail flight)
    // the spine, then the chips. One paper moment, one gold action, in sequence.
    revealAfterText: (skipped) => {
      const pending = get().owl.pending;
      if (!pending) return; // already played (guards double-fire across stream lines)
      set((st) => ({ owl: { ...st.owl, pending: null } }));

      const appendNote = (msgs: ChatItem[]): ChatItem[] =>
        pending.note
          ? [...msgs, { kind: 'msg', id: nextId(), who: 'owl', nodes: [{ t: 'text', v: pending.note! }], tone: 'note' }]
          : msgs;

      const finish = () =>
        set((st) => ({ owl: { ...st.owl, busy: false, chips: pending.chips.slice(0, 3) } }));

      if (pending.bookIds.length) {
        const books = dealHand(pending.bookIds);
        // the hand is dealt a beat after the words settle (sooner if skipped)
        setTimeout(() => {
          set((st) => ({
            owl: {
              ...st.owl,
              messages: appendNote([...st.owl.messages, { kind: 'deal', id: nextId(), books }]),
            },
          }));
          // the whole recommended hand rises onto the shelf a beat after it's dealt
          setTimeout(() => get().collectBooks(books), 480);
          // the rail flight (component-side) rides on top; chips arrive at +700
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
