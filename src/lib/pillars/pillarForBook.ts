/* Resolve a Mirror pillar for any book ref (catalog or open-world). Token-free. */
import { getBook } from '../bookRegistry';
import { classifyPillar, type Pillar } from './categoryMap';

export function pillarForBook(bookId: string | null | undefined): Pillar {
  if (!bookId) return 'wonder';
  const b = getBook(bookId);
  if (!b) return 'wonder';
  if (b.pillar) return b.pillar;
  return classifyPillar(b.cats, null, { genre: b.g ?? 'fiction' });
}
