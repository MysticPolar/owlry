// Builders for the three agent inputs. Each returns the full text of the file an
// agent is pointed at (a subagent reads a file; an API adapter sends the same
// text as the user message). What is left OUT is the point:
//   rubric input:  no version, lane, prompt, score, or other debate
//   blind input:   no version, lane, prompt, scores, or "which is newer"
//   optimizer:     everything about Set A for its own lineage, the other
//                  lineage's numbers only, nothing about Set B

import type { Challenger, Debate, FormMetrics, LedgerEntry, Question, RubricCard, Symptom } from "./types.ts";
import { meanMetrics } from "./metrics.ts";
import { pointsLost } from "./scoring.ts";

function debateText(d: Debate): string {
  const minds = d.minds.map((m, i) => `${i + 1}. ${m.title} — ${m.concern} (${m.author}, ${m.book}, ${m.year})`).join("\n");
  const turns = d.debate.map((t, i) => `Turn ${i + 1} — ${t.speaker} [${t.author}, ${t.book}; pd=${t.pd}; ${t.basis}]\n${t.text}`).join("\n\n");
  return `A. SITUATION\n${d.situation}\n\nB. MINDS\n${minds}\n\nC. DEBATE\n${turns}\n\nD. WHAT BECAME CLEARER\n${d.clearer}\n\nE. WHAT THE CHOICE DEPENDS ON\n${d.dependsOn}`;
}

export interface DeterministicCheck { check: string; location: string; status: "pass" | "fail" | "info"; observed: string; expected: string }

export function buildRubricInput(brief: string, q: Question, d: Debate, canBrowse: boolean, checks: DeterministicCheck[] = []): string {
  return [
    brief.trim(),
    "",
    "=== THE USER'S SITUATION ===",
    q.text,
    ...(q.conversation_history?.length ? ["", "=== CONVERSATION HISTORY ===", ...q.conversation_history] : []),
    "",
    `=== QUESTION TYPE ===\n${q.type}${q.intent ? ` (${q.intent})` : ""}`,
    "",
    `=== WORKER NOTE ===\nThe worker ${canBrowse ? "could" : "could not"} browse or open any source in this session. No source evidence is attached; treat every external attribution as unverified unless the transcript itself contradicts it.`,
    "",
    "=== DETERMINISTIC CHECKS (facts the runner computed; not quality judgments) ===",
    checks.length ? checks.map((c) => `${c.status.toUpperCase()} ${c.check} @ ${c.location}: observed ${c.observed}, expected ${c.expected}`).join("\n") : "none",
    "",
    "=== THE DEBATE ===",
    debateText(d),
    "",
    "Return the JSON object described in the brief, and nothing else.",
  ].join("\n");
}

export function buildBlindInput(brief: string, q: Question, a: Debate, b: Debate): string {
  return [
    brief.trim(),
    "",
    "=== THE USER'S SITUATION ===",
    q.text,
    ...(q.conversation_history?.length ? ["", "=== CONVERSATION HISTORY ===", ...q.conversation_history] : []),
    "",
    `=== QUESTION TYPE ===\n${q.type}`,
    "",
    "=== DEBATE A ===",
    debateText(a),
    "",
    "=== DEBATE B ===",
    debateText(b),
    "",
    "Return the JSON object described in the brief, and nothing else.",
  ].join("\n");
}

export interface ChampionResult {
  q: Question;
  samples: { sample: number; jobId: string; debate: Debate; card: RubricCard; metrics: FormMetrics }[];
}

export interface OptimizerContext {
  brief: string;                 // roles/optimizer.md with {{LANE_PROFILE}} substituted
  lineage: string;
  championVersion: string;
  championStatus: string;        // "working champion" | "working champion restored after a failed validation"
  championPrompt: string;        // system part only
  protectedSpans: { id: string; text: string }[];
  results: ChampionResult[];     // one per Set A question
  ledger: LedgerEntry[];         // oldest first
  banned: { target: string; until: number }[];
  budget: { ceiling: number; maxGrowthFraction: number; wordsNow: number; ablationIteration: boolean };
  capabilityReference?: string;  // numbers-only block from capability.ts, or undefined
  parentResetNotice?: string;    // generic notice after a rollback; never a Set B detail
  nextVersion: string;
}

export function recurringSymptoms(results: ChampionResult[], minQuestions = 3): { cell: string; questions: number; lines: string[] }[] {
  const byCell = new Map<string, { qs: Set<number>; lines: string[] }>();
  for (const r of results) for (const s of r.samples) for (const sy of s.card.symptoms ?? []) {
    const e = byCell.get(sy.cell_id) ?? { qs: new Set<number>(), lines: [] };
    e.qs.add(r.q.idx); e.lines.push(`q${r.q.idx} s${s.sample} turns ${sy.turns.join(",")}: ${sy.observed}${sy.evidence ? ` — "${sy.evidence}"` : ""}`);
    byCell.set(sy.cell_id, e);
  }
  return [...byCell.entries()].filter(([, e]) => e.qs.size >= minQuestions).map(([k, e]) => ({ cell: k, questions: e.qs.size, lines: e.lines })).sort((a, b) => b.questions - a.questions);
}

export function buildOptimizerInput(ctx: OptimizerContext): string {
  const allCards = ctx.results.flatMap((r) => r.samples.map((s) => s.card));
  const allMetrics = ctx.results.flatMap((r) => r.samples.map((s) => s.metrics));
  const out: string[] = [ctx.brief.trim(), ""];

  // the task and its hard limits come first: this input is long (ten transcripts with their cards), and a reader that
  // stops early must still know what to write and under which constraints; the full sections follow
  out.push("=== THIS TASK ===",
    `Write challenger ${ctx.nextVersion}; parent_prompt_id is ${ctx.championVersion}. Read every section below to the end before answering: the champion prompt, the results, the ledger, the bans and the budget all bind the proposal.`,
    `Budget: ceiling ${ctx.budget.ceiling} words, growth at most ${Math.round(ctx.budget.maxGrowthFraction * 100)}% (champion ${ctx.budget.wordsNow} words). Ablation iteration: ${ctx.budget.ablationIteration ? "yes, ABLATE only" : "no"}. Banned targets: ${ctx.banned.length ? ctx.banned.map((b) => b.target).join(", ") : "none"}.`, "");

  out.push(`=== LINEAGE ===\n${ctx.lineage}`, "");
  out.push(`=== CHAMPION PROMPT (version ${ctx.championVersion}, ${ctx.championStatus}; prompt_id ${ctx.championVersion}) ===`, ctx.championPrompt.trim(), "");
  if (ctx.parentResetNotice) out.push(`=== NOTICE ===\n${ctx.parentResetNotice}`, "");

  out.push("=== PROTECTED SPANS (must remain byte-identical and occur exactly once) ===");
  for (const s of ctx.protectedSpans) out.push(`[${s.id}] ${s.text}`);
  out.push("");

  out.push("=== SET A ===");
  for (const r of ctx.results) out.push(`q${r.q.idx} id=${r.q.id} [${r.q.category} / ${r.q.type}${r.q.intent ? " / " + r.q.intent : ""}]: ${r.q.text}`);
  out.push("");

  out.push("=== CHAMPION RESULTS ===");
  for (const r of ctx.results) for (const s of r.samples) {
    out.push(`--- q${r.q.idx} ${r.q.category}, sample ${s.sample}, job ${s.jobId}: ${s.card.score.toFixed(2)} / 100${s.card.capReason ? ` (capped: ${s.card.capReason})` : ""} ---`);
    out.push(debateText(s.debate), "");
    out.push("Form metrics: " + JSON.stringify(s.metrics));
    // one line per cell (the cell names are in the brief and the target list below): same content, a fraction of the JSON
    out.push("Card (cell rating severity | example | limitation):");
    for (const c of s.card.criteria) for (const x of c.sub) out.push(`  ${x.id} ${x.rating.toFixed(2)} ${x.severity} | ${x.example} | ${x.limitation}`);
    out.push(`  criteria points: ${s.card.criteria.map((c) => `${c.id} ${c.points.toFixed(2)}/${c.max}`).join(", ")}`);
    out.push(`  strengths: ${s.card.strengths.join(" / ")}`, `  weaknesses: ${s.card.weaknesses.join(" / ")}`);
    out.push(`  symptoms: ${s.card.symptoms.map((y) => `${y.cell_id} T${y.turns.join(",T")}: ${y.observed}${y.evidence ? ` — "${y.evidence}"` : ""}`).join(" / ") || "none"}`);
    if (s.card.mechanical.length) out.push(`  mechanical: ${s.card.mechanical.map((m) => `${m.pattern} T${m.turns.join(",T")}`).join("; ")}`);
    if (s.card.findings.length) out.push(`  findings: ${s.card.findings.map((f) => `${f.type}/${f.severity}/${f.status} @ ${f.location}: ${f.description}`).join(" / ")}`);
    if (s.card.rubricFitNotes.length) out.push(`  rubric fit notes: ${s.card.rubricFitNotes.join(" / ")}`);
    out.push("");
  }

  out.push("=== RUBRIC MEANS (all champion cards) ===");
  const crit = new Map<string, { sum: number; max: number }>();
  for (const c of allCards) for (const cr of c.criteria) { const a = crit.get(cr.name) ?? { sum: 0, max: cr.max }; a.sum += cr.points; crit.set(cr.name, a); }
  for (const [k, v] of crit) out.push(`${k} (${v.max}): ${(v.sum / allCards.length).toFixed(2)}`);
  out.push(`total: ${(allCards.reduce((a, c) => a + c.score, 0) / allCards.length).toFixed(2)}`);
  out.push("per question: " + ctx.results.map((r) => `q${r.q.idx} ${(r.samples.reduce((a, s) => a + s.card.score, 0) / r.samples.length).toFixed(2)}`).join(", "));
  out.push("", "cells by points lost (max − mean), the target list:");
  for (const s of pointsLost(allCards)) out.push(`  ${s.lost.toFixed(2)}  ${s.id} ${s.criterion} / ${s.name}  (mean rating ${s.meanRating.toFixed(2)}, ${s.meanPoints.toFixed(2)} of ${s.max.toFixed(2)})`);
  out.push("");

  out.push("=== RECURRING SYMPTOMS (on three or more questions) ===");
  const rec = recurringSymptoms(ctx.results);
  if (!rec.length) out.push("none recurred on three questions; the per-question cards above are the evidence");
  for (const r of rec) { out.push(`${r.cell} — ${r.questions} questions`); for (const l of r.lines) out.push("  " + l); }
  out.push("");

  out.push("=== FORM SUMMARY (means over all champion transcripts) ===", JSON.stringify(meanMetrics(allMetrics)), "");

  if (ctx.capabilityReference) out.push("=== CAPABILITY REFERENCE (the other lineage, numbers only; never a target to copy) ===", ctx.capabilityReference, "");

  out.push("=== HYPOTHESIS LEDGER (oldest first) ===");
  if (!ctx.ledger.length) out.push("empty: this is the first challenger of the lineage");
  for (const e of ctx.ledger) {
    out.push(`${e.id} ${e.version} vs ${e.base} [${e.kind}] → ${e.outcome}; blind ${e.wins}/${e.pairs} (p=${e.pValue}); rubric ${e.rubricMeanDelta >= 0 ? "+" : ""}${e.rubricMeanDelta.toFixed(2)}; by category ${Object.entries(e.perCategoryDelta).map(([k, v]) => `${k} ${v >= 0 ? "+" : ""}${v.toFixed(1)}`).join(", ")}`);
    if (e.reason) out.push(`  gate reason: ${e.reason}`);   // a critical REJECT says so here, so it is not read as a quality verdict
    out.push(`  hypothesis: ${e.hypothesis.statement}`);
    out.push(`  targets: ${e.hypothesis.targets.join("; ")}`);
    out.push(`  diff: ${e.diffSummary}`);
    out.push(`  afterwards: ${e.cardsAfter}`);
  }
  out.push("");

  out.push("=== BANNED TARGETS ===");
  if (!ctx.banned.length) out.push("none");
  for (const b of ctx.banned) out.push(`${b.target} (until iteration ${b.until})`);
  out.push("");

  out.push("=== BUDGET ===", `ceiling ${ctx.budget.ceiling} words; growth allowance ${Math.round(ctx.budget.maxGrowthFraction * 100)}% per challenger (deletions unlimited); champion ${ctx.budget.wordsNow} words; ablation iteration: ${ctx.budget.ablationIteration ? "yes — the only allowed kind is ABLATE: remove one paragraph or slot cluster, nothing else" : "no"}`, "");

  out.push(`Write challenger ${ctx.nextVersion}. parent_prompt_id is ${ctx.championVersion}.`);
  return out.join("\n");
}

/** One-line diff summary for the ledger. */
export function diffSummary(c: Challenger): string {
  return c.diff.map((d) => `${d.before ? "−" + d.before.slice(0, 60).replace(/\s+/g, " ") : ""}${d.before && d.after ? " ⟶ " : ""}${d.after ? "+" + d.after.slice(0, 60).replace(/\s+/g, " ") : ""}`).join(" | ");
}

export function countWords(s: string): number { const t = s.trim(); return t ? t.split(/\s+/).length : 0; }

export type { Symptom };
