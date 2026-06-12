/* ============================================================
   owlry — the store. Ports the mockup's game loop (XP, levels,
   ink, coins, streak, saved/reading/finished, reading progress)
   and the Owl Post conversation. Persists the durable slice to a
   ProgressRepository (IndexedDB in v1).
   ============================================================ */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

import { BOOKS } from '../content/books';
import { PICKS } from '../content/picks';
import { WX } from '../content/weather';
import { SAL, FLAVOR, START_CHIPS, dayPart } from '../content/owl';
import { respond, newSession } from '../lib/owlBrain';
import type { OwlMessage } from '../lib/owlBrain';
import type { BookId, GuideId } from '../content/types';

import { repository } from './persistence';
import { SEED } from './seed';
import type { PersistedState, Tab, LibTab, OwlState, ReaderState, ToastState } from './types';

export interface Store extends PersistedState {
  /* ephemeral UI / session */
  activeTab: Tab;
  libTab: LibTab;
  wxIndex: number;
  pickIndex: number;
  reader: ReaderState;
  sheetId: BookId | null;
  letterId: GuideId | null;
  toast: ToastState | null;
  burstNonce: number;
  owl: OwlState;
  openedLetters: GuideId[];
  hydrated: boolean;

  /* actions */
  bootstrap: () => Promise<void>;
  setTab: (t: Tab) => void;
  setLibTab: (t: LibTab) => void;
  cycleWeather: () => void;
  setPick: (i: number) => void;
  toggleSave: (id: BookId) => void;
  addXP: (n: number) => void;
  addInk: (n: number) => void;
  showToast: (icon: string, msg: string) => void;
  triggerBurst: () => void;
  openReader: (id: BookId, page?: number) => void;
  closeReader: () => void;
  nextPage: () => void;
  prevPage: () => void;
  finishBook: () => void;
  openSheet: (id: BookId) => void;
  closeSheet: () => void;
  openLetter: (id: GuideId) => void;
  closeLetter: () => void;
  initChat: () => void;
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

    bootstrap: async () => {
      const loaded = await repository.load();
      if (loaded) set({ ...loaded, hydrated: true });
      else set({ hydrated: true });
      get().initChat();
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
      const n = BOOKS[id].n;
      const p = Math.min(Math.max(page ?? (pagesRead[id] ?? 0) + 1, 1), n);
      set({ finishedIds, readingIds, pagesRead, reader: { open: true, id, p } });
    },

    closeReader: () => set((s) => ({ reader: { ...s.reader, open: false } })),

    nextPage: () => {
      const s = get();
      const id = s.reader.id;
      if (!id) return;
      const n = BOOKS[id].n;
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
      const pagesRead = { ...s.pagesRead, [id]: BOOKS[id].n };
      const readingIds = s.readingIds.filter((x) => x !== id);
      const finishedIds = s.finishedIds.includes(id) ? s.finishedIds : [id, ...s.finishedIds];
      set({ pagesRead, readingIds, finishedIds, reader: { open: false, id: null, p: 1 } });
      get().showToast('ti-trophy', 'finished! +40 XP');
      get().addXP(40);
    },

    openSheet: (id) => set({ sheetId: id }),
    closeSheet: () => set({ sheetId: null }),

    openLetter: (id) => {
      set({ letterId: id, sheetId: null });
      const { openedLetters } = get();
      if (!openedLetters.includes(id)) {
        set({ openedLetters: [...openedLetters, id] });
        get().showToast('ti-mail-opened', 'a letter, opened · +5 XP');
        get().addXP(5);
      }
    },
    closeLetter: () => set({ letterId: null }),

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

      // compute the reply up front so the typing delay can scale with its length
      const st0 = get();
      const session = {
        ...st0.owl.session,
        wxKey: WX[st0.wxIndex].k,
        usedGuides: [...st0.owl.session.usedGuides],
      };
      const reply = respond(text, session);
      const replyLen = reply.msgs.reduce((n, m) => n + m.reduce((x, nd) => x + nd.v.length, 0), 0);
      const think = Math.min(1500, 650 + replyLen * 3);

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
          // the reply lands first; the letter arrives a beat later, as its own moment
          const letterBook = reply.letter;
          set({ owl: { ...st.owl, messages, collected, lastBatch, session } });
          setTimeout(() => {
            const st2 = get();
            set({
              owl: {
                ...st2.owl,
                busy: false,
                chips: reply.chips,
                messages: [...st2.owl.messages, { kind: 'letter', id: nextId(), book: letterBook }],
              },
            });
          }, 450);
        } else {
          set({
            owl: { ...st.owl, busy: false, messages, chips: reply.chips, collected, lastBatch, session },
          });
        }
      }, think);
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
