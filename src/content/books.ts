import type { Book, Category } from './types';
import { BOOKS_1 } from './books-1';
import { BOOKS_2 } from './books-2';
import { isZh } from '../i18n';
import { BOOKS_ZH } from './zh/books';

export const BOOKS: Book[] = [...BOOKS_1, ...BOOKS_2];
const BY_ID = new Map(BOOKS.map((b) => [b.id, b]));

/* the Chinese rendering of a book, built once: the override's words over the English source */
const ZH_CACHE = new Map<string, Book>();
function localized(b: Book): Book {
  const hit = ZH_CACHE.get(b.id);
  if (hit) return hit;
  const z = BOOKS_ZH[b.id];
  const out: Book = z
    ? {
        ...b,
        title: z.title,
        authorName: z.authorName,
        tags: z.tags,
        blurb: z.blurb,
        quote: b.quote ? { ...b.quote, ...(z.quote ? { gloss: z.quote } : {}) } : undefined,
        summary: z.summary,
        start: z.start,
        text: { ...b.text, ...z.text },
      }
    : b;
  ZH_CACHE.set(b.id, out);
  return out;
}

export function book(id: string): Book {
  const b = BY_ID.get(id);
  if (!b) throw new Error(`unknown book: ${id}`);
  return isZh() ? localized(b) : b;
}

export function maybeBook(id: string | undefined): Book | undefined {
  const b = id ? BY_ID.get(id) : undefined;
  return b && isZh() ? localized(b) : b;
}

export const CATEGORIES: Category[] = [
  'Philosophy',
  'Self-help',
  'Business',
  'Psychology',
  'Investing',
  'Relationships',
  'Health',
  'Science',
  'Literature',
  'History',
];
