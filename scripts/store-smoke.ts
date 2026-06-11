/* runtime smoke test of the store game loop (not part of the app build) */
import { useStore } from '../src/store/useStore';
import { BOOKS } from '../src/content/books';

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
