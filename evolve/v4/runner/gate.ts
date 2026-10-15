// Acceptance gate and release gate. Pure functions; the runner feeds them
// cached cards, metrics and blind verdicts and persists what they return.

import type {
  BlindVerdict, Decision, FormMetrics, GateConfig, LedgerEntry, PairResult, ReleaseDecision, RubricCard, Validity, ValidationConfig,
} from "./types.ts";

/** Map a blind verdict to the challenger's credit, given where the champion sat. */
export function challengerCredit(v: BlindVerdict, championSlot: "A" | "B", tieWeight = 0.5): 0 | 0.5 | 1 {
  if (v.winner === "tie") return tieWeight as 0.5;
  const challengerSlot = championSlot === "A" ? "B" : "A";
  return v.winner === challengerSlot ? 1 : 0;
}

export function tally(pairs: PairResult[]): { wins: number; n: number; ties: number } {
  const wins = pairs.reduce((a, p) => a + p.challengerWon, 0);
  const ties = pairs.filter((p) => p.challengerWon === 0.5).length;
  return { wins, n: pairs.length, ties };
}

/** Question-level view (each question weighs the same whatever its sample count): reported, not decided on. */
export function questionTally(pairs: PairResult[]): { questionWins: number; questionLosses: number; questionTies: number; perQuestion: Record<number, number> } {
  const by: Record<number, number[]> = {};
  for (const p of pairs) (by[p.q] ??= []).push(p.challengerWon);
  const perQuestion: Record<number, number> = {};
  let w = 0, l = 0, t = 0;
  for (const [q, xs] of Object.entries(by)) { const m = xs.reduce((a, b) => a + b, 0) / xs.length; perQuestion[Number(q)] = m; if (m > 0.5) w++; else if (m < 0.5) l++; else t++; }
  return { questionWins: w, questionLosses: l, questionTies: t, perQuestion };
}

/** Exact binomial upper tail P(X >= k) for X ~ Bin(n, p). Ties counted as half are rounded down to be conservative. */
export function binomUpperTail(n: number, k: number, p = 0.5): number {
  const kk = Math.floor(k);
  let s = 0;
  for (let i = kk; i <= n; i++) s += choose(n, i) * Math.pow(p, i) * Math.pow(1 - p, n - i);
  return Math.min(1, s);
}
function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

export interface Regression {
  meanDelta: number;
  criterionDeltas: Record<string, number>;
  material: boolean;
  reasons: string[];
}

function meanBy(cards: RubricCard[]): { total: number; byCriterion: Record<string, { mean: number; max: number }> } {
  const by: Record<string, { sum: number; max: number }> = {};
  let total = 0;
  for (const c of cards) {
    total += c.score;
    for (const cr of c.criteria) {
      by[cr.name] ??= { sum: 0, max: cr.max };
      by[cr.name].sum += cr.points;
    }
  }
  const n = Math.max(1, cards.length);
  const out: Record<string, { mean: number; max: number }> = {};
  for (const [k, v] of Object.entries(by)) out[k] = { mean: v.sum / n, max: v.max };
  return { total: total / n, byCriterion: out };
}

/** Rubric regression guard: the challenger may not be materially worse on the absolute rubric. */
export function regressionCheck(champion: RubricCard[], challenger: RubricCard[], cfg: GateConfig["regression"]): Regression {
  const a = meanBy(champion), b = meanBy(challenger);
  const reasons: string[] = [];
  const criterionDeltas: Record<string, number> = {};
  const meanDelta = round2(b.total - a.total);
  if (meanDelta < -cfg.maxMeanDrop) reasons.push(`rubric mean fell ${meanDelta} (limit -${cfg.maxMeanDrop})`);
  for (const [name, av] of Object.entries(a.byCriterion)) {
    const bv = b.byCriterion[name];
    if (!bv) continue;
    const d = round2(bv.mean - av.mean);
    criterionDeltas[name] = d;
    if (-d > cfg.maxCriterionDropFraction * av.max) reasons.push(`${name} fell ${d} of ${av.max}`);
  }
  return { meanDelta, criterionDeltas, material: reasons.length > 0, reasons };
}

/** Hard failures that reject regardless of preference. */
export function criticalCheck(
  validity: Validity[], metrics: FormMetrics[], cards: RubricCard[], cfg: GateConfig["critical"],
): string[] {
  const out: string[] = [];
  const invalid = validity.filter((v) => !v.ok).length;
  if (invalid > cfg.maxInvalidTranscripts) out.push(`${invalid} invalid transcript(s): ${validity.filter((v) => !v.ok).map((v) => v.problems[0]).join("; ")}`);
  const fab = metrics.reduce((a, m) => a + m.fabricatedBasisTurns, 0);
  if (fab > cfg.maxFabricatedBasisTurns) out.push(`${fab} basis reference(s) with chapter/section/link from a worker that cannot browse`);
  const pdq = metrics.reduce((a, m) => a + m.pdFalseQuoteTurns, 0);
  if (pdq > cfg.maxPdFalseQuoteTurns) out.push(`${pdq} pd=false turn(s) with quotation marks`);
  const safety = cards.filter((c) => c.safety?.flagged).length;
  if (safety > cfg.maxSafetyFlags) out.push(`${safety} safety flag(s)`);
  return out;
}

export interface GateInput {
  stage: 1 | 2;
  wins: number;
  n: number;
  regression: Regression;
  critical: string[];
  /** pairs the panel can have: fewer than stage pairs when baseline slots are missing (a champion sample that does not
   *  exist is not an unjudged pair). Defaults to the configured count. */
  expected?: number;
}

export interface GateOutput { decision: Exclude<Decision, "ESCALATE">; reason: string; pValue: number }

/**
 * Sequential rule. Stage 1 on `stage1.pairs` pairs: promote at >= promoteWins, reject at <= rejectWins, else RETEST.
 * Stage 2 on stage1.pairs + stage2.addPairs: promote at >= promoteWins, reject at <= rejectWins, else KEEP (champion retained,
 * hypothesis recorded as inconclusive). Critical failures always reject. A blind win with a material rubric regression is
 * contradictory evidence: RETEST at stage 1, KEEP at stage 2.
 */
export function decide(input: GateInput, cfg: GateConfig): GateOutput {
  const pValue = round4(binomUpperTail(input.n, input.wins));
  if (input.critical.length) return { decision: "REJECT", reason: `critical: ${input.critical.join(" | ")}`, pValue };
  const s = input.stage === 1 ? cfg.stage1 : cfg.stage2;
  const expectedN = input.expected ?? (input.stage === 1 ? cfg.stage1.pairs : cfg.stage1.pairs + cfg.stage2.addPairs);
  // an incomplete panel never promotes and never counts as a loss: the champion is kept and the gap is recorded
  if (input.n < expectedN) return { decision: "KEEP", reason: `incomplete: only ${input.n} of ${expectedN} pairs judged`, pValue };
  if (input.wins >= s.promoteWins) {
    if (input.regression.material) {
      const d: GateOutput["decision"] = input.stage === 1 ? "RETEST" : "KEEP";
      return { decision: d, reason: `blind ${input.wins}/${input.n} but rubric regression: ${input.regression.reasons.join("; ")}`, pValue };
    }
    if (input.regression.meanDelta < (cfg.promoteMinMeanDelta ?? 0)) {
      const d: GateOutput["decision"] = input.stage === 1 ? "RETEST" : "KEEP";
      return { decision: d, reason: `blind ${input.wins}/${input.n} but rubric mean ${fmt(input.regression.meanDelta)} is below the ${fmt(cfg.promoteMinMeanDelta ?? 0)} needed to agree in direction`, pValue };
    }
    return { decision: "PROMOTE", reason: `blind ${input.wins}/${input.n} (p=${pValue}), rubric ${fmt(input.regression.meanDelta)}`, pValue };
  }
  if (input.wins <= s.rejectWins) return { decision: "REJECT", reason: `blind ${input.wins}/${input.n}, rubric ${fmt(input.regression.meanDelta)}`, pValue };
  return input.stage === 1
    ? { decision: "RETEST", reason: `blind ${input.wins}/${input.n} is between ${s.rejectWins} and ${s.promoteWins}`, pValue }
    : { decision: "KEEP", reason: `blind ${input.wins}/${input.n} inconclusive after ${input.n} pairs; champion retained`, pValue };
}

/**
 * Escalation: when a non-promotion closes the k-th consecutive attempt on the same target subcriterion, the decision
 * becomes ESCALATE and the target is banned for `banIterations`. `recent` is the ledger, newest first, excluding this attempt.
 */
export function escalation(
  decision: Decision, targets: string[], recent: LedgerEntry[], cfg: GateConfig["escalate"], iteration: number,
): { decision: Decision; banned: { target: string; until: number }[] } {
  if (decision === "PROMOTE") return { decision, banned: [] };
  const banned: { target: string; until: number }[] = [];
  for (const t of targets) {
    let streak = 1; // this attempt
    for (const e of recent) {
      const nonPromotion = !String(e.outcome).endsWith("PROMOTE");
      if (nonPromotion && e.hypothesis.targets.includes(t)) streak++;
      else break;
    }
    if (streak >= cfg.sameTargetFailures) banned.push({ target: t, until: iteration + cfg.banIterations });
  }
  return banned.length ? { decision: "ESCALATE", banned } : { decision, banned: [] };
}

/** Outer validation on Set B: working champion vs release champion. */
export function releaseDecide(
  input: { wins: number; n: number; meanDelta: number; stage: 1 | 2; critical: string[] }, cfg: ValidationConfig,
): { decision: ReleaseDecision; reason: string } {
  if (input.critical.length) return { decision: "FAIL", reason: `critical: ${input.critical.join(" | ")}` };
  if (input.stage === 1) {
    if (input.wins >= cfg.pass.minWins && input.meanDelta >= cfg.pass.minMeanDelta) return { decision: "PASS", reason: `blind ${input.wins}/${input.n}, rubric ${fmt(input.meanDelta)}` };
    if (input.wins <= cfg.fail.maxWins || input.meanDelta < cfg.fail.orMeanDeltaBelow) return { decision: "FAIL", reason: `blind ${input.wins}/${input.n}, rubric ${fmt(input.meanDelta)}` };
    return { decision: "INCONCLUSIVE", reason: `blind ${input.wins}/${input.n}, rubric ${fmt(input.meanDelta)}; add ${cfg.inconclusiveAddSamples} sample per question` };
  }
  if (input.wins >= cfg.inconclusivePass.minWins && input.meanDelta >= cfg.pass.minMeanDelta) return { decision: "PASS", reason: `blind ${input.wins}/${input.n} after retest` };
  if (input.meanDelta < cfg.fail.orMeanDeltaBelow) return { decision: "FAIL", reason: `rubric ${fmt(input.meanDelta)} after retest` };
  return { decision: "INCONCLUSIVE", reason: `blind ${input.wins}/${input.n} after retest; keep as experimental, no release` };
}

function fmt(x: number): string { return (x >= 0 ? "+" : "") + x.toFixed(2); }
function round2(x: number): number { return Math.round(x * 100) / 100; }
function round4(x: number): number { return Math.round(x * 10000) / 10000; }
