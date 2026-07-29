import {
  fingerprintEbookCopy,
  normalizeCopyFingerprint,
  sameEbookContent,
} from '../src/lib/ebook/fingerprint';
import {
  clearGuestEbookSession,
  loadPosition,
  loadUpload,
  savePosition,
  saveUpload,
} from '../src/lib/ebook/storage';

let pass = 0;
let fail = 0;

function check(label: string, condition: boolean, detail = '') {
  if (condition) {
    pass += 1;
    console.log(`  ok  ${label}`);
  } else {
    fail += 1;
    console.log(`FAIL  ${label}  ${detail}`);
  }
}

const ABC_SHA256 =
  'sha256:ba7816bf8f01cfea414140de5dae2223'
  + 'b00361a396177a9cb410ff61f20015ad';

const first = await fingerprintEbookCopy(new Blob(['abc'], { type: 'application/epub+zip' }));
const sameBytes = await fingerprintEbookCopy(new Blob(['abc'], { type: 'text/plain' }));
const different = await fingerprintEbookCopy(new Blob(['abd']));

check('known SHA-256 vector', first === ABC_SHA256, first);
check('MIME/name do not affect byte identity', sameBytes === first, sameBytes);
check('different bytes get a different identity', different !== first, different);
check(
  'persisted uppercase fingerprints normalize',
  normalizeCopyFingerprint(`  ${ABC_SHA256.toUpperCase()}  `) === ABC_SHA256,
);
check('legacy missing fingerprint stays absent', normalizeCopyFingerprint(undefined) === undefined);
check('malformed fingerprint is rejected', normalizeCopyFingerprint('sha256:not-a-digest') === undefined);
check('normalized identical fingerprints match', sameEbookContent(first, first.toUpperCase()));
check('missing legacy fingerprints never match', !sameEbookContent(undefined, undefined));

clearGuestEbookSession();
const legacyBlob = new Blob(['legacy ebook bytes'], { type: 'application/epub+zip' });
await saveUpload('legacy-fingerprint-smoke', legacyBlob, {
  kind: 'local',
  format: 'epub',
  title: 'Legacy copy',
  author: 'Owlry',
  sourceLabel: 'Test upload',
  copyVersion: 'legacy-copy-version',
  copySelectedAt: 1,
}, { owner: 'guest' });
const backfilled = await loadUpload('legacy-fingerprint-smoke', 'guest');
const reopened = await loadUpload('legacy-fingerprint-smoke', 'guest');
check(
  'legacy guest load computes a fingerprint',
  sameEbookContent(
    backfilled?.source.copyFingerprint,
    await fingerprintEbookCopy(legacyBlob),
  ),
);
check(
  'legacy guest fingerprint persists for the next open',
  sameEbookContent(
    reopened?.source.copyFingerprint,
    backfilled?.source.copyFingerprint,
  ),
);
clearGuestEbookSession();

const positionBookId = 'position-lww-smoke';
const positionVersion = 'position-copy-version';
const positionBlob = new Blob(['position ebook bytes'], { type: 'application/epub+zip' });
const positionFingerprint = await fingerprintEbookCopy(positionBlob);
await saveUpload(positionBookId, positionBlob, {
  kind: 'local',
  format: 'epub',
  title: 'Position copy',
  author: 'Owlry',
  sourceLabel: 'Test upload',
  copyVersion: positionVersion,
  copyFingerprint: positionFingerprint,
  copySelectedAt: 2,
}, { owner: 'guest', resetPosition: true });
const newerPosition = {
  bookId: positionBookId,
  percent: 74,
  cfi: 'epubcfi(/6/20)',
  secondsRead: 90,
  format: 'epub' as const,
  copyVersion: positionVersion,
  copyFingerprint: positionFingerprint,
  updatedAt: 800,
};
await savePosition(newerPosition, 'guest');
const staleAccepted = await savePosition({
  ...newerPosition,
  percent: 12,
  cfi: 'epubcfi(/6/4)',
  updatedAt: 700,
}, 'guest');
const afterStale = await loadPosition(positionBookId, 'guest');
check(
  'guest stale same-version save cannot regress a newer anchor',
  staleAccepted
    && afterStale?.percent === newerPosition.percent
    && afterStale.cfi === newerPosition.cfi,
  JSON.stringify(afterStale),
);

clearGuestEbookSession();
await saveUpload(positionBookId, positionBlob, {
  kind: 'local',
  format: 'epub',
  title: 'Position copy',
  author: 'Owlry',
  sourceLabel: 'Test upload',
  copyVersion: positionVersion,
  copyFingerprint: positionFingerprint,
  copySelectedAt: 3,
}, { owner: 'guest', resetPosition: true });
const legacyPosition = {
  ...newerPosition,
  copyFingerprint: undefined,
  updatedAt: 900,
};
await savePosition(legacyPosition, 'guest');
await savePosition({
  ...legacyPosition,
  copyFingerprint: positionFingerprint,
}, 'guest');
await savePosition({
  ...legacyPosition,
  percent: 99,
  cfi: 'epubcfi(/6/99)',
}, 'guest');
const afterEqualClock = await loadPosition(positionBookId, 'guest');
check(
  'guest equal-clock save prefers fingerprint enrichment before payload tie',
  afterEqualClock?.copyFingerprint === positionFingerprint
    && afterEqualClock.percent === legacyPosition.percent
    && afterEqualClock.cfi === legacyPosition.cfi,
  JSON.stringify(afterEqualClock),
);
clearGuestEbookSession();

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
