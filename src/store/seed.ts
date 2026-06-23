/* ============================================================
   owlry — initial loop state (mockup's starting values).
   ============================================================ */
import type { PersistedState } from './types';

export const SEED: PersistedState = {
  xp: 260,
  xpMax: 400,
  ink: 84,
  inkMax: 120,
  coins: 240,
  lv: 7,
  inkDone: false,
  streak: 12,
  savedIds: ['circe'],
  readingIds: ['goldfinch', 'pachinko', 'tranq'],
  finishedIds: ['oldman', 'none'],
  pagesRead: { goldfinch: 463, pachinko: 118, tranq: 224 },
  prefs: {
    readerScale: 'md',
    reduceMotion: false,
    dailyReminder: false,
    sounds: false,
    owlEngine: 'live',
  },
};
