// Validation of an Optimizer proposal before any generation is spent on it, and
// its conversion into the runner's own challenger record.

import type { Challenger, OptimizerOutput } from "./types.ts";
import { lengthProblems, verifyCandidate, countWords } from "./edits.ts";
import { checkSpans, contradictionProblems, type Span } from "./spans.ts";
import { lintDiff, type LintOptions } from "./lint.ts";

export interface ProposalRules { ceiling: number; maxGrowthFraction: number; userHeading: string; lint: LintOptions; topicWords: string[][] }

export function validateProposal(out: OptimizerOutput, championPrompt: string, championVersion: string, spans: Span[], rules: ProposalRules): string[] {
  const p: string[] = [];
  if (!out || typeof out !== "object") return ["not an object"];
  if (!["propose", "no_change", "escalate"].includes(out.action)) p.push(`action ${out.action} unknown`);
  if (out.parent_prompt_id !== championVersion) p.push(`parent_prompt_id ${out.parent_prompt_id} is not the working champion ${championVersion}`);
  if (out.action !== "propose") {
    if (out.candidate_system_prompt) p.push(`${out.action} must not carry a candidate`);
    if (out.edits?.length) p.push(`${out.action} must not carry edits`);
    if (out.action === "escalate" && !out.next_system_action) p.push("escalate needs next_system_action");
    return p;
  }
  if (!out.kind) p.push("propose needs kind");
  if (!out.hypothesis?.targets?.length) p.push("propose needs at least one target cell");
  if (!out.evidence?.length) p.push("propose needs evidence references");
  const cand = out.candidate_system_prompt ?? "";
  if (!cand.trim()) p.push("candidate_system_prompt empty");
  if (cand.includes(rules.userHeading) || cand.includes("## User's situation") || cand.includes("{{question}}")) p.push("candidate contains the user section; the runner owns it");
  if (cand.trim() === championPrompt.trim()) p.push("candidate identical to the champion");
  p.push(...verifyCandidate(championPrompt, out.edits ?? [], cand));
  p.push(...lengthProblems(championPrompt, cand, rules.ceiling, rules.maxGrowthFraction));
  const sp = checkSpans(cand, spans);
  if (!sp.ok) p.push(`protected spans: missing ${sp.missing.join(", ") || "none"}; duplicated ${sp.duplicated.join(", ") || "none"}`);
  p.push(...contradictionProblems(cand, championPrompt));
  const lint = lintDiff(championPrompt, cand, rules.topicWords, rules.lint);
  if (!lint.ok) p.push(`topicality lint: ${lint.hits.join("; ")}`);
  if (out.kind === "ABLATE" && (out.edits ?? []).some((e) => e.after.trim())) p.push("an ablation adds nothing");
  return p;
}

export function toChallenger(out: OptimizerOutput, version: string, championPrompt: string): Challenger {
  const h = out.hypothesis;
  return {
    version,
    kind: out.kind ?? "REPLACE",
    hypothesis: {
      statement: `${h.problem} — ${h.proposed_change} — expected: ${h.expected_observations.join("; ")} — refuted if: ${h.falsification_condition}`,
      targets: h.targets, expectedDelta: h.expected_delta, mechanism: `${h.cause_type}: ${h.mechanism}`, refutedIf: h.falsification_condition,
    },
    diff: (out.edits ?? []).map((e) => ({ before: e.before, after: e.after })),
    prompt: out.candidate_system_prompt ?? "",
    wordCount: { before: countWords(championPrompt), after: countWords(out.candidate_system_prompt ?? "") },
    risks: [h.regression_risk],
    blocked: out.blocked ?? [],
    changelog: out.change_summary,
  };
}
