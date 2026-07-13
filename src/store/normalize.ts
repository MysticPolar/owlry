import { SEED } from './seed';
import type { PersistedState, Prefs, ReaderFlow, ReaderFont, ReaderPrefs } from './types';

const READER_FONTS = new Set<ReaderFont>(['literata', 'fraunces', 'system']);
const READER_FLOWS = new Set<ReaderFlow>(['scroll', 'page']);

const finite = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

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
    prefs: {
      ...SEED.prefs,
      ...incomingPrefs,
      reader: {
        font: READER_FONTS.has(incomingReader.font as ReaderFont)
          ? (incomingReader.font as ReaderFont)
          : SEED.prefs.reader.font,
        size: Math.min(24, Math.max(16, size)),
        dimmer: Math.min(1, Math.max(0, dimmer)),
        flow: READER_FLOWS.has(incomingReader.flow as ReaderFlow)
          ? (incomingReader.flow as ReaderFlow)
          : SEED.prefs.reader.flow,
      },
    },
  };
}
