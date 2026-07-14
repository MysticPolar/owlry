/* ============================================================
   owlry — Open Library resolver (the keyless fallback).

   Google Books' JSON API needs a key; Open Library's search API is free,
   keyless, and CORS-enabled (Access-Control-Allow-Origin: *), so it's the
   fallback that makes covers work for everyone with zero setup — and the
   upgrade path stays open: with a Google Books key configured, gbooks.ts
   tries Google first (richer data, incl. descriptions) and only falls back
   here on a miss.

   Pure helpers only (no cache/network) — gbooks.ts owns fetching + caching
   and the build-time pre-bake script reuses these in Node.
   ============================================================ */
import { norm, surname } from './textMatch';
import type { BookMeta } from './gbooks';

const SEARCH = 'https://openlibrary.org/search.json';
const COVER = 'https://covers.openlibrary.org/b';

/** one Open Library search result (only the fields we request) */
export interface OLDoc {
  key?: string;
  title?: string;
  subtitle?: string;
  author_name?: string[];
  publisher?: string[];
  number_of_pages_median?: number;
  cover_i?: number;
  cover_edition_key?: string;
  ratings_average?: number;
  ratings_count?: number;
}

/** the search query — title+author, trimmed to the fields we render */
export function buildOpenLibUrl(title: string, author: string): string {
  const params = new URLSearchParams({
    title,
    author,
    fields:
      'key,title,subtitle,author_name,publisher,number_of_pages_median,cover_i,cover_edition_key,ratings_average,ratings_count',
    limit: '5',
  });
  return `${SEARCH}?${params.toString()}`;
}

/** the cover image URL for a doc, or undefined when it has no cover art */
export function olCover(doc: OLDoc): string | undefined {
  if (doc.cover_i != null) return `${COVER}/id/${doc.cover_i}-L.jpg`;
  if (doc.cover_edition_key) return `${COVER}/olid/${doc.cover_edition_key}-L.jpg`;
  return undefined;
}

/** pick the best title+author match — prefer a doc that has cover art */
export function pickOpenLibMatch(docs: OLDoc[], title: string, author: string): OLDoc | null {
  const nt = norm(title);
  const sa = surname(author);
  const matches = docs.filter((d) => {
    if (!d.title) return false;
    const bt = norm(d.title);
    const titleOk = bt === nt || bt.includes(nt) || nt.includes(bt);
    const authorOk = (d.author_name ?? []).some((a) => norm(a).includes(sa) && sa.length > 2);
    return titleOk && authorOk;
  });
  if (!matches.length) return null;
  return matches.find((d) => d.cover_i != null) ?? matches[0];
}

/** map a matched doc to our shared metadata shape (no description — OL search
 *  doesn't return one; the UI falls back to the catalog blurb/tagline) */
export function mapOpenLibDoc(doc: OLDoc): BookMeta {
  return {
    volumeId: doc.key ?? doc.cover_edition_key ?? '',
    title: doc.title ?? '',
    subtitle: doc.subtitle || undefined,
    authors: doc.author_name ?? [],
    publisher: doc.publisher?.[0] || undefined,
    pageCount: typeof doc.number_of_pages_median === 'number' && doc.number_of_pages_median > 0 ? doc.number_of_pages_median : undefined,
    rating: typeof doc.ratings_average === 'number' ? doc.ratings_average : undefined,
    ratingsCount: typeof doc.ratings_count === 'number' && doc.ratings_count > 0 ? doc.ratings_count : undefined,
    description: undefined,
    img: olCover(doc),
    source: 'openlibrary',
  };
}
