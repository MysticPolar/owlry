/* ============================================================
   owlry — store types.
   PersistedState is the durable game loop. Everything else is
   ephemeral session/UI state, re-derived each load (matching the
   mockup, whose chat + carousel reset on refresh).
   ============================================================ */
import type { BookRef } from '../content/types';
import type { OwlMessage, OwlBatch, OwlSession } from '../lib/owlBrain';

export type Tab = 'today' | 'discover' | 'library' | 'profile';
export type LibTab = 'reading' | 'saved' | 'finished';

/** The durable loop persisted to IndexedDB (and, later, a backend). */
export interface PersistedState {
  xp: number;
  xpMax: number;
  ink: number;
  inkMax: number;
  coins: number;
  lv: number;
  inkDone: boolean;
  streak: number;
  savedIds: BookRef[];
  readingIds: BookRef[];
  finishedIds: BookRef[];
  pagesRead: Record<string, number>;
}

export type ChatItem =
  | { kind: 'msg'; id: number; who: 'owl' | 'me'; nodes: OwlMessage; tone?: 'note' }
  | { kind: 'typing'; id: number }
  | { kind: 'letter'; id: number; book: BookRef };

export interface ToastState {
  icon: string;
  msg: string;
  key: number;
}

export interface OwlState {
  messages: ChatItem[];
  chips: string[];
  collected: BookRef[];
  lastBatch: OwlBatch | null;
  session: OwlSession;
  busy: boolean;
  started: boolean;
}

export interface ReaderState {
  open: boolean;
  id: BookRef | null;
  p: number;
}
