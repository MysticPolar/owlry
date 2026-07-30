/* smoke: the home shelf gathers the reader's own books and ranks them warmest-first */
import { rankShelf, shelfContents, genreAffinity, type ShelfSignals } from '../src/lib/shelfRank';
import { getBook } from '../src/lib/bookRegistry';

/* A reader some way into a season, spelled out here rather than borrowed from
   SEED — the seed is a fresh back-row start with empty shelves now, and every
   assertion below is about the RANKING, which needs books to rank. */
const base: ShelfSignals = {
  savedIds: ['circe'],
  readingIds: ['goldfinch', 'pachinko', 'tranq'],
  finishedIds: ['oldman', 'none'],
  quotedIds: ['piranesi', 'medit', 'snow', 'atomic', 'sleep'],
  dislikedIds: [],
  savedAt: {},
  pagesRead: { goldfinch: 463, pachinko: 118, tranq: 224 },
};

const tag = (s: ShelfSignals, id: string): string =>
  s.readingIds.includes(id) && !s.finishedIds.includes(id)
    ? 'reading'
    : s.finishedIds.includes(id)
      ? 'finished'
      : s.savedIds.includes(id)
        ? 'saved'
        : s.quotedIds.includes(id)
          ? 'quoted'
          : '?';

const show = (label: string, s: ShelfSignals): string[] => {
  const order = rankShelf(s) as string[];
  console.log(`\n${label}`);
  order.forEach((id, i) => {
    const d = s.dislikedIds.includes(id) ? ' (waved off)' : '';
    console.log(`  ${i + 1}. ${getBook(id)?.t ?? id}  [${tag(s, id)}]${d}`);
  });
  return order;
};

/* ---- the seeded shelf ---- */
const order = show('seeded shelf:', base);
const rank = (id: string) => order.indexOf(id);

const expected = new Set([...base.savedIds, ...base.readingIds, ...base.finishedIds, ...base.quotedIds]);
if (order.length !== expected.size) throw new Error(`shelf size ${order.length} != ${expected.size}`);
for (const id of expected) if (!order.includes(id as string)) throw new Error(`shelf dropped ${id}`);

// reading (unfinished) outranks anything already finished
for (const r of base.readingIds) {
  for (const f of base.finishedIds) if (rank(r) > rank(f)) throw new Error(`finished ${f} outranked open ${r}`);
}
// deeper progress wins among open books
if (rank('goldfinch') > rank('pachinko')) throw new Error('shallower progress outranked deeper');
// a quoted book beats a plain untouched save
if (rank('piranesi') > rank('circe')) throw new Error('a quoted book should outrank an untouched save');
// finished sinks below a live save
for (const f of base.finishedIds) {
  if (rank(f) < rank('circe')) throw new Error(`finished ${f} outranked a live save`);
}

/* ---- finishing a book drops it out of the in-progress tier ---- */
const alsoFinished: ShelfSignals = { ...base, finishedIds: [...base.finishedIds, 'goldfinch'] };
const fOrder = rankShelf(alsoFinished) as string[];
if (fOrder.indexOf('goldfinch') <= fOrder.indexOf('pachinko'))
  throw new Error('a finished book should fall behind one still open');

/* ---- a waved-off book sinks but stays reachable ----
   asserted on a book that starts high (piranesi, quoted); circe already sits
   at the bottom of the live shelf, so sinking it would be unobservable */
const withDislike: ShelfSignals = { ...base, dislikedIds: ['piranesi'] };
const dOrder = show('after waving off Piranesi:', withDislike);
if (!dOrder.includes('piranesi')) throw new Error('a waved-off book should still be reachable');
if (dOrder.indexOf('piranesi') <= rank('piranesi')) throw new Error('a waved-off book should sink');
if (dOrder.indexOf('piranesi') > dOrder.indexOf('oldman'))
  throw new Error('a waved-off book should still outrank one already finished');

/* ---- savedAt stamps beat append order ---- */
const stamped: ShelfSignals = {
  savedIds: ['circe', 'piranesi'],
  readingIds: [],
  finishedIds: [],
  quotedIds: [],
  dislikedIds: [],
  savedAt: { circe: 2_000, piranesi: 1_000 }, // circe hearted LATER despite sitting first
  pagesRead: {},
};
if ((rankShelf(stamped) as string[])[0] !== 'circe')
  throw new Error('savedAt should decide recency over append order');

/* ---- degenerate input ---- */
const empty: ShelfSignals = {
  savedIds: [], readingIds: [], finishedIds: [], quotedIds: [],
  dislikedIds: [], savedAt: {}, pagesRead: {},
};
if (rankShelf(empty).length !== 0) throw new Error('an empty shelf should rank to nothing');
if (shelfContents(empty).length !== 0) throw new Error('an empty shelf should hold nothing');

console.log('\ngenre affinity:', [...genreAffinity(base)].map(([g, v]) => `${g}=${(v * 100).toFixed(0)}%`).join(' '));
console.log('empty shelf ->', JSON.stringify(rankShelf(empty)));
console.log('\nok: shelf-rank smoke passed');
