/* ============================================================
   owlry — life-pillar classifier (token-free).

   Maps Google Books categories / Open Library subjects onto one of
   five Mirror shelves: health | wealth | love | happiness | wonder.
   One book → one pillar. Wonder is the default / catch-all.
   ============================================================ */

export const PILLARS = ['health', 'wealth', 'love', 'happiness', 'wonder'] as const;
export type Pillar = (typeof PILLARS)[number];

/** Priority order: first match wins. Wonder last = default. */
const ORDER: readonly Pillar[] = PILLARS;

/**
 * Keywords matched case-insensitively as substrings against each category
 * string. Short tokens that are false-friend prone use bounded matchers
 * (see `matches`).
 */
export const KEYWORDS: Record<Pillar, readonly string[]> = {
  health: [
    'health & fitness',
    'medical',
    'nutrition',
    'sleep',
    'diet',
    'exercise',
    'fitness',
    'sports & recreation',
    'self-help / stress management',
    'psychology / psychopathology',
    'body, mind & spirit / healing',
    'wellness',
  ],
  wealth: [
    'business & economics',
    'personal finance',
    'investing',
    'investments',
    'money management',
    'careers',
    'job hunting',
    'management',
    'leadership',
    'entrepreneurship',
    'success in business',
    'real estate',
    'economics',
    'education / counseling / career development',
    'computers',
    'technology & engineering',
  ],
  love: [
    'family & relationships',
    'love & romance',
    'marriage',
    'dating',
    'parenting',
    'friendship',
    'fiction / romance',
    'romance',
    'fiction / contemporary women',
    'interpersonal relations',
    'juvenile fiction / social themes / friendship',
  ],
  happiness: [
    'philosophy',
    'body, mind & spirit',
    'self-help / personal growth',
    'self-help / motivational',
    'self-help / happiness',
    'self-help',
    'psychology',
    'religion',
    'spirituality',
    'bible',
    'bibles',
    'poetry',
    'humor',
    'literary criticism',
    'literary collections',
    'fiction / literary',
    'fiction / classics',
    'performing arts',
    'photography',
    'cooking',
    'gardening',
    'art',
    'music',
    'drama',
    'design',
  ],
  wonder: [
    'fiction / science fiction',
    'fiction / fantasy',
    'fiction / mystery',
    'fiction / thrillers',
    'fiction / horror',
    'fiction / historical',
    'young adult fiction',
    'juvenile fiction',
    'fiction',
    'science',
    'mathematics',
    'history',
    'nature',
    'travel',
    'true crime',
    'comics & graphic novels',
    'biography & autobiography',
    'social science',
    'political science',
    'law',
    'education',
    'language arts',
    'study aids',
    'reference',
    'foreign language',
    'games',
    'crafts',
    'pets',
    'antiques',
    'house & home',
    'transportation',
  ],
};

/** Short tokens that must not match mid-word (romance≠necromancer, art≠martial). */
const BOUNDED = new Set([
  'romance',
  'diet',
  'art',
  'law',
  'music',
  'drama',
  'design',
  'games',
  'pets',
  'sleep',
  'bible',
  'bibles',
]);

const OL_NOISE = [
  /^nyt:/i,
  /^lending:/i,
  /^protected daisy$/i,
  /^accessible book$/i,
  /^in library$/i,
  /^overdrive$/i,
  /^open library staff picks$/i,
];

export function isNoisySubject(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  return OL_NOISE.some((re) => re.test(t));
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function matches(haystack: string, keyword: string): boolean {
  const k = normalize(keyword);
  const h = normalize(haystack);
  if (!k || !h) return false;
  if (BOUNDED.has(k)) {
    // whole segment or / -separated token, or whole string
    const parts = h.split(/[/|,]/).map((p) => p.trim());
    return parts.some((p) => p === k || new RegExp(`(?:^|\\b)${k}(?:\\b|$)`).test(p));
  }
  return h.includes(k);
}

function pillarHits(
  pillar: Pillar,
  bag: string[],
  opts?: { skipLitCrit?: boolean },
): boolean {
  return KEYWORDS[pillar].some((kw) => {
    if (opts?.skipLitCrit && (kw === 'literary criticism' || kw === 'literary collections')) {
      return false;
    }
    return bag.some((c) => matches(c, kw));
  });
}

/**
 * Classify a book into exactly one life pillar.
 * @param categories Google `volumeInfo.categories` and/or OL subjects
 * @param mainCategory optional Google `volumeInfo.mainCategory` (merged into the bag)
 * @param hints.genre Owlry catalog genre — injected only when Google/OL cats are sparse
 */
export function classifyPillar(
  categories: readonly string[] | null | undefined,
  mainCategory?: string | null,
  hints?: { genre?: string | null },
): Pillar {
  const bag: string[] = [];
  const seen = new Set<string>();
  const push = (raw?: string | null) => {
    if (!raw) return;
    if (isNoisySubject(raw)) return;
    const n = normalize(raw);
    if (!n || seen.has(n)) return;
    seen.add(n);
    bag.push(raw);
  };
  push(mainCategory);
  for (const c of categories ?? []) push(c);

  // Catalog / Scout genre fills subgenre gaps. Always inject for fiction-shelf
  // genres (romance/mystery/scifi/…) — Google often returns bare "Fiction" or
  // noisy "Literary Criticism" on mysteries. For life/empty, only inject when sparse.
  const g = (hints?.genre ?? '').toLowerCase();
  const fictionShelf = g === 'romance' || g === 'mystery' || g === 'scifi' || g === 'history' || g === 'fiction';
  if (fictionShelf || isSparseFictionCategories(bag)) {
    for (const h of genreToCategoryHints(hints?.genre)) push(h);
  }

  if (bag.length === 0) return 'wonder';

  // Genre fiction: don't let "Literary Criticism" steal happiness over mystery/romance/scifi
  const skipLitCrit =
    g === 'romance' || g === 'mystery' || g === 'scifi' || g === 'history';

  for (const pillar of ORDER) {
    if (pillarHits(pillar, bag, { skipLitCrit: skipLitCrit && pillar === 'happiness' })) return pillar;
  }
  return 'wonder';
}

/** True when the bag is empty or only coarse fiction labels (no BISAC subgenre). */
export function isSparseFictionCategories(categories: readonly string[]): boolean {
  if (!categories.length) return true;
  return categories.every((c) => {
    const n = normalize(c);
    if (!n) return true;
    // rich BISAC: "Fiction / Romance", "Young Adult Fiction / Fantasy"
    if (n.includes('/') && !/^fiction\s*\/\s*general$/.test(n)) return false;
    // coarse-only
    return (
      n === 'fiction' ||
      n === 'juvenile fiction' ||
      n === 'young adult fiction' ||
      n === 'general fiction'
    );
  });
}

/**
 * Map Owlry shelf genres onto Google-style category strings so bare Fiction
 * still lands on the right pillar (romance → love, mystery → wonder, …).
 */
export function genreToCategoryHints(genre: string | null | undefined): string[] {
  switch ((genre ?? '').toLowerCase()) {
    case 'romance':
      return ['Fiction / Romance'];
    case 'mystery':
      return ['Fiction / Mystery'];
    case 'scifi':
      return ['Fiction / Science Fiction'];
    case 'history':
      return ['History'];
    case 'life':
      // living / self-help desk — soft happiness unless richer cats exist
      return ['Self-Help'];
    case 'fiction':
      // still wonder — literary/general with no subgenre
      return ['Fiction'];
    default:
      return [];
  }
}

/** Merge category lists (Google siblings, OL subjects, …) preserving order. */
export function mergeCategoryLists(...lists: Array<readonly string[] | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const raw of list ?? []) {
      if (!raw || isNoisySubject(raw)) continue;
      const n = normalize(raw);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(raw.trim());
    }
  }
  return out;
}
