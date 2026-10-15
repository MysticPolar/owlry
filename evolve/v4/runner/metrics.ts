// Deterministic form metrics and structural validity for one debate.
// These replace "detect mechanical compliance" as an evaluator judgment with
// counts the runner can compute for free, log per transcript, feed to the
// Optimizer, and use in the gate's critical checks.

import type { Debate, FormMetrics, Validity } from "./types.ts";

export interface MetricOptions {
  canBrowse: boolean;
  wordsMin: number;   // 25
  wordsMax: number;   // 65
  turnsMin: number;   // 9
  turnsMax: number;   // 12
  pdCutoff: number;   // 1931
}

const HEDGE = /\b(?:maybe|perhaps|might|if)\b/gi;
const BANNED = /\b(?:must|clearly|always|obviously)\b/gi;
// "The Minimalist mentions …", "The Physical Theorist claims …", "The Stoic argues that …"
const TEMPLATED = /^(?:The [A-Z][\w'’\- ]{2,40}?) (?:mentions|notes|says|claims|argues|suggests|states|insists|proposes|assumes|treats|frames|calls|points out|said|argued|suggested|claimed|attributes|disputes|dismisses)\b/;
// rote fillings of the old slot system
const SLOT = /\b(?:I (?:drop|dropped|now hold|let go of|withdraw)|dropping the claim|the narrower claim|re-?read(?:ing)? (?:the|that|chapter|my)|which (?:matters|do you value|do you prize) more|if you value (?:the )?\w+ (?:mechanism|more))\b/i;
// double quotes, curly single quotes, or a straight single quote not inside a word (so don't / it's are ignored)
const QUOTE = /["“”‘’]|(?<![A-Za-z])'|'(?![A-Za-z])/;
// chapter / section / page / letter / numbered-passage / link markers in a basis
const FAB_BASIS = /\b(?:chapter|chap\.|ch\.|section|sect\.|§|part\s+[ivx\d]+|book\s+[ivx\d]+|letters?\s+\d+|p\.\s?\d+|pp\.\s?\d+|\d+\.\d+)\b|https?:\/\/|\]\(/i;
// disclaimers that name a marker only to say there is none ("section not verified, no link provided",
// "so no link or section is given") are removed before the test: they cite nothing
const BASIS_DISCLAIMER = /\b(?:no|not|without|never)\s+(?:a\s+|any\s+)?(?:links?|urls?|sections?|chapters?|pages?)(?:\s+(?:or|and|nor)\s+(?:a\s+|any\s+)?(?:links?|urls?|sections?|chapters?|pages?))*\b|\b(?:sections?|chapters?|pages?|links?|urls?)\s+(?:(?:was|were|is|are)\s+)?(?:not\s+verified|unverified|not\s+given|not\s+provided|omitted)\b/gi;
export function fabricatedBasis(basis: string): boolean { return FAB_BASIS.test((basis ?? "").replace(BASIS_DISCLAIMER, " ")); }

export function countWords(s: string): number {
  const t = (s ?? "").trim();
  return t ? t.split(/\s+/).length : 0;
}

export function formMetrics(d: Debate, o: MetricOptions): FormMetrics {
  const turns = Array.isArray(d?.debate) ? d.debate : [];
  const texts = turns.map((t) => t?.text ?? "");
  const wordsPer = texts.map(countWords);
  const words = wordsPer.reduce((a, b) => a + b, 0);
  const count = (re: RegExp, s: string) => (s.match(re) ?? []).length;

  const hedges = texts.reduce((n, s) => n + count(HEDGE, s), 0);
  const bannedCertainty = texts.reduce((n, s) => n + count(BANNED, s), 0);
  const templatedOpeners = texts.filter((s) => TEMPLATED.test(s.trim())).length;
  const slotMarkers = texts.filter((s) => SLOT.test(s)).length;
  const questionsToUser = texts.filter((s) => s.includes("?") && /\byou\b/i.test(s)).length;
  const theUser = texts.reduce((n, s) => n + count(/\bthe user\b/gi, s), 0);
  const pdFalseQuoteTurns = turns.filter((t) => t && t.pd === false && QUOTE.test(t.text ?? "")).length;
  const fabricatedBasisTurns = o.canBrowse ? 0 : turns.filter((t) => fabricatedBasis(t?.basis ?? "")).length;
  const distinctSpeakers = new Set(turns.map((t) => (t?.speaker ?? "").trim())).size;
  const distinctBooks = new Set(turns.map((t) => `${t?.author ?? ""}|${t?.book ?? ""}`)).size;

  return {
    turns: turns.length,
    words,
    meanWordsPerTurn: turns.length ? round2(words / turns.length) : 0,
    shortTurns: wordsPer.filter((w) => w < o.wordsMin).length,
    longTurns: wordsPer.filter((w) => w > o.wordsMax).length,
    hedges,
    hedgeDensity: words ? round2((hedges / words) * 100) : 0,
    bannedCertainty,
    templatedOpeners,
    slotMarkers,
    questionsToUser,
    theUser,
    pdFalseQuoteTurns,
    fabricatedBasisTurns,
    distinctSpeakers,
    distinctBooks,
  };
}

export function validity(d: Debate, o: MetricOptions): Validity {
  const problems: string[] = [];
  if (!d || typeof d !== "object") return { ok: false, problems: ["not an object"] };
  for (const k of ["situation", "clearer", "dependsOn"] as const) {
    if (typeof d[k] !== "string" || !d[k].trim()) problems.push(`${k} missing`);
  }
  const minds = Array.isArray(d.minds) ? d.minds : [];
  if (minds.length !== 3) problems.push(`minds: ${minds.length}, expected 3`);
  const titles = new Set(minds.map((m) => (m?.title ?? "").trim()));
  if (titles.size !== minds.length) problems.push("mind titles not distinct");
  for (const m of minds) {
    if (!m?.title || !m?.author || !m?.book) problems.push(`mind incomplete: ${JSON.stringify(m?.title ?? "?")}`);
    if (typeof m?.year !== "number" || !Number.isFinite(m.year)) problems.push(`year missing for ${m?.title ?? "?"}`);
  }
  const turns = Array.isArray(d.debate) ? d.debate : [];
  if (turns.length < o.turnsMin || turns.length > o.turnsMax) problems.push(`turns: ${turns.length}, expected ${o.turnsMin}-${o.turnsMax}`);
  const yearOf = new Map(minds.map((m) => [`${m?.author}|${m?.book}`, m?.year] as const));
  turns.forEach((t, i) => {
    const n = i + 1;
    for (const k of ["speaker", "text", "author", "book", "basis"] as const) {
      if (typeof t?.[k] !== "string" || !t[k].trim()) problems.push(`turn ${n}: ${k} missing`);
    }
    if (typeof t?.pd !== "boolean") problems.push(`turn ${n}: pd not boolean`);
    if (t?.speaker && !titles.has(t.speaker.trim())) problems.push(`turn ${n}: speaker not one of the three minds`);
    const y = yearOf.get(`${t?.author}|${t?.book}`);
    if (y === undefined) problems.push(`turn ${n}: author/book not one of the three minds`);
    else if (typeof t?.pd === "boolean" && (y < o.pdCutoff) !== t.pd) problems.push(`turn ${n}: pd=${t.pd} but year ${y}`);
  });
  return { ok: problems.length === 0, problems };
}

export function meanMetrics(list: FormMetrics[]): FormMetrics {
  const keys = Object.keys(list[0] ?? {}) as (keyof FormMetrics)[];
  const out = {} as FormMetrics;
  for (const k of keys) {
    const v = list.reduce((a, m) => a + (m[k] as number), 0) / Math.max(1, list.length);
    (out as unknown as Record<string, number>)[k] = round2(v);
  }
  return out;
}

export function round2(x: number): number { return Math.round(x * 100) / 100; }
