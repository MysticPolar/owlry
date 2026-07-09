// ============================================================
// Byte-identical port of src/lib/cover.ts's slugify(). Must stay in sync —
// the client derives book refs/covers from the same function, and the
// server's `slug` in an owl-chat response must match what the client
// independently computes when it registers the recommended book.
// Pure (no Deno/Node globals) so it's importable by tsx smoke scripts too.
// ============================================================
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
