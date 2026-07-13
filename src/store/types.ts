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

export type ReaderFont = 'literata' | 'fraunces' | 'system';
export type ReaderFlow = 'scroll' | 'page';

export interface ReaderPrefs {
  font: ReaderFont;
  size: number;
  dimmer: number;
  flow: ReaderFlow;
}

/** Which owl answers the chat: the live LLM, or the offline mockup brain. */
export type OwlEngine = 'live' | 'mockup';

/** The theatre's lighting rig: 'day' matinée or 'night' evening show. */
export type Mode = 'day' | 'night';

/** User preferences (set on the settings page), persisted with the loop. */
export interface Prefs {
  /** One library-wide reading setup. Format-specific engines may disable controls they cannot honor. */
  reader: ReaderPrefs;
  reduceMotion: boolean;
  dailyReminder: boolean;
  sounds: boolean;
  /** the live owl when a backend is configured; 'mockup' forces the offline brain */
  owlEngine: OwlEngine;
  /** lighting rig — 'night' is the default evening show */
  mode: Mode;
  /** opening night (onboarding) has been seen */
  onboarded?: boolean;
  /** the name the reader gave the owls at the door ("Dear ___,") */
  name?: string;
  /** first-use owl intros already shown (peek/scribe/keeper/…), fired once */
  introsSeen?: string[];
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
  savedIds: BookRef[];
  readingIds: BookRef[];
  finishedIds: BookRef[];
  pagesRead: Record<string, number>;
  prefs: Prefs;
}

export type ChatItem =
  | { kind: 'msg'; id: number; who: 'owl' | 'me'; nodes: OwlMessage; tone?: 'note' }
  | { kind: 'typing'; id: number }
  /** the unified lazy reading-letter card — the book (catalog id OR open-world
      slug) is registered in bookRegistry before the card is shown; the letter
      itself is generated on tap via owl-peek and cached in the registry. */
  | { kind: 'letter'; id: number; book: BookRef };

/** The cast (docs/story-bible.md). */
export type OwlName = 'scout' | 'peek' | 'scribe' | 'mirror' | 'keeper';

/** Scout's two desks: 'all' (default — fiction and non-fiction, whatever
    fits) and 'pro' ("office hours" — non-fiction only, suit on, cooler
    stage, goal-driven). */
export type DeskMode = 'all' | 'pro';

/** first-use owl introduction cards, fired once at their trigger */
export type IntroKey = 'peek' | 'scribe' | 'keeper' | 'proscout' | 'proscoutLocked';

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
  collected: BookRef[];
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
  id: BookRef | null;
  p: number;
}
