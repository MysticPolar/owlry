// Run:  npx tsx tests/run.ts     or     deno run -A tests/run.ts
import { test, eq, ok, near, report } from "./harness.ts";
import { cleanDebate, roteDebate, card, rawCard, pairs, ledgerEntry, RUBRIC_MAP } from "./fixtures.ts";
import { formMetrics, validity, fabricatedBasis } from "../runner/metrics.ts";
import { parseJsonLoose } from "../runner/parse.ts";
import { lintDiff, lintText, topicSet, candidateTopicWords, addedText } from "../runner/lint.ts";
import { tally, questionTally, decide, regressionCheck, criticalCheck, escalation, releaseDecide, binomUpperTail, challengerCredit } from "../runner/gate.ts";
import { transition, canTransition, stopReason } from "../runner/state.ts";
import { genKey, rubricKey, blindKey, championSlot, canonical } from "../runner/cache.ts";
import { buildRubricInput, buildBlindInput, buildOptimizerInput } from "../runner/inputs.ts";
import { validateRaw, scoreCard, pointsLost } from "../runner/scoring.ts";
import { applyEdits, verifyCandidate, lengthProblems } from "../runner/edits.ts";
import { checkSpans, contradictionProblems } from "../runner/spans.ts";
import { capabilityReport, capabilityReferenceForOptimizer } from "../runner/capability.ts";
import { validateProposal, toChallenger } from "../runner/challenger.ts";
import type { OptimizerOutput } from "../runner/types.ts";
import type { GateConfig, ValidationConfig, Question } from "../runner/types.ts";

const M = { canBrowse: false, wordsMin: 25, wordsMax: 65, turnsMin: 9, turnsMax: 12, pdCutoff: 1931 };
const G: GateConfig = { stage1: { pairs: 10, promoteWins: 8, rejectWins: 3 }, stage2: { addPairs: 5, promoteWins: 11, rejectWins: 5 }, tieWeight: 0.5, promoteMinMeanDelta: 0.5, regression: { maxMeanDrop: 0.5, maxCriterionDropFraction: 0.05 }, critical: { maxInvalidTranscripts: 0, maxFabricatedBasisTurns: 0, maxPdFalseQuoteTurns: 1, maxSafetyFlags: 0 }, escalate: { sameTargetFailures: 3, banIterations: 5 } };
const V: ValidationConfig = { everyPromotions: 3, samplesPerQuestion: 2, pass: { minWins: 7, ofPairs: 10, minMeanDelta: 0 }, fail: { maxWins: 3, orMeanDeltaBelow: -1 }, inconclusiveAddSamples: 1, inconclusivePass: { minWins: 10, ofPairs: 15 }, rotateSetBOnPass: 1 };
const LINT = { minWordLength: 4, allow: ["user", "situation", "question", "debate", "mind", "minds", "turn", "turns", "book", "books", "author", "option", "options", "decision", "fact", "facts", "person", "people"] };
const SET_A = [
  "I started three new skincare products last week and now my face stings. How do I figure out what’s causing it?",
  "I got an offer that pays 25% more, but the commute would be 90 minutes each way. How do I decide whether it’s worth it?",
  "I’m always the one making plans with my friend. When we meet, it’s lovely, but if I stop texting, nothing happens. Should I say something?",
  "Most of my friends are buying homes or getting married. I’m not sure I even want those things, but I still feel behind.",
  "Why are some places in northern Europe warmer in winter than parts of Canada at similar latitudes?",
];
const noRegression = { meanDelta: 0.5, criterionDeltas: {}, material: false, reasons: [] };

// ---------- metrics ----------
await test("metrics: clean debate has no formula markers and is valid", () => {
  const m = formMetrics(cleanDebate(), M);
  eq([m.turns, m.templatedOpeners, m.slotMarkers, m.pdFalseQuoteTurns, m.fabricatedBasisTurns, m.theUser, m.shortTurns], [9, 0, 0, 0, 0, 0, 0]);
  eq(validity(cleanDebate(), M).ok, true);
});
await test("metrics: rote debate is counted (opener, slot markers, pd-false quotes, fabricated basis, third person, short turn)", () => {
  const m = formMetrics(roteDebate(), M);
  eq(m.templatedOpeners, 1, "templated opener"); eq(m.slotMarkers, 2, "slot markers"); eq(m.pdFalseQuoteTurns, 1, "pd-false quotes");
  eq(m.fabricatedBasisTurns, 1, "fabricated basis"); eq(m.theUser, 1, "the user"); eq(m.shortTurns, 1, "short turns"); ok(m.hedges >= 5, "hedges counted");
});
await test("metrics: fabricated basis is ignored when the worker can browse", () => {
  eq(formMetrics(roteDebate(), { ...M, canBrowse: true }).fabricatedBasisTurns, 0);
});
await test("parse: the one JSON object is found in a fence, after prose, or between prose braces; prose alone is null", () => {
  const obj = '{"winner":"A","note":"a } inside a string"}';
  eq(parseJsonLoose(obj)?.winner, "A");
  eq(parseJsonLoose("Evaluation of the debate {anonymous}:\n" + obj)?.winner, "A");
  eq(parseJsonLoose("```json\n" + obj + "\n```\nNote: totals omitted {see brief}")?.winner, "A");
  eq(parseJsonLoose("Here it is: " + obj + " — done."), JSON.parse(obj));
  eq(parseJsonLoose("I think the prompt is fine."), null);
  eq(parseJsonLoose("[1,2,3]"), null, "an array is not the object asked for");
});
await test("metrics: apostrophes inside words (straight or curly) are not quotation marks; quoted phrases are", () => {
  const d = cleanDebate();
  const post = d.debate.filter((t) => t.pd === false);
  post[0].text = "Let’s be plain: it’s not the product, and I don’t think Prince’s rose is a symbol here. " + "word ".repeat(20);
  post[1].text = "Let's be plain: it's not that, and I don't agree with the friends' plan as stated so far. " + "word ".repeat(20);
  eq(formMetrics(d, M).pdFalseQuoteTurns, 1, "the plural possessive friends' still counts (as before); contractions do not");
  post[1].text = "Nothing quoted here at all, just plain reasoning in my own words today. " + "word ".repeat(20);
  eq(formMetrics(d, M).pdFalseQuoteTurns, 0);
  post[0].text = "You keep saying ‘behind’ as if it were a verdict. " + "word ".repeat(20);
  post[1].text = "He called it “a calling” and meant something else entirely. " + "word ".repeat(20);
  eq(formMetrics(d, M).pdFalseQuoteTurns, 2);
});
await test("metrics: a basis that names a marker only to disclaim it is not fabricated; a real chapter or link is", () => {
  eq(fabricatedBasis("[Basis: Daniel Gilbert, Stumbling on Happiness (impact bias and adaptation); section not verified, no link provided]"), false);
  eq(fabricatedBasis("[Basis: Amir Levine and Rachel Heller, Attached, general framework; source not verified, so no link or section is given]"), false);
  eq(fabricatedBasis("Basis: Author, Book"), false);
  eq(fabricatedBasis("[Basis: Henry David Thoreau, Walden, 'Economy' chapter; source not verified online, no link provided]"), true);
  eq(fabricatedBasis("[Basis: John Bowlby, Attachment, Chapter 15](https://en.wikipedia.org/wiki/Attachment_theory)"), true);
  eq(fabricatedBasis("[Basis: Seneca, Letters 7]"), true);
});
await test("scoring: every two-decimal rating 0.00..10.00 passes the decimals check (no IEEE false rejections); 8.333 fails", () => {
  const bad: number[] = [];
  for (let h = 0; h <= 1000; h++) {
    const r = h / 100;
    const raw = rawCard(r >= 9 ? 9.5 : 6, { "C1.1": { rating: r, limitation_severity: r >= 9 ? "none" : "minor", limitation: r >= 9 ? "none" : "minor: T2", excellent_anchor_met: r >= 9 } });
    if (validateRaw(raw, RUBRIC_MAP).problems.some((p) => p.includes("decimals"))) bad.push(r);
  }
  eq(bad, []);
  ok(validateRaw(rawCard(6, { "C1.1": { rating: 8.333 } }), RUBRIC_MAP).problems.some((p) => p.includes("decimals")));
});
await test("capability: a cell is capability-bound only when the gap holds at >= 2.0 on every question (1.2 on one question is not enough)", () => {
  const mk = (lin: string, ratings: number[]) => ({ lineage: lin, champion: "v0", byQuestion: Object.fromEntries(ratings.map((r, i) => [i + 1, [card(60, undefined, { "C4.4": r })]])) });
  const a = mk("gemini", [5, 5, 5, 5, 5]);
  eq(capabilityReport(a, mk("sonnet", [6.2, 7.5, 7.6, 7.7, 7.8]), 2.0).capabilityBound.includes("C4.4"), false);
  eq(capabilityReport(a, mk("sonnet", [7.1, 7.5, 7.6, 7.7, 7.8]), 2.0).capabilityBound.includes("C4.4"), true);
});
await test("validity: catches wrong pd, unknown speaker, turn count", () => {
  const d = cleanDebate(); d.debate[0].pd = false; d.debate[3].speaker = "The Intruder"; d.debate.pop();
  const v = validity(d, M);
  eq(v.ok, false); ok(v.problems.some((p) => p.includes("pd=false but year 1843"))); ok(v.problems.some((p) => p.includes("not one of the three minds"))); ok(v.problems.some((p) => p.startsWith("turns: 8")));
});

// ---------- lint ----------
const TOPIC = [
  ["skincare", "skin", "product", "sting", "irritation"],
  ["commute", "commuting", "salary", "transit"],
  ["friend", "friendship", "texting", "texts", "plans"],
  ["home", "homes", "married", "marriage", "milestone"],
  ["europe", "canada", "latitude", "winter", "ocean", "current"],
];
await test("lint: curated topic words are stemmed with inflection variants; candidates come from the question text", () => {
  const t = topicSet(TOPIC);
  for (const w of ["skincare", "sting", "commute", "friend", "text", "latitude", "canada", "europe", "home", "marry", "current"]) ok(t.has(w), `missing ${w}`);
  const c = candidateTopicWords(SET_A, LINT);
  ok(c.includes("skincare") && c.includes("commute") && c.includes("latitude") && !c.includes("offer") && !c.includes("decide"), JSON.stringify(c));
});
await test("lint: a topical rule is rejected, a general rule passes", () => {
  const base = "## 4. Let the minds genuinely debate\n\nOpen with a concrete, contestable position.\n";
  const topical = base + "If the user names a friend who never texts first, one turn drafts what to say.\n";
  const general = base + "If the user named another person, one turn says what that person may expect of them, as a guess, and the next turn tests it against the user's own words.\n";
  const r1 = lintDiff(base, topical, TOPIC, LINT); eq(r1.ok, false); ok(r1.hits.some((h) => h.includes("friend")) && r1.hits.some((h) => h.includes("text")));
  eq(lintDiff(base, general, TOPIC, LINT).ok, true, JSON.stringify(lintDiff(base, general, TOPIC, LINT)));
});
await test("lint: a topic word already in the champion prompt is not a hit (field names like `text`)", () => {
  const base = "For every dialogue line, output `text`, `author`, `book`, and `pd`.\n";
  eq(lintDiff(base, base + "When `pd` is false, `text` contains no quotation marks.\n", TOPIC, LINT).ok, true);
});
await test("lint: category conditionals and category names are rejected", () => {
  const r = lintText("For a health question, one turn names red flags. The wealth cases need numbers.", new Set(), LINT);
  eq(r.ok, false); ok(r.hits.some((h) => h.startsWith("category conditional"))); ok(r.hits.some((h) => h === "category name: health"));
});
await test("lint: only added lines are linted", () => {
  eq(addedText("a\nb\nc", "a\nb\nc\nd"), "d");
  eq(lintDiff("the commute is long", "the commute is long\nnew general line", TOPIC, LINT).ok, true);
});

// ---------- gate ----------
await test("gate: credit mapping respects the randomized slot", () => {
  const v = (p: "A" | "B" | "tie") => ({ winner: p, margin: p === "tie" ? "none" as const : "clear" as const, reason: "", comparisons: [], best_of_a: "", best_of_b: "", concerns: [] });
  eq(challengerCredit(v("A"), "B"), 1); eq(challengerCredit(v("A"), "A"), 0); eq(challengerCredit(v("tie"), "A"), 0.5);
});
await test("gate: binomial tail", () => {
  near(binomUpperTail(10, 8), 0.0547, 0.001); near(binomUpperTail(5, 4), 0.1875, 0.001); near(binomUpperTail(15, 11), 0.0592, 0.001);
});
await test("gate: stage 1 promote / reject / retest thresholds", () => {
  eq(decide({ stage: 1, wins: 8, n: 10, regression: noRegression, critical: [] }, G).decision, "PROMOTE");
  eq(decide({ stage: 1, wins: 7.5, n: 10, regression: noRegression, critical: [] }, G).decision, "RETEST");
  eq(decide({ stage: 1, wins: 3, n: 10, regression: noRegression, critical: [] }, G).decision, "REJECT");
  eq(decide({ stage: 1, wins: 4, n: 10, regression: noRegression, critical: [] }, G).decision, "RETEST");
});
await test("gate: stage 2 promote / reject / keep", () => {
  eq(decide({ stage: 2, wins: 11, n: 15, regression: noRegression, critical: [] }, G).decision, "PROMOTE");
  eq(decide({ stage: 2, wins: 5, n: 15, regression: noRegression, critical: [] }, G).decision, "REJECT");
  eq(decide({ stage: 2, wins: 8, n: 15, regression: noRegression, critical: [] }, G).decision, "KEEP");
});
await test("gate: a blind win with a rubric regression is contradictory evidence, never a promotion", () => {
  const reg = { meanDelta: -2, criterionDeltas: {}, material: true, reasons: ["rubric mean fell"] };
  eq(decide({ stage: 1, wins: 9, n: 10, regression: reg, critical: [] }, G).decision, "RETEST");
  eq(decide({ stage: 2, wins: 13, n: 15, regression: reg, critical: [] }, G).decision, "KEEP");
});
await test("gate: a critical failure rejects regardless of wins", () => {
  eq(decide({ stage: 1, wins: 10, n: 10, regression: noRegression, critical: ["2 invalid transcripts"] }, G).decision, "REJECT");
});
await test("gate: an incomplete panel keeps the champion and is not a loss", () => {
  const d = decide({ stage: 1, wins: 7, n: 7, regression: noRegression, critical: [] }, G);
  eq(d.decision, "KEEP"); ok(d.reason.startsWith("incomplete"));
});
await test("gate: a blind win needs the rubric to agree in direction (mean delta >= +0.5)", () => {
  const flat = { meanDelta: 0.1, criterionDeltas: {}, material: false, reasons: [] };
  eq(decide({ stage: 1, wins: 9, n: 10, regression: flat, critical: [] }, G).decision, "RETEST");
  eq(decide({ stage: 2, wins: 12, n: 15, regression: flat, critical: [] }, G).decision, "KEEP");
  eq(decide({ stage: 1, wins: 9, n: 10, regression: { ...flat, meanDelta: 0.5 }, critical: [] }, G).decision, "PROMOTE");
});
await test("gate: question-level tally weighs every question the same", () => {
  const t = questionTally(pairs(6, 10, 2));   // credits: q1..q5 s1 = 1, q1 s2 = 1, q2,q3 s2 = 0.5, q4,q5 s2 = 0
  eq([t.questionWins, t.questionLosses, t.questionTies], [3, 0, 2]);
});
await test("gate: tally counts ties as half", () => {
  const t = tally(pairs(6, 10, 2)); eq(t.wins, 7); eq(t.ties, 2); eq(t.n, 10);
});
await test("gate: regression check flags a 1.5-point drop in a 20-point criterion", () => {
  const champ = Array.from({ length: 10 }, () => card(60, [12, 12, 6, 12, 6, 6, 6]));
  const chal = Array.from({ length: 10 }, () => card(60, [10.5, 13, 6, 12, 6, 6.5, 6]));
  const r = regressionCheck(champ, chal, G.regression);
  eq(r.material, true); ok(r.reasons[0].includes("Quality of discussion fell -1.5"));
  eq(regressionCheck(champ, champ, G.regression).material, false);
});
await test("gate: critical checks count invalid transcripts, fabricated basis, pd-false quotes", () => {
  const v = validity(roteDebate(), M), m = formMetrics(roteDebate(), M);
  const c = criticalCheck([v], [m], [card(50)], G.critical);
  ok(c.some((x) => x.includes("basis")), "fabricated basis"); ok(c.length >= 1);
  eq(criticalCheck([validity(cleanDebate(), M)], [formMetrics(cleanDebate(), M)], [card(50)], G.critical), []);
});
await test("gate: escalation after three consecutive failures on the same target", () => {
  const recent = [ledgerEntry(["Accuracy and support"], "REJECT"), ledgerEntry(["Accuracy and support"], "KEEP")];
  const e = escalation("REJECT", ["Accuracy and support"], recent, G.escalate, 7);
  eq(e.decision, "ESCALATE"); eq(e.banned, [{ target: "Accuracy and support", until: 12 }]);
  eq(escalation("REJECT", ["Accuracy and support"], [recent[0], ledgerEntry(["Drama"], "REJECT")], G.escalate, 7).decision, "REJECT", "streak broken by another target");
  eq(escalation("PROMOTE", ["Accuracy and support"], recent, G.escalate, 7).decision, "PROMOTE");
});
await test("gate: release decisions", () => {
  eq(releaseDecide({ wins: 7, n: 10, meanDelta: 0.2, stage: 1, critical: [] }, V).decision, "PASS");
  eq(releaseDecide({ wins: 3, n: 10, meanDelta: 0.2, stage: 1, critical: [] }, V).decision, "FAIL");
  eq(releaseDecide({ wins: 6, n: 10, meanDelta: -1.5, stage: 1, critical: [] }, V).decision, "FAIL");
  eq(releaseDecide({ wins: 5, n: 10, meanDelta: 0.1, stage: 1, critical: [] }, V).decision, "INCONCLUSIVE");
  eq(releaseDecide({ wins: 10, n: 15, meanDelta: 0.1, stage: 2, critical: [] }, V).decision, "PASS");
  eq(releaseDecide({ wins: 8, n: 15, meanDelta: 0.1, stage: 2, critical: [] }, V).decision, "INCONCLUSIVE");
});

// ---------- state ----------
await test("state: the happy path and the four outcomes", () => {
  let s = transition("BASELINE", "baseline_done"); eq(s, "OPTIMIZING");
  s = transition(s, "optimizer_done"); s = transition(s, "lint_ok"); s = transition(s, "generated"); s = transition(s, "evaluated"); s = transition(s, "compared"); eq(s, "DECIDING");
  eq(transition("DECIDING", "promote"), "PROMOTED"); eq(transition("DECIDING", "retest"), "RETESTING"); eq(transition("DECIDING", "reject"), "REJECTED"); eq(transition("DECIDING", "escalate"), "ESCALATED");
  eq(transition("PROMOTED", "rebaselined"), "REBASELINING"); eq(transition("RETESTING", "generated"), "EVALUATING");
  eq(transition("VALIDATING", "fail"), "ROLLED_BACK");
});
await test("state: invalid transitions throw; the champion changes only through DECIDING", () => {
  let threw = false; try { transition("GENERATING", "promote"); } catch { threw = true; } ok(threw);
  eq(canTransition("OPTIMIZING", "promote"), false); eq(canTransition("DECIDING", "promote"), true);
});
await test("state: stop rules", () => {
  const cfg = { maxIterationsPerSession: 30, maxCallsPerSession: 600, consecutiveNonPromotions: 6, consecutiveEscalations: 2 };
  eq(stopReason({ iterations: 3, calls: 50, outcomes: ["REJECTED", "KEPT", "REJECTED", "KEPT", "REJECTED", "KEPT"] }, cfg)?.startsWith("plateau"), true);
  eq(stopReason({ iterations: 3, calls: 50, outcomes: ["PROMOTED", "KEPT", "REJECTED", "KEPT", "REJECTED", "KEPT"] }, cfg), null);
  eq(stopReason({ iterations: 3, calls: 50, outcomes: ["ESCALATED", "ESCALATED"] }, cfg)?.startsWith("repeated escalation"), true);
  eq(stopReason({ iterations: 30, calls: 50, outcomes: [] }, cfg)?.startsWith("max iterations"), true);
});

// ---------- cache ----------
await test("cache: keys are stable, key-order independent, and change with every input", async () => {
  const base = { lineage: "gemini", lane: "gemini", promptHash: "p", model: "m", settings: { temperature: 0.5, draw: "exp-1" }, questionId: "health-04", questionText: "q", envelopeVersion: "1", sample: 1 };
  const k1 = await genKey(base), k2 = await genKey({ ...base, settings: { draw: "exp-1", temperature: 0.5 } });
  eq(k1, k2, "order independent");
  ok(k1 !== await genKey({ ...base, sample: 2 }), "sample changes key");
  ok(k1 !== await genKey({ ...base, settings: { ...base.settings, draw: "exp-2" } }), "a fresh draw changes key (re-baseline)");
  ok(k1 !== await genKey({ ...base, questionText: "edited" }), "edited question changes key");
  const r1 = await rubricKey({ transcriptHash: "t", rubricVersion: "rubric.v3", model: "opus", effort: "high", questionType: "decision", canBrowse: false });
  ok(r1 !== await rubricKey({ transcriptHash: "t", rubricVersion: "rubric.v4", model: "opus", effort: "high", questionType: "decision", canBrowse: false }), "rubric version changes key");
  ok(await blindKey({ aHash: "x", bHash: "y", judgeVersion: "v", model: "m", effort: "e" }) !== await blindKey({ aHash: "y", bHash: "x", judgeVersion: "v", model: "m", effort: "e" }), "order of A/B is part of the key");
  eq(canonical({ b: 1, a: [{ d: 2, c: 3 }] }), '{"a":[{"c":3,"d":2}],"b":1}');
});
await test("cache: A/B slot is deterministic per pair and roughly balanced", async () => {
  let a = 0; for (let i = 0; i < 200; i++) if ((await championSlot("exp", `c${i}`, `x${i}`)) === "A") a++;
  ok(a > 70 && a < 130, `balance ${a}/200`);
  eq(await championSlot("exp", "c1", "x1"), await championSlot("exp", "c1", "x1"));
});

// ---------- inputs ----------
const q: Question = { idx: 1, id: "health-04", category: "Health", type: "decision", text: SET_A[0] };
await test("inputs: rubric input carries the situation, the type and the debate, and no version or lane", () => {
  const s = buildRubricInput("BRIEF", q, cleanDebate(), false);
  ok(s.includes("QUESTION TYPE ===\ndecision") && s.includes("could not browse") && s.includes("Turn 9"));
  ok(!/\bv\d+\b/.test(s) && !/gemini|sonnet|champion|challenger/i.test(s), "no version or lane words");
});
await test("inputs: blind input carries both debates and no score, version or newer/older hint", () => {
  const s = buildBlindInput("BRIEF", q, cleanDebate(), roteDebate());
  ok(s.includes("=== DEBATE A ===") && s.includes("=== DEBATE B ==="));
  ok(!/score|rating|points|newer|older|champion|challenger|version/i.test(s.replace("BRIEF", "")));
});
await test("inputs: optimizer input ranks cells by points lost, lists ledger, bans, spans and the capability reference", () => {
  const results = [1, 2, 3, 4, 5].map((i) => ({ q: { ...q, idx: i, id: `id-${i}` }, samples: [{ sample: 1, jobId: `gen.v0.q${i}.s1`, debate: cleanDebate(), card: card(60, undefined, { "C7.2": 0 }), metrics: formMetrics(cleanDebate(), M) }] }));
  const s = buildOptimizerInput({ brief: "BRIEF", lineage: "gemini", championVersion: "v0", championStatus: "working champion", championPrompt: "PROMPT", protectedSpans: [{ id: "language", text: "Use the user’s language." }], results, ledger: [ledgerEntry(["C7.2"], "REJECT")], banned: [{ target: "C2.3", until: 9 }], budget: { ceiling: 1900, maxGrowthFraction: 0.1, wordsNow: 1353, ablationIteration: true }, capabilityReference: "Other lineage …", nextVersion: "v3" });
  eq(pointsLost(results.map((r) => r.samples[0].card))[0].id, "C7.2");
  ok(s.includes("=== HYPOTHESIS LEDGER") && s.includes("C2.3 (until iteration 9)") && s.includes("ablation iteration: yes") && s.includes("[language] Use the user’s language.") && s.includes("=== CAPABILITY REFERENCE") && s.endsWith("Write challenger v3. parent_prompt_id is v0."));
});

// ---------- scoring ----------
await test("scoring: 35 ratings of 6.00 give exactly 60.00; points come from the map, not the evaluator", () => {
  const raw = rawCard(6);
  eq(validateRaw(raw, RUBRIC_MAP).ok, true, JSON.stringify(validateRaw(raw, RUBRIC_MAP)));
  const c = scoreCard(raw, RUBRIC_MAP);
  eq(c.uncapped, 60); eq(c.score, 60); eq(c.criteria[0].points, 12); eq(c.criteria[2].points, 6); eq(c.criteria[0].sub[0].points, 2.4);
});
await test("scoring: integer hundredths avoid float drift (7.25 × 0.4 = 2.90, 35 cells sum cleanly)", () => {
  const c = scoreCard(rawCard(7.25), RUBRIC_MAP);
  eq(c.criteria[0].sub[0].points, 2.9); eq(c.uncapped, 72.5);
});
await test("scoring: the cap applies only on an established finding", () => {
  const f = { type: "format" as const, severity: "material" as const, location: "T3", description: "quotation marks in a pd=false turn", evidence_ids: [] };
  const suspected = rawCard(9.4, {}, { findings: [{ ...f, status: "suspected" }], cap_reasons: [{ reason: "pd_false_quotation_marks", finding_index: 0 }] });
  ok(!validateRaw(suspected, RUBRIC_MAP).ok, "a cap on a suspected finding is rejected");
  const observed = rawCard(9.4, {}, { findings: [{ ...f, status: "observed" }], cap_reasons: [{ reason: "pd_false_quotation_marks", finding_index: 0 }] });
  eq(validateRaw(observed, RUBRIC_MAP).ok, true); const c = scoreCard(observed, RUBRIC_MAP); eq(c.uncapped, 94); eq(c.score, 89.99); eq(c.capReason, "pd_false_quotation_marks");
});
await test("scoring: the cell rule — material ≤ 6.99, minor ≤ 8.99, minor+anchor ≤ 9.49, 9+ needs the anchor", () => {
  const bad = rawCard(6, { "C1.1": { rating: 7.5, limitation_severity: "material", limitation: "material: T4 forced consensus" }, "C1.2": { rating: 9.2, excellent_anchor_met: false, limitation: "none", limitation_severity: "none" }, "C1.3": { rating: 9.6, limitation_severity: "minor", limitation: "minor: T5", excellent_anchor_met: true } });
  const v = validateRaw(bad, RUBRIC_MAP);
  eq(v.ok, false); ok(v.problems.some((p) => p.startsWith("C1.1: material"))); ok(v.problems.some((p) => p.startsWith("C1.2"))); ok(v.problems.some((p) => p.startsWith("C1.3: minor weakness with anchor")));
  const good = rawCard(6, { "C1.3": { rating: 9.4, limitation_severity: "minor", limitation: "minor: T5 slightly late", excellent_anchor_met: true } });
  eq(validateRaw(good, RUBRIC_MAP).ok, true);
});
await test("scoring: wrong cell order or count is rejected", () => {
  const raw = rawCard(6); const t = raw.cells[0]; raw.cells[0] = raw.cells[1]; raw.cells[1] = t;
  ok(!validateRaw(raw, RUBRIC_MAP).ok);
  const short = rawCard(6); short.cells.pop(); ok(validateRaw(short, RUBRIC_MAP).problems.some((p) => p.startsWith("cells: 34")));
});

// ---------- edits and spans ----------
const CHAMP = "## 4. Debate\n\nOpen with a concrete, contestable position.\n\nLet the speakers challenge assumptions.\n\nUse the user’s language.\n";
await test("edits: ordered exact-span edits reproduce the candidate; ambiguous or missing spans are rejected", () => {
  const edits = [{ operation: "delete" as const, before: "Let the speakers challenge assumptions.\n\n", after: "", reason: "ignored" }, { operation: "add" as const, before: "Open with a concrete, contestable position.", after: "Open with a concrete, contestable position. By the midpoint one mind has changed what it recommends because of something another mind said.", reason: "achievement rule" }];
  const a = applyEdits(CHAMP, edits); eq(a.ok, true, a.problems.join()); ok(a.result.includes("By the midpoint") && !a.result.includes("Let the speakers"));
  eq(verifyCandidate(CHAMP, edits, a.result), []);
  ok(verifyCandidate(CHAMP, edits, a.result + " extra").length === 1, "candidate must equal the edited base");
  ok(applyEdits(CHAMP + "position.\n", [{ operation: "replace", before: "position.", after: "stance.", reason: "" }]).problems[0].includes("more than once"));
  ok(applyEdits(CHAMP, [{ operation: "replace", before: "nowhere", after: "x", reason: "" }]).problems[0].includes("not found"));
  ok(applyEdits(CHAMP, [{ operation: "add", before: "Use the user’s language.", after: "Something else entirely.", reason: "" }]).problems[0].includes("anchor"));
});
await test("edits: length rules — ceiling and 10% growth, deletions unlimited", () => {
  const base = Array.from({ length: 100 }, (_, i) => `w${i}`).join(" ");
  eq(lengthProblems(base, base + " a b c d e f g h i j", 1900, 0.1), []);
  ok(lengthProblems(base, base + " " + Array.from({ length: 11 }, (_, i) => `x${i}`).join(" "), 1900, 0.1)[0].includes("growth"));
  eq(lengthProblems(base, "w0 w1", 1900, 0.1), []);
  ok(lengthProblems(base, base, 50, 0.1)[0].includes("ceiling"));
});
await test("spans: protected spans must occur exactly once; contradictions are caught", () => {
  const spans = [{ id: "language", text: "Use the user’s language." }, { id: "open", text: "Open with a concrete, contestable position." }];
  eq(checkSpans(CHAMP, spans), { ok: true, missing: [], duplicated: [] });
  eq(checkSpans(CHAMP.replace("Use the user’s language.", "Use English."), spans).missing, ["language"]);
  eq(checkSpans(CHAMP + "Use the user’s language.\n", spans).duplicated, ["language"]);
  ok(contradictionProblems(CHAMP + "Write at least 15 turns.").length === 1);
  eq(contradictionProblems(CHAMP), []);
});

// ---------- proposal validation ----------
await test("spans: contradictions are counted against the champion, so its own negated rules never reject a proposal", async () => {
  const g = globalThis as unknown as { Deno?: { readTextFile: (p: string) => Promise<string> } };
  const path = decodeURIComponent(new URL("../prompts/castDebate.sonnet.v0.md", import.meta.url).pathname);
  const nodeFs = "node:fs/promises";   // a non-literal specifier: tsc runs without Node types
  const text: string = g.Deno ? await g.Deno.readTextFile(path) : await (await import(nodeFs)).readFile(path, "utf8");
  const v0 = text.split("## User’s situation")[0];
  ok(contradictionProblems(v0).length >= 2, "the v0 prompt itself matches the patterns (its negated rules)");
  eq(contradictionProblems(v0.replace("Keep the dialogue continuous.", "Keep the dialogue continuous and plain."), v0), [], "an unrelated edit passes");
  eq(contradictionProblems(v0 + "\nWrite at least 15 turns.", v0).length, 1, "a new contradiction is caught");
});
await test("challenger: a valid proposal passes; the user heading, a bad parent, a broken span and a topical word are rejected", () => {
  const spans = [{ id: "language", text: "Use the user’s language." }];
  const rules = { ceiling: 1900, maxGrowthFraction: 0.1, userHeading: "## User’s situation", lint: LINT, topicWords: TOPIC };
  const base: OptimizerOutput = { schema_version: "optimizer-4.2.0", action: "propose", parent_prompt_id: "v0", kind: "DELETE", hypothesis: { problem: "p", cause_type: "prompt", mechanism: "m", proposed_change: "c", expected_observations: ["o"], falsification_condition: "f", regression_risk: "r", targets: ["C1.1"], expected_delta: 3 }, evidence: [{ question_id: "health-04", job_id: "gen.v0.q1.s1", location: "debate[2].text", observation: "x" }], candidate_system_prompt: CHAMP.replace("Let the speakers challenge assumptions.\n\n", ""), edits: [{ operation: "delete", before: "Let the speakers challenge assumptions.\n\n", after: "", reason: "ignored" }], blocked: [], next_system_action: null, change_summary: "s" };
  eq(validateProposal(base, CHAMP, "v0", spans, rules), []);
  ok(validateProposal({ ...base, parent_prompt_id: "v9" }, CHAMP, "v0", spans, rules).some((p) => p.includes("parent_prompt_id")));
  ok(validateProposal({ ...base, candidate_system_prompt: base.candidate_system_prompt + "\n## User’s situation\n{{question}}" }, CHAMP, "v0", spans, rules).some((p) => p.includes("user section")));
  const topical: OptimizerOutput = { ...base, kind: "ADD", edits: [{ operation: "add", before: "Open with a concrete, contestable position.", after: "Open with a concrete, contestable position. If the user names a friend, one turn drafts the text to send.", reason: "" }], candidate_system_prompt: CHAMP.replace("Open with a concrete, contestable position.", "Open with a concrete, contestable position. If the user names a friend, one turn drafts the text to send.") };
  ok(validateProposal(topical, CHAMP, "v0", spans, rules).some((p) => p.includes("topicality")));
  const broken: OptimizerOutput = { ...base, edits: [{ operation: "replace", before: "Use the user’s language.", after: "Use English.", reason: "" }], candidate_system_prompt: CHAMP.replace("Use the user’s language.", "Use English.") };
  ok(validateProposal(broken, CHAMP, "v0", spans, rules).some((p) => p.includes("protected spans")));
  const nc: OptimizerOutput = { ...base, action: "no_change", kind: null, candidate_system_prompt: null, edits: [] };
  eq(validateProposal(nc, CHAMP, "v0", spans, rules), []);
  const esc: OptimizerOutput = { ...nc, action: "escalate" };
  ok(validateProposal(esc, CHAMP, "v0", spans, rules).some((p) => p.includes("next_system_action")));
  const ch = toChallenger(base, "v1", CHAMP); eq(ch.version, "v1"); eq(ch.kind, "DELETE"); eq(ch.wordCount.after, 13);
});

// ---------- capability ----------
await test("capability: cell gaps, per-question gaps and the capability-bound rule", () => {
  const A = { lineage: "gemini", champion: "v0", byQuestion: Object.fromEntries([1, 2, 3, 4, 5].map((q) => [q, [card(50, undefined, { "C2.3": 3 }), card(50, undefined, { "C2.3": 3.5 })]])) };
  const B = { lineage: "sonnet", champion: "v0", byQuestion: Object.fromEntries([1, 2, 3, 4, 5].map((q) => [q, [card(75, undefined, { "C2.3": 7 }), card(75, undefined, { "C2.3": 7.5 })]])) };
  const r = capabilityReport(A, B, 2.0);
  eq(r.total.gap, 25); eq(r.byQuestion.length, 5); eq(r.cells[0].id, "C2.3"); eq(r.cells[0].gap, 4); ok(r.capabilityBound.includes("C2.3"));
  const ref = capabilityReferenceForOptimizer(r, "gemini"); ok(ref.includes("C2.3") && ref.includes("capability-bound") && ref.includes("sonnet"));
});

const fails = report();
if (fails) { (globalThis as { process?: { exit: (c: number) => void } }).process?.exit(1); }
