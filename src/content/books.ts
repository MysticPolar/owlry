import type { Book, Category } from './types';
import { BOOKS_1 } from './books-1';
import { BOOKS_2 } from './books-2';

export const BOOKS: Book[] = [...BOOKS_1, ...BOOKS_2];
const BY_ID = new Map(BOOKS.map((b) => [b.id, b]));

export function book(id: string): Book {
  const b = BY_ID.get(id);
  if (!b) throw new Error(`unknown book: ${id}`);
  return b;
}

export function maybeBook(id: string | undefined): Book | undefined {
  return id ? BY_ID.get(id) : undefined;
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
