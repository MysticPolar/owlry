// ============================================================
// owlry — The Council Room: the verbatim-quote rule, enforced.
//
// The house rule (AGENTS.md): only a figure's verified `quotes` may render
// as quotation, and they must be verbatim with a source. The model is told
// this, but a schema cannot check it, so every "quote" segment that comes
// back is matched against the dossier the client sent. A match is replaced
// by the canonical text + source; anything else is demoted to plain text
// (still the figure's paraphrase, just not shown as their words).
//
// A dossier quote can itself come from the model (council-chat mode
// "figure" recalls a thinker's lines from training data). Those are
// matched the same way — the council may copy them — but the segment that
// comes out carries `attributed: true`, and the client labels it so. The
// word "verbatim" stays reserved for the curated catalogue.
//
// Every line leaves the gate with a clean `to` (the seats it addresses by
// name): whole numbers 0–2, each once, ascending, never the speaker's own
// seat — [] when it speaks to the reader. Whatever the model sent there,
// the client can draw "X to Y" from it without checking. It is also held
// to the words: a line that answers a seat its text never names, while
// naming another, is relabelled to the seat it names (`answered`).
// ============================================================
import type { WireLine, WireSegment } from './schemas.ts';

export interface DossierQuote {
  text: string;
  source: { work: string; loc?: string; url?: string };
  /** where the words were checked: the curated catalogue (the default), or recalled by the model and unverified */
  provenance?: 'curated' | 'model';
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
  const out: WireSegment = { kind: 'quote', text: hit.text, source: { work: hit.source.work, loc: hit.source.loc ?? null } };
  if (hit.provenance === 'model') out.attributed = true;
  return out;
}

/** the seats a line addresses, made safe: whole numbers 0–2, unique, ascending, never the speaker's own seat */
export function addressees(raw: unknown, seat: number): number[] {
  if (!Array.isArray(raw)) return [];
  const seats = raw.filter((s): s is number => Number.isInteger(s) && s >= 0 && s <= 2 && s !== seat);
  return [...new Set(seats)].sort((a, b) => a - b);
}

const HAN = /\p{Script=Han}/u;
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The other seats a line names in its own words — a seat's short name or full name in the line's text
 * segments (a quote is the speaker's published words, not an address). Longest names first, each match
 * used once, so "William James" is not also read as a seat called "James". Latin names match as whole
 * words, case-sensitive; a Chinese name matches anywhere. A rendering the dossier does not use ("奥勒留"
 * for "马可") is simply not found — this can confirm an addressee, never prove there is none.
 */
export function named(segments: WireSegment[], seat: number, dossiers: Dossier[]): number[] {
  let text = segments.filter((s) => s.kind === 'text').map((s) => s.text).join('\n');
  if (!text) return [];
  const names = dossiers
    .flatMap((d, i) => [d.short, d.name].map((n) => ({ seat: i, n: (n ?? '').trim() })))
    .filter((x) => [...x.n].length >= 2)
    .sort((a, b) => [...b.n].length - [...a.n].length);
  const found = new Set<number>();
  for (const { seat: s, n } of names) {
    const re = HAN.test(n)
      ? new RegExp(escapeRe(n), 'gu')
      : new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])${escapeRe(n)}(?![\\p{L}\\p{M}\\p{N}])`, 'gu');
    let hit = false;
    text = text.replace(re, (m) => {
      hit = true;
      return ' '.repeat(m.length);
    });
    if (hit && s !== seat) found.add(s);
  }
  return [...found].sort((a, b) => a - b);
}

/**
 * Whom a line answers, checked against its words. A line to the reader ([]) stays so — it may mention the
 * others without answering them. A line that answers someone keeps the model's seats when its words name at
 * least one of them, plus any other seat they name; when its words name none of them but do name another
 * seat, the words win. When the words name no seat at all, the model's `to` stands.
 */
export function answered(to: number[], said: number[]): number[] {
  if (!to.length || !said.length) return to;
  if (!to.some((s) => said.includes(s))) return said;
  return [...new Set([...to, ...said])].sort((a, b) => a - b);
}

/** apply the rule to every line; drops empty segments and lines for unknown seats, keeps a clean `to` checked
 *  against the names in the words */
export function enforceQuotes(lines: WireLine[], dossiers: Dossier[]): WireLine[] {
  const out: WireLine[] = [];
  for (const line of lines) {
    const d = dossiers[line.seat];
    if (!d || !Array.isArray(line.segments)) continue;
    const segments = line.segments
      .filter((s) => !!s && typeof s.text === 'string' && s.text.trim())
      .map((s) => canonical({ ...s, text: s.text.trim() }, d.quotes));
    if (!segments.length) continue;
    const to = answered(addressees(line.to, line.seat), named(segments, line.seat, dossiers));
    out.push({ seat: line.seat, to, segments });
  }
  return out;
}
