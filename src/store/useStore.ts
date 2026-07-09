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

import { PICKS } from '../content/picks';
import { WX } from '../content/weather';
import { SAL, FLAVOR, START_CHIPS, dayPart } from '../content/owl';
import { newSession } from '../lib/owlBrain';
import type { OwlMessage } from '../lib/owlBrain';
import { fetchOwlTurn, fetchLetter } from '../lib/owlClient';
import { getBook, getGuide } from '../lib/bookRegistry';
import { supabase, isBackendConfigured } from '../lib/supabase';
import { getLocalWeather } from '../lib/weather';
import { rowsToChat } from '../lib/chatHydrate';
import type { ChatRow } from '../lib/chatHydrate';
import type { BookRef } from '../content/types';

import { loadLocal, saveLocal, type Owner } from './persistence';
import { mergeProgress } from '../lib/sync/mergeProgress';
import { cloudPull, cloudPush } from '../lib/sync/cloud';
import { SEED } from './seed';
import type {
  DeskMode,
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
} from './types';

/** lazy reading-letter state: the letter is generated only when the reader taps the card */
export type LetterStatus = 'idle' | 'loading' | 'ready';

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
  pickIndex: number;
  reader: ReaderState;
  sheetId: BookRef | null;
  letterId: BookRef | null;
  letterStatus: LetterStatus;
  toast: ToastState | null;
  owlReact: OwlReact | null;
  burstNonce: number;
  owl: OwlState;
  deskMode: DeskMode;
  /** opening night: playing when true (first run, or replayed from settings) */
  showOnboarding: boolean;
  openedLetters: BookRef[];
  hydrated: boolean;
  settingsOpen: boolean;
  /** cross-device sync: 'off' as guest, else the live push state */
  syncStatus: 'off' | 'syncing' | 'synced' | 'error';

  /* auth — null user + authReady:true whenever no backend is configured, so the
     app never gates on login unless VITE_SUPABASE_URL/ANON_KEY are set */
  authUser: AuthUser | null;
  authReady: boolean;
  signOut: () => Promise<void>;

  /* the separate, read-only history list (past days; today lives in Discover) */
  historyOpen: boolean;
  openHistory: () => void;
  closeHistory: () => void;

  /* actions */
  bootstrap: () => Promise<void>;
  setTab: (t: Tab) => void;
  setLibTab: (t: LibTab) => void;
  cycleWeather: () => void;
  setPick: (i: number) => void;
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
  toggleMode: () => void;
  resetProgress: () => void;
  initChat: () => void;
  /** wipe the conversation and greet fresh (user-initiated "new chat") */
  restartChat: () => void;
  /** load today's persisted chat (authenticated + configured) or fall back to the greeting */
  hydrateChat: () => Promise<void>;
  sendToOwl: (text: string) => void;
  setDeskMode: (mode: DeskMode) => void;
  openOnboarding: () => void;
  /** end opening night; when a first letter was sorted, plant it in the chat and open it */
  finishOnboarding: (firstLetter?: BookRef) => void;
  /** sign-in: adopt an account — pull cloud progress, merge, and start syncing */
  adoptAccount: (userId: string) => Promise<void>;
  /** sign-out: stop syncing and fall back to the local guest cache */
  revertToGuest: () => Promise<void>;
}

let chatId = 0;
const nextId = () => ++chatId;

let toastTimer: ReturnType<typeof setTimeout> | undefined;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let cloudTimer: ReturnType<typeof setTimeout> | undefined;

/* who owns the local cache + whether changes push to the cloud. 'guest' →
   local only (offline-first, as before); a user id → local + cloud sync. */
let owner: Owner = 'guest';

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
    prefs: s.prefs,
  };
}

export const useStore = create<Store>()(
  subscribeWithSelector((set, get) => ({
    ...SEED,

    activeTab: 'today',
    libTab: 'reading',
    wxIndex: 0,
    pickIndex: 0,
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
    },
    deskMode: 'all',
    showOnboarding: false,
    openedLetters: [],
    hydrated: false,
    settingsOpen: false,
    syncStatus: 'off',

    // no backend configured → already "ready", with no user; the app never gates on login
    authUser: null,
    authReady: !supabase,

    signOut: async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
      // the module-level onAuthStateChange listener below clears authUser + resets the chat
    },

    historyOpen: false,
    openHistory: () => set({ historyOpen: true }),
    closeHistory: () => set({ historyOpen: false }),

    bootstrap: async () => {
      const [loaded, session] = await Promise.all([
        loadLocal('guest'),
        supabase ? supabase.auth.getSession().then((r) => r.data.session) : Promise.resolve(null),
      ]);
      if (loaded) set({ ...loaded, hydrated: true });
      else set({ hydrated: true });
      // opening night, once — the curtain waits for first-timers
      if (!get().prefs.onboarded) set({ showOnboarding: true });
      if (supabase) {
        set({
          authUser: session?.user ? { id: session.user.id, email: session.user.email ?? null } : null,
          authReady: true,
        });
      }
      await get().hydrateChat();
    },

    hydrateChat: async () => {
      const s = get();
      if (!supabase || !s.authUser) {
        get().initChat();
        return;
      }

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('owlry_chat_messages')
        .select('id, who, kind, payload, created_at')
        .eq('user_id', s.authUser.id)
        .gte('created_at', startOfDay.toISOString())
        .order('created_at', { ascending: true });

      if (error || !data || !data.length) {
        get().initChat();
        return;
      }

      const hydrated = rowsToChat(data as unknown as ChatRow[]);
      chatId = Math.max(chatId, hydrated.maxId); // never collide with hydrated row ids
      set((st) => ({
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

    setTab: (t) => set({ activeTab: t }),
    setLibTab: (t) => set({ libTab: t }),

    cycleWeather: () => {
      const wxIndex = (get().wxIndex + 1) % WX.length;
      set({ wxIndex });
      get().showToast(WX[wxIndex].i, WX[wxIndex].l);
    },

    setPick: (i) => set({ pickIndex: ((i % PICKS.length) + PICKS.length) % PICKS.length }),

    toggleSave: (id) => {
      const { savedIds } = get();
      if (savedIds.includes(id)) {
        set({ savedIds: savedIds.filter((x) => x !== id) });
        get().showToast('ti-heart-broken', 'unshelved. keeper noticed.', 'keeper');
      } else {
        set({ savedIds: [...savedIds, id] });
        get().showToast('ti-heart', 'shelved · +5 XP', 'keeper');
        get().addXP(5);
      }
    },

    addXP: (n) => {
      let { xp, lv } = get();
      const { xpMax } = get();
      xp += n;
      let leveled = false;
      while (xp >= xpMax) {
        xp -= xpMax;
        lv += 1;
        leveled = true;
      }
      set({ xp, lv });
      if (leveled) {
        get().showToast('ti-sparkles', 'level up! LV ' + lv);
        get().triggerBurst();
      }
    },

    addInk: (n) => {
      const { ink, inkMax, inkDone, coins } = get();
      const next = Math.min(ink + n, inkMax);
      if (next >= inkMax && !inkDone) {
        set({ ink: next, inkDone: true, coins: coins + 50 });
        get().showToast('ti-coin', 'daily ink full · +50 coins');
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
      set({ finishedIds, readingIds, pagesRead, reader: { open: true, id, p } });
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
      get().showToast('ti-trophy', 'finished — counted twice. +40 XP', 'keeper');
      get().addXP(40);
    },

    openSheet: (id) => set({ sheetId: id }),
    closeSheet: () => set({ sheetId: null }),

    // the letter is GENERATED on tap (never before): open the overlay, then resolve
    // its content lazily via owl-peek. Already-generated letters resolve instantly
    // (generate-once). A cache-miss generation meters ink; re-opening is free.
    openLetter: (id) => {
      const ready = !!getGuide(id);
      set({ letterId: id, sheetId: null, letterStatus: ready ? 'ready' : 'loading' });

      const { openedLetters } = get();
      if (!openedLetters.includes(id)) {
        set({ openedLetters: [...openedLetters, id] });
        get().showToast('ti-mail-opened', 'a peek, opened · +5 XP', 'peek');
        get().addXP(5);
      }

      if (ready) return;

      // a cache-miss peek is written live (owl-peek) — that costs ink; a dry well
      // holds the letter until reading a few pages refills it.
      const willGenerate = liveOwlEnabled(get().prefs);
      if (willGenerate && get().ink < 2) {
        get().showToast('ti-pencil', 'the inkwell is dry — a few pages will refill it', 'scout');
        if (get().letterId === id) set({ letterStatus: 'idle' });
        return;
      }
      if (willGenerate) get().addInk(-2); // spend up front; refunded if it fails

      void (async () => {
        const guide = await fetchLetter(id);
        if (get().letterId !== id) return; // the reader closed or opened a different letter
        if (guide) {
          set({ letterStatus: 'ready' });
        } else {
          if (willGenerate) get().addInk(2); // the desk refunds a failed letter
          set({ letterStatus: 'idle' });
        }
      })();
    },

    closeLetter: () => set({ letterId: null, letterStatus: 'idle' }),

    openSettings: () => set({ settingsOpen: true }),
    closeSettings: () => set({ settingsOpen: false }),
    setPref: (key, value) => set((s) => ({ prefs: { ...s.prefs, [key]: value } })),
    toggleMode: () => {
      const mode = get().prefs.mode === 'night' ? 'day' : 'night';
      set((s) => ({ prefs: { ...s.prefs, mode } }));
      get().showToast(mode === 'night' ? 'ti-moon-stars' : 'ti-sun', mode === 'night' ? 'the evening show' : 'the matinée');
    },
    resetProgress: () =>
      set((s) => ({
        ...SEED,
        prefs: s.prefs, // keep the user's settings; only the loop resets
      })),

    initChat: () => {
      if (get().owl.started) return;
      const dp = dayPart();
      const wxKey = WX[get().wxIndex].k;

      // the greeting is local + instant (Scout's canned welcome, zero tokens) —
      // the live pipeline answers real asks, but the door always opens the same way.
      const greeting: OwlMessage = [
        {
          t: 'text',
          v: `${SAL[dp]} ${FLAVOR[wxKey]}. scout here, at the post desk — tell me what's going on, and i'll sort you a peek.`,
        },
      ];
      console.info('[owlry] owl engine →', liveOwlEnabled(get().prefs) ? 'LIVE (Scout + memory)' : 'mockup (offline)');
      set((s) => ({
        owl: {
          ...s.owl,
          started: true,
          messages: [{ kind: 'msg', id: nextId(), who: 'owl', nodes: greeting }],
          chips: START_CHIPS[dp],
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
      set((s) => ({
        owl: {
          ...s.owl,
          started: false,
          messages: [],
          chips: [],
          collected: [],
          lastBatch: null,
          busy: false,
          session: newSession(WX[get().wxIndex].k),
        },
      }));
      get().initChat();
    },

    openOnboarding: () => set({ showOnboarding: true, settingsOpen: false }),

    adoptAccount: async (userId) => {
      owner = userId;
      set({ syncStatus: 'syncing' });
      // what's on screen right now (a guest's play, waiting to carry over)
      const current = extractPersisted(get());
      const [userLocal, cloud] = await Promise.all([
        loadLocal(userId),
        cloudPull().catch(() => null), // offline → treat as no cloud
      ]);

      // brand-new account on a fresh device (nothing local, nothing in the
      // cloud) → carry over the current guest progress as its starting point.
      // Otherwise adopt the account's own data (this device's cache merged with
      // the cloud), never folding in the transient guest/demo state.
      let next: PersistedState;
      if (!userLocal && !cloud) next = current;
      else {
        const base = userLocal ?? (cloud as PersistedState);
        next = cloud ? mergeProgress(base, cloud) : base;
      }

      set({ ...next });
      await saveLocal(userId, next);
      try {
        await cloudPush(next);
        set({ syncStatus: 'synced' });
      } catch {
        set({ syncStatus: 'error' });
      }
    },

    revertToGuest: async () => {
      owner = 'guest';
      set({ syncStatus: 'off' });
      const guest = await loadLocal('guest');
      // show the guest cache again (or the fresh seed) so an account's data
      // doesn't linger on screen after signing out
      set({ ...(guest ?? SEED) });
    },

    finishOnboarding: (firstLetter) => {
      set((s) => ({ showOnboarding: false, prefs: { ...s.prefs, onboarded: true } }));
      if (firstLetter) {
        // the show ends in the real thing: the letter lands in the actual chat,
        // opens as the first peek, and the desk is ready behind it
        set((s) => ({
          activeTab: 'discover',
          owl: {
            ...s.owl,
            messages: [...s.owl.messages, { kind: 'letter', id: nextId(), book: firstLetter }],
            chips: ['go deeper', 'something lighter', 'more like this', 'new vibe'],
          },
        }));
        get().openLetter(firstLetter);
      }
    },

    setDeskMode: (mode) => {
      if (get().deskMode === mode) return;
      set({ deskMode: mode });
      // scout acknowledges the switch in voice — canned, zero tokens
      const ack: OwlMessage = [
        {
          t: 'text',
          v:
            mode === 'pro'
              ? 'right — office hours. what are we solving?'
              : 'off the clock — the whole desk is open. where shall we wander?',
        },
      ];
      const chips =
        mode === 'pro' ? ['need focus', 'build a habit', 'career', 'money'] : ['rest', 'cozy escape', 'feeling stuck', 'surprise me'];
      set((st) => ({
        owl: {
          ...st.owl,
          chips,
          messages: [...st.owl.messages, { kind: 'msg', id: nextId(), who: 'owl', nodes: ack }],
        },
        owlReact: { owl: 'scout', nonce: (st.owlReact?.nonce ?? 0) + 1 },
      }));
    },

    sendToOwl: (raw) => {
      const text = (raw ?? '').trim();
      const s = get();
      if (!text || s.owl.busy) return;
      const meId = nextId();
      const typingId = nextId();
      const wxKey = WX[s.wxIndex].k;

      set((st) => ({
        owl: {
          ...st.owl,
          busy: true,
          chips: [],
          messages: [
            ...st.owl.messages,
            { kind: 'msg', id: meId, who: 'me', nodes: [{ t: 'text', v: text }] },
            { kind: 'typing', id: typingId },
          ],
        },
      }));

      void (async () => {
        // ink meters the LIVE owl (−1 ink, +3 XP). A dry inkwell → the free
        // offline brain answers instead (never charged), so chat never breaks.
        const canLive = liveOwlEnabled(get().prefs);
        const spend = canLive && get().ink >= 1;
        if (canLive && !spend) get().showToast('ti-pencil', 'the inkwell is dry — a few pages will refill it', 'scout');

        const { reply, session, live } = await fetchOwlTurn(
          text,
          { session: s.owl.session, wxKey, desk: get().deskMode },
          { offline: !spend },
        );
        if (live) {
          get().addInk(-1); // charged only when the live Scout actually answered
          get().addXP(3);
        }

        // offline resolves instantly; the typing delay below reproduces the mockup's pacing
        const replyLen = reply.msgs.reduce((n, m) => n + m.reduce((x, nd) => x + nd.v.length, 0), 0);
        const think = Math.min(1500, 650 + replyLen * 3);

        // a contextual note (e.g. "not financial advice") trails the reply as its own quiet line
        const withNote = (msgs: ChatItem[]): ChatItem[] =>
          reply.note
            ? [...msgs, { kind: 'msg', id: nextId(), who: 'owl', nodes: [{ t: 'text', v: reply.note }], tone: 'note' }]
            : msgs;

        setTimeout(() => {
          const st = get();
          let messages = st.owl.messages.filter((m) => m.id !== typingId);
          reply.msgs.forEach((nodes) => {
            messages = [...messages, { kind: 'msg', id: nextId(), who: 'owl', nodes }];
          });

          let collected = st.owl.collected;
          let lastBatch = st.owl.lastBatch;
          if (reply.batch) {
            lastBatch = reply.batch;
            collected = [...st.owl.collected];
            [reply.batch.main, ...reply.batch.also].forEach((id) => {
              if (!collected.includes(id)) collected.unshift(id);
            });
          }

          if (reply.letter) {
            // the reply lands first; the letter (and any note) arrive a beat later, as their own moment
            const letterBook = reply.letter;
            set({ owl: { ...st.owl, messages, collected, lastBatch, session } });
            setTimeout(() => {
              const st2 = get();
              const msgs2: ChatItem[] = withNote([...st2.owl.messages, { kind: 'letter', id: nextId(), book: letterBook }]);
              set((st3) => ({
                owl: { ...st2.owl, busy: false, chips: reply.chips, messages: msgs2 },
                owlReact: { owl: 'scout', nonce: (st3.owlReact?.nonce ?? 0) + 1 },
              }));
            }, 450);
          } else {
            set((st4) => ({
              owl: { ...st.owl, busy: false, messages: withNote(messages), chips: reply.chips, collected, lastBatch, session },
              owlReact: { owl: 'scout', nonce: (st4.owlReact?.nonce ?? 0) + 1 },
            }));
          }
        }, think);
      })();
    },
  })),
);

/* ── persist the durable slice (debounced) whenever it changes ── */
/* local cache always (offline-first); a longer-debounced cloud push too when
   signed in, so progress follows the account across devices */
function scheduleCloudPush(slice: PersistedState) {
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    useStore.setState({ syncStatus: 'syncing' });
    void cloudPush(slice)
      .then(() => useStore.setState({ syncStatus: 'synced' }))
      .catch(() => useStore.setState({ syncStatus: 'error' }));
  }, 1400);
}

useStore.subscribe(
  (s) => extractPersisted(s),
  (slice) => {
    if (!useStore.getState().hydrated) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void saveLocal(owner, slice);
    }, 250);
    if (owner !== 'guest') scheduleCloudPush(slice);
  },
  { equalityFn: shallow },
);

/* ── keep authUser + the chat in sync with Supabase's own session lifecycle
   (sign in/out, token refresh) — set up ONCE at module scope. This listener owns
   only the CHAT side (authUser + hydrateChat + reset); cloud-sync adoption is
   owned solely by App.tsx's effect (driven by useAuth), so a login never adopts
   twice. A redundant hydrateChat() right after bootstrap's own is harmless (it
   replaces owl.messages wholesale). No-op when no backend is configured. ── */
if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ? { id: session.user.id, email: session.user.email ?? null } : null;
    useStore.setState({ authUser: user, authReady: true });
    if (user) {
      void useStore.getState().hydrateChat();
    } else {
      // signed out: back to a fresh, ephemeral greeting
      useStore.setState((s) => ({
        owl: { ...s.owl, started: false, messages: [], chips: [], collected: [], lastBatch: null },
      }));
      useStore.getState().initChat();
    }
  });
}
