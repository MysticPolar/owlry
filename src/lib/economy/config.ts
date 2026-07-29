/* ============================================================
   owlry — the economy's numbers, versioned (docs/gamification-design.md §3).

   This module mirrors owlry_action_config / owlry_economy_config so a
   GUEST plays the same economy the server runs — the same grants AND
   the same guards. Numbers without guards would be an unbounded farm,
   and adoptAccount would launder it into a real account.

   When the server's config rows are retuned, bump ECONOMY_VERSION and
   change them here in the same PR.
   ============================================================ */
import type { EconomyAction, StandGood } from './types';

/** bumped when the grant/guard numbers change; rides in the persisted blob */
export const ECONOMY_VERSION = 2;
/** bumped when the LEVEL CURVE changes; drives the one-time xpMax migration */
export const CURVE_VERSION = 2;

export const ECONOMY = {
  inkMax: 120,
  /** regen seeps only up to here — pages and mornings fill past it */
  inkRest: 60,
  regenMinutes: 30,
  /** the global daily ceiling; grants past it are withheld, not banked */
  dailyXpCap: 150,
  streakBonusCoins: 30,
  levelCoins: 50,
  wellFullCoins: 50,
  bottleInk: 10,
  /** 2026-01-01T00:00:00Z, in epoch seconds — matches season_epoch */
  seasonEpoch: Date.UTC(2026, 0, 1) / 1000,
  seasonDays: 90,
} as const;

/** per-action grants. negative ink = a spend. */
export const ACTION_CONFIG: Record<EconomyAction, { xp: number; ink: number; coins: number }> = {
  turn_page: { xp: 4, ink: 2, coins: 0 },
  open: { xp: 8, ink: 0, coins: 0 },
  finish: { xp: 60, ink: 0, coins: 25 },
  save: { xp: 5, ink: 0, coins: 0 },
  unsave: { xp: 0, ink: 0, coins: 0 },
  chat: { xp: 3, ink: -1, coins: 0 },
  // peeks are content, not labor — the 25 XP the server was seeded with was a
  // 1,000-XP/day idle farm. The daily generation cap is the LLM throttle.
  preview: { xp: 0, ink: -5, coins: 0 },
  quote_keep: { xp: 5, ink: 0, coins: 0 },
  checkin: { xp: 10, ink: 10, coins: 0 },
  purchase: { xp: 0, ink: 0, coins: 0 },
  onboard: { xp: 20, ink: 10, coins: 0 },
};

/** how many XP-bearing acts of each kind a local day may hold */
export const DAILY_CAPS = {
  turn_page: 60,
  open: 3,
  chat: 6,
  /** live generations, ink or no ink — this is what throttles the LLM */
  preview: 6,
  quote_keep: 5,
} as const;

/** the quiet floor between two XP-bearing page steps */
export const STEP_COOLDOWN_MS = 60_000;
/** a local day whose first and last XP-bearing acts are this far apart is a marathon */
export const MARATHON_SECONDS = 3600;
export const NIGHT_OWL_HOUR = 22;
/** an act before this hour is a matinée; at or after it, the evening show */
export const MATINEE_END_HOUR = 18;
export const RETURNING_PATRON_DAYS = 14;
/** how many quote fingerprints a guest keeps (the server dedupes forever) */
export const QUOTE_HASH_MEMORY = 200;

/** the lobby stand's stock — mirrors owlry_stand_catalog.
    Stationery is the rotating good: one design per programme, so the shelf is
    never quite the same twice. Seeded three years out; adding a season is one
    more row here and one more in the migration. */
export const STAND_CATALOG: StandGood[] = [
  { sku: 'bottle-small', kind: 'bottle', price: 5, season: null },
  { sku: 'marquee-letters', kind: 'marquee', price: 80, season: null },
  { sku: 'cushion-velvet', kind: 'cushion', price: 120, season: null },
  ...Array.from({ length: 12 }, (_, n): StandGood => ({
    sku: `stationery-s${n}`,
    kind: 'stationery',
    price: 40,
    season: n,
  })),
];

/** the lobby stand opens at LV2 */
export const STAND_LEVEL = 2;

export const goodFor = (sku: string): StandGood | undefined =>
  STAND_CATALOG.find((g) => g.sku === sku);

/** which season a moment belongs to (a calendar quarter) */
export const seasonId = (at: Date = new Date()): number =>
  Math.floor((at.getTime() / 1000 - ECONOMY.seasonEpoch) / (ECONOMY.seasonDays * 86400));

/** the stock on sale this season (evergreen goods always count) */
export const seasonStock = (season: number): StandGood[] =>
  STAND_CATALOG.filter((g) => g.season === null || g.season === season);
