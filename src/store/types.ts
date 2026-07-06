/* ============================================================
   owlry — store types.
   PersistedState is the durable game loop. Everything else is
   ephemeral session/UI state, re-derived each load (matching the
   mockup, whose chat + carousel reset on refresh).
   ============================================================ */
import type { BookId, GuideId } from '../content/types';
import type { OwlMessage, OwlBatch, OwlSession } from '../lib/owlBrain';

export type Tab = 'today' | 'discover' | 'library' | 'profile';
export type LibTab = 'reading' | 'saved' | 'finished';

export type ReaderScale = 'sm' | 'md' | 'lg';

/** Which owl answers the chat: the live LLM, or the offline mockup brain. */
export type OwlEngine = 'live' | 'mockup';

/** The theatre's lighting rig: 'day' matinée or 'night' evening show. */
export type Mode = 'day' | 'night';

/** User preferences (set on the settings page), persisted with the loop. */
export interface Prefs {
  readerScale: ReaderScale;
  reduceMotion: boolean;
  dailyReminder: boolean;
  sounds: boolean;
  /** the live owl when a backend is configured; 'mockup' forces the offline brain */
  owlEngine: OwlEngine;
  /** lighting rig — 'night' is the default evening show */
  mode: Mode;
  /** opening night (onboarding) has been seen */
  onboarded?: boolean;
}

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
  savedIds: BookId[];
  readingIds: BookId[];
  finishedIds: BookId[];
  pagesRead: Record<string, number>;
  prefs: Prefs;
}

export type ChatItem =
  | { kind: 'msg'; id: number; who: 'owl' | 'me'; nodes: OwlMessage }
  | { kind: 'typing'; id: number }
  | { kind: 'letter'; id: number; book: GuideId }
  /** a letter card for an open-world (live) recommendation — content is
      generated lazily, only when the reader taps the card */
  | { kind: 'recletter'; id: number; title: string; author: string; note?: string };

/** The cast (docs/story-bible.md). */
export type OwlName = 'scout' | 'peek' | 'scribe' | 'mirror' | 'keeper';

/** Scout's two desks: 'all' (default — fiction and non-fiction, whatever
    fits) and 'pro' ("office hours" — non-fiction only, suit on, cooler
    stage, goal-driven). */
export type DeskMode = 'all' | 'pro';

export interface ToastState {
  icon: string;
  msg: string;
  key: number;
  /** when a moment belongs to an owl, the toast carries its face */
  owl?: OwlName;
}

/** a moment an owl reacts to — any mounted CastOwl of that name pops */
export interface OwlReact {
  owl: OwlName;
  nonce: number;
}

export interface OwlState {
  messages: ChatItem[];
  chips: string[];
  collected: BookId[];
  lastBatch: OwlBatch | null;
  session: OwlSession;
  busy: boolean;
  started: boolean;
}

/** an open-world reading letter being viewed (content arrives lazily) */
export interface RecLetterState {
  title: string;
  author: string;
  note?: string;
  status: 'loading' | 'ready' | 'error';
}

export interface ReaderState {
  open: boolean;
  id: BookId | null;
  p: number;
}
