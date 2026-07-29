/* ============================================================
   owlry — the local economy engine (docs/gamification-design.md).

   A pure function: economy state + an action → the next state, what was
   actually granted, and what was withheld. It runs the SAME grants and
   the SAME guards as owlry_perform_action, so:

     • a GUEST plays the real economy offline (numbers without guards
       would be an unbounded farm, and adoptAccount would launder it);
     • a SIGNED-IN reader gets an honest optimistic delta that the
       server snapshot then reconciles.

   Nothing here reaches for the clock on its own — `now` is always
   passed in, so the whole thing is deterministic and testable.
   ============================================================ */
import {
  ACTION_CONFIG,
  DAILY_CAPS,
  ECONOMY,
  MARATHON_SECONDS,
  MATINEE_END_HOUR,
  NIGHT_OWL_HOUR,
  QUOTE_HASH_MEMORY,
  RETURNING_PATRON_DAYS,
  STEP_COOLDOWN_MS,
  goodFor,
  seasonId,
} from './config';
import { LV_CAP, cumulativeXp, encoreStars, levelForXp } from './curve';
import type {
  BookEarn,
  DailyCounters,
  EconomyAction,
  Granted,
  StubRecord,
  WithheldReason,
} from './types';

/* ---------- local days ---------- */

/** the reader's local day, YYYY-MM-DD (the server derives the same from tz_offset_minutes) */
export function localDay(at: number | Date = Date.now()): string {
  const d = at instanceof Date ? at : new Date(at);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** whole days between two YYYY-MM-DD strings (a − b) */
export const dayDiff = (a: string, b: string): number =>
  Math.round((Date.parse(`${a}T00:00:00`) - Date.parse(`${b}T00:00:00`)) / 86_400_000);

/** minutes east of UTC — what the server stores as tz_offset_minutes */
export const tzOffsetMinutes = (at: Date = new Date()): number => -at.getTimezoneOffset();

export const emptyDaily = (day: string): DailyCounters => ({
  day,
  xp: 0,
  turn_page: 0,
  open: 0,
  chat: 0,
  preview: 0,
  quote_keep: 0,
  checkin: false,
  matinee: false,
  evening: false,
  fullHouse: false,
  bottle: false,
  lastStepAt: 0,
  firstAt: 0,
  lastAt: 0,
});

/* ---------- the shape the engine owns ---------- */

export interface EconomyState {
  /** lifetime XP — the durable truth; lv/xp/xpMax are derived mirrors */
  totalXp: number;
  ink: number;
  inkMax: number;
  coins: number;
  streak: number;
  /** the once-ever full-well +50 has been paid */
  inkDone: boolean;
  daily: DailyCounters;
  /** per-book earn marks, so a re-read can't re-earn */
  earn: Record<string, BookEarn & { mask?: number }>;
  stubs: StubRecord[];
  /** quote fingerprints (never the prose), newest last */
  quoteHashes: string[];
  /** lobby-stand skus owned (guests only — authed goods come from the snapshot) */
  goods: string[];
  /** the last local day with an XP-bearing act */
  streakLastDay: string | null;
  /** the missed day a dark night already forgave */
  darkNightAt: string | null;
  /** epoch ms the ink clock was last settled */
  inkAt: number;
}

export interface ActionContext {
  now?: number;
  bookId?: string | null;
  /** turn_page: which twentieth of the book this is (1..20) */
  step?: number;
  /** purchase: which sku */
  sku?: string;
  /** quote_keep: the line's fingerprint */
  hash?: string;
  /** finish/twenty-books: how many books are finished after this action */
  finishedCount?: number;
}

export interface EngineResult {
  next: EconomyState;
  granted: Granted;
  withheld?: WithheldReason;
  /** refused outright — nothing changed (a dry well, an empty purse) */
  refused?: WithheldReason;
  leveled: boolean;
  levelBefore: number;
  levelAfter: number;
  /** stubs earned by this action alone */
  newStubs: StubRecord[];
  /** the once-ever full well filled on this action */
  wellFilled: boolean;
}

/* ---------- derived mirrors ---------- */

/** what the level chips and bars read. Past the front row the bar tracks the
    next encore star, so the display never shows a thirteenth-row overflow. */
export function derive(totalXp: number): { lv: number; xp: number; xpMax: number; encore: number } {
  const raw = levelForXp(totalXp);
  const encore = encoreStars(totalXp);
  if (raw >= LV_CAP) {
    const past = Math.max(0, totalXp - cumulativeXp(LV_CAP));
    return { lv: LV_CAP, xp: past % 1000, xpMax: 1000, encore };
  }
  return {
    lv: raw,
    xp: totalXp - cumulativeXp(raw),
    xpMax: cumulativeXp(raw + 1) - cumulativeXp(raw),
    encore,
  };
}

/* ---------- time-based ink regen ---------- */

/** the well regathers with time — but only up to the resting line. Pages and
    mornings are what fill it past that, which is why a peek binge has to be
    read back rather than waited out. */
export function settleInk(s: EconomyState, now: number): EconomyState {
  const rest = Math.min(s.inkMax, ECONOMY.inkRest);
  if (s.ink >= rest) return s.inkAt === now ? s : { ...s, inkAt: now };
  const per = ECONOMY.regenMinutes * 60_000;
  const gained = Math.floor((now - (s.inkAt || now)) / per);
  if (gained <= 0) return s;
  const ink = Math.min(rest, s.ink + gained);
  return { ...s, ink, inkAt: ink >= rest ? now : (s.inkAt || now) + gained * per };
}

const popcount = (n: number): number => {
  let c = 0;
  let v = n;
  while (v) {
    v &= v - 1;
    c += 1;
  }
  return c;
};

const addStub = (list: StubRecord[], out: StubRecord[], id: string, at: string, n?: number): void => {
  if (list.some((s) => s.id === id && (s.n ?? null) === (n ?? null))) return;
  const stub: StubRecord = n === undefined ? { id, at } : { id, n, at };
  list.push(stub);
  out.push(stub);
};

/* ---------- the one guarded mutation ---------- */

export function applyAction(state: EconomyState, action: EconomyAction, ctx: ActionContext = {}): EngineResult {
  const now = ctx.now ?? Date.now();
  const at = new Date(now);
  const day = localDay(now);
  const hour = at.getHours();

  let s = settleInk(state, now);
  if (s.daily.day !== day) s = { ...s, daily: emptyDaily(day) };

  const rest = Math.min(s.inkMax, ECONOMY.inkRest);
  const cfg = ACTION_CONFIG[action];
  const nothing: Granted = { xp: 0, ink: 0, coins: 0 };
  const refuse = (why: WithheldReason): EngineResult => ({
    next: s,
    granted: nothing,
    refused: why,
    leveled: false,
    levelBefore: levelForXp(s.totalXp),
    levelAfter: levelForXp(s.totalXp),
    newStubs: [],
    wellFilled: false,
  });

  if (!cfg) return refuse('unverified');

  let dXp = cfg.xp;
  let dInk = cfg.ink;
  let dCoins = cfg.coins;
  let withheld: WithheldReason | undefined;

  const book = ctx.bookId ?? null;
  const earn: Record<string, BookEarn & { mask?: number }> = { ...s.earn };
  const mark = (b: string): BookEarn & { mask?: number } => ({ ...(earn[b] ?? {}) });
  const daily: DailyCounters = { ...s.daily };
  const quoteHashes = [...s.quoteHashes];
  const goods = [...s.goods];

  /* ---------- per-action guards (mirrors of the SQL) ---------- */
  if (action === 'turn_page') {
    const step = ctx.step;
    const m = book ? mark(book) : {};
    const seen = book ? ((m.mask ?? 0) & (1 << ((step ?? 1) - 1))) !== 0 : false;
    if (!book || !step || step < 1 || step > 20) {
      // no ink either — a bogus step that still paid +2 would be a well with
      // no bottom, and the same hole existed server-side
      dXp = 0;
      dInk = 0;
      withheld = 'unverified';
    } else if (seen) {
      // ink is deduped on the step being SEEN, not on it having paid XP, so a
      // book returns at most twenty steps' worth of ink to the desk, ever
      dXp = 0;
      dInk = 0;
      withheld = 'duplicate';
    } else if (now - daily.lastStepAt < STEP_COOLDOWN_MS) {
      dXp = 0; // ink still refills — reading always returns something to the desk
      withheld = 'rate_limited';
    } else if (daily.turn_page >= DAILY_CAPS.turn_page) {
      dXp = 0;
      withheld = 'rate_limited';
    }
    if (book && step && step >= 1 && step <= 20) {
      // every step SEEN is recorded (paid or not) — the finish guard counts these
      m.mask = (m.mask ?? 0) | (1 << (step - 1));
      if (dXp > 0) m.step = step;
      earn[book] = m;
    }
    if (dXp > 0) {
      daily.turn_page += 1;
      daily.lastStepAt = now;
    }
  } else if (action === 'open') {
    const m = book ? mark(book) : {};
    if (book && m.open) {
      dXp = 0;
      withheld = 'duplicate';
    } else if (daily.open >= DAILY_CAPS.open) {
      dXp = 0;
      withheld = 'rate_limited';
    }
    if (book && dXp > 0) {
      m.open = 1;
      earn[book] = m;
      daily.open += 1;
    }
  } else if (action === 'finish') {
    const m = book ? mark(book) : {};
    if (book && m.finish) {
      dXp = 0;
      dCoins = 0;
      withheld = 'duplicate'; // Keeper still counts it — the shelf write lands
    } else if (!book || popcount(m.mask ?? 0) < 19) {
      // a finish has to be read to: nineteen of twenty steps seen
      dXp = 0;
      dCoins = 0;
      withheld = 'unverified';
    }
    if (book && dXp > 0) {
      m.finish = 1;
      earn[book] = m;
    }
  } else if (action === 'save') {
    const m = book ? mark(book) : {};
    if (book && m.save) {
      dXp = 0;
      withheld = 'duplicate';
    }
    if (book && dXp > 0) {
      m.save = 1;
      earn[book] = m;
    }
  } else if (action === 'chat') {
    if (s.ink + dInk < 0) return refuse('insufficient_ink');
    if (daily.chat >= DAILY_CAPS.chat) {
      dXp = 0; // the ink still spends; the owl still answers
      withheld = 'rate_limited';
    } else if (dXp > 0) {
      daily.chat += 1;
    }
  } else if (action === 'preview') {
    // the LLM throttle: the daily cap binds, not the ink
    if (daily.preview >= DAILY_CAPS.preview) return refuse('rate_limited');
    if (s.ink + dInk < 0) return refuse('insufficient_ink');
    daily.preview += 1;
  } else if (action === 'quote_keep') {
    const hash = ctx.hash ?? '';
    if (hash && quoteHashes.includes(hash)) return refuse('duplicate');
    if (hash) {
      quoteHashes.push(hash);
      if (quoteHashes.length > QUOTE_HASH_MEMORY) quoteHashes.splice(0, quoteHashes.length - QUOTE_HASH_MEMORY);
    }
    if (daily.quote_keep >= DAILY_CAPS.quote_keep) {
      dXp = 0; // kept silently
      withheld = 'rate_limited';
    } else if (dXp > 0) {
      daily.quote_keep += 1;
    }
  } else if (action === 'checkin') {
    if (daily.checkin) return refuse('duplicate');
    daily.checkin = true;
  } else if (action === 'onboard') {
    if (s.stubs.some((st) => st.id === 'opening_night')) return refuse('duplicate');
  } else if (action === 'purchase') {
    const good = ctx.sku ? goodFor(ctx.sku) : undefined;
    const season = seasonId(at);
    if (!good || (good.season !== null && good.season !== season)) return refuse('unverified');
    if (good.kind !== 'bottle' && goods.includes(good.sku)) return refuse('duplicate');
    if (good.kind === 'bottle' && daily.bottle) return refuse('rate_limited');
    if (s.coins < good.price) return refuse('insufficient_coins');
    dCoins = -good.price;
    if (good.kind === 'bottle') {
      dInk = ECONOMY.bottleInk;
      daily.bottle = true;
    } else {
      goods.push(good.sku);
    }
  }

  /* ---------- the global daily ceiling (withheld, never banked) ---------- */
  if (dXp > 0 && daily.xp + dXp > ECONOMY.dailyXpCap) {
    dXp = Math.max(0, ECONOMY.dailyXpCap - daily.xp);
    if (dXp === 0) withheld = withheld ?? 'rate_limited';
  }

  /* ---------- apply ---------- */
  const levelBefore = levelForXp(s.totalXp);
  let totalXp = s.totalXp + dXp;
  let ink = Math.min(s.inkMax, Math.max(0, s.ink + dInk));
  let coins = s.coins + dCoins;
  let inkDone = s.inkDone;
  let streak = s.streak;
  let streakLastDay = s.streakLastDay;
  let darkNightAt = s.darkNightAt;
  const newStubs: StubRecord[] = [];
  const stubs = [...s.stubs];

  const levelAfter = levelForXp(totalXp);
  const leveled = levelAfter > levelBefore;
  if (leveled) {
    // the faucet stops at the front row; the refill tops to the resting line,
    // not the cap — a full-cap refill was twenty-four free peeks a level
    const paidLevels = Math.max(0, Math.min(levelAfter, LV_CAP) - Math.min(levelBefore, LV_CAP));
    coins += ECONOMY.levelCoins * paidLevels;
    ink = Math.max(ink, rest);
  }

  if (dXp > 0) {
    daily.xp += dXp;
    daily.firstAt = daily.firstAt || now;
    daily.lastAt = now;
    if (hour < MATINEE_END_HOUR) daily.matinee = true;
    else daily.evening = true;

    // ---------- the streak: local days, and the dark night ----------
    if (streakLastDay !== day) {
      const gap = streakLastDay ? dayDiff(day, streakLastDay) : Infinity;
      const darkAvailable = !darkNightAt || dayDiff(day, darkNightAt) > 7;
      if (gap === 1) streak += 1;
      else if (gap === 2 && darkAvailable) {
        // the house was dark one night — the flame keeps, free
        streak += 1;
        darkNightAt = localDay(now - 86_400_000);
      } else streak = 1;
      if (streakLastDay && gap >= RETURNING_PATRON_DAYS) {
        addStub(stubs, newStubs, 'returning_patron', at.toISOString());
      }
      if (streak % 7 === 0) coins += ECONOMY.streakBonusCoins;
      streakLastDay = day;
    }

    // ---------- full house: a matinée act and an evening act, same day ----------
    if (daily.matinee && daily.evening && !daily.fullHouse) {
      daily.fullHouse = true;
      daily.xp += 5;
      totalXp += 5;
      dXp += 5;
    }
  }

  /* ---------- the once-ever full well ---------- */
  let wellFilled = false;
  if (ink >= s.inkMax && !inkDone) {
    inkDone = true;
    wellFilled = true;
    coins += ECONOMY.wellFullCoins;
  }

  /* ---------- stubs (delta-granting; the album only ever gains) ---------- */
  const iso = at.toISOString();
  if (action === 'onboard') addStub(stubs, newStubs, 'opening_night', iso);
  if (action === 'finish' && dXp > 0) {
    addStub(stubs, newStubs, 'first_finish', iso);
    if ((ctx.finishedCount ?? 0) >= 20) addStub(stubs, newStubs, 'twenty_books', iso);
  }
  if (streak >= 7) addStub(stubs, newStubs, 'seven_nights', iso);
  if (dXp > 0 && hour >= NIGHT_OWL_HOUR) addStub(stubs, newStubs, 'night_owl', iso);
  if (daily.firstAt && daily.lastAt - daily.firstAt >= MARATHON_SECONDS * 1000) {
    addStub(stubs, newStubs, 'marathon', iso);
  }
  if (wellFilled) addStub(stubs, newStubs, 'full_well', iso);
  for (let n = 1; n <= encoreStars(totalXp); n += 1) addStub(stubs, newStubs, 'encore', iso, n);

  const next: EconomyState = {
    ...s,
    totalXp,
    ink,
    coins,
    inkDone,
    streak,
    streakLastDay,
    darkNightAt,
    daily,
    earn,
    stubs,
    quoteHashes,
    goods,
    inkAt: ink >= rest ? now : s.inkAt,
  };

  return {
    next,
    granted: { xp: dXp, ink: ink - s.ink, coins: coins - s.coins },
    withheld,
    leveled,
    levelBefore,
    levelAfter,
    newStubs,
    wellFilled,
  };
}
