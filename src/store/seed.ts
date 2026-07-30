/* ============================================================
   owlry — initial loop state: the back row, on opening night.

   This is a TRUE first run, not a furnished demo. Everyone starts
   at LV1 in row 13 with nothing on the shelves, because the first
   five levels ARE the onboarding: the stand opens at LV2, the pro
   desk at LV3, the mirror's room at LV5 — all of it reachable in
   one session on the learning curve (32 XP to leave the back row).
   A seeded LV7 reader would never see any of that happen.

   SEED is also the floor `adoptAccount` merges against (max-wins),
   so every number here is one a brand-new account could inherit.
   That is the second reason they are all zero.
   ============================================================ */
import { CURVE_VERSION, ECONOMY_VERSION } from '../lib/economy/config';
import { cumulativeXp } from '../lib/economy/curve';
import { emptyDaily, localDay } from '../lib/economy/engine';
import type { PersistedState } from './types';

export const SEED: PersistedState = {
  totalXp: 0,
  xp: 0,
  // row 13 costs 32 to leave — the first deliberate act clears it
  xpMax: cumulativeXp(2) - cumulativeXp(1),
  // the welcome bundle, so scout is askable before a single page is read
  ink: 10,
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

  // the ledger side starts empty: no counters, no stubs, no flame memory
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
