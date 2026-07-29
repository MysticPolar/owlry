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

/**
 * Open-world metadata is private to the active auth owner. The generation is
 * intentionally part of the scope: an async response that started for account
 * A keeps A's captured scope and can never repopulate account B's active map
 * after an auth boundary.
 */
export interface DynamicRegistryScope {
  readonly owner: string;
  readonly generation: number;
}

let registryGeneration = 0;
let activeRegistryScope: DynamicRegistryScope = {
  owner: 'guest',
  generation: registryGeneration,
};
const dynBooks = new Map<number, Record<string, Book>>();
const dynGuides = new Map<number, Record<string, Guide>>();

const booksFor = (
  scope: DynamicRegistryScope,
  create = false,
): Record<string, Book> | undefined => {
  let books = dynBooks.get(scope.generation);
  if (!books && create) {
    books = {};
    dynBooks.set(scope.generation, books);
  }
  return books;
};

const guidesFor = (
  scope: DynamicRegistryScope,
  create = false,
): Record<string, Guide> | undefined => {
  let guides = dynGuides.get(scope.generation);
  if (!guides && create) {
    guides = {};
    dynGuides.set(scope.generation, guides);
  }
  return guides;
};

export function getActiveDynamicRegistryScope(): DynamicRegistryScope {
  return activeRegistryScope;
}

export function isActiveDynamicRegistryScope(
  scope: DynamicRegistryScope,
): boolean {
  return scope.generation === activeRegistryScope.generation;
}

/** Start a fresh registry generation for the target auth owner. */
export function setActiveDynamicRegistryScope(
  owner: string,
): DynamicRegistryScope {
  activeRegistryScope = {
    owner,
    generation: ++registryGeneration,
  };
  return activeRegistryScope;
}

/** Remove every runtime book and guide; bundled catalog content is untouched. */
export function clearDynamicRegistry(): void {
  dynBooks.clear();
  dynGuides.clear();
}

export function registerBook(
  ref: BookRef,
  b: Book,
  scope: DynamicRegistryScope = activeRegistryScope,
): void {
  if (!(ref in BOOKS)) booksFor(scope, true)![ref] = b;
}

/** Catalog books are already bundled and should not be duplicated in account state. */
export function isCatalogBook(ref: BookRef): boolean {
  return ref in BOOKS;
}

/** Return only metadata that must follow an open-world book across devices. */
export function getPersistableBook(ref: BookRef): Book | undefined {
  return isCatalogBook(ref)
    ? undefined
    : booksFor(activeRegistryScope)?.[ref];
}

/**
 * Re-register an account's persisted open-world catalog before any shelf
 * renders. Kept structurally typed to avoid coupling this UI registry to the
 * Zustand persistence module.
 */
export function registerPersistedBooks(
  entries: Record<string, { book: Book }>,
  scope: DynamicRegistryScope = activeRegistryScope,
): void {
  for (const [ref, entry] of Object.entries(entries)) {
    if (entry?.book) registerBook(ref, entry.book, scope);
  }
}

export function registerGuide(
  ref: BookRef,
  g: Guide,
  scope: DynamicRegistryScope = activeRegistryScope,
): void {
  if (!(ref in GUIDES)) guidesFor(scope, true)![ref] = g;
}

/** resolve a book by ref — catalog (with pre-baked meta) first, then session-registered
    open-world. In 简体中文 the translated fields overlay the catalog entry; they land ON
    TOP of the baked meta, so a reader gets the Chinese title AND the real cover. */
export function getBook(ref: BookRef | null | undefined): Book | undefined {
  if (!ref) return undefined;
  const base = CATALOG[ref as BookId]
    ?? booksFor(activeRegistryScope)?.[ref];
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
  return GUIDES[ref as GuideId]
    ?? guidesFor(activeRegistryScope)?.[ref];
}

/** does this ref have a reading letter the owl can show? */
export function hasGuide(ref: BookRef | null | undefined): boolean {
  return !!ref && (
    ref in GUIDES
    || !!guidesFor(activeRegistryScope)?.[ref]
  );
}
