import { SEED } from './seed';
import type { PersistedState, Prefs, ReaderFlow, ReaderFont, ReaderPrefs } from './types';
import type { EbookFormat, ReadingPosition } from '../lib/ebook/types';
import type { BookRef } from '../content/types';
import { readingPositionKey } from '../lib/ebook/positionKey';

const READER_FONTS = new Set<ReaderFont>(['literata', 'fraunces', 'system']);
const READER_FLOWS = new Set<ReaderFlow>(['scroll', 'page']);
const EBOOK_FORMATS = new Set<EbookFormat>(['epub', 'pdf', 'txt', 'fb2', 'mobi', 'azw3']);

const finite = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

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

/** Hydrate old local/cloud JSON without allowing stale preferences to undercut reading defaults. */
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

  return {
    ...SEED,
    ...state,
    readingPositions: normalizeReadingPositions(state.readingPositions),
    prefsUpdatedAt: Math.max(0, finite(state.prefsUpdatedAt, 0)),
    prefs: {
      ...SEED.prefs,
      ...incomingPrefs,
      reader: {
        font: READER_FONTS.has(incomingReader.font as ReaderFont)
          ? (incomingReader.font as ReaderFont)
          : SEED.prefs.reader.font,
        size: Math.min(24, Math.max(16, size)),
        dimmer: Math.min(1, Math.max(0, dimmer)),
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
