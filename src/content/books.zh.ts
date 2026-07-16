/* ============================================================
   owlry — 简体中文 catalog overlay. Translated fields only; visual
   identity (cover color, pages, genre, rating) stays in books.ts.
   Resolved by lib/bookRegistry.getBook() when the language is zh.
   ============================================================ */
import type { Book, BookId } from './types';

export type BookZh = Pick<Book, 't' | 'a' | 's' | 'q' | 'i' | 'w'>;

/* Filled by the catalog translation pass. */
export const BOOKS_ZH: Partial<Record<BookId, BookZh>> = {};
