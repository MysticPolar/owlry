import { normalizeCopyFingerprint } from './fingerprint';
import type { ReadingPosition } from './types';

const compareText = (a: string, b: string): number => (
  a < b ? -1 : a > b ? 1 : 0
);

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => compareText(a, b))
      .map(([key, child]) => [key, canonical(child)]),
  );
};

const normalizedTieValue = (position: ReadingPosition): ReadingPosition => {
  const copyFingerprint = normalizeCopyFingerprint(position.copyFingerprint);
  const normalized = { ...position };
  if (copyFingerprint) normalized.copyFingerprint = copyFingerprint;
  else delete normalized.copyFingerprint;
  return normalized;
};

/**
 * Total order for competing writes to one exact book-copy position slot.
 * A positive value means `candidate` wins over `current`.
 *
 * Fingerprint-only migration must not alter reading recency, so a valid content
 * identity wins an equal-clock tie before the canonical payload tie-break.
 */
export const compareReadingPositionWrites = (
  candidate: ReadingPosition,
  current: ReadingPosition,
): number => {
  if (candidate.updatedAt !== current.updatedAt) {
    return candidate.updatedAt > current.updatedAt ? 1 : -1;
  }

  const candidateHasFingerprint =
    normalizeCopyFingerprint(candidate.copyFingerprint) !== undefined;
  const currentHasFingerprint =
    normalizeCopyFingerprint(current.copyFingerprint) !== undefined;
  if (candidateHasFingerprint !== currentHasFingerprint) {
    return candidateHasFingerprint ? 1 : -1;
  }

  return compareText(
    JSON.stringify(canonical(normalizedTieValue(candidate))),
    JSON.stringify(canonical(normalizedTieValue(current))),
  );
};
