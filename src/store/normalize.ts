import { CURVE_VERSION, ECONOMY_VERSION } from '../lib/economy/config';
import { legacyTotalXp } from '../lib/economy/curve';
import { derive, emptyDaily, localDay } from '../lib/economy/engine';
import type { BookEarn, DailyCounters, StubRecord } from '../lib/economy/types';
import { SEED } from './seed';
import type {
  PersistedBook,
  PersistedState,
  Prefs,
  ReaderFlow,
  ReaderFont,
  ReaderPrefs,
  ReaderTheme,
} from './types';
import type { EbookFormat, ReadingPosition } from '../lib/ebook/types';
import type { Book, BookRef, Genre } from '../content/types';
import { readingPositionKey } from '../lib/ebook/positionKey';
import { normalizeCopyFingerprint } from '../lib/ebook/fingerprint';

const READER_FONTS = new Set<ReaderFont>(['literata', 'fraunces', 'system']);
const READER_FLOWS = new Set<ReaderFlow>(['scroll', 'page']);
const READER_THEMES = new Set<ReaderTheme>(['paper', 'sepia', 'night']);
const EBOOK_FORMATS = new Set<EbookFormat>(['epub', 'pdf', 'txt', 'fb2', 'mobi', 'azw3']);
const BOOK_GENRES = new Set<Genre>(['history', 'fiction', 'scifi', 'mystery', 'romance', 'life']);
const RESERVED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

const finite = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const cleanString = (value: unknown, cap: number): string | null => {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().slice(0, cap);
  return cleaned || null;
};

const optionalString = (value: unknown, cap: number): string | undefined =>
  cleanString(value, cap) ?? undefined;

/** Validate account-synced open-world metadata before it reaches cover/style UI. */
const normalizeBook = (raw: unknown): Book | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const candidate = raw as Partial<Book>;
  const t = cleanString(candidate.t, 240);
  const a = cleanString(candidate.a, 180);
  const c = cleanString(candidate.c, 16);
  const s = cleanString(candidate.s, 240);
  const q = cleanString(candidate.q, 600);
  const n = finite(candidate.n, -1);
  if (
    !t
    || !a
    || !c
    || !/^#[0-9a-f]{6}$/i.test(c)
    || !s
    || !q
    || !Number.isFinite(n)
    || n < 0
    || !BOOK_GENRES.has(candidate.g as Genre)
  ) return null;

  const book: Book = {
    t,
    a,
    c,
    s,
    q,
    n: Math.floor(n),
    g: candidate.g as Genre,
  };
  const tc = optionalString(candidate.tc, 16);
  if (tc && /^#[0-9a-f]{6}$/i.test(tc)) book.tc = tc;
  const r = optionalString(candidate.r, 16);
  if (r) book.r = r;
  const i = optionalString(candidate.i, 4_000);
  if (i) book.i = i;
  const w = optionalString(candidate.w, 2_000);
  if (w) book.w = w;
  const img = optionalString(candidate.img, 2_048);
  if (img && /^https:\/\//i.test(img)) book.img = img;
  const sub = optionalString(candidate.sub, 300);
  if (sub) book.sub = sub;
  const pub = optionalString(candidate.pub, 300);
  if (pub) book.pub = pub;
  if (
    typeof candidate.rn === 'number'
    && Number.isFinite(candidate.rn)
    && candidate.rn >= 0
    && candidate.rn <= 5
  ) book.rn = candidate.rn;
  if (
    typeof candidate.rc === 'number'
    && Number.isFinite(candidate.rc)
    && candidate.rc >= 0
  ) book.rc = Math.floor(candidate.rc);
  if (
    candidate.rsrc === 'google'
    || candidate.rsrc === 'goodreads'
    || candidate.rsrc === 'openlibrary'
  ) book.rsrc = candidate.rsrc;
  return book;
};

const normalizeLibraryBooks = (raw: unknown): Record<BookRef, PersistedBook> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const books: Record<BookRef, PersistedBook> = {};
  for (const [ref, value] of Object.entries(raw)) {
    if (RESERVED_KEYS.has(ref) || !ref.trim() || ref.length > 160) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const candidate = value as Partial<PersistedBook>;
    const book = normalizeBook(candidate.book);
    const updatedAt = finite(candidate.updatedAt, -1);
    if (!book || updatedAt <= 0) continue;
    books[ref as BookRef] = { book, updatedAt };
  }
  return books;
};

const normalizeReadingPositions = (raw: unknown): Record<string, ReadingPosition> => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const positions: Record<string, ReadingPosition> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (id === '__proto__' || id === 'prototype' || id === 'constructor') continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const candidate = value as Partial<ReadingPosition>;
    if (
      typeof candidate.percent !== 'number'
      || !Number.isFinite(candidate.percent)
      || candidate.percent < 0
      || candidate.percent > 100
      || typeof candidate.updatedAt !== 'number'
      || !Number.isFinite(candidate.updatedAt)
      || candidate.updatedAt <= 0
      || !EBOOK_FORMATS.has(candidate.format as EbookFormat)
    ) continue;

    const secondsRead =
      typeof candidate.secondsRead === 'number'
      && Number.isFinite(candidate.secondsRead)
      && candidate.secondsRead >= 0
        ? candidate.secondsRead
        : 0;
    const bookId = (
      typeof candidate.bookId === 'string'
      && candidate.bookId.trim()
        ? candidate.bookId
        : id
    ) as BookRef;
    const position: ReadingPosition = {
      bookId,
      percent: candidate.percent,
      secondsRead,
      format: candidate.format as EbookFormat,
      updatedAt: candidate.updatedAt,
    };
    if (typeof candidate.copyVersion === 'string' && candidate.copyVersion.trim()) {
      position.copyVersion = candidate.copyVersion;
    }
    const copyFingerprint = normalizeCopyFingerprint(candidate.copyFingerprint);
    if (copyFingerprint) position.copyFingerprint = copyFingerprint;
    if (typeof candidate.cfi === 'string' && candidate.cfi.trim()) position.cfi = candidate.cfi;
    if (typeof candidate.page === 'number' && Number.isFinite(candidate.page) && candidate.page >= 1) {
      position.page = Math.floor(candidate.page);
    }
    if (
      typeof candidate.scroll === 'number'
      && Number.isFinite(candidate.scroll)
      && candidate.scroll >= 0
      && candidate.scroll <= 1
    ) position.scroll = candidate.scroll;
    const key = readingPositionKey(bookId, position.copyVersion);
    if (!positions[key] || positions[key].updatedAt < position.updatedAt) {
      positions[key] = position;
    }
  }
  return positions;
};

const strOrNull = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const strList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

/** a stored day's counters, or a fresh sheet — never SEED's (see the trap below) */
function readDaily(value: unknown): DailyCounters {
  const fresh = emptyDaily(localDay());
  if (!value || typeof value !== 'object') return fresh;
  const d = value as Partial<DailyCounters>;
  if (typeof d.day !== 'string') return fresh;
  return {
    ...fresh,
    ...d,
    day: d.day,
  };
}

function readEarn(value: unknown): Record<string, BookEarn & { mask?: number }> {
  if (!value || typeof value !== 'object') return {};
  const out: Record<string, BookEarn & { mask?: number }> = {};
  for (const [id, mark] of Object.entries(value as Record<string, unknown>)) {
    if (mark && typeof mark === 'object') out[id] = { ...(mark as BookEarn & { mask?: number }) };
  }
  return out;
}

function readStubs(value: unknown): StubRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (s): s is StubRecord => !!s && typeof s === 'object' && typeof (s as StubRecord).id === 'string',
  );
}

/**
 * Hydrate old local/cloud JSON without letting stale preferences undercut
 * reading defaults.
 *
 * THE SPREAD TRAP: this returns `{ ...SEED, ...state }`, so any field the
 * incoming blob is MISSING silently inherits the demo seed — a reader who
 * never played would arrive at row 7 with 240 coins. Every economy field is
 * therefore resolved EXPLICITLY below, read from `state` and defaulted to a
 * neutral value, never left to the spread.
 */
export function normalizePersisted(raw: unknown): PersistedState {
  const state = raw && typeof raw === 'object' ? (raw as Partial<PersistedState>) : {};
  const incomingPrefs =
    state.prefs && typeof state.prefs === 'object'
      ? (state.prefs as Partial<Prefs> & { readerScale?: 'sm' | 'md' | 'lg' })
      : {};
  const incomingReader: Partial<ReaderPrefs> =
    incomingPrefs.reader && typeof incomingPrefs.reader === 'object' ? incomingPrefs.reader : {};
  const legacySize = incomingPrefs.readerScale === 'sm' ? 16 : incomingPrefs.readerScale === 'lg' ? 21 : 18;
  const size = Math.round(finite(incomingReader.size, legacySize));
  const dimmer = finite(incomingReader.dimmer, SEED.prefs.reader.dimmer);

  // curveV is read from the RAW blob (never the spread, which would hand every
  // pre-migration reader the seed's already-migrated stamp). A blob from before
  // the season ledger only carries (lv, xp) on the old flat-400 curve, so its
  // lifetime total is reconstructed once, here.
  const storedCurve = finite(state.curveV, 0);
  const migrated = storedCurve >= CURVE_VERSION && typeof state.totalXp === 'number';
  const totalXp = migrated
    ? Math.max(0, finite(state.totalXp, 0))
    : legacyTotalXp(finite(state.lv, 1), finite(state.xp, 0));
  const d = derive(totalXp);

  return {
    ...SEED,
    ...state,
    readingPositions: normalizeReadingPositions(state.readingPositions),
    libraryBooks: normalizeLibraryBooks(state.libraryBooks),
    prefsUpdatedAt: Math.max(0, finite(state.prefsUpdatedAt, 0)),

    // the level, re-derived from the one number that means anything
    totalXp,
    xp: d.xp,
    xpMax: d.xpMax,
    lv: d.lv,

    // ledger-side fields, every one of them explicit
    daily: readDaily(state.daily),
    earn: readEarn(state.earn),
    stubs: readStubs(state.stubs),
    quoteHashes: strList(state.quoteHashes),
    goods: strList(state.goods),
    streakLastDay: strOrNull(state.streakLastDay),
    darkNightAt: strOrNull(state.darkNightAt),
    inkAt: finite(state.inkAt, 0),
    curveV: CURVE_VERSION,
    economyVersion: ECONOMY_VERSION,

    prefs: {
      ...SEED.prefs,
      ...incomingPrefs,
      reader: {
        font: READER_FONTS.has(incomingReader.font as ReaderFont)
          ? (incomingReader.font as ReaderFont)
          : SEED.prefs.reader.font,
        size: Math.min(24, Math.max(16, size)),
        dimmer: Math.min(1, Math.max(0, dimmer)),
        theme: READER_THEMES.has(incomingReader.theme as ReaderTheme)
          ? (incomingReader.theme as ReaderTheme)
          : SEED.prefs.reader.theme,
        // an inherited flow only sticks if the reader chose it in settings —
        // profiles that never touched the toggle migrate to the seed default
        flow: incomingReader.flowSetByUser && READER_FLOWS.has(incomingReader.flow as ReaderFlow)
          ? (incomingReader.flow as ReaderFlow)
          : SEED.prefs.reader.flow,
        flowSetByUser: incomingReader.flowSetByUser === true,
      },
    },
  };
}
