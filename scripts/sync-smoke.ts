/* runtime smoke test of the progress-merge (cross-device sync) — pure, no backend */
import { mergeProgress } from '../src/lib/sync/mergeProgress';
import { SEED } from '../src/store/seed';
import type { PersistedState } from '../src/store/types';

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

// onboarding is sticky; prefs otherwise follow the leader
{
  const a = make({ lv: 9, prefs: { ...SEED.prefs, onboarded: false, mode: 'night' } });
  const b = make({ lv: 2, prefs: { ...SEED.prefs, onboarded: true, mode: 'day' } });
  const m = mergeProgress(a, b);
  check('onboarded is sticky', m.prefs.onboarded === true);
  check('prefs follow the leader', m.prefs.mode === 'night', m.prefs.mode);
}

// union is order-independent for shelves
{
  const a = make({ savedIds: ['circe'] as never });
  const b = make({ savedIds: ['hail'] as never });
  const ab = mergeProgress(a, b).savedIds.slice().sort().join(',');
  const ba = mergeProgress(b, a).savedIds.slice().sort().join(',');
  check('shelf union order-independent', ab === ba, `${ab} vs ${ba}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
