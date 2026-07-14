/* ============================================================
   owlry — title/author normalization for fuzzy source matching.

   Shared by the public-domain resolver (lib/ebook/resolve.ts) and the
   Google Books resolver (lib/gbooks.ts) so both key + match books the
   same way. Pure + dependency-free.
   ============================================================ */

/** lowercase, drop a leading article, strip punctuation, collapse spaces */
export const norm = (s: string): string =>
  s
    .toLowerCase()
    .replace(/^(the|a|an)\s+/, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** the author's surname (last token, or the part before a comma), normalized */
export const surname = (author: string): string => {
  const a = author.includes(',') ? author.split(',')[0] : author.split(' ').slice(-1)[0];
  return norm(a);
};
