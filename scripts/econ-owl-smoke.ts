/* smoke: every economy action names the owl whose desk it happened at, so the
   receipt strip fronts the right face (scout finds, peek tastes, scribe
   remembers, keeper keeps the shelves and the counter). */
import { ACTION_OWL } from '../src/store/useStore';
import { ACTION_CONFIG } from '../src/lib/economy/config';
import type { EconomyAction } from '../src/lib/economy/types';

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

// every action the engine can grant must have a face — a missing one would
// render <use href="#owl-undefined"> and show an empty box
const actions = Object.keys(ACTION_CONFIG) as EconomyAction[];
for (const a of actions) {
  check(`${a} names an owl`, !!ACTION_OWL[a], String(ACTION_OWL[a]));
}
check('no stray entries', Object.keys(ACTION_OWL).length === actions.length,
  `${Object.keys(ACTION_OWL).length} vs ${actions.length}`);

// the cast, where the story bible puts them
check('asking scout is scout', ACTION_OWL.chat === 'scout', ACTION_OWL.chat);
check('a peek is peek', ACTION_OWL.preview === 'peek', ACTION_OWL.preview);
check('a kept line is scribe', ACTION_OWL.quote_keep === 'scribe', ACTION_OWL.quote_keep);
for (const a of ['save', 'unsave', 'finish', 'open', 'turn_page', 'purchase', 'checkin'] as EconomyAction[]) {
  check(`${a} is keeper's`, ACTION_OWL[a] === 'keeper', ACTION_OWL[a]);
}

// mirror is a level-5 reveal; the strip must never spoil her early
check('mirror never fronts a receipt', !Object.values(ACTION_OWL).includes('mirror'));

// every name must match a sprite id in index.html (#owl-<name>)
const CAST = ['scout', 'peek', 'scribe', 'keeper', 'mirror'];
check('every owl is a real sprite', Object.values(ACTION_OWL).every((o) => CAST.includes(o)));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
