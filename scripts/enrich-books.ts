/* ============================================================
   owlry — pre-bake book metadata for the catalog.

   For each catalog book (title+author), fetches metadata and writes the
   sourced fields — img / sub / pub / rn / rc / rsrc / cats / pillar — into the generated
   sidecar src/content/books-meta.ts. Hand-written fields (t/a/i/w/q/n/c/tc/s/g/r)
   are never touched; getBook() merges the sidecar over the catalog at runtime.

   Sources (same order as the runtime resolver): Google Books first when
   GOOGLE_BOOKS_API_KEY is set (richer), then Open Library (free, keyless) as
   the fallback — so this works out of the box with no key.

   Run:  npm run books:enrich
         GOOGLE_BOOKS_API_KEY=xxx npm run books:enrich   (prefer Google)
   ============================================================ */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { BOOKS } from '../src/content/books';
import type { Book, BookId } from '../src/content/types';
import { buildQueryUrl, pickMatch, mapVolume, collectSiblingCategories, type BookMeta, type GVolume } from '../src/lib/gbooks';
import { buildOpenLibUrl, pickOpenLibMatch, mapOpenLibDoc, type OLDoc } from '../src/lib/openlibrary';
import { classifyPillar, isSparseFictionCategories, mergeCategoryLists } from '../src/lib/pillars/categoryMap';

const KEY = process.env.GOOGLE_BOOKS_API_KEY;
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/content/books-meta.ts');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** resolve one book: Google first (if keyed), then Open Library; enrich sparse Fiction */
async function resolveOne(title: string, author: string, genre: string): Promise<BookMeta | null> {
  let meta: BookMeta | null = null;
  if (KEY) {
    try {
      const res = await fetch(buildQueryUrl(title, author, KEY));
      if (res.ok) {
        const data = (await res.json()) as { items?: GVolume[] };
        const items = data.items ?? [];
        const m = pickMatch(items, title, author);
        if (m) {
          const siblings = collectSiblingCategories(items, title, author);
          meta = mapVolume(m, { extraCategories: siblings, genre });
        }
      }
    } catch {
      /* fall through to Open Library */
    }
  }
  const sparse = !meta || isSparseFictionCategories(meta.categories ?? (meta.mainCategory ? [meta.mainCategory] : []));
  if (!meta || sparse) {
    try {
      const res = await fetch(buildOpenLibUrl(title, author));
      if (res.ok) {
        const data = (await res.json()) as { docs?: OLDoc[] };
        const m = pickOpenLibMatch(data.docs ?? [], title, author);
        if (m) {
          const ol = mapOpenLibDoc(m, { genre });
          if (!meta) meta = ol;
          else if (ol.categories?.length) {
            const categories = mergeCategoryLists(meta.categories, ol.categories);
            meta = {
              ...meta,
              categories,
              pillar: classifyPillar(categories, meta.mainCategory, { genre }),
            };
          }
        }
      }
    } catch {
      /* no match */
    }
  }
  return meta;
}

/** the sidecar subset — only the sourced fields (never description/pages/title) */
function sidecar(m: BookMeta): Partial<Book> {
  const e: Partial<Book> = {};
  if (m.img) e.img = m.img;
  if (m.subtitle) e.sub = m.subtitle;
  if (m.publisher) e.pub = m.publisher;
  if (m.rating != null) {
    e.rn = m.rating;
    if (m.ratingsCount != null) e.rc = m.ratingsCount;
    e.rsrc = m.source;
  }
  if (m.categories?.length) e.cats = m.categories;
  if (m.pillar) e.pillar = m.pillar;
  return e;
}

async function run() {
  const ids = Object.keys(BOOKS) as BookId[];
  const out: Partial<Record<BookId, Partial<Book>>> = {};
  let found = 0;

  console.log(KEY ? 'Google Books (keyed) → Open Library fallback\n' : 'Open Library (no key set)\n');

  for (const id of ids) {
    const b = BOOKS[id];
    try {
      const m = await resolveOne(b.t, b.a, b.g);
      if (m) {
        const e = sidecar(m);
        if (Object.keys(e).length) {
          out[id] = e;
          found++;
          console.log(`  ok  ${id.padEnd(10)} ${m.source.padEnd(11)} ${e.img ? 'cover' : 'no-cover'} ${e.rn != null ? `★${e.rn.toFixed(1)}` : ''}`);
        } else {
          console.log(`  --  ${id.padEnd(10)} match had no usable fields`);
        }
      } else {
        console.log(`  --  ${id.padEnd(10)} no confident match`);
      }
    } catch (err) {
      console.log(`FAIL  ${id.padEnd(10)} ${String(err)}`);
    }
    await sleep(250); // be polite to the APIs
  }

  const header = `/* ============================================================
   owlry — GENERATED FILE. Do not edit by hand.

   Pre-baked book metadata for the catalog, keyed by BookId.
   Regenerate with:  npm run books:enrich
   (scripts/enrich-books.ts fetches Google Books / Open Library for each
   catalog book and writes only the sourced fields — img/sub/pub/rn/rc/rsrc/cats/pillar —
   never the hand-written t/a/i/w/q/n/c/tc/s/g/r.)

   Merged over the static catalog in lib/bookRegistry.ts's getBook().
   ============================================================ */
import type { Book, BookId } from './types';

export const BOOK_META: Partial<Record<BookId, Partial<Book>>> = `;
  writeFileSync(OUT, `${header}${JSON.stringify(out, null, 2)};\n`);
  console.log(`\n${found}/${ids.length} enriched → ${OUT}`);
}

run();
