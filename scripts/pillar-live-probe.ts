/* one-off: fetch titles from Google Books → categories → pillars (with genre hints) */
import { BOOKS } from '../src/content/books';
import type { BookId } from '../src/content/types';
import {
  buildQueryUrl,
  pickMatch,
  mapVolume,
  collectSiblingCategories,
  type GVolume,
} from '../src/lib/gbooks';
import { buildOpenLibUrl, pickOpenLibMatch, mapOpenLibDoc, type OLDoc } from '../src/lib/openlibrary';
import { classifyPillar, isSparseFictionCategories, mergeCategoryLists } from '../src/lib/pillars/categoryMap';

const KEY =
  process.env.GOOGLE_BOOKS_API_KEY?.trim() ||
  process.env.VITE_GOOGLE_BOOKS_API_KEY?.trim();

const IDS: BookId[] = [
  'wws',
  'beach',
  'piranesi',
  'sleep',
  'circe',
  'medit',
  'deep',
  'atomic',
  'spqr',
  'kindred',
];

async function main() {
  if (!KEY) {
    console.error('Set GOOGLE_BOOKS_API_KEY or VITE_GOOGLE_BOOKS_API_KEY');
    process.exit(1);
  }

  console.log('catalog book → Google/OL categories → pillar (genre hint when sparse)\n');

  for (const id of IDS) {
    const b = BOOKS[id];
    let cats: string[] = [];
    let main: string | undefined;
    let source = 'none';

    try {
      const res = await fetch(buildQueryUrl(b.t, b.a, KEY));
      if (res.ok) {
        const data = (await res.json()) as { items?: GVolume[] };
        const items = data.items ?? [];
        const match = pickMatch(items, b.t, b.a);
        if (match) {
          const siblings = collectSiblingCategories(items, b.t, b.a);
          const m = mapVolume(match, { extraCategories: siblings, genre: b.g });
          cats = m.categories ?? [];
          main = m.mainCategory;
          source = 'google';
        }
      } else {
        console.log(`${id} Google HTTP ${res.status}`);
      }
    } catch (e) {
      console.log(`${id} Google error ${String(e)}`);
    }

    if (isSparseFictionCategories(cats.concat(main ? [main] : []))) {
      try {
        const res = await fetch(buildOpenLibUrl(b.t, b.a));
        if (res.ok) {
          const data = (await res.json()) as { docs?: OLDoc[] };
          const match = pickOpenLibMatch(data.docs ?? [], b.t, b.a);
          if (match) {
            const ol = mapOpenLibDoc(match, { genre: b.g });
            cats = mergeCategoryLists(cats, ol.categories);
            source = source === 'google' ? 'google+ol' : 'openlibrary';
          }
        }
      } catch {
        /* ignore */
      }
    }

    const pillar = classifyPillar(cats, main, { genre: b.g });
    console.log(`${id}  (${b.g})  ${b.t}`);
    console.log(`  main: ${main ?? '(none)'}`);
    console.log(`  cats: ${cats.slice(0, 6).join('; ') || '(none)'}  [${source}]`);
    console.log(`  → ${pillar}\n`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

main();
