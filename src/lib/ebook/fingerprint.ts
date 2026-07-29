/*
 * Stable identity for the bytes of one uploaded ebook.
 *
 * `copyVersion` remains the identity/order of a particular file-selection
 * event. The fingerprint is deliberately separate: two selections on different
 * devices can have different versions while still referring to byte-identical
 * content. That lets the reader preserve an exact anchor only when it is safe.
 */

const SHA256_PREFIX = 'sha256:';
const SHA256_HEX = /^[0-9a-f]{64}$/;

/** Normalize a persisted/cloud value without trusting arbitrary metadata. */
export function normalizeCopyFingerprint(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const candidate = value.trim().toLowerCase();
  if (!candidate.startsWith(SHA256_PREFIX)) return undefined;
  const hex = candidate.slice(SHA256_PREFIX.length);
  return SHA256_HEX.test(hex) ? `${SHA256_PREFIX}${hex}` : undefined;
}

/** Missing legacy fingerprints never count as a match. */
export function sameEbookContent(a: unknown, b: unknown): boolean {
  const left = normalizeCopyFingerprint(a);
  return !!left && left === normalizeCopyFingerprint(b);
}

/** Compute a content-stable SHA-256 identity entirely on the user's device. */
export async function fingerprintEbookCopy(blob: Blob): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Secure file fingerprinting is unavailable in this browser.');
  }
  const digest = new Uint8Array(
    await subtle.digest('SHA-256', await blob.arrayBuffer()),
  );
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${SHA256_PREFIX}${hex}`;
}
