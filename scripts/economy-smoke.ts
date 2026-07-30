/* runtime smoke test of the season ledger's client engine (docs/gamification-design.md).
   The engine is pure and takes its clock as an argument, so every guard, cap and
   day boundary can be exercised without waiting for one. */
import { applyAction, derive, emptyDaily, localDay, settleInk } from '../src/lib/economy/engine';
import type { EconomyState } from '../src/lib/economy/engine';
import { LV_CAP, cumulativeXp, encoreStars, levelForXp, rowFromLevel, seatMovesAt } from '../src/lib/economy/curve';
import { ECONOMY } from '../src/lib/economy/config';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, detail = '') {
  if (cond) {
    pass++;
    console.log(`  ok  ${label}`);
  } else {
    fail++;
    console.log(`FAIL  ${label}  ${detail}`);
  }
}

/* a fixed clock: 2026-07-28, 10:00 local — a matinée hour */
const T0 = new Date(2026, 6, 28, 10, 0, 0).getTime();
const DAY = 86_400_000;

const base = (over: Partial<EconomyState> = {}): EconomyState => ({
  totalXp: 0,
  ink: 60,
  inkMax: 120,
  coins: 0,
  streak: 0,
  inkDone: false,
  daily: emptyDaily(localDay(T0)),
  earn: {},
  stubs: [],
  quoteHashes: [],
  goods: [],
  streakLastDay: null,
  darkNightAt: null,
  inkAt: T0,
  ...over,
});

/* ---------- the seat map ---------- */
check('curve: the learning band is cheap — LV2 at 32, LV5 at 90',
  cumulativeXp(2) === 32 && cumulativeXp(5) === 90);
check('curve: the summit is still 9,000', cumulativeXp(LV_CAP) === 9000 && LV_CAP === 36);
check('curve: level inverts its own cumulative at every boundary',
  Array.from({ length: LV_CAP }, (_, i) => i + 1).every(
    (l) => levelForXp(cumulativeXp(l)) === l && (l === 1 || levelForXp(cumulativeXp(l) - 1) === l - 1),
  ));
check('curve: past the summit, a level is a thousand XP like a star',
  levelForXp(9999) === 36 && levelForXp(10_000) === 37 && cumulativeXp(37) === 10_000);
check('seats: LV1 is the back row, the seat moves every third level',
  rowFromLevel(1) === 13 && rowFromLevel(2) === 13 && rowFromLevel(3) === 12
  && rowFromLevel(6) === 11 && rowFromLevel(35) === 2 && rowFromLevel(36) === 1);
check('seats: a seat move is exactly a multiple of three',
  Array.from({ length: 35 }, (_, i) => i + 2).every((l) => seatMovesAt(l) === (l % 3 === 0)));
check('seats: past the front row there is no row 0', rowFromLevel(50) === 1);
check('encore: a star per thousand past the front row',
  encoreStars(9000) === 0 && encoreStars(10_000) === 1 && encoreStars(11_500) === 2);
const past = derive(10_400);
check('derive: past the summit the bar tracks the next star',
  past.lv === LV_CAP && past.xpMax === 1000 && past.xp === 400, `${past.lv}/${past.xp}`);

/* ---------- turn_page: the step is what dedupes a re-read ---------- */
{
  let s = base();
  const r1 = applyAction(s, 'turn_page', { now: T0, bookId: 'b', step: 1 });
  check('turn_page pays 4 XP and returns 2 ink', r1.granted.xp === 4 && r1.granted.ink === 2, JSON.stringify(r1.granted));
  s = r1.next;

  // the same twentieth, read again — nothing, ever
  const again = applyAction(s, 'turn_page', { now: T0 + 120_000, bookId: 'b', step: 1 });
  check('a re-read of a paid step earns nothing', again.granted.xp === 0 && again.withheld === 'duplicate');

  // a new step, but too soon after the last one
  const soon = applyAction(s, 'turn_page', { now: T0 + 20_000, bookId: 'b', step: 2 });
  check('steps under a minute apart withhold XP but still return ink',
    soon.granted.xp === 0 && soon.withheld === 'rate_limited' && soon.granted.ink === 2);

  const later = applyAction(s, 'turn_page', { now: T0 + 61_000, bookId: 'b', step: 2 });
  check('a minute later the step pays', later.granted.xp === 4);

  // the ink is deduped on the step being seen, not on it having paid — otherwise
  // a bogus or repeated step is an unlimited well (and a free +50 coin latch)
  const bogus = applyAction(s, 'turn_page', { now: T0 + 200_000, bookId: 'b', step: 999 });
  check('a nonsense step returns no ink at all', bogus.granted.ink === 0 && bogus.withheld === 'unverified');

  const cooled = applyAction(s, 'turn_page', { now: T0 + 20_000, bookId: 'b', step: 2 });
  const twice = applyAction(cooled.next, 'turn_page', { now: T0 + 300_000, bookId: 'b', step: 2 });
  check('a step already seen returns no ink, even if it never paid XP',
    cooled.granted.ink === 2 && twice.granted.ink === 0 && twice.withheld === 'duplicate');
}

/* ---------- finish: nineteen of twenty steps, or nothing ---------- */
{
  let s = base();
  const short = applyAction(s, 'finish', { now: T0, bookId: 'b', pages: 300 });
  check('an unread finish is withheld', short.granted.xp === 0 && short.withheld === 'unverified');

  // walk the whole book, a minute a step
  for (let step = 1; step <= 20; step += 1) {
    s = applyAction(s, 'turn_page', { now: T0 + step * 61_000, bookId: 'b', step }).next;
  }
  const done = applyAction(s, 'finish', { now: T0 + 21 * 61_000, bookId: 'b', pages: 300 });
  check('a read book finishes for 60 XP and 25 coins',
    done.granted.xp >= 60 && done.granted.coins >= 25, JSON.stringify(done.granted));
  const twice = applyAction(done.next, 'finish', { now: T0 + 22 * 61_000, bookId: 'b', pages: 300 });
  check('a second finish of the same book pays nothing', twice.granted.xp === 0 && twice.withheld === 'duplicate');
}

/* ---------- chat: the ink gate, then the XP cap ---------- */
{
  const dry = applyAction(base({ ink: 0 }), 'chat', { now: T0 });
  check('a dry well refuses the live owl (the caller falls back offline)', dry.refused === 'insufficient_ink');

  let s = base({ ink: 60 });
  for (let i = 0; i < 6; i += 1) s = applyAction(s, 'chat', { now: T0 + i * 1000 }).next;
  const seventh = applyAction(s, 'chat', { now: T0 + 7000 });
  check('the seventh ask of a day still spends ink, but stops paying XP',
    seventh.granted.xp === 0 && seventh.withheld === 'rate_limited' && seventh.granted.ink === -1);
}

/* ---------- preview: the daily cap is the LLM throttle, not the ink ---------- */
{
  let s = base({ ink: 120 });
  for (let i = 0; i < 6; i += 1) s = applyAction(s, 'preview', { now: T0 + i * 1000, bookId: `b${i}` }).next;
  check('six letters a day, and the well is still deep', s.ink === 90, `${s.ink}`);
  const seventh = applyAction(s, 'preview', { now: T0 + 7000, bookId: 'b7' });
  check('the seventh letter is refused by the cap, not the well', seventh.refused === 'rate_limited');
  const noInk = applyAction(base({ ink: 4 }), 'preview', { now: T0, bookId: 'b' });
  check('a well under five drops refuses the letter', noInk.refused === 'insufficient_ink');
}

/* ---------- quote_keep: the same line, once ---------- */
{
  const first = applyAction(base(), 'quote_keep', { now: T0, bookId: 'b', hash: 'h1' });
  check('a kept line pays 5 XP', first.granted.xp === 5);
  const dupe = applyAction(first.next, 'quote_keep', { now: T0 + 1000, bookId: 'b', hash: 'h1' });
  check('the same line kept twice pays nothing', dupe.refused === 'duplicate');

  let s = base();
  for (let i = 0; i < 5; i += 1) s = applyAction(s, 'quote_keep', { now: T0 + i * 1000, bookId: 'b', hash: `q${i}` }).next;
  const sixth = applyAction(s, 'quote_keep', { now: T0 + 9000, bookId: 'b', hash: 'q9' });
  check('the sixth line of a day is kept quietly', sixth.granted.xp === 0 && sixth.withheld === 'rate_limited');
}

/* ---------- checkin: one ticket a day ---------- */
{
  const first = applyAction(base(), 'checkin', { now: T0 });
  check('checking in stamps the ticket: +10 XP, +10 ink', first.granted.xp === 10 && first.granted.ink === 10);
  const twice = applyAction(first.next, 'checkin', { now: T0 + 3600_000 });
  check('a second launch the same day is a no-op', twice.refused === 'duplicate');
  const tomorrow = applyAction(first.next, 'checkin', { now: T0 + DAY });
  check('tomorrow the ticket stamps again', tomorrow.granted.xp === 10);
}

/* ---------- the global daily ceiling ---------- */
{
  let s = base();
  for (let step = 1; step <= 20; step += 1) {
    s = applyAction(s, 'turn_page', { now: T0 + step * 61_000, bookId: 'a', step }).next;
  }
  s = applyAction(s, 'finish', { now: T0 + 21 * 61_000, bookId: 'a', pages: 300 }).next;
  check('a day of hard reading stops at the ceiling', s.daily.xp <= ECONOMY.dailyXpCap, `${s.daily.xp}`);
}

/* ---------- the flame, and the dark night ---------- */
{
  const d0 = applyAction(base(), 'checkin', { now: T0 });
  check('the first day lights the flame at 1', d0.next.streak === 1);

  const d1 = applyAction(d0.next, 'checkin', { now: T0 + DAY });
  check('a second day in a row makes it 2', d1.next.streak === 2);

  // skip a day: the house was dark, and the flame keeps — free, once a week
  const d3 = applyAction(d1.next, 'checkin', { now: T0 + 3 * DAY });
  check('one missed night is forgiven, and the flame grows', d3.next.streak === 3 && !!d3.next.darkNightAt,
    `${d3.next.streak}`);

  // miss again inside the same week — this time it rests
  const d5 = applyAction(d3.next, 'checkin', { now: T0 + 5 * DAY });
  check('a second miss in the same week rests the flame', d5.next.streak === 1, `${d5.next.streak}`);

  // seven real nights pay
  let s = base();
  for (let i = 0; i < 7; i += 1) s = applyAction(s, 'checkin', { now: T0 + i * DAY }).next;
  check('the seventh night shakes thirty coins loose', s.streak === 7 && s.coins >= ECONOMY.streakBonusCoins,
    `streak=${s.streak} coins=${s.coins}`);
  check('seven nights earns its stub', s.stubs.some((x) => x.id === 'seven_nights'));
}

/* ---------- the lobby stand ---------- */
{
  const poor = applyAction(base({ coins: 2 }), 'purchase', { now: T0, sku: 'bottle-small' });
  check('an empty purse buys nothing', poor.refused === 'insufficient_coins');

  const bought = applyAction(base({ coins: 50, ink: 30 }), 'purchase', { now: T0, sku: 'bottle-small' });
  check('the small bottle: five coins, ten ink', bought.granted.coins === -5 && bought.granted.ink === 10);
  const twice = applyAction(bought.next, 'purchase', { now: T0 + 3600_000, sku: 'bottle-small' });
  check('one bottle a day', twice.refused === 'rate_limited');

  const cushion = applyAction(base({ coins: 200 }), 'purchase', { now: T0, sku: 'cushion-velvet' });
  check('a cushion is bought once, ever', cushion.next.goods.includes('cushion-velvet'));
  const again = applyAction(cushion.next, 'purchase', { now: T0 + DAY, sku: 'cushion-velvet' });
  check('and never bought twice', again.refused === 'duplicate');
}

/* ---------- the full well, and the level faucet ---------- */
{
  const s = base({ ink: 118, inkMax: 120 });
  const r = applyAction(s, 'turn_page', { now: T0, bookId: 'b', step: 1 });
  check('filling the well to the brim pays fifty coins, once',
    r.wellFilled && r.next.coins >= ECONOMY.wellFullCoins && r.next.inkDone, `${r.next.coins}`);
  const after = applyAction({ ...r.next, ink: 118 }, 'turn_page', { now: T0 + 61_000, bookId: 'b', step: 2 });
  check('and never again', !after.wellFilled && after.next.coins === r.next.coins);
}
{
  // a level in the back row pays the back row's rate, and tops the well to the
  // resting line, not the cap
  const s = base({ totalXp: cumulativeXp(2) - 4, ink: 10 });
  const r = applyAction(s, 'turn_page', { now: T0, bookId: 'b', step: 1 });
  check('the back row pays ten coins', r.leveled && r.next.coins === 10, `${r.next.coins}`);
  check('and refills to the resting line, never the cap', r.next.ink === ECONOMY.inkRest, `${r.next.ink}`);
}
{
  // brass is priced by the row the level lands in, not by the level
  const mid = applyAction(base({ totalXp: cumulativeXp(15) - 4 }), 'turn_page', { now: T0, bookId: 'b', step: 1 });
  check('row 8 pays a hundred', mid.next.coins === 100, `${mid.next.coins}`);
  const near = applyAction(base({ totalXp: cumulativeXp(33) - 4 }), 'turn_page', { now: T0, bookId: 'b', step: 1 });
  check('the last two rows pay double', near.next.coins === 200, `${near.next.coins}`);
}
{
  // the faucet stops at the front row
  const s = base({ totalXp: cumulativeXp(LV_CAP) - 4 });
  const r = applyAction(s, 'turn_page', { now: T0, bookId: 'b', step: 1 });
  check('reaching the front row still pays', r.next.coins === 200, `${r.next.coins}`);
  const beyond = applyAction(base({ totalXp: cumulativeXp(LV_CAP + 1) - 4 }), 'turn_page', { now: T0, bookId: 'b', step: 1 });
  check('past it, no more brass', beyond.next.coins === 0, `${beyond.next.coins}`);
}
{
  // one act can clear several levels on the learning curve — each is paid at
  // its own row's rate, never at the destination's
  const s = base({ totalXp: 4, earn: { b: { mask: (1 << 19) - 1 } } });
  const r = applyAction(s, 'finish', { now: T0, bookId: 'b' });
  check('a multi-level crossing pays every level it passes',
    r.levelBefore === 1 && r.levelAfter === 4 && r.granted.coins === 25 + 10 + 20 + 20,
    `${r.levelBefore}→${r.levelAfter} coins=${r.granted.coins}`);
}
{
  // the peek slip: brass buys one more letter, three times a day at most
  const s = base({ coins: 200, ink: 60, daily: { ...emptyDaily(localDay(T0)), preview: 6 } });
  check('a spent day refuses the seventh letter',
    applyAction(s, 'preview', { now: T0 }).refused === 'rate_limited');
  const bought = applyAction(s, 'purchase', { now: T0, sku: 'peek-slip' });
  check('a slip costs thirty and mints nothing else',
    bought.granted.coins === -30 && bought.granted.ink === 0 && bought.granted.xp === 0
    && bought.next.daily.slips === 1 && !bought.next.goods.includes('peek-slip'),
    `${bought.granted.coins}/${bought.next.daily.slips}`);
  check('and the seventh letter is written',
    !applyAction(bought.next, 'preview', { now: T0 }).refused);
  let walk = bought.next;
  for (let i = 0; i < 2; i += 1) walk = applyAction(walk, 'purchase', { now: T0, sku: 'peek-slip' }).next;
  check('the fourth slip of a day is refused',
    walk.daily.slips === 3
    && applyAction(walk, 'purchase', { now: T0, sku: 'peek-slip' }).refused === 'rate_limited',
    `${walk.daily.slips}`);
}

/* ---------- regen seeps to the resting line, and no further ---------- */
{
  const dry = settleInk(base({ ink: 0, inkAt: T0 }), T0 + 20 * ECONOMY.regenMinutes * 60_000);
  check('the well regathers with time', dry.ink === 20, `${dry.ink}`);
  const full = settleInk(base({ ink: 0, inkAt: T0 }), T0 + 500 * ECONOMY.regenMinutes * 60_000);
  check('but only up to the resting line', full.ink === ECONOMY.inkRest, `${full.ink}`);
  const above = settleInk(base({ ink: 100, inkAt: T0 }), T0 + 500 * ECONOMY.regenMinutes * 60_000);
  check('a well above the line is left alone', above.ink === 100, `${above.ink}`);
}

/* ---------- a full house: a matinée act and an evening act ---------- */
{
  const morning = applyAction(base(), 'turn_page', { now: T0, bookId: 'b', step: 1 });
  const evening = applyAction(morning.next, 'turn_page', {
    now: new Date(2026, 6, 28, 20, 0, 0).getTime(),
    bookId: 'b',
    step: 2,
  });
  check('both performances in one day is a full house', evening.next.daily.fullHouse && evening.granted.xp === 9,
    `${evening.granted.xp}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
