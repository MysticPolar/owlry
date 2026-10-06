/* live probe: 10 fiction-heavy titles → Google/OL categories → pillars */
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

/** title, author, expected Owlry-style genre hint (as Scout/catalog would know) */
const BOOKS: [string, string, string][] = [
  ['Pride and Prejudice', 'Jane Austen', 'romance'],
  ['The Girl with the Dragon Tattoo', 'Stieg Larsson', 'mystery'],
  ['Dune', 'Frank Herbert', 'scifi'],
  ['The Shining', 'Stephen King', 'fiction'], // horror → wonder via bare/fantasy path
  ['The Song of Achilles', 'Madeline Miller', 'fiction'],
  ['Gone Girl', 'Gillian Flynn', 'mystery'],
  ['The Notebook', 'Nicholas Sparks', 'romance'],
  ['Neuromancer', 'William Gibson', 'scifi'],
  ['Rebecca', 'Daphne du Maurier', 'mystery'],
  ['Normal People', 'Sally Rooney', 'fiction'],
];

async function main() {
  if (!KEY) {
    console.error('Set GOOGLE_BOOKS_API_KEY or VITE_GOOGLE_BOOKS_API_KEY');
    process.exit(1);
  }

  console.log('10 fiction titles — Google/OL categories → pillar\n');

  for (const [title, author, genre] of BOOKS) {
    let cats: string[] = [];
    let main: string | undefined;
    let source = 'none';
    let matched = title;

    try {
      const res = await fetch(buildQueryUrl(title, author, KEY));
      if (res.ok) {
        const data = (await res.json()) as { items?: GVolume[] };
        const items = data.items ?? [];
        const match = pickMatch(items, title, author);
        if (match) {
          const siblings = collectSiblingCategories(items, title, author);
          const m = mapVolume(match, { extraCategories: siblings, genre });
          matched = m.title || title;
          cats = m.categories ?? [];
          main = m.mainCategory;
          source = 'google';
        } else {
          console.log(`· ${title} — no Google match`);
        }
      } else {
        console.log(`· ${title} — Google HTTP ${res.status}`);
      }
    } catch (e) {
      console.log(`· ${title} — ${String(e)}`);
    }

    const bag = cats.concat(main ? [main] : []);
    if (isSparseFictionCategories(bag)) {
      try {
        const res = await fetch(buildOpenLibUrl(title, author));
        if (res.ok) {
          const data = (await res.json()) as { docs?: OLDoc[] };
          const match = pickOpenLibMatch(data.docs ?? [], title, author);
          if (match) {
            const ol = mapOpenLibDoc(match, { genre });
            cats = mergeCategoryLists(cats, ol.categories);
            source = source === 'google' ? 'google+ol' : 'openlibrary';
          }
        }
      } catch {
        /* ignore */
      }
    }

    const pillar = classifyPillar(cats, main, { genre });
    const shown = cats.slice(0, 5).join(' · ') || '(none)';
    console.log(`${matched}`);
    console.log(`  hint: ${genre}  |  source: ${source}`);
    console.log(`  cats: ${shown}`);
    console.log(`  → ${pillar}\n`);
    await new Promise((r) => setTimeout(r, 350));
  }
}

main();
