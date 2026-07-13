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

check('seed xp/ink/coins/lv', g().xp === 260 && g().ink === 84 && g().coins === 240 && g().lv === 7);

const migrated = normalizePersisted({
  ...SEED,
  prefs: { ...SEED.prefs, reader: undefined, readerScale: 'lg' },
});
check('legacy reader scale migrates to 21px', migrated.prefs.reader.size === 21);
const clamped = normalizePersisted({ ...SEED, prefs: { ...SEED.prefs, reader: { ...SEED.prefs.reader, size: 99 } } });
check('reader size migration clamps at 24px', clamped.prefs.reader.size === 24);

g().addXP(5);
check('addXP(5) → 265', g().xp === 265, `${g().xp}`);

g().addXP(140); // 405 → level up to 8, xp 5
check('level-up across xpMax', g().lv === 8 && g().xp === 5, `lv=${g().lv} xp=${g().xp}`);

g().addInk(40); // 84+40 = 124 → cap 120, +50 coins once
check('ink caps + coin bonus', g().ink === 120 && g().inkDone && g().coins === 290, `ink=${g().ink} coins=${g().coins}`);

g().addInk(10); // already done → no further coins
check('ink bonus only once', g().ink === 120 && g().coins === 290);

const xpBeforeSave = g().xp;
g().toggleSave('hail');
check('save adds + grants 5 XP', g().savedIds.includes('hail') && g().xp === xpBeforeSave + 5);

g().toggleSave('circe');
check('unsave removes', !g().savedIds.includes('circe'));

g().openReader('hail');
check('openReader moves to reading at p1', g().reader.id === 'hail' && g().reader.p === 1 && g().readingIds.includes('hail'));

const xpBeforeTurn = g().xp;
g().nextPage();
check('nextPage advances + earns XP', g().reader.p === 2 && g().pagesRead.hail === 1 && g().xp === xpBeforeTurn + 2);

g().finishBook();
check(
  'finishBook → finished, full pages, +40 XP, reader closed',
  g().finishedIds.includes('hail') &&
    g().pagesRead.hail === BOOKS.hail.n &&
    g().xp === xpBeforeTurn + 2 + 40 &&
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

await new Promise((r) => setTimeout(r, 2300)); // think (≤1500) + letter beat (450)
const items = g().owl.messages;
check(
  'reply landed: me msg + owl reply + letter card (wws)',
  items.some((m) => m.kind === 'msg' && m.who === 'me') &&
    items.filter((m) => m.kind === 'msg' && m.who === 'owl').length >= 2 &&
    items.some((m) => m.kind === 'letter' && m.book === 'wws'),
);
check(
  'typing cleared, busy false, after-chips offered',
  !g().owl.busy && !items.some((m) => m.kind === 'typing') && g().owl.chips.includes('go deeper'),
);
check('tray batch perched on wws', g().owl.lastBatch?.main === 'wws');
const letterIdx = items.findIndex((m) => m.kind === 'letter');
const lastOwlIdx = items.map((m) => m.kind === 'msg' && m.who === 'owl').lastIndexOf(true);
check('letter arrives after the reply (its own beat)', lastOwlIdx > 0 && letterIdx > lastOwlIdx);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
