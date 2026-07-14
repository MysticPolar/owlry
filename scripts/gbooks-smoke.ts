/* network-free smoke test of the Google Books resolver's pure logic:
   query building, title+author match scoring (incl. cover preference and
   wrong-author rejection), volume→meta mapping (https rewrite, HTML strip),
   and cache keying. No network — pickMatch/mapVolume are fed canned volumes. */
import { buildQueryUrl, pickMatch, mapVolume, metaKey, type GVolume } from '../src/lib/gbooks';
import { buildOpenLibUrl, pickOpenLibMatch, mapOpenLibDoc, olCover, type OLDoc } from '../src/lib/openlibrary';

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

/* ---------- query ---------- */
const url = buildQueryUrl('The Snow Child', 'Eowyn Ivey');
check('query has intitle', url.includes('intitle%3A') || url.includes('intitle:'));
check('query has inauthor surname', /inauthor(%3A|:)ivey/i.test(url));
check('query pins country=US', url.includes('country=US'));
check('query trims via fields=', url.includes('fields='));

/* ---------- fixtures ---------- */
const withCover: GVolume = {
  id: 'abc123',
  volumeInfo: {
    title: 'Piranesi',
    authors: ['Susanna Clarke'],
    publisher: 'Bloomsbury',
    pageCount: 272,
    averageRating: 4,
    ratingsCount: 1234,
    description: '<p>Piranesi lives in a <b>house</b> &amp; keeps journals.</p>',
    imageLinks: {
      thumbnail:
        'http://books.google.com/books/content?id=abc123&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api',
    },
  },
};
const sameTitleNoCover: GVolume = {
  id: 'nocover',
  volumeInfo: { title: 'Piranesi: A Novel', authors: ['Susanna Clarke'] },
};
const wrongAuthor: GVolume = {
  id: 'decoy',
  volumeInfo: { title: 'Piranesi', authors: ['Someone Else'], imageLinks: { thumbnail: 'http://x/y' } },
};

/* ---------- match scoring ---------- */
check(
  'match: picks title+author match, rejects wrong-author decoy',
  pickMatch([wrongAuthor, withCover], 'Piranesi', 'Susanna Clarke')?.id === 'abc123',
);
check(
  'match: prefers an edition that has cover art',
  pickMatch([sameTitleNoCover, withCover], 'Piranesi', 'Susanna Clarke')?.id === 'abc123',
);
check(
  'match: title variant "Piranesi: A Novel" still matches',
  pickMatch([sameTitleNoCover], 'Piranesi', 'Susanna Clarke')?.id === 'nocover',
);
check('match: wrong author alone → no match', pickMatch([wrongAuthor], 'Piranesi', 'Susanna Clarke') === null);
check('match: empty list → null', pickMatch([], 'Piranesi', 'Susanna Clarke') === null);

/* ---------- volume → meta ---------- */
const m = mapVolume(withCover);
check('map: cover forced to https', !!m.img?.startsWith('https://'), m.img ?? '(none)');
check('map: page-curl overlay dropped', !m.img?.includes('edge=curl'));
check('map: description HTML stripped', m.description === 'Piranesi lives in a house & keeps journals.', m.description ?? '');
check('map: rating + count carried', m.rating === 4 && m.ratingsCount === 1234);
check('map: publisher + pages carried', m.publisher === 'Bloomsbury' && m.pageCount === 272);
check('map: no imageLinks → img undefined', mapVolume(sameTitleNoCover).img === undefined);
check('map: google source tagged', mapVolume(withCover).source === 'google');

/* ---------- Open Library fallback ---------- */
const olUrl = buildOpenLibUrl('The Snow Child', 'Eowyn Ivey');
check('ol query has title + author + fields + limit', /title=/.test(olUrl) && /author=/.test(olUrl) && olUrl.includes('fields=') && olUrl.includes('limit='));

const olWithCover: OLDoc = {
  key: '/works/OL1W',
  title: 'Piranesi',
  subtitle: 'A Novel',
  author_name: ['Susanna Clarke'],
  publisher: ['Bloomsbury', 'Heyne'],
  number_of_pages_median: 272,
  cover_i: 10226290,
  ratings_average: 4.3333,
  ratings_count: 63,
};
const olNoCover: OLDoc = { key: '/works/OL2W', title: 'Piranesi', author_name: ['Susanna Clarke'], cover_edition_key: 'OL9M' };
const olWrongAuthor: OLDoc = { key: '/works/OL3W', title: 'Piranesi', author_name: ['Someone Else'], cover_i: 999 };

check('ol match: picks title+author, prefers cover', pickOpenLibMatch([olNoCover, olWithCover], 'Piranesi', 'Susanna Clarke')?.key === '/works/OL1W');
check('ol match: rejects wrong author', pickOpenLibMatch([olWrongAuthor], 'Piranesi', 'Susanna Clarke') === null);

const om = mapOpenLibDoc(olWithCover);
check('ol map: cover from cover_i (https)', om.img === 'https://covers.openlibrary.org/b/id/10226290-L.jpg');
check('ol map: subtitle + first publisher + pages', om.subtitle === 'A Novel' && om.publisher === 'Bloomsbury' && om.pageCount === 272);
check('ol map: rating + count + source tagged', om.rating === 4.3333 && om.ratingsCount === 63 && om.source === 'openlibrary');
check('ol cover: falls back to olid, else undefined', olCover(olNoCover) === 'https://covers.openlibrary.org/b/olid/OL9M-L.jpg' && olCover({ title: 'x' }) === undefined);

/* ---------- cache key ---------- */
check('key: normalized title|surname', metaKey('The Snow Child', 'Eowyn Ivey') === 'snow child|ivey');
check('key: stable across spacing/case/comma', metaKey('The  Snow Child  ', ' Ivey,  Eowyn ') === metaKey('The Snow Child', 'Eowyn Ivey'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
