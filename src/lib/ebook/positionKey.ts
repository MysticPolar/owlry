import type { BookRef } from '../../content/types';
import type { ReadingPosition } from './types';

/** One exact anchor slot per book copy; `null` represents public/unversioned. */
export const readingPositionKey = (
  bookId: BookRef,
  copyVersion?: string,
): string => JSON.stringify([bookId, copyVersion ?? null]);

export const getReadingPosition = (
  positions: Record<string, ReadingPosition>,
  bookId: BookRef,
  copyVersion?: string,
): ReadingPosition | null => (
  positions[readingPositionKey(bookId, copyVersion)] ?? null
);

export const maxReadingPercent = (
  positions: Record<string, ReadingPosition>,
  bookId: BookRef,
): number => Object.values(positions).reduce(
  (max, position) => (
    position.bookId === bookId ? Math.max(max, position.percent) : max
  ),
  0,
);
