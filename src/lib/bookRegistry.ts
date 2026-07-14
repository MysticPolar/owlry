/* ============================================================
   owlry — book + guide resolver.

   The catalog (content/books.ts, content/guides.ts) is the v1
   source of truth. The live owl can recommend open-world books
   that aren't in the catalog; those are registered here at
   runtime (session-scoped) so every UI surface — Cover, Tray,
   Strip, Sheet, Letter — can resolve a book or its reading letter
   by ref WITHOUT changing how it renders. Catalog refs resolve
   byte-identically to before; this is purely additive.
   ============================================================ */
import { BOOKS } from '../content/books';
import { BOOKS_ZH } from '../content/books.zh';
import { BOOK_META } from '../content/books-meta';
import { GUIDES } from '../content/guides';
import { GUIDES_ZH } from '../content/guides.zh';
import { getActiveLang } from '../i18n';
import type { Book, BookId, BookRef, Guide, GuideId } from '../content/types';

/** the catalog merged once with its pre-baked Google Books fields (img/sub/pub/
    rating). Computed at module load so getBook returns a stable identity and
    catalog refs resolve byte-identically to before wherever no meta was baked. */
const CATALOG: Record<BookId, Book> = Object.fromEntries(
  (Object.keys(BOOKS) as BookId[]).map((k) => {
    const m = BOOK_META[k];
    return [k, m ? { ...BOOKS[k], ...m } : BOOKS[k]];
  }),
) as Record<BookId, Book>;

/** session-scoped open-world books/guides (not persisted in v1) */
const dynBooks: Record<string, Book> = {};
const dynGuides: Record<string, Guide> = {};

export function registerBook(ref: BookRef, b: Book): void {
  if (!(ref in BOOKS)) dynBooks[ref] = b;
}

export function registerGuide(ref: BookRef, g: Guide): void {
  if (!(ref in GUIDES)) dynGuides[ref] = g;
}

/** resolve a book by ref — catalog (with pre-baked meta) first, then session-registered
    open-world. In 简体中文 the translated fields overlay the catalog entry; they land ON
    TOP of the baked meta, so a reader gets the Chinese title AND the real cover. */
export function getBook(ref: BookRef | null | undefined): Book | undefined {
  if (!ref) return undefined;
  const base = CATALOG[ref as BookId] ?? dynBooks[ref];
  if (base && getActiveLang() === 'zh') {
    const z = BOOKS_ZH[ref as BookId];
    if (z) return { ...base, ...z };
  }
  return base;
}

/** resolve a reading letter by ref — catalog first, then session-registered */
export function getGuide(ref: BookRef | null | undefined): Guide | undefined {
  if (!ref) return undefined;
  if (getActiveLang() === 'zh') {
    const z = GUIDES_ZH[ref as GuideId];
    if (z) return z;
  }
  return GUIDES[ref as GuideId] ?? dynGuides[ref];
}

/** does this ref have a reading letter the owl can show? */
export function hasGuide(ref: BookRef | null | undefined): boolean {
  return !!ref && (ref in GUIDES || ref in dynGuides);
}
