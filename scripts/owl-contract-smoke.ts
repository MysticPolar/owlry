/* runtime smoke test of the reading-letter (Peek) wire contract — the turn
   (Scout) wire moved to owl-wire-v2-smoke.ts when the live owl switched from a
   custom HEAD/---/BODY format to the owl-chat/owl-peek edge functions. */
import { validateLetter, registerLetter } from '../src/lib/owlContract';
import type { LetterWire } from '../src/lib/owlContract';
import { getBook, getGuide } from '../src/lib/bookRegistry';
import { slugify } from '../src/lib/cover';

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

const LETTER: LetterWire = {
  res: 'Money has been sitting heavy on you, less about the math than the worry it stirs.',
  chap: 'No One’s Crazy',
  core: 'Housel argues that financial behaviour is driven by personal history and emotion far more than by spreadsheets.',
  ins: [
    { t: 'Your experience is a sliver', r: 'Each of us has lived a fraction of money history.', ex: 'He contrasts Depression-era savers with 1990s investors.' },
    { t: 'Reasonable beats rational', r: 'Sleeping well can be worth more than optimal returns.', ex: 'He’d rather be reasonable than coldly rational.', q: { t: 'Reasonable is more realistic.', by: 'MORGAN HOUSEL' } },
    { t: 'Room for error', r: 'A margin of safety lets you endure the unexpected.', ex: 'He keeps more cash than models say is optimal.' },
  ],
  close: 'The aim isn’t a perfect plan; it’s one you can stick with when the ground shifts.',
  take: ['Define “enough” before chasing more.'],
  ask: ['What money story from your past is steering this worry?'],
  fr: [
    { title: 'Your Money or Your Life', author: 'Vicki Robin', why: 'reframes spending as life energy' },
    { title: 'The Millionaire Next Door', author: 'Thomas J. Stanley', why: 'on quiet, ordinary wealth' },
    { title: 'Die With Zero', author: 'Bill Perkins', why: 'on spending for a life, not a balance' },
  ],
};

const lv = validateLetter(LETTER);
check('letter validates', lv.ok, lv.ok ? '' : lv.errors.join('; '));

const slug = slugify('The Psychology of Money');
const guide = registerLetter(slug, LETTER);
check('letter registered under the slug', guide.ins.length === 3 && !!getGuide(slug));
check('further reading registered + resolvable', guide.fr.length === 3 && guide.fr.every((f) => !!getBook(f.id)));
check('quote carried through when genuine', guide.ins[1].q?.t === 'Reasonable is more realistic.');
check('quote omitted when not given', guide.ins[0].q === undefined);

const bad = (mut: (l: LetterWire) => void, label: string) => {
  const c = JSON.parse(JSON.stringify(LETTER)) as LetterWire;
  mut(c);
  check(label, !validateLetter(c).ok);
};
bad((l) => (l.ins = l.ins.slice(0, 2)), 'reject: <3 insights');
bad((l) => (l.fr = l.fr.slice(0, 2)), 'reject: fr ≠ 3');
bad((l) => ((l as unknown as { res: unknown }).res = ''), 'reject: empty res');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
