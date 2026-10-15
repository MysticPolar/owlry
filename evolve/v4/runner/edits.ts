// Exact-edit contract (from the v4.1 package): a challenger is an ordered list of
// (before → after) replacements; each `before` must occur exactly once in the
// progressively edited prompt, and applying all of them must reproduce the
// candidate byte for byte. This makes every diff auditable and every ledger
// line reproducible; a candidate that cannot be reproduced is rejected before
// any generation is spent on it.

import type { Edit } from "./types.ts";

export interface ApplyResult { ok: boolean; result: string; problems: string[] }

export function applyEdits(base: string, edits: Edit[]): ApplyResult {
  let text = base;
  const problems: string[] = [];
  edits.forEach((e, i) => {
    if (!e.before || !e.before.length) { problems.push(`edit ${i + 1}: before is empty`); return; }
    const first = text.indexOf(e.before);
    if (first < 0) { problems.push(`edit ${i + 1} (${e.operation}): before not found: "${e.before.slice(0, 60)}…"`); return; }
    if (text.indexOf(e.before, first + 1) >= 0) { problems.push(`edit ${i + 1} (${e.operation}): before occurs more than once`); return; }
    if (e.operation === "add" && !e.after.includes(e.before)) problems.push(`edit ${i + 1}: an add must keep its anchor inside after`);
    if (e.operation === "delete" && e.after.trim() !== "") problems.push(`edit ${i + 1}: a delete must have an empty after`);
    text = text.slice(0, first) + e.after + text.slice(first + e.before.length);
  });
  return { ok: problems.length === 0, result: text, problems };
}

/** The candidate must equal the base with the edits applied, modulo trailing whitespace. */
export function verifyCandidate(base: string, edits: Edit[], candidate: string): string[] {
  const a = applyEdits(base, edits);
  if (!a.ok) return a.problems;
  if (a.result.trim() !== (candidate ?? "").trim()) return ["applying the edits to the champion does not reproduce candidate_system_prompt"];
  return [];
}

export function countWords(s: string): number { const t = (s ?? "").trim(); return t ? t.split(/\s+/).length : 0; }

/** Length rules: absolute ceiling and growth per iteration (deletions are always allowed). */
export function lengthProblems(base: string, candidate: string, ceiling: number, maxGrowthFraction: number): string[] {
  const before = countWords(base), after = countWords(candidate);
  const out: string[] = [];
  if (after > ceiling) out.push(`${after} words exceeds the ceiling ${ceiling}`);
  if (after > before && after > Math.floor(before * (1 + maxGrowthFraction))) out.push(`${after} words exceeds the growth allowance (${Math.floor(before * (1 + maxGrowthFraction))} from ${before})`);
  return out;
}
