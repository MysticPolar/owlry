/* ============================================================
   Ids for minds the catalogue lacks — a port of the server's
   supabase/functions/_shared/council/minds.ts (keyOf, slug, initialsOf),
   kept byte-for-byte in behaviour so the client can name a card before
   the server has written it: a recalled figure's id is the cast's slug,
   a recalled book's is `${keyOf(title)}--${figureId}`. Pure, no imports.
   ============================================================ */

/** the Latin letters NFKD leaves whole (no diacritic to strip): ø æ œ ß ð þ ł đ ı → their ascii spellings */
const LETTERS: Record<string, string> = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ð: 'd', þ: 'th', ł: 'l', đ: 'd', ı: 'i' };
const fold = (s: string): string =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[øæœßðþłđı]/g, (c) => LETTERS[c] ?? c);

/** the cache key for a name or a title: ascii-folded, hyphenated; Chinese kept as it is */
export function keyOf(s: string): string {
  return fold(s).replace(/[^a-z0-9㐀-鿿]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
}

/** an ascii id in the catalogue's style ("marcus-aurelius"); empty when the name has no Latin letters */
export function slug(s: string): string {
  return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
}

/** two letters for the avatar: initials of the first and last word, or the first character of a Chinese name */
export function initialsOf(name: string): string {
  const words = name.split(/[\s·•]+/).filter(Boolean);
  if (!words.length) return '?';
  if (/^[㐀-鿿]/.test(words[0])) return words[0].slice(0, 1);
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? words[words.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase() || '?';
}

/** the client's id for a book the cast named: decided here so a session can name it before any card exists */
export function recalledBookId(title: string, figureId: string): string {
  return `${keyOf(title) || 'book'}--${figureId}`;
}
