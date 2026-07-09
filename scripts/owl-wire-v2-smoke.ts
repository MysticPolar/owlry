/* runtime smoke test of the v2 owl wire (Scout): validation + the 3-tier
   say→bubble mapping + client/server slug parity. Proves a live owl-chat
   response maps onto the EXACT shapes the UI renders, and that the client's
   slugify() never diverges from the server's byte-identical port. */
import { validateChatV2, mapChatV2, splitSayIntoNodes } from '../src/lib/owlWireV2';
import type { ChatV2Response } from '../src/lib/owlWireV2';
import { getBook } from '../src/lib/bookRegistry';
import { slugify as clientSlugify } from '../src/lib/cover';
import { slugify as serverSlugify } from '../supabase/functions/_shared/slug';

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

/* ---------- slug parity: client and server must never diverge ---------- */

const TRICKY_TITLES = [
  'Why We Sleep',
  "The Emperor's New Mind",
  'Crime and Punishment: A Novel',
  'Sea of Tranquility',
  '活着', // Chinese title (unicode)
  'Café society — a memoir',
  '   Leading   Spaces   ',
];
for (const t of TRICKY_TITLES) {
  check(`slug parity: "${t}"`, clientSlugify(t) === serverSlugify(t), `${clientSlugify(t)} vs ${serverSlugify(t)}`);
}

/* ---------- validateChatV2 ---------- */

const GOOD: ChatV2Response = {
  say: "ah, the wide-awake hours. i've sorted a letter for you — Why We Sleep, on the two clocks you're fighting tonight.",
  main: {
    title: 'Why We Sleep',
    author: 'Matthew Walker',
    pages: 368,
    blurb: 'A sleep scientist makes the case that sleep is the most powerful lever on health, mood, and mind.',
    tagline: 'the science of the third of your life you sleep through',
    genre: 'life',
    rating: '4.4',
    bio: 'Matthew Walker directs the Center for Human Sleep Science at UC Berkeley.',
  },
  picks: [],
  note: null,
  chips: ['go deeper', 'something lighter', 'more like this', 'new vibe'],
  slug: null,
};

const gv = validateChatV2(GOOD);
check('good response validates', gv.ok, gv.ok ? '' : gv.errors.join('; '));

const bad = (mut: (r: ChatV2Response) => void, label: string) => {
  const clone = JSON.parse(JSON.stringify(GOOD)) as ChatV2Response;
  mut(clone);
  const v = validateChatV2(clone);
  check(label, !v.ok);
};
bad((r) => ((r as unknown as { say: unknown }).say = ''), 'reject: empty say');
bad((r) => ((r.main as unknown as { pages: unknown })!.pages = 'lots'), 'reject: main.pages not a number');
bad((r) => ((r as unknown as { picks: unknown }).picks = 'nope'), 'reject: picks not an array');
bad((r) => ((r as unknown as { chips: unknown }).chips = null), 'reject: chips not an array');
bad((r) => ((r as unknown as { note: unknown }).note = 5), 'reject: note not a string or null');

/* ---------- mapChatV2: the "sort a letter" path ---------- */

const rec = mapChatV2(GOOD);
const slug = rec.letter!;
check('letter ref set to the book slug', slug === 'why-we-sleep', slug);
check('batch.main === letter ref', rec.batch?.main === slug);
check('note undefined when null', rec.note === undefined);
const bookNodes = rec.msgs[0].filter((n) => n.t === 'book');
check('bubble has exactly one book node, exact-match casing preserved', bookNodes.length === 1 && bookNodes[0].t === 'book' && bookNodes[0].v === 'Why We Sleep' && bookNodes[0].id === slug);
check('main book registered w/ tray metadata', !!getBook(slug) && getBook(slug)!.n === 368 && !!getBook(slug)!.i);

/* ---------- mapChatV2: case-insensitive span preserves model casing ---------- */

const CASED: ChatV2Response = { ...GOOD, say: "your letter opens why we sleep to the chapter on caffeine.", main: { ...GOOD.main!, title: 'Why We Sleep' } };
const casedRec = mapChatV2(CASED);
const casedNode = casedRec.msgs[0].find((n) => n.t === 'book');
check('case-insensitive match preserves the text as written', casedNode?.t === 'book' && casedNode.v === 'why we sleep');

/* ---------- mapChatV2: title absent from say → deterministic append ---------- */

const NO_TITLE: ChatV2Response = { ...GOOD, say: 'this one is for the sleepless nights.' };
const appended = mapChatV2(NO_TITLE);
const appendedBook = appended.msgs[0].find((n) => n.t === 'book');
check('fallback append: book node still present when title absent from say', appendedBook?.t === 'book' && appendedBook.v === 'Why We Sleep');
check('fallback append: original say text preserved', appended.msgs[0].some((n) => n.t === 'text' && n.v.includes('sleepless nights')));

/* ---------- mapChatV2: fiction hand-off (picks only, no letter) ---------- */

const FICTION: ChatV2Response = {
  say: 'easy does it — no homework, just pages. try The House in the Cerulean Sea (a cozy found-family escape), or A Man Called Ove (grumpy heart, gently warm).',
  main: null,
  picks: [
    { title: 'The House in the Cerulean Sea', author: 'TJ Klune', note: 'a cozy found-family escape' },
    { title: 'A Man Called Ove', author: 'Fredrik Backman', note: 'grumpy heart, gently warm' },
  ],
  note: null,
  chips: ['more like this', 'new vibe', 'surprise me'],
  slug: null,
};
const fictionRec = mapChatV2(FICTION);
check('fiction hand-off: no letter offered', fictionRec.letter === undefined);
const fictionBooks = fictionRec.msgs[0].filter((n) => n.t === 'book');
check('fiction hand-off: both picks became book nodes', fictionBooks.length === 2);
check('fiction hand-off: batch main/also from picks in order', fictionRec.batch?.main === clientSlugify('The House in the Cerulean Sea') && fictionRec.batch?.also[0] === clientSlugify('A Man Called Ove'));

/* ---------- mapChatV2: clarify turn (no book at all) ---------- */

const CLARIFY: ChatV2Response = {
  say: 'tell me a little more — what\'s the shape of it: rest, focus, heartache, or escape?',
  main: null,
  picks: [],
  note: null,
  chips: ['rest', 'need focus', 'feeling blue', 'cozy escape'],
  slug: null,
};
const clarifyRec = mapChatV2(CLARIFY);
check('clarify turn: no letter, no batch, single text bubble', clarifyRec.letter === undefined && !clarifyRec.batch && clarifyRec.msgs[0].every((n) => n.t === 'text'));

/* ---------- note passthrough ---------- */

const NOTED: ChatV2Response = { ...GOOD, note: 'a note: this is reading, not financial advice.' };
check('note carried through when present', mapChatV2(NOTED).note === NOTED.note);

/* ---------- splitSayIntoNodes: multi-title ordering ---------- */

const multi = splitSayIntoNodes('read Foo then Bar, in that order.', ['Foo', 'Bar'], (t) => t.toLowerCase());
check('splitSayIntoNodes finds both titles in order', multi.filter((n) => n.t === 'book').map((n) => n.v).join(',') === 'Foo,Bar');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
