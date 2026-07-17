// ============================================================
// owlry — post-parse business-rule validation.
//
// LETTER_SCHEMA now states the array-length rules ("at least 3 insights",
// "exactly 3 further reads") to Gemini directly, but schema conformance
// is not a guarantee and says nothing about the rules a schema can't
// express — that a string is non-empty rather than "". So this stays as
// the code-side check after JSON.parse, mirroring src/lib/owlContract.ts's
// validateLetter on the client. A malformed reply here is treated the
// same as a generation failure (502) — it is never cached or persisted.
// ============================================================
import type { LetterWire } from './schemas.ts';

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export function isValidLetterWire(v: unknown): v is LetterWire {
  if (!v || typeof v !== 'object') return false;
  const l = v as Record<string, unknown>;
  if (!isNonEmptyString(l.res) || !isNonEmptyString(l.chap) || !isNonEmptyString(l.core) || !isNonEmptyString(l.close)) return false;
  if (!Array.isArray(l.ins) || l.ins.length < 3) return false;
  if (!Array.isArray(l.take) || l.take.length < 1) return false;
  if (!Array.isArray(l.ask) || l.ask.length < 1) return false;
  if (!Array.isArray(l.fr) || l.fr.length !== 3) return false;
  return l.ins.every((n) => {
    if (!n || typeof n !== 'object') return false;
    const i = n as Record<string, unknown>;
    return isNonEmptyString(i.t) && isNonEmptyString(i.r) && isNonEmptyString(i.ex);
  });
}
