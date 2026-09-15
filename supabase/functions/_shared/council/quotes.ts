// ============================================================
// owlry — The Council Room: the verbatim-quote rule, enforced.
//
// The house rule (AGENTS.md): only a figure's verified `quotes` may render
// as quotation, and they must be verbatim with a source. The model is told
// this, but a schema cannot check it, so every "quote" segment that comes
// back is matched against the dossier the client sent. A match is replaced
// by the canonical text + source; anything else is demoted to plain text
// (still the figure's paraphrase, just not shown as their words).
// ============================================================
import type { WireLine, WireSegment } from './schemas.ts';

export interface DossierQuote {
  text: string;
  source: { work: string; loc?: string; url?: string };
}

export interface Dossier {
  id: string;
  name: string;
  short: string;
  role: string;
  label: string;
  bio: string;
  works: { title: string; year: string }[];
  quotes: DossierQuote[];
  bookId: string;
  bookTitle: string;
}

/** loose equality for a quotation: case, spacing, curly vs straight quotes and outer punctuation don't count */
export function normalizeQuote(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^["'\s.,;:!?-]+|["'\s.,;:!?-]+$/g, '')
    .trim();
}

function canonical(seg: WireSegment, quotes: DossierQuote[]): WireSegment {
  if (seg.kind !== 'quote') return { kind: 'text', text: seg.text, source: null };
  const want = normalizeQuote(seg.text);
  const hit = want ? quotes.find((q) => normalizeQuote(q.text) === want) : undefined;
  if (!hit) return { kind: 'text', text: seg.text, source: null };
  return { kind: 'quote', text: hit.text, source: { work: hit.source.work, loc: hit.source.loc ?? null } };
}

/** apply the rule to every line; drops empty segments and lines for unknown seats */
export function enforceQuotes(lines: WireLine[], dossiers: Dossier[]): WireLine[] {
  const out: WireLine[] = [];
  for (const line of lines) {
    const d = dossiers[line.seat];
    if (!d) continue;
    const segments = line.segments
      .filter((s) => typeof s.text === 'string' && s.text.trim())
      .map((s) => canonical({ ...s, text: s.text.trim() }, d.quotes));
    if (segments.length) out.push({ seat: line.seat, segments });
  }
  return out;
}
