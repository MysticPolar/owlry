import type { BookZh } from './types';
import { BOOKS_ZH_1 } from './books-1';
import { BOOKS_ZH_2 } from './books-2';

/* the whole catalogue, in Chinese — one entry per book id (see ../books.ts) */
export const BOOKS_ZH: Record<string, BookZh> = { ...BOOKS_ZH_1, ...BOOKS_ZH_2 };
