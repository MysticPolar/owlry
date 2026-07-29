/* ============================================================
   owlry — store types.
   PersistedState is the durable game loop. Everything else is
   ephemeral session/UI state, re-derived each load (matching the
   mockup, whose chat + carousel reset on refresh).
   ============================================================ */
import type { Book, BookRef } from '../content/types';
import type { ReadingPosition } from '../lib/ebook/types';
import type { OwlMessage, OwlBatch, OwlSession } from '../lib/owlBrain';

export type Tab = 'today' | 'discover' | 'profile';
export type LibTab = 'reading' | 'saved' | 'finished';

export type ReaderFont = 'literata' | 'fraunces' | 'system';
export type ReaderFlow = 'scroll' | 'page';

export interface ReaderPrefs {
  font: ReaderFont;
  size: number;
  dimmer: number;
  flow: ReaderFlow;
  /** true once the reader has explicitly picked a flow in settings — without it,
      a persisted flow is treated as the old default and re-seeded (page) */
  flowSetByUser?: boolean;
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
  /** the profile bio line — a sentence about your reading self */
  bio?: string;
  /** UI language — 'en' (default) or 'zh' (简体中文) */
  lang?: 'en' | 'zh';
  /** first-use owl intros already shown (peek/scribe/keeper/…), fired once */
  introsSeen?: string[];
}

/**
 * Metadata for a non-catalog book Scout introduced. Catalog books already ship
 * with the app; open-world books need this account-owned copy so a fresh device
 * can render and open a synced shelf without replaying the original chat.
 */
export interface PersistedBook {
  book: Book;
  updatedAt: number;
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
  /** Exact, reflow-safe resume anchors synced for signed-in readers.
      Guests keep the same shape in memory only for the current tab. */
  readingPositions: Record<string, ReadingPosition>;
  /** Open-world book metadata, keyed by the same stable slug used by shelves/uploads. */
  libraryBooks: Record<BookRef, PersistedBook>;
  prefs: Prefs;
  /** Monotonic last-write marker for settings, independent of XP/progress. */
  prefsUpdatedAt: number;
}

export type ChatItem =
  | {
      kind: 'msg';
      id: number;
      who: 'owl' | 'me';
      nodes: OwlMessage;
      tone?: 'note';
      /** the speaker label shown above the first owl line of a turn ('scout' | 'scout pro') */
      speaker?: 'scout' | 'scout pro';
      /** this owl line should type in with a caret (the calm-stream typewriter) */
      stream?: boolean;
    }
  | { kind: 'typing'; id: number }
  /** the unified lazy reading-letter card — the book (catalog id OR open-world
      slug) is registered in bookRegistry before the card is shown; the letter
      itself is generated on tap via owl-peek and cached in the registry.
      Kept for hydrated history rows; new turns deal a 'deal' instead. */
  | { kind: 'letter'; id: number; book: BookRef }
  /** scout's dealt hand — up to three book cards fanned after the reply text
      (the turn's picks, backfilled from the catalog to a full hand of 3) */
  | { kind: 'deal'; id: number; books: BookRef[] };

/** The cast (docs/story-bible.md). */
export type OwlName = 'scout' | 'peek' | 'scribe' | 'mirror' | 'keeper';

/** Scout's two desks: 'all' (default — fiction and non-fiction, whatever
    fits) and 'pro' ("office hours" — non-fiction only, suit on, cooler
    stage, goal-driven). */
export type DeskMode = 'all' | 'pro';

/** first-use owl introduction cards, fired once at their trigger */
export type IntroKey = 'peek' | 'scribe' | 'keeper' | 'proscout' | 'proscoutLocked' | 'mirror';

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

/** The post-text half of a turn, stashed while Scout's line streams in.
    Consumed by `revealAfterText` once the typewriter finishes so the letter
    and the chips arrive one-at-a-time (never mid-stream). */
export interface PendingTurn {
  /** the turn's pick(s), main first (batch.main + batch.also, or the letter);
      empty when the turn deals no cards */
  bookIds: BookRef[];
  chips: string[];
  note?: string;
}

/** A book the reader has just peeked, asking the shelf rail to fly its spine
    in from the letter card (nonce so a repeat of the same book still fires). */
export interface ShelfFly {
  id: BookRef;
  n: number;
}

export interface OwlState {
  messages: ChatItem[];
  chips: string[];
  collected: BookRef[];
  lastBatch: OwlBatch | null;
  session: OwlSession;
  busy: boolean;
  started: boolean;
  /** set while Scout's reply streams; drives the after-text choreography */
  pending: PendingTurn | null;
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
