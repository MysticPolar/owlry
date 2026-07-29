/* runtime smoke test of chat hydration (src/lib/chatHydrate.ts) — proves that
   persisted owlry_chat_messages rows rebuild into the exact ChatItem[]/tray/
   strip/chips shapes the UI already renders, with every mentioned book
   re-registered so Cover/Sheet/Letter resolve it after a reload. */
import { rowsToChat } from '../src/lib/chatHydrate';
import type { ChatRow } from '../src/lib/chatHydrate';
import { getBook } from '../src/lib/bookRegistry';
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

const MAIN_BOOK = {
  title: 'Deep Work',
  author: 'Cal Newport',
  pages: 296,
  blurb: 'Focused, undistracted work is rare and valuable — this is a training manual for attention.',
  tagline: 'four focused hours beat forty scattered ones',
  genre: 'life',
  rating: '4.2',
  bio: 'Cal Newport is a computer science professor at Georgetown.',
};

const rows: ChatRow[] = [
  { id: 101, who: 'me', kind: 'msg', payload: { text: 'feeling stuck and cant focus' } },
  {
    id: 102,
    who: 'owl',
    kind: 'msg',
    payload: {
      say: "forget motivation; let's talk identity. your letter opens Deep Work to the chapter on rituals.",
      main: MAIN_BOOK,
      picks: [],
      chips: ['go deeper', 'something lighter', 'more like this', 'new vibe'],
    },
  },
  { id: 103, who: 'owl', kind: 'letter', payload: { slug: slugify(MAIN_BOOK.title), book: MAIN_BOOK } },
  { id: 104, who: 'owl', kind: 'note', payload: { text: 'a gentle note: pace yourself.' } },
];

const hydrated = rowsToChat(rows);

check('4 rows → 4 ChatItems, in order', hydrated.messages.length === 4 && hydrated.messages[0].id === 101 && hydrated.messages[3].id === 104);
check('me row → msg/who:me with a text node', hydrated.messages[0].kind === 'msg' && (hydrated.messages[0] as { who: string }).who === 'me');

const owlMsg = hydrated.messages[1];
check('owl msg row → msg/who:owl', owlMsg.kind === 'msg' && (owlMsg as { who: string }).who === 'owl');
const bookNode = owlMsg.kind === 'msg' ? owlMsg.nodes.find((n) => n.t === 'book') : undefined;
check('bubble book node resolves the recommended title', bookNode?.t === 'book' && bookNode.v === 'Deep Work');

check('lastBatch.main set to the book slug', hydrated.lastBatch?.main === slugify(MAIN_BOOK.title));
check('collected includes the recommended book', hydrated.collected.includes(slugify(MAIN_BOOK.title)));
check('chips restored from the persisted owl msg row', hydrated.chips.length === 4 && hydrated.chips[0] === 'go deeper');
check('main book registered w/ tray metadata after hydration', getBook(slugify(MAIN_BOOK.title))?.n === 296);

// the hand is dealt under the words, exactly as the live turn fans it — and
// the legacy letter row for that same book is folded into it, not doubled
const dealItem = hydrated.messages[2];
check('owl msg with a main → a dealt hand under the bubble', dealItem.kind === 'deal');
const dealBooks = dealItem.kind === 'deal' ? dealItem.books : [];
check('the dealt hand leads with the recommended book', dealBooks[0] === slugify(MAIN_BOOK.title));
check('a thin reply is still filled to three cards', dealBooks.length === 3, String(dealBooks.length));
check('the letter row for the dealt book is not doubled',
  !hydrated.messages.some((m) => m.kind === 'letter' && m.book === slugify(MAIN_BOOK.title)));
check('deal ids can never collide with a row id or a later nextId',
  hydrated.messages.every((m) => m.kind !== 'deal' || m.id < 0));

const noteItem = hydrated.messages[3];
check('note row → msg/who:owl with tone:note', noteItem.kind === 'msg' && (noteItem as { tone?: string }).tone === 'note');

check('maxId reflects the highest row id', hydrated.maxId === 104);

/* ---------- fiction hand-off row (picks only, no main) ---------- */

const PICK_A = { title: 'Circe', author: 'Madeline Miller', note: 'an island and a witch finding her nerve' };
const PICK_B = { title: 'Piranesi', author: 'Susanna Clarke', note: 'a dreamlike house with its own tides' };
const fictionRows: ChatRow[] = [
  {
    id: 201,
    who: 'owl',
    kind: 'msg',
    payload: {
      say: 'easy does it — no homework, just pages. try Circe (an island and a witch finding her nerve), or Piranesi (a dreamlike house with its own tides).',
      main: null,
      picks: [PICK_A, PICK_B],
      chips: ['more like this', 'new vibe', 'surprise me'],
    },
  },
];
const fictionHydrated = rowsToChat(fictionRows);
check('fiction hand-off: lastBatch main/also from picks in order', fictionHydrated.lastBatch?.main === slugify(PICK_A.title) && fictionHydrated.lastBatch?.also[0] === slugify(PICK_B.title));
check('fiction hand-off: both picks registered', !!getBook(slugify(PICK_A.title)) && !!getBook(slugify(PICK_B.title)));
const fictionBookNodes = fictionHydrated.messages[0].kind === 'msg' ? fictionHydrated.messages[0].nodes.filter((n) => n.t === 'book') : [];
check('fiction hand-off: both picks became book nodes', fictionBookNodes.length === 2);

/* THE REGRESSION THIS GUARDS: a picks-only turn (no main, so no letter row)
   used to hydrate as words alone. The cards were there when the reply first
   landed and gone the next time the app opened. */
const fictionDeal = fictionHydrated.messages.find((m) => m.kind === 'deal');
check('fiction hand-off: the cards survive a reload', !!fictionDeal);
const fictionCards = fictionDeal?.kind === 'deal' ? fictionDeal.books : [];
check('fiction hand-off: both picks are on the table, in order',
  fictionCards[0] === slugify(PICK_A.title) && fictionCards[1] === slugify(PICK_B.title));
check('fiction hand-off: the hand is filled to three', fictionCards.length === 3, String(fictionCards.length));

/* a turn that recommends nothing must not deal a phantom hand */
const chatterRows: ChatRow[] = [
  { id: 301, who: 'owl', kind: 'msg', payload: { say: 'happy to just talk.', main: null, picks: [], chips: [] } },
];
const chatter = rowsToChat(chatterRows);
check('a bookless reply deals no cards', !chatter.messages.some((m) => m.kind === 'deal'));

/* an old letter row with no picks alongside it still renders its card */
const legacyRows: ChatRow[] = [
  { id: 401, who: 'owl', kind: 'letter', payload: { slug: slugify(MAIN_BOOK.title), book: MAIN_BOOK } },
];
check('a standalone legacy letter row still renders',
  rowsToChat(legacyRows).messages.some((m) => m.kind === 'letter'));

/* ---------- empty history ---------- */

const empty = rowsToChat([]);
check('empty rows → empty, safe defaults', empty.messages.length === 0 && empty.collected.length === 0 && empty.lastBatch === null && empty.maxId === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
