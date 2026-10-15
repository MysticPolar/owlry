// Build the Option-1 control prompts: each round-12 v2 prompt with the v0 citation plumbing (the plain "Basis: Author,
// Book" format, the no-browsing/no-verification wording and the per-line quotation check that Gemini v0 carries), so that
// a control run v0 vs v2-plain measures the content edits of rounds 1-12 rather than the citation format the gate's
// critical checks reject. Every change is an exact replacement that must match once; nothing else in v2 is touched.
//
//   deno run -A evolve/v4/tools/make_plain_controls.ts        (from the repository root)
//
// Writes prompts/castDebate.{gemini,sonnet}.v2-plain.md and prints the replacements, the word counts and the span check.

import { checkSpans } from "../runner/spans.ts";
import { countWords } from "../runner/edits.ts";

const P = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/\/$/, "");
const HEADING = "## User’s situation";
const spans = JSON.parse(await Deno.readTextFile(`${P}/seeds/protected-spans.json`));
const span = (lin: string, id: string) => (spans[lin].protected_spans as { id: string; text: string }[]).find((s) => s.id === id)!.text;
const read = (f: string) => Deno.readTextFile(`${P}/prompts/${f}`);
const sys = (t: string) => t.slice(0, t.indexOf(HEADING)).trim();

// The plumbing is defined by the two v0 files: Gemini v0 is Sonnet v0 plus exactly these line changes.
const sonnetV0 = (await read("castDebate.sonnet.v0.md")).split("\n"), geminiV0 = (await read("castDebate.gemini.v0.md")).split("\n");
if (sonnetV0.length !== geminiV0.length) throw new Error("v0 files differ in line count; the plumbing is not a line-for-line change");
const plumbing: [string, string][] = sonnetV0.map((l, i) => [l, geminiV0[i]] as [string, string]).filter(([a, b]) => a !== b);
// two adjacent changed lines (the basis instruction and its example) are one replacement
const merged: [string, string][] = [];
for (const [a, b] of plumbing) {
  const last = merged[merged.length - 1];
  if (last && sonnetV0.indexOf(a) === sonnetV0.indexOf(last[0].split("\n").pop()!) + 1) { last[0] += "\n" + a; last[1] += "\n" + b; }
  else merged.push([a, b]);
}

// Gemini v2 descends from v11, whose citation passages were reworded in rounds 1-11; its replacements are explicit.
const QUOTE_EXTRA = "When `pd` is false, the `text` field contains no quotation marks of any kind: a suggested sentence or a borrowed label is written as reported speech (they could say they need a week to decide).";
const geminiPairs: [string, string][] = [
  ["Verified means you read the passage in this session; otherwise cite author and book only and paraphrase without quotation marks.",
    "You cannot browse or open any book in this session, so cite only at the level you can defend from memory: the author and the book, never a chapter, section, page, letter number or link."],
  ["Every speaking turn must include a concise reference to its supporting book and, when verified, the relevant chapter or section. Put this reference in the final `basis` field:\n[Basis: Author, Book, section](verified URL)",
    span("gemini", "basis_plumbing")],
  // the quotation rule returns verbatim (its "read this session" wording was the old loop's verification plumbing);
  // v2's own addition about reported speech stays, after the rule
  ["1. Book published before 1931: quote its exact words only if you read them this session; otherwise paraphrase. Keep quotations brief. For a translated or revised text, also verify that the edition supplying the quoted wording was published before 1931.\n2. Book published in 1931 or later: do not quote. Express the idea naturally in your own words and name the author and book in the accompanying fields and reference. " + QUOTE_EXTRA,
    span("gemini", "quotation_rule") + " " + QUOTE_EXTRA],
  ["Never invent quotations, references, links, or page numbers. Continue without requesting user input.",
    "Never invent quotations, references, links, or page numbers. Nothing in this session is verified, so paraphrase, attribute only what you can responsibly attribute, and do not imply that anything was checked. Continue without requesting user input."],
  ['"basis":"[Basis: Author, Book, verified section if available](verified URL)"}', '"basis":"Basis: Author, Book"}'],
  ["Omit unverified chapter or section details. If no URL can be verified, use a plain-text basis with the author and book and briefly state that the source was not verified; do not fabricate a link.",
    "The `basis` is always the plain text Basis: Author, Book, with no section and no link."],
  ["Check each line before writing the next: when `pd` is false, `text` contains no quotation marks of any kind, not even around one word; when `pd` is true,",
    span("gemini", "per_turn_quote_check") + " Also, when `pd` is true,"],
];

function apply(name: string, text: string, pairs: [string, string][]): string {
  let out = text;
  for (const [before, after] of pairs) {
    const n = out.split(before).length - 1;
    if (n !== 1) throw new Error(`${name}: expected the passage once, found ${n}: ${before.slice(0, 80)}…`);
    out = out.replace(before, after);
  }
  return out;
}

const report: string[] = [];
for (const [lin, pairs] of [["sonnet", merged], ["gemini", geminiPairs]] as [string, [string, string][]][]) {
  const v2 = await read(`castDebate.${lin}.v2.md`);
  const plain = apply(lin, v2, pairs);
  await Deno.writeTextFile(`${P}/prompts/castDebate.${lin}.v2-plain.md`, plain);
  const own = checkSpans(sys(plain), spans[lin].protected_spans), gem = checkSpans(sys(plain), spans.gemini.protected_spans);
  report.push(`${lin}: v2 ${countWords(sys(v2))} words -> v2-plain ${countWords(sys(plain))} words; ${pairs.length} replacements; ` +
    `${lin} spans missing [${own.missing.join(", ")}]; plain-citation spans missing [${gem.missing.filter((m) => ["basis_plumbing", "format_line", "per_turn_quote_check", "quotation_rule"].includes(m)).join(", ")}]`);
}
console.log(report.join("\n"));
