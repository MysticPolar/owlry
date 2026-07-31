/* network-free smoke: life-pillar classifier from Google-style categories */
import { classifyPillar, type Pillar } from '../src/lib/pillars/categoryMap';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function expect(cats: string[], want: Pillar, main?: string) {
  const got = classifyPillar(cats, main);
  assert(got === want, `expected ${want}, got ${got} for ${JSON.stringify({ cats, main })}`);
}

// plan examples
expect(['Health & Fitness / Sleep & Sleep Disorders'], 'health');
expect(['Business & Economics / Personal Finance'], 'wealth');
expect(['Fiction / Romance'], 'love');
expect(['Philosophy / Ethics & Moral Philosophy'], 'happiness');
expect(['Fiction'], 'wonder');
expect([], 'wonder');

// catalog genre fills in when Google only says Fiction
assert(
  classifyPillar(['Fiction'], null, { genre: 'romance' }) === 'love',
  'bare Fiction + romance genre → love',
);
assert(
  classifyPillar(['Fiction'], null, { genre: 'mystery' }) === 'wonder',
  'bare Fiction + mystery genre → wonder (mystery)',
);
assert(
  classifyPillar(['Fiction'], null, { genre: 'scifi' }) === 'wonder',
  'bare Fiction + scifi genre → wonder',
);
// rich BISAC still beats genre hint when not a fiction-shelf conflict
assert(
  classifyPillar(['Fiction / Literary'], null, { genre: 'romance' }) === 'love',
  'romance genre + literary → love (fiction-shelf genre wins)',
);
assert(
  classifyPillar(['Fiction', 'Literary Criticism'], null, { genre: 'mystery' }) === 'wonder',
  'mystery genre beats literary-criticism false friend',
);

// mainCategory alone is Fiction but richer categories win via the bag
expect(['Family & Relationships / Love & Romance'], 'love', 'Fiction');

// priority: wealth before happiness on business + self-help
expect(['Business & Economics / Entrepreneurship', 'Self-Help'], 'wealth');

// love before happiness
expect(['Fiction / Romance', 'Fiction / Literary'], 'love');

// clinical psych → health; generic psych → happiness
expect(['Psychology / Psychopathology'], 'health');
expect(['Psychology / Cognitive Psychology'], 'happiness');

// noisy OL subjects ignored
expect(['nyt:hardcover_fiction', 'Fiction / Mystery'], 'wonder');

// bounded: necromancer must not become love
expect(['Fiction / Fantasy'], 'wonder');
assert(classifyPillar(['Necromancer Chronicles']) === 'wonder', 'necromancer ≠ romance');

console.log('pillar-smoke: ok');
