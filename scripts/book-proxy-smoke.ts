import { strict as assert } from 'node:assert';
import { isAllowedBookUrl } from '../supabase/functions/_shared/bookProxyPolicy.ts';

const accepted = [
  'https://www.gutenberg.org/cache/epub/11/pg11-images.epub',
  'https://www.gutenberg.org/ebooks/11.epub3.images',
  'https://www.gutenberg.org/ebooks/11.epub3.noimages',
  'https://www.gutenberg.org/ebooks/11.epub.images',
  'https://gutenberg.pglaf.org/1/1/11/11.txt',
];

const rejected = [
  'http://www.gutenberg.org/ebooks/11.epub3.images',
  'https://example.com/ebooks/11.epub3.images',
  'https://www.gutenberg.org/ebooks/11.html.images',
  'https://www.gutenberg.org/ebooks/11.epub3.images/extra',
  'https://www.gutenberg.org/',
];

for (const value of accepted) {
  assert.equal(isAllowedBookUrl(new URL(value)), true, `expected allowed: ${value}`);
}

for (const value of rejected) {
  assert.equal(isAllowedBookUrl(new URL(value)), false, `expected rejected: ${value}`);
}

const virtualEpub = new URL('https://www.gutenberg.org/ebooks/11.epub3.images');
const redirectChecks = [
  [new URL('/cache/epub/11/pg11-images-3.epub', virtualEpub), true],
  [new URL('https://example.com/cache/epub/11/pg11-images-3.epub', virtualEpub), false],
  [new URL('http://www.gutenberg.org/cache/epub/11/pg11-images-3.epub', virtualEpub), false],
] as const;

for (const [url, expected] of redirectChecks) {
  assert.equal(isAllowedBookUrl(url), expected, `redirect policy mismatch: ${url}`);
}

console.log(`${accepted.length + rejected.length + redirectChecks.length} book-proxy URL policy checks passed`);
