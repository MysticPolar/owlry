/* runtime smoke test of the progress-merge (cross-device sync) — pure, no backend */
import { mergeProgress } from '../src/lib/sync/mergeProgress';
import { SEED } from '../src/store/seed';
import type { PersistedState } from '../src/store/types';
import { readingPositionKey } from '../src/lib/ebook/positionKey';
import { normalizePersisted } from '../src/store/normalize';

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, detail = '') {
  if (cond) {
    pass++;
    console.log(`  ok  ${label}`);
  } else {
    fail++;
    console.log(`FAIL  ${label}  ${detail}`);
  }
}

// deep-ish clone of the seed with overrides (prefs merged, not replaced)
const make = (o: Partial<PersistedState> = {}): PersistedState => ({
  ...SEED,
  ...o,
  prefs: { ...SEED.prefs, ...(o.prefs ?? {}) },
});

// shelves union
{
  const a = make({ savedIds: ['circe'] as never, readingIds: [] as never, finishedIds: [] as never });
  const b = make({ savedIds: ['hail'] as never, readingIds: [] as never, finishedIds: [] as never });
  const m = mergeProgress(a, b);
  check('saved shelves union', m.savedIds.includes('circe' as never) && m.savedIds.includes('hail' as never), m.savedIds.join(','));
}

// a finished book is removed from reading after merge
{
  const a = make({ readingIds: ['goldfinch', 'pachinko'] as never, finishedIds: [] as never });
  const b = make({ readingIds: [] as never, finishedIds: ['goldfinch'] as never });
  const m = mergeProgress(a, b);
  check(
    'finished wins over reading',
    m.finishedIds.includes('goldfinch' as never) && !m.readingIds.includes('goldfinch' as never) && m.readingIds.includes('pachinko' as never),
    `reading=${m.readingIds.join(',')} finished=${m.finishedIds.join(',')}`,
  );
}

// pagesRead: per-book max, keys unioned
{
  const a = make({ pagesRead: { goldfinch: 100 } });
  const b = make({ pagesRead: { goldfinch: 250, pachinko: 40 } });
  const m = mergeProgress(a, b);
  check('pagesRead per-book max', m.pagesRead.goldfinch === 250 && m.pagesRead.pachinko === 40, JSON.stringify(m.pagesRead));
}

// exact resume anchors: newest write wins even when it moves backward
{
  const older = {
    bookId: 'goldfinch' as never,
    percent: 72,
    cfi: 'epubcfi(/6/20)',
    secondsRead: 400,
    format: 'epub' as const,
    updatedAt: 100,
  };
  const newer = {
    ...older,
    percent: 41,
    cfi: 'epubcfi(/6/12)',
    updatedAt: 200,
  };
  const positionKey = readingPositionKey(older.bookId, older.copyVersion);
  const a = make({ readingPositions: { [positionKey]: older } });
  const b = make({ readingPositions: { [positionKey]: newer } });
  const m = mergeProgress(a, b);
  check(
    'newest exact position wins after reading backward',
    m.readingPositions[positionKey]?.percent === 41
      && m.readingPositions[positionKey]?.cfi === newer.cfi,
    JSON.stringify(m.readingPositions[positionKey]),
  );
}

// exact positions from different copies of the same book remain independent
{
  const copyA = {
    bookId: 'goldfinch' as never,
    percent: 68,
    cfi: 'epubcfi(/6/18)',
    secondsRead: 120,
    format: 'epub' as const,
    copyVersion: 'copy-a',
    updatedAt: 300,
  };
  const copyB = {
    ...copyA,
    percent: 22,
    cfi: 'epubcfi(/6/8)',
    copyVersion: 'copy-b',
    updatedAt: 400,
  };
  const keyA = readingPositionKey(copyA.bookId, copyA.copyVersion);
  const keyB = readingPositionKey(copyB.bookId, copyB.copyVersion);
  const merged = mergeProgress(
    make({ readingPositions: { [keyA]: copyA } }),
    make({ readingPositions: { [keyB]: copyB } }),
  );
  check(
    'exact positions remain isolated per book copy',
    merged.readingPositions[keyA]?.percent === 68
      && merged.readingPositions[keyB]?.percent === 22,
    JSON.stringify(merged.readingPositions),
  );
}

// Fingerprint migration enriches an equal-clock anchor without pretending the
// reader moved later. Merge direction must not change the winner.
{
  const copyFingerprint = `sha256:${'cd'.repeat(32)}`;
  const copyVersion = 'legacy-copy-enriched';
  const key = readingPositionKey('goldfinch', copyVersion);
  const legacy = {
    bookId: 'goldfinch' as never,
    percent: 46,
    cfi: 'epubcfi(/6/14)',
    secondsRead: 75,
    format: 'epub' as const,
    copyVersion,
    updatedAt: 450,
  };
  const enriched = { ...legacy, copyFingerprint };
  const legacyState = make({ readingPositions: { [key]: legacy } });
  const enrichedState = make({ readingPositions: { [key]: enriched } });
  const forward = mergeProgress(legacyState, enrichedState);
  const reverse = mergeProgress(enrichedState, legacyState);
  check(
    'equal-clock position merge prefers valid fingerprint metadata',
    forward.readingPositions[key]?.copyFingerprint === copyFingerprint
      && reverse.readingPositions[key]?.copyFingerprint === copyFingerprint,
    JSON.stringify({
      forward: forward.readingPositions[key],
      reverse: reverse.readingPositions[key],
    }),
  );
}

// persisted fingerprints are normalized in the value while exact-version keys stay stable
{
  const digest = `sha256:${'ab'.repeat(32)}`;
  const copyVersion = 'copy-with-fingerprint';
  const key = readingPositionKey('goldfinch', copyVersion);
  const normalized = normalizePersisted({
    ...SEED,
    readingPositions: {
      staleKey: {
        bookId: 'goldfinch',
        percent: 27,
        secondsRead: 40,
        format: 'epub',
        copyVersion,
        copyFingerprint: `  ${digest.toUpperCase()}  `,
        updatedAt: 500,
      },
      malformed: {
        bookId: 'pachinko',
        percent: 18,
        secondsRead: 20,
        format: 'epub',
        copyVersion: 'bad-fingerprint-copy',
        copyFingerprint: 'sha256:not-a-digest',
        updatedAt: 600,
      },
    },
  });
  check(
    'normalized position keeps valid copy fingerprint under exact-version key',
    normalized.readingPositions[key]?.copyFingerprint === digest
      && normalized.readingPositions[key]?.copyVersion === copyVersion,
    JSON.stringify(normalized.readingPositions[key]),
  );
  check(
    'malformed position fingerprint is discarded',
    normalized.readingPositions[
      readingPositionKey('pachinko', 'bad-fingerprint-copy')
    ]?.copyFingerprint === undefined,
  );
}

// exact positions from different books are unioned
{
  const a = make({
    readingPositions: {
      [readingPositionKey('goldfinch' as never)]: {
        bookId: 'goldfinch' as never,
        percent: 12,
        secondsRead: 10,
        format: 'epub',
        updatedAt: 10,
      },
    },
  });
  const b = make({
    readingPositions: {
      [readingPositionKey('pachinko' as never)]: {
        bookId: 'pachinko' as never,
        percent: 34,
        secondsRead: 20,
        format: 'pdf',
        updatedAt: 20,
      },
    },
  });
  const m = mergeProgress(a, b);
  check(
    'exact positions union by book',
    m.readingPositions[readingPositionKey('goldfinch' as never)]?.percent === 12
      && m.readingPositions[readingPositionKey('pachinko' as never)]?.percent === 34,
    JSON.stringify(m.readingPositions),
  );
}

// open-world book metadata follows a shelf onto a fresh device
{
  const momTest = {
    t: 'The Mom Test',
    a: 'Rob Fitzpatrick',
    c: '#2F5757',
    s: 'Mom<br>Test',
    q: 'How to learn what customers actually need.',
    n: 138,
    g: 'life' as const,
  };
  const other = {
    t: 'Continuous Discovery Habits',
    a: 'Teresa Torres',
    c: '#56324B',
    s: 'Continuous<br>Discovery',
    q: 'A practical cadence for product discovery.',
    n: 244,
    g: 'life' as const,
  };
  const merged = mergeProgress(
    make({
      libraryBooks: {
        'the-mom-test': { book: momTest, updatedAt: 100 },
      },
    }),
    make({
      libraryBooks: {
        'continuous-discovery-habits': { book: other, updatedAt: 200 },
      },
    }),
  );
  check(
    'open-world metadata unions across devices',
    merged.libraryBooks['the-mom-test']?.book.a === 'Rob Fitzpatrick'
      && merged.libraryBooks['continuous-discovery-habits']?.book.a === 'Teresa Torres',
    JSON.stringify(merged.libraryBooks),
  );

  const corrected = {
    ...momTest,
    q: 'Ask about their life instead of pitching your idea.',
  };
  const refreshed = mergeProgress(
    merged,
    make({
      libraryBooks: {
        'the-mom-test': { book: corrected, updatedAt: 300 },
      },
    }),
  );
  check(
    'newest open-world metadata wins',
    refreshed.libraryBooks['the-mom-test']?.book.q === corrected.q,
    refreshed.libraryBooks['the-mom-test']?.book.q,
  );
}

// scalars follow the further-along side (level dominates)
{
  const a = make({ lv: 8, xp: 5 });
  const b = make({ lv: 7, xp: 399 });
  const m = mergeProgress(a, b);
  check('higher level leads', m.lv === 8 && m.xp === 5, `lv=${m.lv} xp=${m.xp}`);
}

// tie on level → higher xp leads
{
  const a = make({ lv: 7, xp: 100 });
  const b = make({ lv: 7, xp: 300 });
  const m = mergeProgress(a, b);
  check('xp breaks level tie', m.xp === 300, `xp=${m.xp}`);
}

// currencies never shrink
{
  const a = make({ coins: 240, ink: 10, streak: 3 });
  const b = make({ coins: 500, ink: 80, streak: 12 });
  const m = mergeProgress(a, b);
  check('coins/ink/streak take max', m.coins === 500 && m.ink === 80 && m.streak === 12, `${m.coins}/${m.ink}/${m.streak}`);
}

// onboarding is sticky; legacy prefs without a timestamp follow advancement
{
  const a = make({ lv: 9, prefs: { ...SEED.prefs, onboarded: false, mode: 'night' } });
  const b = make({ lv: 2, prefs: { ...SEED.prefs, onboarded: true, mode: 'day' } });
  const m = mergeProgress(a, b);
  check('onboarded is sticky', m.prefs.onboarded === true);
  check('prefs follow the leader', m.prefs.mode === 'night', m.prefs.mode);
}

// reader settings have their own write order, independent of XP
{
  const older = make({
    lv: 9,
    prefsUpdatedAt: 100,
    prefs: {
      ...SEED.prefs,
      reader: { ...SEED.prefs.reader, font: 'literata', size: 18 },
    },
  });
  const newer = make({
    lv: 2,
    prefsUpdatedAt: 200,
    prefs: {
      ...SEED.prefs,
      reader: { ...SEED.prefs.reader, font: 'system', size: 22 },
    },
  });
  const merged = mergeProgress(older, newer);
  check(
    'newest reader settings win without XP',
    merged.prefs.reader.font === 'system'
      && merged.prefs.reader.size === 22
      && merged.prefsUpdatedAt === 200,
    JSON.stringify(merged.prefs.reader),
  );
}

// union is order-independent for shelves
{
  const a = make({ savedIds: ['circe'] as never });
  const b = make({ savedIds: ['hail'] as never });
  const ab = mergeProgress(a, b).savedIds.slice().sort().join(',');
  const ba = mergeProgress(b, a).savedIds.slice().sort().join(',');
  check('shelf union order-independent', ab === ba, `${ab} vs ${ba}`);
  const ordered = make({ savedIds: ['circe', 'atomic'] as never });
  check(
    'same-device shelf recency order survives sync',
    mergeProgress(ordered, ordered).savedIds.join(',') === 'circe,atomic',
  );
}

// same-millisecond writes still converge regardless of merge direction
{
  const a = make({
    prefsUpdatedAt: 100,
    prefs: {
      ...SEED.prefs,
      reader: { ...SEED.prefs.reader, size: 17 },
    },
    readingPositions: {
      'goldfinch::copy': {
        bookId: 'goldfinch',
        format: 'epub',
        copyVersion: 'copy',
        percent: 10,
        secondsRead: 10,
        updatedAt: 100,
      },
    },
  });
  const b = make({
    prefsUpdatedAt: 100,
    prefs: {
      ...SEED.prefs,
      reader: { ...SEED.prefs.reader, size: 23 },
    },
    readingPositions: {
      'goldfinch::copy': {
        bookId: 'goldfinch',
        format: 'epub',
        copyVersion: 'copy',
        percent: 90,
        secondsRead: 90,
        updatedAt: 100,
      },
    },
  });
  const ab = mergeProgress(a, b);
  const ba = mergeProgress(b, a);
  check(
    'equal-timestamp anchors converge',
    ab.readingPositions['goldfinch::copy']?.percent
      === ba.readingPositions['goldfinch::copy']?.percent,
  );
  check(
    'equal-timestamp prefs converge',
    ab.prefs.reader.size === ba.prefs.reader.size,
  );
  const absorbed = mergeProgress(a, ab);
  check(
    'equal-timestamp anchor merge is absorbing',
    absorbed.readingPositions['goldfinch::copy']?.percent
      === ab.readingPositions['goldfinch::copy']?.percent,
  );
  check(
    'equal-timestamp prefs merge is absorbing',
    absorbed.prefs.reader.size === ab.prefs.reader.size,
  );
  const c = make({
    prefsUpdatedAt: 100,
    prefs: {
      ...SEED.prefs,
      reader: { ...SEED.prefs.reader, size: 19 },
    },
    readingPositions: {
      'goldfinch::copy': {
        bookId: 'goldfinch',
        format: 'epub',
        copyVersion: 'copy',
        percent: 50,
        secondsRead: 50,
        updatedAt: 100,
      },
    },
  });
  const left = mergeProgress(mergeProgress(a, b), c);
  const right = mergeProgress(a, mergeProgress(b, c));
  check(
    'equal-timestamp merge is associative',
    left.readingPositions['goldfinch::copy']?.percent
      === right.readingPositions['goldfinch::copy']?.percent
      && left.prefs.reader.size === right.prefs.reader.size,
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
