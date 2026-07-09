/* ============================================================
   owlry — the store. Ports the mockup's game loop (XP, levels,
   ink, coins, streak, saved/reading/finished, reading progress)
   and the Owl Post conversation. Persists the durable slice to a
   ProgressRepository (IndexedDB in v1).
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
import { supabase } from '../lib/supabase';
import { rowsToChat } from '../lib/chatHydrate';
import type { ChatRow } from '../lib/chatHydrate';
import type { BookRef } from '../content/types';

/** lazy reading-letter state: the letter is generated only when the reader taps the card */
export type LetterStatus = 'idle' | 'loading' | 'ready';

/** the signed-in reader, once a backend is configured and a session exists */
export interface AuthUser {
  id: string;
  email: string | null;
}

import { repository } from './persistence';
import { SEED } from './seed';
import type { PersistedState, Tab, LibTab, OwlState, ReaderState, ToastState, ChatItem } from './types';

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
  burstNonce: number;
  owl: OwlState;
  openedLetters: BookRef[];
  hydrated: boolean;

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
  showToast: (icon: string, msg: string) => void;
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
  initChat: () => void;
  /** load today's persisted chat (authenticated + configured) or fall back to the greeting */
  hydrateChat: () => Promise<void>;
  sendToOwl: (text: string) => void;
}

let chatId = 0;
const nextId = () => ++chatId;

let toastTimer: ReturnType<typeof setTimeout> | undefined;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

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
    openedLetters: [],
    hydrated: false,

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
        repository.load(),
        supabase ? supabase.auth.getSession().then((r) => r.data.session) : Promise.resolve(null),
      ]);
      if (loaded) set({ ...loaded, hydrated: true });
      else set({ hydrated: true });
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
        get().showToast('ti-heart-broken', 'removed from library');
      } else {
        set({ savedIds: [...savedIds, id] });
        get().showToast('ti-heart', 'saved to library · +5 XP');
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

    showToast: (icon, msg) => {
      const key = nextId();
      set({ toast: { icon, msg, key } });
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
      get().showToast('ti-trophy', 'finished! +40 XP');
      get().addXP(40);
    },

    openSheet: (id) => set({ sheetId: id }),
    closeSheet: () => set({ sheetId: null }),

    // the letter is GENERATED on tap (never before): open the overlay, then resolve
    // its content lazily. Already-generated letters resolve instantly (generate once).
    openLetter: (id) => {
      const ready = !!getGuide(id);
      set({ letterId: id, sheetId: null, letterStatus: ready ? 'ready' : 'loading' });

      const { openedLetters } = get();
      if (!openedLetters.includes(id)) {
        set({ openedLetters: [...openedLetters, id] });
        get().showToast('ti-mail-opened', 'a letter, opened · +5 XP');
        get().addXP(5);
      }

      if (ready) return;
      void (async () => {
        const guide = await fetchLetter(id);
        // ignore if the reader closed or opened a different letter meanwhile
        if (get().letterId !== id) return;
        set({ letterStatus: guide ? 'ready' : 'idle' });
      })();
    },
    closeLetter: () => set({ letterId: null, letterStatus: 'idle' }),

    initChat: () => {
      if (get().owl.started) return;
      const wxKey = WX[get().wxIndex].k;
      const dp = dayPart();
      const greeting: OwlMessage = [
        {
          t: 'text',
          v: `${SAL[dp]} ${FLAVOR[wxKey]}. i'm the owl at the post desk — tell me what's going on, and i'll sort you a reading letter.`,
        },
      ];
      set((s) => ({
        owl: {
          ...s.owl,
          started: true,
          messages: [{ kind: 'msg', id: nextId(), who: 'owl', nodes: greeting }],
          chips: START_CHIPS[dp],
          session: { ...s.owl.session, wxKey },
        },
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
        // resolve the turn (live model or offline brain); offline resolves fast so
        // the typing delay below reproduces the mockup's pacing exactly
        const { reply, session } = await fetchOwlTurn(text, { session: s.owl.session, wxKey });
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
              const msgs2: ChatItem[] = withNote([
                ...st2.owl.messages,
                { kind: 'letter', id: nextId(), book: letterBook },
              ]);
              set({ owl: { ...st2.owl, busy: false, chips: reply.chips, messages: msgs2 } });
            }, 450);
          } else {
            set({
              owl: { ...st.owl, busy: false, messages: withNote(messages), chips: reply.chips, collected, lastBatch, session },
            });
          }
        }, think);
      })();
    },
  })),
);

/* ── persist the durable slice (debounced) whenever it changes ── */
useStore.subscribe(
  (s) => extractPersisted(s),
  (slice) => {
    if (!useStore.getState().hydrated) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void repository.save(slice);
    }, 250);
  },
  { equalityFn: shallow },
);

/* ── keep authUser (+ the chat) in sync with Supabase's own session lifecycle
   (sign in/out, token refresh) — set up ONCE at module scope, never inside
   bootstrap(), so a dev-mode double-invoke of bootstrap() can't double-
   subscribe. A redundant hydrateChat() call right after bootstrap's own is
   harmless (it replaces owl.messages wholesale, never appends). No-op when no
   backend is configured. ── */
if (supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ? { id: session.user.id, email: session.user.email ?? null } : null;
    useStore.setState({ authUser: user });
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
