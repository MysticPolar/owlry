/* ============================================================
   owlry — initial loop state (mockup's starting values).
   ============================================================ */
import { CURVE_VERSION, ECONOMY_VERSION } from '../lib/economy/config';
import { cumulativeXp } from '../lib/economy/curve';
import { emptyDaily, localDay } from '../lib/economy/engine';
import type { PersistedState } from './types';

export const SEED: PersistedState = {
  // the demo reader sits in row 7 with 260 XP banked into the level; on the
  // quadratic curve that is 2,960 lifetime and an 800-XP row to cross
  totalXp: cumulativeXp(7) + 260,
  xp: 260,
  xpMax: cumulativeXp(8) - cumulativeXp(7),
  ink: 84,
  inkMax: 120,
  coins: 240,
  lv: 7,
  inkDone: false,
  streak: 12,
  savedIds: ['circe'],
  readingIds: ['goldfinch', 'pachinko', 'tranq'],
  finishedIds: ['oldman', 'none'],
  // the books the seeded profile quotes tab already claims lines from
  // (content/profile.ts QUOTES) — kept in step so the shelf agrees with it
  quotedIds: ['piranesi', 'medit', 'snow', 'atomic', 'sleep'],
  dislikedIds: [],
  savedAt: {},
  pagesRead: { goldfinch: 463, pachinko: 118, tranq: 224 },
  readingPositions: {},
  libraryBooks: {},

  // the ledger side starts empty even in the demo: no counters, no stubs, no
  // flame memory. The seeded streak of 12 is scenery — the first real act
  // relights it honestly at 1 (streakLastDay is null, so the gap is infinite).
  daily: emptyDaily(localDay()),
  earn: {},
  stubs: [],
  quoteHashes: [],
  goods: [],
  streakLastDay: null,
  darkNightAt: null,
  inkAt: 0,
  curveV: CURVE_VERSION,
  economyVersion: ECONOMY_VERSION,
  prefs: {
    reader: { font: 'literata', size: 18, dimmer: 0, flow: 'page' },
    reduceMotion: false,
    dailyReminder: false,
    sounds: false,
    owlEngine: 'live',
    mode: 'night',
    onboarded: false,
  },
  prefsUpdatedAt: 0,
};
