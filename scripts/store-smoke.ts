/* runtime smoke test of the store game loop (not part of the app build) */
import { useStore } from '../src/store/useStore';
import { BOOKS } from '../src/content/books';
import { normalizePersisted } from '../src/store/normalize';
import { SEED } from '../src/store/seed';

const g = () => useStore.getState();
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

check('seed starts in the back row with nothing',
  g().xp === 0 && g().ink === 10 && g().coins === 0 && g().lv === 1 && g().streak === 0,
  `xp=${g().xp} ink=${g().ink} coins=${g().coins} lv=${g().lv}`);

const migrated = normalizePersisted({
  ...SEED,
  prefs: { ...SEED.prefs, reader: undefined, readerScale: 'lg' },
});
check('legacy reader scale migrates to 21px', migrated.prefs.reader.size === 21);
const clamped = normalizePersisted({ ...SEED, prefs: { ...SEED.prefs, reader: { ...SEED.prefs.reader, size: 99 } } });
check('reader size migration clamps at 24px', clamped.prefs.reader.size === 24);

// the seat map: everyone opens in row 13, and it costs 32 to leave
check('seed derives an empty ledger in the back row',
  g().totalXp === 0 && g().xpMax === 32, `${g().totalXp}/${g().xpMax}`);

g().addXP(5);
check('addXP(5) → 5', g().xp === 5, `${g().xp}`);

// LV2 begins at 32 lifetime — the learning curve, not the old quadratic
g().addXP(27);
check('level-up on the learning curve', g().lv === 2 && g().xp === 0 && g().xpMax === 6, `lv=${g().lv} xp=${g().xp}`);

// addInk is a primitive now: the well moves, but nothing is minted — the
// once-ever +50 belongs to the engine (and, signed in, to the ledger)
g().addInk(200); // 10+200 → capped at 120
check('addInk caps and mints nothing', g().ink === 120 && g().coins === 0, `ink=${g().ink} coins=${g().coins}`);

const xpBeforeSave = g().xp;
g().toggleSave('hail');
check('save adds + grants 5 XP', g().savedIds.includes('hail') && g().xp === xpBeforeSave + 5, `${g().xp}`);

g().toggleSave('hail'); // unsave…
g().toggleSave('hail'); // …and save again: the shelf moves, the XP does not
check('save pays once per book, ever', g().xp === xpBeforeSave + 5, `${g().xp}`);

// nothing is shelved on a fresh seed, so put it there before taking it back
g().toggleSave('circe');
check('save adds to the shelf', g().savedIds.includes('circe'));
g().toggleSave('circe');
check('unsave removes', !g().savedIds.includes('circe'));

g().openReader('hail');
check('openReader moves to reading at p1', g().reader.id === 'hail' && g().reader.p === 1 && g().readingIds.includes('hail'));

const xpBeforeTurn = g().xp;
g().nextPage();
check(
  'nextPage advances + earns a step',
  g().reader.p === 2 && g().pagesRead.hail === 1 && g().xp === xpBeforeTurn + 4,
  `xp=${g().xp}`,
);

// a finish has to be read to: one page turned is not nineteen twentieths, so
// Keeper still shelves it but the ledger withholds the reward
const xpBeforeFinish = g().xp;
g().finishBook();
check(
  'finishBook shelves, but an unread finish earns nothing',
  g().finishedIds.includes('hail') &&
    g().pagesRead.hail === BOOKS.hail.n &&
    g().xp === xpBeforeFinish &&
    g().reader.open === false &&
    !g().readingIds.includes('hail'),
  `pages=${g().pagesRead.hail} xp=${g().xp}`,
);

/* ── owl conversation sequencing (typing → reply → letter → chips) ── */
g().initChat();
check('greeting + starter chips', g().owl.messages.length === 1 && g().owl.chips.length === 4);

g().sendToOwl("can't sleep");
check(
  'send → busy, typing indicator up, chips cleared',
  g().owl.busy && g().owl.messages.some((m) => m.kind === 'typing') && g().owl.chips.length === 0,
);

// the calm stream: after ~620ms the dots clear and scout's line streams in — the
// letter/chips wait for the typewriter to finish (the component signals that)
await new Promise((r) => setTimeout(r, 750));
const streamed = g().owl.messages;
check(
  'reply streamed: me pill + owl reply flagged, deal still pending',
  streamed.some((m) => m.kind === 'msg' && m.who === 'me') &&
    streamed.filter((m) => m.kind === 'msg' && m.who === 'owl').length >= 2 &&
    streamed.some((m) => m.kind === 'msg' && m.who === 'owl' && m.stream) &&
    !streamed.some((m) => m.kind === 'deal') &&
    g().owl.busy &&
    g().owl.pending?.bookIds[0] === 'wws',
);
check('tray batch perched on wws', g().owl.lastBatch?.main === 'wws');

// the stream finished → play the after-text beat (the dealt hand → flight → chips)
g().revealAfterText(false);
await new Promise((r) => setTimeout(r, 1000)); // deal (+170) then chips (+700)
const items = g().owl.messages;
check(
  'the hand landed after the reply, wws leading, filled to 3',
  items.some((m) => m.kind === 'deal' && m.books[0] === 'wws' && m.books.length === 3),
);
check(
  'typing cleared, busy false, after-chips offered (≤3)',
  !g().owl.busy &&
    !items.some((m) => m.kind === 'typing') &&
    g().owl.chips.includes('go deeper') &&
    g().owl.chips.length <= 3,
);
const dealIdx = items.findIndex((m) => m.kind === 'deal');
const lastOwlIdx = items.map((m) => m.kind === 'msg' && m.who === 'owl').lastIndexOf(true);
check('the hand arrives after the reply (its own beat)', lastOwlIdx > 0 && dealIdx > lastOwlIdx);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
