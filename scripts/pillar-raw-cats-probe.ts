/* Live: raw Google categories for fiction + self-help (siblings included) */
import {
  buildQueryUrl,
  pickMatch,
  collectSiblingCategories,
  type GVolume,
} from '../src/lib/gbooks';
import { classifyPillar } from '../src/lib/pillars/categoryMap';

const KEY =
  process.env.GOOGLE_BOOKS_API_KEY?.trim() ||
  process.env.VITE_GOOGLE_BOOKS_API_KEY?.trim();

const BOOKS: [string, string, string][] = [
  // fiction mix
  ['It Ends with Us', 'Colleen Hoover', 'romance'],
  ['The Silent Patient', 'Alex Michaelides', 'mystery'],
  ['Project Hail Mary', 'Andy Weir', 'scifi'],
  ['Mexican Gothic', 'Silvia Moreno-Garcia', 'fiction'],
  ['Where the Crawdads Sing', 'Delia Owens', 'fiction'],
  ['The Thursday Murder Club', 'Richard Osman', 'mystery'],
  // self-help / life
  ['Atomic Habits', 'James Clear', 'life'],
  ['The 7 Habits of Highly Effective People', 'Stephen Covey', 'life'],
  ['How to Win Friends and Influence People', 'Dale Carnegie', 'life'],
  ['Why We Sleep', 'Matthew Walker', 'life'],
];

async function main() {
  if (!KEY) {
    console.error('missing Google Books key');
    process.exit(1);
  }
  console.log('RAW Google categories (all matching editions) → pillar\n');

  for (const [title, author, genre] of BOOKS) {
    await new Promise((r) => setTimeout(r, 400));
    const res = await fetch(buildQueryUrl(title, author, KEY));
    if (!res.ok) {
      console.log(`${title}\n  HTTP ${res.status}\n`);
      continue;
    }
    const data = (await res.json()) as { items?: GVolume[] };
    const items = data.items ?? [];
    const match = pickMatch(items, title, author);

    // every category string Google returned on ANY matching edition
    const perEdition: string[] = [];
    const nt = title.toLowerCase();
    for (const it of items) {
      const vi = it.volumeInfo;
      if (!vi?.title) continue;
      const cats = [
        ...(vi.mainCategory ? [`main:${vi.mainCategory}`] : []),
        ...(vi.categories ?? []).map((c) => c),
      ];
      if (cats.length) {
        perEdition.push(`  edition "${vi.title}": ${cats.join(' | ') || '(empty)'}`);
      }
    }

    const siblings = match ? collectSiblingCategories(items, title, author) : [];
    const main = match?.volumeInfo?.mainCategory;
    const pillar = classifyPillar(siblings, main, { genre });

    console.log(`${title}  [${genre}]`);
    console.log(`  matched: ${match?.volumeInfo?.title ?? '(none)'}`);
    if (!perEdition.length) console.log('  (no categories on any returned edition)');
    else console.log(perEdition.slice(0, 5).join('\n'));
    console.log(`  merged bag: ${siblings.join(' · ') || '(none)'}`);
    console.log(`  → pillar: ${pillar}\n`);
  }
}

main();
