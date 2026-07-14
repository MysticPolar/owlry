/* ============================================================
   owlry — runtime Google Books hydration.

   Catalog books carry their Google fields pre-baked (content/books-meta.ts,
   merged in getBook). Owl-recommended open-world books don't — this hook
   resolves them at runtime and returns the metadata so the caller can
   coalesce `book.img ?? meta?.img` (and rating/publisher/etc.).

   It skips the network for books already enriched (pre-baked or resolved
   this session), and resolveGBooks dedupes concurrent calls + caches in
   IndexedDB, so many <Cover>s of the same book issue at most one request.
   ============================================================ */
import { useEffect, useState } from 'react';
import type { BookRef } from '../content/types';
import { getBook } from '../lib/bookRegistry';
import { peekMeta, resolveBookMeta, type BookMeta } from '../lib/gbooks';

export function useBookMeta(ref: BookRef | null | undefined): BookMeta | null {
  const b = ref ? getBook(ref) : undefined;
  // already enriched (pre-baked catalog, or a source had no cover but did have a
  // rating) → the fields live on `b`; no runtime lookup needed.
  const enriched = !!b && (b.img !== undefined || b.rsrc !== undefined);
  const [meta, setMeta] = useState<BookMeta | null>(() =>
    b && !enriched ? peekMeta(b.t, b.a) ?? null : null,
  );

  useEffect(() => {
    if (!b || enriched) return;
    let alive = true;
    resolveBookMeta(b.t, b.a).then((m) => {
      if (alive) setMeta(m);
    });
    return () => {
      alive = false;
    };
  }, [b?.t, b?.a, enriched]);

  return meta;
}
