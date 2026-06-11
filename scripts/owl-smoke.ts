/* runtime smoke test of the simulated owl brain (not part of the app build) */
import { respond, newSession } from '../src/lib/owlBrain';
import { FPOOL } from '../src/content/owl';

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

// fresh session per single-shot intent
const one = (input: string) => respond(input, newSession('rain'));

const sleep = one("can't sleep");
check('"can\'t sleep" → wws letter', sleep.letter === 'wws' && sleep.batch?.main === 'wws');

const morning = one('fresh start today');
check('"fresh start today" → medit', morning.letter === 'medit');

const stuck = one('I feel stuck and can\'t focus');
check('"stuck/focus" → deep', stuck.letter === 'deep');

const blue = one('feeling blue and heartbroken');
check('"blue/heart" → pema', blue.letter === 'pema');

const meaning = one('what is the meaning of it all');
check('"meaning" → frankl', meaning.letter === 'frankl');

const habit = one('help me build a habit');
check('"habit" → atomic', habit.letter === 'atomic');

const overwhelm = one('overwhelmed by this writing project');
check('"overwhelm/writing" → bird', overwhelm.letter === 'bird');

const surprise = one('surprise me');
check('"surprise me" → some guide letter', !!surprise.letter && !!surprise.batch, JSON.stringify(surprise.chips));

const lighter = one('something lighter please');
check(
  '"lighter" → fiction (no letter, pool pick)',
  !lighter.letter && lighter.batch?.main === FPOOL.rain[0] && lighter.batch?.also[0] === FPOOL.rain[1],
  JSON.stringify(lighter.batch),
);

const nomatch = one('asdf qwer zxcv');
check('gibberish → fallback (no letter/batch)', !nomatch.letter && !nomatch.batch, JSON.stringify(nomatch.chips));

// conversational follow-ups reuse one session after a guide
const s = newSession('rain');
respond("can't sleep", s);
const deeper = respond('go deeper', s);
check('"go deeper" after guide → no letter, italic question', !deeper.letter && deeper.msgs[0].some((n) => n.t === 'em'));

const more = respond('more like this', s);
check('"more like this" after wws → from-same-desk batch (medit first)', more.batch?.main === 'medit', JSON.stringify(more.batch));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
