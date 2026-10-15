// evo4.ts — deterministic experiment runner for the v4.2 loop (Deno).
//
// The pure modules next to it (gate, scoring, edits, spans, lint, metrics, cache,
// state, inputs, challenger, capability) are tested in tests/run.ts; this file
// wires them to files and jobs, and tests/integration.ts drives it end to end
// with mock agent outputs. Three functions come from ./legacy.ts because they
// already existed in the schema-2 harness:
//   callGemini(system, user, settings)  forced JSON schema, 429 / 5xx retries on the same model
//   frameWorkerPrompt(system, user)     the Sonnet worker file (roles/worker-envelope.md)
//   loadQuestionText(id)                the question bank
//
// Usage (from the repository root):
//   deno run --config evolve/deno.json --env-file=.env.local -A evolve/v4/runner/evo4.ts <command> [--lineage L|all] [...]
// EVO4_ROOT overrides the data root (default evolve/v4); the integration test points it at a scratch copy.
//
// Commands
//   bootstrap    [--lineage L|all] [--champion v0]       open an experiment in BASELINE for the lineage's champion
//   next         [--lineage L|all]                       print outstanding jobs for every named lineage (JSON lines) or status lines
//   ingest       [--lineage L|all]                       read job outputs, validate, cache, advance; runs the gate when a stage completes
//   challenge    --lineage L --file F [--note "…"]       enter a hand-written challenger (skips the optimizer once; the control experiment)
//   validate     --lineage L                             open an outer validation on Set B (working vs release champion)
//   capability   [--set A] [--blind]                     cross-lineage report from both baselines; --blind adds 10 cross-lane pairs
//   status       [--lineage L|all]
//   ledger       --lineage L
//   metrics      --file path.json [--lane gemini]
//   gemini-batch --lineage L --exp <id>                  run the pending Gemini generations sequentially (background)
//
// Both lineages run in parallel: `next` without --lineage prints the union of their jobs; the dispatcher spawns all
// subagent jobs in one batch while the Gemini batch runs in the background. The lineages share Set A, Set B, the
// evaluator and judge versions and the content-addressed caches; they never share a champion, a baseline or a gate.
//
// Data layout (under evolve/v4/)
//   config.v4.2.json  sets/  runner-only/setB.json  roles/  prompts/  schemas/  rubric-map.json  seeds/protected-spans.json
//   cache/gen/<key>.json  cache/rubric/<key>.json  cache/blind/<key>.json
//   <lineage>/versions/vN.md + vN.json · champion.json · baseline.json · ledger.jsonl · bans.json · calls.count · validations.log
//   <lineage>/experiments/<id>/state.json, jobs/, out/, pairs.json · <lineage>/validations/<id>/…
//   capability/<timestamp>.md

import { formMetrics, validity, type MetricOptions } from "./metrics.ts";
import { challengerCredit, criticalCheck, decide, escalation, questionTally, regressionCheck, releaseDecide, tally } from "./gate.ts";
import { blindKey, championSlot, genKey, promptHash, rubricKey, sha256, transcriptHash } from "./cache.ts";
import { normalise, schemaProblems } from "./validate.ts";
import { parseJsonLoose } from "./parse.ts";
import { stopReason, transition, type Event, type State } from "./state.ts";
import { buildBlindInput, buildOptimizerInput, buildRubricInput, diffSummary, type ChampionResult, type DeterministicCheck } from "./inputs.ts";
import { scoreCard, validateRaw, pointsLost, type RubricMap } from "./scoring.ts";
import { validateProposal, toChallenger } from "./challenger.ts";
import { capabilityMarkdown, capabilityReferenceForOptimizer, capabilityReport, type LineageCards } from "./capability.ts";
import { countWords } from "./edits.ts";
import type { BlindVerdict, Challenger, Debate, LedgerEntry, OptimizerOutput, PairResult, Question, RubricCard, RubricRaw } from "./types.ts";
import { callGemini, frameWorkerPrompt, GeminiBlocked, loadQuestionText } from "./legacy.ts";

// ---------- config, args, state types ----------

const ROOT = (Deno.env.get("EVO4_ROOT") ?? "evolve/v4").replace(/\/+$/, "");
const USER_HEADING = "## User’s situation";
const cfg = JSON.parse(await Deno.readTextFile(`${ROOT}/config.v4.2.json`));
const RUBRIC_MAP: RubricMap = JSON.parse(await Deno.readTextFile(`${ROOT}/${cfg.evaluation.rubricMap}`));
const SPANS = JSON.parse(await Deno.readTextFile(`${ROOT}/${cfg.prompt.protectedSpans}`));
const CELL_NAME: Record<string, string> = Object.fromEntries(RUBRIC_MAP.criteria.flatMap((c) => c.cells.map((x) => [x.id, x.name] as const)));
const args = parseArgs(Deno.args);
const lineagesRequested: string[] = !args.lineage || args.lineage === "all" ? Object.keys(cfg.lineages) : [String(args.lineage)];

// unusable: a completed worker answer that is not a debate at all (no minds/debate arrays, a Gemini reply that never
// completed). It stays a recorded failure (validity false, counted by the critical check) but cannot be scored or paired.
// printed: `next` has handed the job to the dispatcher since the last ingest; misses: ingests that found a printed job
// with no output (the agent returned without writing) — two misses close the job as missing instead of re-issuing it forever
interface Job { kind: "generate" | "gemini" | "rubric" | "blind" | "optimizer"; lineage: string; outPath: string; promptPath?: string; cacheKey?: string; done: boolean; attempts: number; misses?: number; version?: string; q?: number; s?: number; unusable?: boolean; printed?: boolean }
interface ExpState {
  id: string; kind: "iteration" | "validation"; lineage: string; state: State; iteration: number;
  champion: string; challenger?: string; stage: 1 | 2; stage1Samples: number; samples: number;
  jobs: Record<string, Job>; decision?: string; reason?: string; manual?: boolean; ablation?: boolean; createdAt: string; updatedAt: string;
  questions?: Question[];   // validation only: the Set B questions this validation opened with
  refills?: Record<string, number>;   // baseline slots redrawn after a failure (slot → refill round), salted into the draw
  queued?: { system: string; note: string; file: string };   // a manual challenger entered before the baseline closed
  setBUses?: boolean;       // validation only: this validation's use of Set B was reserved in setB.json when it opened
}
interface Baseline { version: string; draw: string; comparisons: number; gen: Record<string, string>; rubric: Record<string, string>; missing?: string[]; fingerprint?: string; championCritical?: string[]; completedAt: string }
const MAX_REFILLS = 2;   // a failed baseline slot is redrawn alone up to twice before it is left out (or, past half the slots, a person is asked)
interface Champion { working: string; release: string | null; initialReleaseReference: string; promotions: number; promotionsSinceValidation: number }
/** A session bounds the stop rules: they count ledger entries and calls since `start`, and `evo4 session` opens a new one. */
interface Session { startedAt: string; ledgerStart: number; callsStart: number }

// Only `next` (and `capability --blind`) print job lines. `ingest` advances silently, so a dispatcher that spawns
// whatever it reads after `next` can never spawn the same job twice.
let PRINT = false;
function emit(job: Record<string, unknown>) { if (PRINT) console.log(JSON.stringify(job)); }
// module-level constants must sit above the command switch below, which runs at load time
const GEMINI_LOCK_STALE_MS = 10 * 60 * 1000;   // longer than one call with three 61-second 429 waits
const EVO4 = `${Deno.env.get("EVO4_ROOT") ? `EVO4_ROOT=${ROOT} ` : ""}deno run --config evolve/deno.json --env-file=.env.local -A evolve/v4/runner/evo4.ts`;

class Lineage {
  constructor(public name: string) {}
  get def() { return cfg.lineages[this.name]; }
  get lane() { return cfg.lanes[this.def.lane]; }
  get dir() { return `${ROOT}/${this.name}`; }
  get spans(): { id: string; text: string }[] { return SPANS[this.name]?.protected_spans ?? []; }
  metricOpts(): MetricOptions { return { canBrowse: Boolean(this.lane.canBrowse), wordsMin: cfg.wordsPerTurn.min, wordsMax: cfg.wordsPerTurn.max, turnsMin: cfg.turns.min, turnsMax: cfg.turns.max, pdCutoff: cfg.pdCutoff }; }
  laneSettings(): Record<string, unknown> { return this.lane.kind === "api" ? { temperature: this.lane.temperature, thinkingLevel: this.lane.thinkingLevel, maxOutputTokens: this.lane.maxOutputTokens } : { agentType: this.lane.agentType, effort: this.lane.effort }; }
}

/** Run a per-lineage command for every requested lineage; an error in one is reported as `<lineage>: ERROR …` and never
 *  stops the others (the lineages never share a gate, so they must not share a failure). Exit code 1 if any failed. */
/** Commands that act on one lineage (challenge, validate) must name it. */
function oneLineage(): string {
  if (!args.lineage || args.lineage === "all") { console.error(`${args._[0]} needs --lineage <${Object.keys(cfg.lineages).join("|")}>`); Deno.exit(2); }
  if (!cfg.lineages[String(args.lineage)]) { console.error(`unknown lineage ${args.lineage}`); Deno.exit(2); }
  return String(args.lineage);
}

async function eachLineage(fn: (L: Lineage) => Promise<void>) {
  let failed = 0;
  for (const l of lineagesRequested) {
    try { await fn(new Lineage(l)); }
    catch (e) { failed++; console.log(`${l}: ERROR ${(e as Error).message}`); }
  }
  // exit 1 only when no lineage could run: an ERROR line for one lineage is that lineage's stop, not the command's failure
  if (failed && failed === lineagesRequested.length) Deno.exit(1);
}

switch (args._[0]) {
  case "bootstrap": await eachLineage(bootstrap); break;
  case "next": PRINT = true; await eachLineage(next); break;
  case "ingest": await eachLineage(ingest); await capabilityIngest().catch((e) => console.log(`capability: ERROR ${(e as Error).message}`)); break;
  case "challenge": await challenge(new Lineage(oneLineage())).catch((e) => { console.log(`${args.lineage}: ERROR ${(e as Error).message}`); Deno.exit(1); }); break;
  case "validate": await validateCmd(new Lineage(oneLineage())).catch((e) => { console.log(`${args.lineage}: ERROR ${(e as Error).message}`); Deno.exit(1); }); break;
  case "capability": PRINT = true; await capability(); break;
  case "session": await eachLineage(newSession); break;
  case "status": await eachLineage(status); break;
  case "ledger": console.log(await Deno.readTextFile(`${new Lineage(lineagesRequested[0]).dir}/ledger.jsonl`).catch(() => "(empty)")); break;
  case "metrics": await metricsCmd(); break;
  case "gemini-batch": await geminiBatch(new Lineage(lineagesRequested[0])); break;
  default: console.error("unknown command"); Deno.exit(2);
}

// ---------- bootstrap ----------

async function bootstrap(L: Lineage) {
  // a second bootstrap would reset promotions and the release pointer; it needs --force
  if ((await exists(`${L.dir}/champion.json`)) && !args.force) { console.log(`${L.name}: already bootstrapped (champion.json exists); pass --force to start the lineage over`); return; }
  const champion = (args.champion as string) ?? L.def.champion;
  const file = `${L.dir}/versions/${champion}.md`;
  if (!(await exists(file))) await writeText(file, await Deno.readTextFile(`${ROOT}/prompts/${L.def.subject}.${champion}.md`));
  if (!(await exists(`${L.dir}/versions/${champion}.json`))) await writeJson(`${L.dir}/versions/${champion}.json`, { version: champion, parent: null, kind: "BASELINE", status: "working champion", origin: `prompts/${L.def.subject}.${champion}.md`, createdAt: now() });
  await writeJson(`${L.dir}/champion.json`, { working: champion, release: null, initialReleaseReference: L.def.initialReleaseReference ?? champion, promotions: 0, promotionsSinceValidation: 0 } as Champion);
  await writeJson(`${L.dir}/session.json`, { startedAt: now(), ledgerStart: (await readLedger(L)).length, callsStart: await callsCount(L) } as Session);
  const exp = newExp(L, "iteration", "BASELINE", champion, 0);
  await saveExp(L, exp);
  console.log(`${L.name}: opened ${exp.id} in BASELINE for ${champion}`);
}

/** Start a new session: the stop rules count from here. A STOPPED lineage resumes with a new iteration. */
async function newSession(L: Lineage) {
  await writeJson(`${L.dir}/session.json`, { startedAt: now(), ledgerStart: (await readLedger(L)).length, callsStart: await callsCount(L) } as Session);
  const exp = await currentExp(L);
  if (exp.state === "STOPPED") {
    const champ = await readJson(`${L.dir}/champion.json`) as Champion;
    await openIteration(L, champ, exp.iteration + 1, `resumed after: ${exp.reason ?? "stop"}`);
  }
  console.log(`${L.name}: new session from ledger entry ${(await readLedger(L)).length + 1}; state ${(await currentExp(L)).state}`);
}

// ---------- next ----------

async function next(L: Lineage): Promise<void> {
  const exp = await currentExp(L);
  const champ = await readJson(`${L.dir}/champion.json`) as Champion;
  // the stop rules are applied in emitOptimizer, at the iteration boundary: stopping here could overwrite PROMOTED
  // before the pointer moves, or abandon a DECIDING experiment whose judgments are already paid for
  // outputs written but not yet ingested: printing their jobs again would invite a second spawn
  // Gemini outputs are left out: the background batch writes them one by one, it never needs a respawn, and a WAIT here
  // would send the dispatcher to ingest before it spawned the other lineage's freshly printed jobs (counting them as misses)
  const unread: string[] = [];
  for (const [id, j] of Object.entries(exp.jobs)) if (!j.done && j.kind !== "gemini" && j.outPath && (await exists(j.outPath))) unread.push(id);
  if (unread.length) { console.log(`${L.name}: WAIT ${unread.length} output(s) not yet ingested (${unread.slice(0, 3).join(", ")}${unread.length > 3 ? ", …" : ""}); run ingest`); return; }
  switch (exp.state) {
    case "BASELINE": case "REBASELINING":
      return emitGeneration(L, exp, [exp.champion], await questionsFor(exp), 1, exp.samples);
    case "OPTIMIZING":
      return emitOptimizer(L, exp, champ);
    case "GENERATING":
      return emitGeneration(L, exp, [exp.challenger!], await questionsFor(exp), 1, exp.samples);
    case "RETESTING":   // fresh samples for BOTH sides so no pair reuses a cached champion draw
      return emitGeneration(L, exp, [exp.champion, exp.challenger!], await questionsFor(exp), exp.stage1Samples + 1, exp.samples);
    case "EVALUATING":
      return emitRubric(L, exp);
    case "COMPARING":
      return emitBlind(L, exp);
    case "DECIDING":
      await (exp.kind === "validation" ? runValidationGate(L, exp) : runGate(L, exp)); return next(L);
    case "VALIDATING":
      return emitGeneration(L, exp, [exp.champion, exp.challenger!], await questionsFor(exp), exp.stage === 1 ? 1 : exp.stage1Samples + 1, exp.samples);
    case "PROMOTED":
      return afterPromote(L, exp, champ);
    case "REJECTED": case "KEPT": case "ESCALATED": case "RELEASED": case "ROLLED_BACK": case "EXPERIMENTAL":
      return openNextIteration(L, exp, champ);
    case "STOPPED": console.log(`${L.name}: STOPPED ${exp.reason ?? ""}`); return;
    case "NEEDS_HUMAN": console.log(`${L.name}: NEEDS_HUMAN ${exp.reason ?? ""}`); return;
    case "LINTING": console.log(`${L.name}: WAIT an optimizer output was being checked when the runner stopped; run ingest`); return;
    default: console.log(`${L.name}: NEEDS_HUMAN unknown state ${exp.state}`);
  }
}

async function emitGeneration(L: Lineage, exp: ExpState, versions: string[], questions: Question[], fromSample: number, toSample: number) {
  let geminiPending = 0, geminiWritten = 0;
  for (const v of versions) {
    const { system, userTemplate, hash } = await loadVersion(L, v);
    for (const q of questions) {
      for (let s = fromSample; s <= toSample; s++) {
        const jobId = `gen.${v}.q${q.idx}.s${s}`;
        if (exp.jobs[jobId]?.done) continue;
        // `draw` = the experiment id: a promoted challenger is re-generated under the new experiment, never reusing its
        // winning samples; a baseline slot refilled after a failure gets a salted draw so it is a fresh sample
        const refill = exp.refills?.[`q${q.idx}.s${s}`];
        const draw = refill ? `${exp.id}#refill${refill}` : exp.id;
        const key = await genKey({ lineage: L.name, lane: L.def.lane, promptHash: hash, model: L.lane.model, settings: { ...L.laneSettings(), draw }, questionId: q.id, questionText: q.text, envelopeVersion: cfg.envelopeVersion ?? "1", sample: s });
        const prev = exp.jobs[jobId];
        const base = { lineage: L.name, cacheKey: key, version: v, q: q.idx, s, attempts: prev?.attempts ?? 0, misses: prev?.misses ?? 0 };
        if (await exists(`${C(exp)}/gen/${key}.json`)) { exp.jobs[jobId] = { kind: L.lane.kind === "api" ? "gemini" : "generate", outPath: "", done: true, ...base, unusable: Boolean((await readJson(`${C(exp)}/gen/${key}.json`)).unusable) }; continue; }
        const user = userTemplate.replace("{{question}}", q.text) + "\n\n" + envelopeNote();
        // a refilled slot gets new file names too: the failed attempt's output is still on disk and must not be read again
        const salt = refill ? `#refill${refill}` : "";
        if (L.lane.kind === "api") {
          const outPath = `${expDir(L, exp)}/out/${jobId}${refill ? `.refill${refill}` : ""}.json`;
          exp.jobs[jobId] = { kind: "gemini", outPath, done: false, ...base };
          if (await exists(outPath)) geminiWritten++; else geminiPending++;
        }
        else {
          // the worker's files sit under an opaque name: the path must not tell it its version, lineage or experiment
          const { promptPath, outPath } = prev?.promptPath ? { promptPath: prev.promptPath, outPath: prev.outPath } : await inboxPaths(L, exp, jobId + salt);
          if (!prev?.promptPath || !(await exists(promptPath))) await writeText(promptPath, frameWorkerPrompt(system, user));
          exp.jobs[jobId] = { kind: "generate", outPath, promptPath, done: false, ...base, printed: prev?.printed || PRINT };
          emit({ id: jobId, lineage: L.name, kind: "generate", agentType: L.lane.agentType, model: L.lane.model, effort: L.lane.effort, promptPath, outPath });
        }
      }
    }
  }
  await saveExp(L, exp);
  if (geminiPending) {
    // one batch per experiment at a time: a second process would call the free-tier API for the same jobs
    const lock = await readJson(`${expDir(L, exp)}/gemini.lock`).catch(() => null) as { heartbeat: number } | null;
    if (lock && Date.now() - lock.heartbeat < GEMINI_LOCK_STALE_MS) { if (PRINT) console.log(`${L.name}: WAIT gemini-batch running (${geminiWritten} written, ${geminiPending} to go)`); }
    else emit({ id: "gemini-batch", lineage: L.name, kind: "gemini-batch", pending: geminiPending, command: `${EVO4} gemini-batch --lineage ${L.name} --exp ${exp.id}` });
  }
  else if (geminiWritten) { if (PRINT) console.log(`${L.name}: WAIT ${geminiWritten} Gemini output(s) written; the next ingest reads them`); }
  else if (allDone(exp, ["generate", "gemini"])) await afterGeneration(L, exp);
}

async function emitOptimizer(L: Lineage, exp: ExpState, champ: Champion) {
  const a = cfg.agents.optimizer;
  const promptPath = `${expDir(L, exp)}/jobs/optimizer.md`;
  if (exp.jobs.optimizer && !exp.jobs.optimizer.done) {
    if (await exists(exp.jobs.optimizer.outPath)) { console.log(`${L.name}: WAIT optimizer output present; run ingest`); return; }
    // once printed, the input is frozen (an agent may be reading it; a respawn carries the runner's appended problems);
    // before the first print it is rebuilt, so it carries the freshest capability reference (the other lineage's
    // baseline may have finished after this job was created)
    if (exp.jobs.optimizer.printed || exp.jobs.optimizer.attempts > 0 || !PRINT) {
      if (PRINT && !exp.jobs.optimizer.printed) { exp.jobs.optimizer.printed = true; await saveExp(L, exp); }
      emit({ id: "optimizer", lineage: L.name, kind: "optimizer", agentType: a.agentType, model: a.model, effort: a.effort, promptPath, outPath: exp.jobs.optimizer.outPath });
      return;
    }
  }
  // the stop rules apply here, at the iteration boundary, before any new work is opened
  const stop = stopReason(await sessionStats(L), cfg.stop);
  if (stop) { if (exp.jobs.optimizer && !exp.jobs.optimizer.done) delete exp.jobs.optimizer; exp.state = "STOPPED"; exp.reason = stop; await saveExp(L, exp); console.log(`${L.name}: STOPPED ${stop}`); return; }
  const base = await readJson(`${L.dir}/baseline.json`).catch(() => null) as Baseline | null;
  // every redraw opens a new experiment: the experiment id is the draw in the generation cache key, so a redraw inside
  // the same experiment would return the very transcripts it is meant to replace
  if (!base || base.version !== champ.working) return redraw(L, exp, champ, `no baseline for the working champion ${champ.working}`);
  if (base.comparisons >= cfg.promotion.refreshBaselineAfterComparisons) return redraw(L, exp, champ, `baseline refreshed after ${base.comparisons} comparisons`);   // their rule: a long-lived cached bundle is redrawn
  // README 10: a change to an evaluator, judge, model, effort, lane setting, envelope, rubric map or Set A question starts a
  // new baseline. New cache keys alone do not do it, because baseline.json names its cached transcripts and cards directly.
  const fp = await fingerprint(L);
  if (base.fingerprint && base.fingerprint !== fp) return redraw(L, exp, champ, "the evaluation configuration changed since this baseline was drawn");
  const results = await championResults(base, setA());
  // the brief without its lane-profile catalogue: this optimizer reads its own profile only, never the other worker's
  const role = await Deno.readTextFile(`${ROOT}/${a.role}`), cut = role.indexOf("\n## Lane profiles");
  const brief = (cut >= 0 ? role.slice(0, cut).replace(/\n-{3,}\s*$/, "") : role).replace("{{LANE_PROFILE}}", laneProfile(L));
  const { system } = await loadVersion(L, champ.working);
  const bans = ((await readJson(`${L.dir}/bans.json`).catch(() => [])) as { target: string; until: number }[]).filter((b) => b.until > exp.iteration);
  const ablation = cfg.optimizer.ablationEveryN > 0 && exp.iteration > 0 && exp.iteration % cfg.optimizer.ablationEveryN === 0 && countWords(system) > cfg.optimizer.ablationWhileWordsAbove;
  exp.ablation = ablation;
  const capRef = cfg.optimizer.capabilityReference ? await capabilityReferenceFor(L) : undefined;
  const input = buildOptimizerInput({
    brief, lineage: L.name, championVersion: champ.working,
    championStatus: champ.release && champ.release !== champ.working ? `working champion (release champion is ${champ.release})` : "working champion",
    championPrompt: system, protectedSpans: L.spans, results, ledger: (await readLedger(L)).slice(-(cfg.optimizer.historyIterations ?? 10)), banned: bans,
    budget: { ceiling: cfg.prompt.maxWords, maxGrowthFraction: cfg.prompt.maxGrowthPerChallenger, wordsNow: countWords(system), ablationIteration: ablation },
    capabilityReference: capRef, parentResetNotice: exp.reason?.startsWith("rolled back") ? "The base prompt changed after a failed validation; a fresh Set A baseline was supplied." : undefined,
    nextVersion: nextVersionName(await listVersions(L)),
  });
  await writeText(promptPath, input);
  exp.jobs.optimizer = { kind: "optimizer", lineage: L.name, promptPath, outPath: `${expDir(L, exp)}/out/optimizer.json`, done: false, attempts: 0, misses: exp.jobs.optimizer?.misses ?? 0, printed: PRINT };
  await saveExp(L, exp);
  emit({ id: "optimizer", lineage: L.name, kind: "optimizer", agentType: a.agentType, model: a.model, effort: a.effort, promptPath, outPath: exp.jobs.optimizer.outPath });
}

/** Close this experiment and redraw the working champion's baseline in a new one (fresh draw id, fresh samples). */
async function redraw(L: Lineage, exp: ExpState, champ: Champion, reason: string) {
  if (exp.jobs.optimizer && !exp.jobs.optimizer.done) delete exp.jobs.optimizer;
  exp.reason = `superseded: ${reason}`; await saveExpOnly(L, exp);
  const e = newExp(L, "iteration", "REBASELINING", champ.working, exp.iteration); e.reason = reason;
  await saveExp(L, e);
  console.log(`${L.name}: ${reason}; opened ${e.id} to redraw the baseline`);
  return next(L);
}

/** One rubric job per generation in this experiment whose card is not cached. Input: situation, type, worker note, deterministic checks, one debate. */
async function emitRubric(L: Lineage, exp: ExpState) {
  const brief = await Deno.readTextFile(`${ROOT}/${cfg.agents.rubric.role}`);
  const a = cfg.agents.rubric;
  const questions = await questionsFor(exp);
  for (const [genId, j] of Object.entries(exp.jobs)) {
    if (!genId.startsWith("gen.") || !j.done) continue;
    const jobId = genId.replace("gen.", "rubric.");
    if (exp.jobs[jobId]?.done) continue;
    if (!j.cacheKey || j.unusable) {   // missing or not a debate: nothing to score; recorded, never a zero
      exp.jobs[jobId] = { kind: "rubric", lineage: L.name, outPath: "", done: true, version: j.version, q: j.q, s: j.s, attempts: 0 };
      await appendText(`${expDir(L, exp)}/missing.log`, `${jobId}: not scored, the generation is ${j.cacheKey ? "not a debate" : "missing"}\n`);
      continue;
    }
    const gen = await readJson(`${C(exp)}/gen/${j.cacheKey}.json`);
    const q = questions.find((x) => x.idx === j.q)!;
    const key = await rubricKey({ transcriptHash: gen.transcriptHash, rubricVersion: a.version, model: a.model, effort: a.effort, questionType: q.type, canBrowse: Boolean(L.lane.canBrowse) });
    const prev = exp.jobs[jobId];
    const base = { lineage: L.name, cacheKey: key, version: j.version, q: j.q, s: j.s, attempts: prev?.attempts ?? 0, misses: prev?.misses ?? 0 };
    if (await exists(`${C(exp)}/rubric/${key}.json`)) { exp.jobs[jobId] = { kind: "rubric", outPath: "", done: true, ...base }; continue; }
    // opaque file names: the evaluator must not learn the lineage, the version or the experiment from the path;
    // an existing input is kept, because a respawn carries the problems the runner appended to it
    const refill = exp.refills?.[`q${j.q}.s${j.s}`];
    const { promptPath, outPath } = prev?.promptPath ? { promptPath: prev.promptPath, outPath: prev.outPath } : await inboxPaths(L, exp, jobId + (refill ? `#refill${refill}` : ""));
    if (!prev?.promptPath || !(await exists(promptPath))) await writeText(promptPath, buildRubricInput(brief, q, gen.debate, Boolean(L.lane.canBrowse), deterministicChecks(gen)));
    exp.jobs[jobId] = { kind: "rubric", outPath, promptPath, done: false, ...base, printed: prev?.printed || PRINT };
    emit({ id: jobId, lineage: L.name, kind: "rubric", agentType: a.agentType, model: a.model, effort: a.effort, promptPath, outPath });
  }
  await saveExp(L, exp);
  if (allDone(exp, ["rubric"])) await afterRubric(L, exp);
}

/** One blind job per (question, sample): champion sample s vs challenger sample s, slot by hash. Input: situation, type, two debates. */
async function emitBlind(L: Lineage, exp: ExpState) {
  const brief = await Deno.readTextFile(`${ROOT}/${cfg.agents.blind.role}`);
  const a = cfg.agents.blind;
  for (const q of await questionsFor(exp)) {
    for (let s = 1; s <= exp.samples; s++) {
      const jobId = `blind.q${q.idx}.s${s}`;
      if (exp.jobs[jobId]?.done) continue;
      const ck = await championGenKey(L, exp, q.idx, s), xk = exp.jobs[`gen.${exp.challenger}.q${q.idx}.s${s}`]?.cacheKey;
      const champ = ck ? await readJson(`${C(exp)}/gen/${ck}.json`) : null, chal = xk ? await readJson(`${C(exp)}/gen/${xk}.json`) : null;
      if (!champ || !chal || champ.unusable || chal.unusable) {   // a side is missing or not a debate: a missing pair, never a tie
        exp.jobs[jobId] = { kind: "blind", lineage: L.name, outPath: "", done: true, q: q.idx, s, attempts: 0 };
        const side = !champ || champ.unusable ? "champion" : "challenger", rec = side === "champion" ? champ : chal;
        await appendText(`${expDir(L, exp)}/missing.log`, `${jobId}: not judged, the ${side} sample is ${rec ? "not a debate" : "missing"}\n`);
        continue;
      }
      const slot = await championSlot(exp.id, ck!, xk!);
      const A = slot === "A" ? champ : chal, B = slot === "A" ? chal : champ;
      if (contaminated(A.debate) || contaminated(B.debate)) { exp.jobs[jobId] = { kind: "blind", lineage: L.name, outPath: "", done: true, q: q.idx, s, attempts: 0 }; await appendText(`${expDir(L, exp)}/contaminated.log`, `${jobId}: judge-targeting text in a transcript; pair excluded\n`); continue; }
      const key = await blindKey({ aHash: A.transcriptHash, bHash: B.transcriptHash, judgeVersion: a.version, model: a.model, effort: a.effort });
      const prev = exp.jobs[jobId];
      const base = { lineage: L.name, cacheKey: key, q: q.idx, s, attempts: prev?.attempts ?? 0, misses: prev?.misses ?? 0 };
      if (await exists(`${C(exp)}/blind/${key}.json`)) { exp.jobs[jobId] = { kind: "blind", outPath: "", done: true, ...base }; continue; }
      const { promptPath, outPath } = prev?.promptPath ? { promptPath: prev.promptPath, outPath: prev.outPath } : await inboxPaths(L, exp, jobId);
      if (!prev?.promptPath || !(await exists(promptPath))) await writeText(promptPath, buildBlindInput(brief, q, A.debate, B.debate));
      exp.jobs[jobId] = { kind: "blind", outPath, promptPath, done: false, ...base, printed: prev?.printed || PRINT };
      emit({ id: jobId, lineage: L.name, kind: "blind", agentType: a.agentType, model: a.model, effort: a.effort, promptPath, outPath });
    }
  }
  await saveExp(L, exp);
  if (allDone(exp, ["blind"])) {
    if (exp.kind === "validation") { await runValidationGate(L, exp); return; }
    exp.state = transition(exp.state, "compared"); await saveExp(L, exp); return next(L);
  }
}

/** Opaque, lineage-neutral paths for an agent's input and output (README 4 "who sees what"): the name is a hash, and
 *  Set B jobs live under runner-only/ so nothing from a validation lands next to a Set A file. */
async function inboxPaths(L: Lineage, exp: ExpState, jobId: string): Promise<{ promptPath: string; outPath: string }> {
  const h = (await sha256(`${L.name}|${exp.id}|${jobId}`)).slice(0, 24);
  const dir = exp.kind === "validation" ? `${ROOT}/runner-only/inbox` : `${ROOT}/inbox`;
  return { promptPath: `${dir}/${h}.md`, outPath: `${dir}/${h}.json` };
}

/** What a baseline was drawn and scored under; any difference means its transcripts and cards are not comparable. */
async function fingerprint(L: Lineage): Promise<string> {
  const r = cfg.agents.rubric, b = cfg.agents.blind;
  return (await sha256(JSON.stringify({
    rubric: [r.version, r.model, r.effort], blind: [b.version, b.model, b.effort], lane: [L.lane.model, L.laneSettings()],
    envelope: cfg.envelopeVersion, map: RUBRIC_MAP, setA: setA().map((q) => [q.idx, q.id, q.text, q.type]), samples: cfg.samplesPerQuestion,
  }))).slice(0, 16);
}

// ---------- ingest ----------

async function ingest(L: Lineage) {
  const exp = await currentExp(L);
  const invalid: string[] = [];
  for (const [id, j] of Object.entries(exp.jobs)) {
    if (j.done || !j.outPath) continue;
    if (!(await exists(j.outPath))) {
      // printed, the batch returned, and no output: the agent did not write. Two such misses close the job
      // (a missing pair or card, an optimizer KEEP) instead of re-issuing it on every pass.
      // --no-miss: the agents did not all return cleanly (a usage limit, an interruption); count nothing, respawn later
      if (j.printed && j.kind !== "gemini" && !args["no-miss"]) {
        j.printed = false; j.misses = (j.misses ?? 0) + 1;
        if (j.misses >= 2) await closeMissing(L, exp, id, j, invalid, "the agent returned twice without writing its output");
        else invalid.push(`${id}: no output was written — respawn once`);
      }
      continue;
    }
    const rawText = await Deno.readTextFile(j.outPath);
    const obj = parseJsonLoose(rawText);
    j.attempts++; j.printed = false;
    await bumpCalls(L);   // every output read is a call spent, valid or not (the call budget must not undercount)
    try {
      if (j.kind === "generate" || j.kind === "gemini") {
        // a worker answer is recorded whatever it is (README 11 #15): not JSON, not a debate or invalid, it stays a failure on
        // record (validity false, counted by the critical check), never retried away. The Gemini batch wraps the reply as
        // {output, latencyMs, tokens}, with output null when the reply never completed; a subagent writes the debate itself.
        const debate = (!obj ? null : j.kind === "gemini" && "output" in obj ? obj.output : obj) as Debate;
        const v = validity(debate, L.metricOpts()), m = formMetrics(debate, L.metricOpts());
        const unusable = !debate || typeof debate !== "object" || !Array.isArray(debate.minds) || !Array.isArray(debate.debate) || !debate.debate.length;
        if (!obj) v.problems.unshift("not JSON");
        else if (unusable && obj.error) v.problems.unshift(`no reply: ${String(obj.error)}`);
        await writeJson(`${C(exp)}/gen/${j.cacheKey}.json`, { jobId: id, lineage: L.name, version: j.version, q: j.q, s: j.s, model: L.lane.model, settings: L.laneSettings(), debate, validity: v, metrics: m, unusable, latencyMs: obj?.latencyMs ?? null, tokens: obj?.tokens ?? null, raw: rawText.slice(0, 200_000), transcriptHash: await transcriptHash(debate ?? rawText), savedAt: now() });
        j.done = true; j.unusable = unusable;
      } else if (j.kind === "optimizer") {
        await ingestOptimizer(L, exp, j, obj, invalid);
      } else if (!obj) {
        await retire(L, exp, id, j, invalid, ["not JSON: return only the JSON object"]);
      } else if (j.kind === "rubric") {
        const raw = obj as unknown as RubricRaw;
        // cells are identified by id; the 35 long names are the runner's, so an evaluator that shortens one does not lose
        // the whole card (the schema requires each name verbatim)
        if (Array.isArray(raw.cells)) raw.cells = raw.cells.map((c) => (c && typeof c === "object" && CELL_NAME[c.id] ? { ...c, name: CELL_NAME[c.id] } : c));
        await normalise(`${ROOT}/${cfg.agents.rubric.schema}`, raw);
        const problems = await schemaProblems(`${ROOT}/${cfg.agents.rubric.schema}`, raw);
        if (!problems.length) problems.push(...validateRaw(raw, RUBRIC_MAP).problems);
        if (problems.length) { await retire(L, exp, id, j, invalid, problems); continue; }
        const card = scoreCard(raw, RUBRIC_MAP);
        await writeJson(`${C(exp)}/rubric/${j.cacheKey}.json`, { jobId: id, raw, card, rubricVersion: cfg.agents.rubric.version, savedAt: now() });
        j.done = true;
      } else if (j.kind === "blind") {
        const v = obj as unknown as BlindVerdict;
        await normalise(`${ROOT}/${cfg.agents.blind.schema}`, v);
        const problems = await schemaProblems(`${ROOT}/${cfg.agents.blind.schema}`, v);
        if ((v.winner === "tie") !== (v.margin === "none")) problems.push("winner tie if and only if margin none");
        if (problems.length) { await retire(L, exp, id, j, invalid, problems); continue; }
        await writeJson(`${C(exp)}/blind/${j.cacheKey}.json`, { jobId: id, verdict: v, judgeVersion: cfg.agents.blind.version, savedAt: now() });
        j.done = true;
      }
    } catch (e) {
      // a shape the checks did not anticipate is a validation problem for that one job, never a dead-ended lineage
      if (j.kind === "optimizer") await ingestOptimizer(L, exp, j, null, invalid, `could not be processed: ${(e as Error).message}`);
      else if (!j.done) await retire(L, exp, id, j, invalid, [`could not be processed: ${(e as Error).message}`]);
    }
  }
  await saveExp(L, exp);
  for (const line of invalid) console.log(`${L.name}: INVALID ${line}`);
  // advance exactly as `next` would, without printing: every emitter creates its missing jobs before it checks
  // whether the stage is complete, so a stage can never close on jobs that were not created yet
  await next(L);
  console.log(`${L.name}: state ${(await currentExp(L)).state}`);
}

/** The optimizer's output: schema, then the runner's proposal checks; problems go back into its input once, twice → KEEP. */
async function ingestOptimizer(L: Lineage, exp: ExpState, j: Job, obj: Record<string, unknown> | null, invalid: string[], failure?: string) {
  if (exp.state !== "OPTIMIZING") {   // stale: a manual challenger or a redraw took this iteration's slot
    j.done = true; await appendText(`${expDir(L, exp)}/missing.log`, `optimizer: output arrived in state ${exp.state}; ignored\n`); return;
  }
  const out = obj as unknown as OptimizerOutput;
  const { system } = await loadVersion(L, exp.champion);
  const problems: string[] = failure ? [failure] : !obj ? ["not JSON: return only the JSON object"] : await schemaProblems(`${ROOT}/${cfg.agents.optimizer.schema}`, out);
  if (!problems.length) {
    problems.push(...validateProposal(out, system, exp.champion, L.spans, { ceiling: cfg.prompt.maxWords, maxGrowthFraction: cfg.prompt.maxGrowthPerChallenger, userHeading: USER_HEADING, lint: cfg.lint, topicWords: setA().map((q) => q.topicWords ?? []) }));
    if (exp.ablation && out.action === "propose" && out.kind !== "ABLATE") problems.push(`this is an ablation iteration: the only allowed kind is ABLATE, got ${out.kind}`);
    // a banned target is listed in the input; a proposal aimed at it anyway is returned for repair, not tested
    const bans = ((await readJson(`${L.dir}/bans.json`).catch(() => [])) as { target: string; until: number }[]).filter((b) => b.until > exp.iteration);
    if (out.action === "propose") for (const t of out.hypothesis?.targets ?? []) { const b = bans.find((x) => x.target === t); if (b) problems.push(`target ${t} is banned until iteration ${b.until}; choose another cell or no_change`); }
  }
  exp.state = transition(exp.state, "optimizer_done");
  if (problems.length) {
    exp.state = transition(exp.state, "lint_failed"); exp.reason = problems.join(" | ");
    if (j.attempts >= 2) { j.done = true; await recordNonProposal(L, exp, "KEEP", `optimizer output rejected twice: ${exp.reason}`); exp.state = "KEPT"; invalid.push(`optimizer: rejected twice; iteration closed as KEEP`); return; }
    await appendText(j.promptPath ?? `${expDir(L, exp)}/jobs/optimizer.md`, `\n\n=== PREVIOUS ATTEMPT REJECTED BY THE RUNNER ===\n${problems.join("\n")}\nReturn the JSON object again, correcting these; do not change anything else.`);
    await Deno.remove(j.outPath).catch(() => {}); invalid.push(`optimizer: ${exp.reason} — the input file now carries the problems; respawn the job once`); return;
  }
  j.done = true;
  if (out.action === "no_change") { await recordNonProposal(L, exp, "KEEP", `optimizer: no_change — ${out.change_summary}`); exp.state = "KEPT"; exp.reason = out.change_summary; return; }
  if (out.action === "escalate") { await recordNonProposal(L, exp, "ESCALATE", `optimizer: escalate (${out.hypothesis.cause_type}) — ${out.next_system_action}`); exp.state = "ESCALATED"; exp.reason = out.next_system_action ?? ""; await appendText(`${L.dir}/escalations.log`, `${now()} ${exp.id} ${out.hypothesis.cause_type}: ${out.next_system_action}\n`); return; }
  const vName = nextVersionName(await listVersions(L));
  const ch = toChallenger(out, vName, system);
  await writeText(`${L.dir}/versions/${vName}.md`, `${ch.prompt.trim()}\n\n${USER_HEADING}\n\n{{question}}\n`);
  await writeJson(`${L.dir}/versions/${vName}.json`, { version: vName, parent: exp.champion, kind: ch.kind, hypothesis: ch.hypothesis, optimizer: out, diff: ch.diff, risks: ch.risks, blocked: ch.blocked, changelog: ch.changelog, wordCount: ch.wordCount, experiment: exp.id, status: "challenger", createdAt: now() });
  exp.challenger = vName; exp.state = transition(exp.state, "lint_ok");
}

/** An invalid judge or evaluator output: the problems are appended to its input and it is respawned once; after the
 *  second failure the job is closed as missing (never a tie, never a zero). */
async function retire(L: Lineage, exp: ExpState, id: string, j: Job, invalid: string[], problems: string[]) {
  const why = problems.slice(0, 5).join("; ");
  if (j.attempts >= 2) { await closeMissing(L, exp, id, j, invalid, why); return; }
  if (j.promptPath) await appendText(j.promptPath, `\n\n=== PREVIOUS ATTEMPT REJECTED BY THE RUNNER ===\n${problems.slice(0, 10).join("\n")}\nReturn the JSON object again, correcting these; do not change anything else.\n`);
  await Deno.remove(j.outPath).catch(() => {}); invalid.push(`${id}: ${why} — respawn once`);
}

/** Close a job that will not produce a usable output. An optimizer closes the iteration as KEEP. */
async function closeMissing(L: Lineage, exp: ExpState, id: string, j: Job, invalid: string[], why: string) {
  j.done = true; j.cacheKey = undefined;
  await appendText(`${expDir(L, exp)}/missing.log`, `${id}: ${why}\n`);
  invalid.push(`${id}: ${why} — closed as missing`);
  if (j.kind === "optimizer" && exp.state === "OPTIMIZING") { await recordNonProposal(L, exp, "KEEP", `optimizer produced no usable output: ${why}`); exp.state = "KEPT"; }
}

async function recordNonProposal(L: Lineage, exp: ExpState, outcome: "KEEP" | "ESCALATE", reason: string) {
  const entry: LedgerEntry = { id: exp.id, lineage: L.name, version: "(none)", base: exp.champion, kind: "REPLACE", hypothesis: { statement: reason, targets: [], expectedDelta: 0, mechanism: "", refutedIf: "" }, diffSummary: "", outcome, wins: 0, pairs: 0, pValue: 1, rubricMeanDelta: 0, perCategoryDelta: {}, cardsAfter: "", reason: "no challenger was tested", at: now() };
  await appendText(`${L.dir}/ledger.jsonl`, JSON.stringify(entry) + "\n");
}

async function afterGeneration(L: Lineage, exp: ExpState) {
  if (exp.state === "BASELINE" || exp.state === "REBASELINING" || exp.state === "VALIDATING") { await emitRubric(L, exp); return; }
  exp.state = transition(exp.state, "generated"); await saveExp(L, exp); await emitRubric(L, exp);
}

async function afterRubric(L: Lineage, exp: ExpState) {
  if (exp.state === "BASELINE" || exp.state === "REBASELINING") {
    // a slot enters the baseline only with a usable, uncontaminated transcript AND its card; a slot without them could
    // never be paired, so every later panel would be incomplete (KEEP) until the refresh
    const base: Baseline = { version: exp.champion, draw: exp.id, comparisons: 0, gen: {}, rubric: {}, missing: [], fingerprint: await fingerprint(L), completedAt: now() };
    for (const q of await questionsFor(exp)) for (let s = 1; s <= exp.samples; s++) {
      const slot = `q${q.idx}.s${s}`, g = exp.jobs[`gen.${exp.champion}.${slot}`], r = exp.jobs[`rubric.${exp.champion}.${slot}`];
      const clean = g?.cacheKey && !g.unusable && r?.cacheKey && !contaminated((await readJson(`${C(exp)}/gen/${g.cacheKey}.json`)).debate);
      if (clean) { base.gen[slot] = g.cacheKey!; base.rubric[slot] = r.cacheKey!; } else base.missing!.push(slot);
    }
    // each missing slot is redrawn alone, with a salted draw (a fresh sample, not the cached failure), up to MAX_REFILLS times
    const refill = base.missing!.filter((slot) => (exp.refills?.[slot] ?? 0) < MAX_REFILLS);
    if (refill.length) {
      exp.refills ??= {};
      for (const slot of refill) { exp.refills[slot] = (exp.refills[slot] ?? 0) + 1; delete exp.jobs[`gen.${exp.champion}.${slot}`]; delete exp.jobs[`rubric.${exp.champion}.${slot}`]; }
      await appendText(`${expDir(L, exp)}/missing.log`, `baseline: redrawing ${refill.map((s) => `${s} (redraw ${exp.refills![s]} of ${MAX_REFILLS})`).join(", ")}\n`);
      await saveExp(L, exp); return next(L);
    }
    const slots = (await questionsFor(exp)).length * exp.samples;
    if (base.missing!.length * 2 > slots) {
      // more than half the slots failed every draw: something is wrong with the champion, the worker or the evaluator
      exp.state = "NEEDS_HUMAN"; exp.reason = `baseline: ${base.missing!.length} of ${slots} slots failed ${MAX_REFILLS + 1} draws (${base.missing!.join(", ")}); see ${expDir(L, exp)}/missing.log`;
      await saveExp(L, exp); console.log(`${L.name}: NEEDS_HUMAN ${exp.reason}`); return;
    }
    // the champion is held to nothing at baseline, but a person should know when its own output fails the limits a
    // challenger must meet: such a gate rejects like-for-like challengers on form, whatever their quality
    const gens = await Promise.all(Object.values(base.gen).map((k) => readJson(`${C(exp)}/gen/${k}.json`)));
    base.championCritical = criticalCheck(gens.map((g) => g.validity), gens.map((g) => g.metrics), [], cfg.gate.critical);
    await writeJson(`${L.dir}/baseline.json`, base);
    if (base.missing!.length) console.log(`${L.name}: WARNING baseline ${base.version} has ${base.missing!.length} missing slot(s) after ${MAX_REFILLS} redraws (${base.missing!.join(", ")}); panels are judged on the remaining pairs`);
    if (base.championCritical.length) console.log(`${L.name}: WARNING the champion ${base.version}'s own baseline fails the critical limits a challenger must meet: ${base.championCritical.join(" | ")}`);
    exp.state = transition(exp.state, "baseline_done");
    if (exp.queued) return enterChallenger(L, exp, exp.queued.system, exp.queued.note, exp.queued.file);   // README step 5: the control queued before the baseline closed
    await saveExp(L, exp); return next(L);
  }
  if (exp.state === "VALIDATING") { await emitBlind(L, exp); return; }
  exp.state = transition(exp.state, "evaluated"); await saveExp(L, exp); await emitBlind(L, exp);
}

// ---------- gate ----------

async function runGate(L: Lineage, exp: ExpState) {
  if (exp.state !== "DECIDING") return;   // a decided experiment is never decided twice
  const champQ = await championCardsQ(L, exp), chalQ = await cardsForQ(exp, exp.challenger!);
  const champCards = champQ.map((x) => x.card), chalCards = chalQ.map((x) => x.card);
  const chalGens = await gensFor(exp, exp.challenger!);
  const regression = regressionCheck(champCards, chalCards, cfg.gate.regression);
  const critical = criticalCheck(chalGens.map((g) => g.validity), chalGens.map((g) => g.metrics), chalCards, cfg.gate.critical);
  if (chalCards.some((c) => c.provisional)) critical.push("a provisional (truncated) card cannot authorize a promotion");
  const pairs = await collectPairs(L, exp);
  const { wins, n } = tally(pairs);
  const qt = questionTally(pairs);
  // a baseline slot left out after its redraws has no champion sample to pair with: it is not an unjudged pair
  const baseMissing = ((await readJson(`${L.dir}/baseline.json`)) as Baseline).missing?.length ?? 0;
  const expected = (exp.stage === 1 ? cfg.gate.stage1.pairs : cfg.gate.stage1.pairs + cfg.gate.stage2.addPairs) - baseMissing;
  const out = decide({ stage: exp.stage, wins, n, regression, critical, expected }, cfg.gate);
  const meta = await readJson(`${L.dir}/versions/${exp.challenger}.json`);
  if (out.decision === "RETEST") {
    exp.stage = 2; exp.stage1Samples = exp.samples; exp.samples += Math.ceil(cfg.gate.stage2.addPairs / setA().length);
    exp.decision = "RETEST"; exp.reason = out.reason; exp.state = transition(exp.state, "retest"); await saveExp(L, exp);
    console.log(`${L.name}: RETEST: ${out.reason}`); return;
  }
  // idempotent across a crash: if this experiment's ledger line exists, its side effects (ledger, bans, comparison count,
  // version status) were applied before the crash; only the state transition is redone
  const ledgerAll = await readLedger(L), applied = ledgerAll.some((e) => e.id === exp.id);
  const esc = escalation(out.decision, meta.hypothesis.targets, ledgerAll.filter((e) => e.id !== exp.id).reverse(), cfg.gate.escalate, exp.iteration);
  if (esc.banned.length && !applied) { const bans = (await readJson(`${L.dir}/bans.json`).catch(() => [])) as unknown[]; await writeJson(`${L.dir}/bans.json`, [...bans, ...esc.banned]); }
  const decision = esc.decision;
  if (applied) {
    exp.decision = decision; exp.reason = out.reason; exp.state = transition(exp.state, decision.toLowerCase() as Event);
    await saveExp(L, exp); console.log(`${L.name}: ${decision}: ${exp.reason} (side effects already applied)`); return;
  }
  const entry: LedgerEntry = {
    id: exp.id, lineage: L.name, version: exp.challenger!, base: exp.champion, kind: meta.kind, hypothesis: meta.hypothesis,
    diffSummary: diffSummary({ diff: meta.diff } as Challenger), outcome: exp.stage === 2 ? `RETEST→${decision}` as LedgerEntry["outcome"] : decision,
    wins, pairs: n, pValue: out.pValue, rubricMeanDelta: regression.meanDelta, perCategoryDelta: perCategoryDelta(champQ, chalQ),
    cardsAfter: summarizeTargets(chalCards, meta.hypothesis.targets) + ` | question wins ${qt.questionWins}/${setA().length}, losses ${qt.questionLosses}/${setA().length}`,
    reason: out.reason + (esc.banned.length ? `; escalated: ${esc.banned.map((b) => b.target).join(", ")}` : ""), at: now(),
  };
  await appendText(`${L.dir}/ledger.jsonl`, JSON.stringify(entry) + "\n");
  await writeJson(`${expDir(L, exp)}/pairs.json`, pairs);
  const base = await readJson(`${L.dir}/baseline.json`) as Baseline; base.comparisons++; await writeJson(`${L.dir}/baseline.json`, base);
  exp.decision = decision; exp.reason = out.reason + (esc.banned.length ? `; escalated: ${esc.banned.map((b) => b.target).join(", ")}` : "");
  exp.state = transition(exp.state, decision.toLowerCase() as Event);
  await writeJson(`${L.dir}/versions/${exp.challenger}.json`, { ...meta, status: decision === "PROMOTE" ? "working champion" : decision.toLowerCase(), decidedAt: now(), wins, pairs: n, rubricMeanDelta: regression.meanDelta, questionTally: qt });
  await saveExp(L, exp);
  console.log(`${L.name}: ${decision}: ${exp.reason}`);
}

async function afterPromote(L: Lineage, exp: ExpState, champ: Champion) {
  // compare-and-swap: the pointer moves only from the parent this challenger was tested against. A pointer that already
  // names the challenger is this same promotion applied before a crash: continue without counting it twice.
  if (champ.working !== exp.champion && champ.working !== exp.challenger) { exp.state = "NEEDS_HUMAN"; exp.reason = `working champion is ${champ.working}, not the tested parent ${exp.champion}`; await saveExp(L, exp); return; }
  if (champ.working === exp.champion) {
    champ.working = exp.challenger!; champ.promotions++; champ.promotionsSinceValidation++;
    await writeJson(`${L.dir}/champion.json`, champ);
    await writeJson(`${L.dir}/versions/${exp.champion}.json`, { ...(await readJson(`${L.dir}/versions/${exp.champion}.json`)), status: "superseded", supersededBy: champ.working });
  }
  if (!cfg.promotion.redrawBaseline) {   // the v4.1 draft's behaviour; biased upward by about one point (README 5)
    const base: Baseline = { version: champ.working, draw: exp.id, comparisons: 0, gen: {}, rubric: {}, missing: [], completedAt: now() };
    for (const [id, j] of Object.entries(exp.jobs)) { if (!j.cacheKey || j.unusable || j.version !== champ.working) continue; const slot = `q${j.q}.s${j.s}`; if (id.startsWith("gen.")) base.gen[slot] = j.cacheKey; if (id.startsWith("rubric.")) base.rubric[slot] = j.cacheKey; }
    for (const slot of Object.keys(base.gen)) if (!base.rubric[slot]) { delete base.gen[slot]; base.missing!.push(slot); }
    await writeJson(`${L.dir}/baseline.json`, base);
  }
  // validation first when it is due; whatever it decides, the next iteration re-baselines the working champion
  // (openIteration sees that baseline.json belongs to an older version) — a rebaseline opened here would be orphaned
  if (champ.promotionsSinceValidation >= cfg.validation.everyPromotions) return openValidation(L);
  return openIteration(L, champ, exp.iteration + 1);
}

async function openNextIteration(L: Lineage, exp: ExpState, champ: Champion) {
  return openIteration(L, champ, exp.iteration + 1);
}

/** Open the next iteration: OPTIMIZING when baseline.json belongs to the working champion, else REBASELINING first. */
async function openIteration(L: Lineage, champ: Champion, iteration: number, reason?: string) {
  const base = await readJson(`${L.dir}/baseline.json`).catch(() => null) as Baseline | null;
  const state: State = base && base.version === champ.working ? "OPTIMIZING" : "REBASELINING";
  const e = newExp(L, "iteration", state, champ.working, iteration);
  if (reason) e.reason = reason;
  await saveExp(L, e);
  return next(L);
}

// ---------- manual challenger (champion selection, control experiments) ----------

/** `evo4 challenge`: a hand-written challenger takes the next iteration's slot. Entered during BASELINE/REBASELINING it is
 *  queued and tested as soon as the baseline closes (README step 5 can follow bootstrap at once, with no race against the
 *  optimizer job); entered at OPTIMIZING it withdraws the optimizer job if that job has not produced an output. */
async function challenge(L: Lineage) {
  const exp = await currentExp(L);
  const raw = String(args.file ?? "");
  // a relative path is tried from the working directory, then from the package root (README writes prompts/…)
  const file = (await exists(raw)) ? raw : (await exists(`${ROOT}/${raw}`)) ? `${ROOT}/${raw}` : null;
  if (!file) { console.error(`${L.name}: --file ${raw} not found (tried it and ${ROOT}/${raw})`); Deno.exit(2); }
  const text = await Deno.readTextFile(file);
  const i = text.indexOf(USER_HEADING);
  const system = (i >= 0 ? text.slice(0, i) : text).trim();
  const note = String(args.note ?? `manual challenger from ${raw}`);
  if (exp.state === "BASELINE" || exp.state === "REBASELINING") {
    if (exp.queued) { console.error(`${L.name}: a manual challenger is already queued (${exp.queued.file})`); Deno.exit(2); }
    exp.queued = { system, note, file: raw }; await saveExp(L, exp);
    console.log(`${L.name}: queued ${raw} as the manual challenger; it is tested as soon as the ${exp.state === "BASELINE" ? "" : "re"}baseline of ${exp.champion} closes`);
    return;
  }
  if (exp.state !== "OPTIMIZING") { console.error(`${L.name}: a manual challenger needs BASELINE, REBASELINING or OPTIMIZING (now ${exp.state})`); Deno.exit(2); }
  if (exp.jobs.optimizer && !exp.jobs.optimizer.done) {
    if (await exists(exp.jobs.optimizer.outPath)) { console.error(`${L.name}: an optimizer output is waiting to be ingested; ingest it or delete ${exp.jobs.optimizer.outPath} first`); Deno.exit(2); }
    delete exp.jobs.optimizer;   // the manual challenger takes this iteration's slot; the unspawned optimizer job is withdrawn
  }
  await enterChallenger(L, exp, system, note, raw);
}

async function enterChallenger(L: Lineage, exp: ExpState, system: string, note: string, file: string) {
  const { system: champion } = await loadVersion(L, exp.champion);
  const vName = nextVersionName(await listVersions(L));
  const sp = (await import("./spans.ts")).checkSpans(system, L.spans);
  if (!sp.ok) console.log(`${L.name}: WARNING manual challenger breaks protected spans: missing ${sp.missing.join(",") || "none"}; duplicated ${sp.duplicated.join(",") || "none"} (allowed for a control, recorded)`);
  await writeText(`${L.dir}/versions/${vName}.md`, `${system}\n\n${USER_HEADING}\n\n{{question}}\n`);
  await writeJson(`${L.dir}/versions/${vName}.json`, { version: vName, parent: exp.champion, kind: "REWRITE", manual: true, origin: file, hypothesis: { statement: note, targets: [], expectedDelta: 0, mechanism: "manual", refutedIf: "the gate rejects it" }, diff: [{ before: `(the whole ${exp.champion} system prompt)`, after: `(the whole system prompt of ${file})` }], risks: [], blocked: [], changelog: note, wordCount: { before: countWords(champion), after: countWords(system) }, brokenSpans: sp.ok ? [] : [...sp.missing, ...sp.duplicated], experiment: exp.id, status: "challenger", createdAt: now() });
  exp.challenger = vName; exp.manual = true; exp.queued = undefined; exp.state = "GENERATING"; await saveExp(L, exp);
  console.log(`${L.name}: entered ${vName} (${file}) as a manual challenger of ${exp.champion}`);
  return next(L);
}

// ---------- outer validation (Set B) ----------

/** `evo4 validate`: only at an iteration boundary, so no in-flight experiment is orphaned. */
async function validateCmd(L: Lineage) {
  const exp = await currentExp(L);
  // an exhausted Set B is refused before any state changes: a voluntary validation must not park the lineage
  const setB = await readJson(`${ROOT}/${cfg.sets.B}`);
  if ((setB.uses ?? 0) >= (cfg.validation.maxUsesBeforeRefresh ?? Infinity)) { console.error(`${L.name}: Set B has been used ${setB.uses} times (limit ${cfg.validation.maxUsesBeforeRefresh}); refresh runner-only/setB.json (new questions, uses 0) first`); Deno.exit(2); }
  const boundary = ["REJECTED", "KEPT", "ESCALATED", "RELEASED", "ROLLED_BACK", "EXPERIMENTAL", "STOPPED", "NEEDS_HUMAN"].includes(exp.state) || (exp.state === "OPTIMIZING" && !exp.jobs.optimizer?.printed);
  if (!boundary) { console.error(`${L.name}: validate only between iterations (now ${exp.state}${exp.jobs.optimizer?.printed ? " with an optimizer job out" : ""}); run it when the current experiment has been decided`); Deno.exit(2); }
  if (exp.jobs.optimizer && !exp.jobs.optimizer.done) { delete exp.jobs.optimizer; await saveExp(L, exp); }
  return openValidation(L);
}

async function openValidation(L: Lineage) {
  const champ = await readJson(`${L.dir}/champion.json`) as Champion;
  const iteration = (await currentExp(L).catch(() => ({ iteration: 0 }))).iteration;
  const reference = champ.release ?? champ.initialReleaseReference;   // first validation compares against the production prompt, never against itself
  if (reference === champ.working) {
    champ.release = champ.working; champ.promotionsSinceValidation = 0; await writeJson(`${L.dir}/champion.json`, champ);
    await appendText(`${L.dir}/validations.log`, `${now()} release champion := ${champ.working} (identical to the reference)\n`);
    return openIteration(L, champ, iteration + 1);
  }
  // README 9.3: Set B is refreshed after maxUsesBeforeRefresh validations; that is a person's job (new held-out texts)
  const setB = await readJson(`${ROOT}/${cfg.sets.B}`);
  if ((setB.uses ?? 0) >= (cfg.validation.maxUsesBeforeRefresh ?? Infinity)) {
    const e = newExp(L, "iteration", "NEEDS_HUMAN", champ.working, iteration);
    e.reason = `Set B has been used ${setB.uses} times (limit ${cfg.validation.maxUsesBeforeRefresh}): refresh runner-only/setB.json (new questions, uses 0), then run evo4 validate --lineage ${L.name}`;
    await saveExp(L, e); console.log(`${L.name}: NEEDS_HUMAN ${e.reason}`); return;
  }
  await ensureVersionFile(L, reference);
  const exp = newExp(L, "validation", "VALIDATING", reference, iteration);
  exp.challenger = champ.working; exp.samples = cfg.validation.samplesPerQuestion; exp.stage1Samples = exp.samples;
  // Set B is shared and rotates after a PASS; the validation keeps the questions it opened with (stored behind the wall).
  // The use is reserved now, not at the decision, so two lineages validating at once cannot exceed the refresh limit.
  exp.questions = await loadSetB();
  setB.uses = (setB.uses ?? 0) + 1; await writeJson(`${ROOT}/${cfg.sets.B}`, setB); exp.setBUses = true;
  await saveExp(L, exp);
  console.log(`${L.name}: opened ${exp.id}: working ${champ.working} vs reference ${reference} on Set B`);
  return next(L);
}

async function runValidationGate(L: Lineage, exp: ExpState) {
  if (exp.state !== "VALIDATING") return;   // a decided validation is never decided twice (no second rotation, no second log line)
  const champ = await readJson(`${L.dir}/champion.json`) as Champion;
  const refCards = await cardsFor(exp, exp.champion), workCards = await cardsFor(exp, exp.challenger!);
  const regression = regressionCheck(refCards, workCards, cfg.gate.regression);
  const gens = await gensFor(exp, exp.challenger!);
  const critical = criticalCheck(gens.map((g) => g.validity), gens.map((g) => g.metrics), workCards, cfg.gate.critical);
  const { wins, n } = tally(await collectPairs(L, exp));
  let out = releaseDecide({ wins, n, meanDelta: regression.meanDelta, stage: exp.stage, critical }, cfg.validation);
  // an incomplete panel is never a release and never a loss (README 5, 11 #17): without a critical failure, missing pairs
  // make the validation INCONCLUSIVE (stage 1 adds a sample per question; stage 2 ends EXPERIMENTAL)
  const expected = (await questionsFor(exp)).length * exp.samples;
  if (!critical.length && n < expected) out = { decision: "INCONCLUSIVE", reason: `incomplete: only ${n} of ${expected} pairs judged (blind ${wins}/${n}, rubric ${regression.meanDelta >= 0 ? "+" : ""}${regression.meanDelta.toFixed(2)})` };
  if (out.decision === "INCONCLUSIVE" && exp.stage === 1) {
    exp.stage = 2; exp.stage1Samples = exp.samples; exp.samples += cfg.validation.inconclusiveAddSamples; exp.reason = out.reason;
    await saveExp(L, exp); console.log(`${L.name}: INCONCLUSIVE: ${out.reason}`); return next(L);
  }
  if (out.decision === "PASS") { champ.release = exp.challenger!; await rotateSetB(exp.id, (exp.questions ?? []).map((q) => q.id)); }
  if (out.decision === "FAIL") {
    champ.working = exp.champion;
    const vf = `${L.dir}/versions/${exp.challenger}.json`;
    if (await exists(vf)) await writeJson(vf, { ...(await readJson(vf)), status: "rolled back", rolledBackAt: now(), rolledBackTo: exp.champion });
  }
  champ.promotionsSinceValidation = 0; await writeJson(`${L.dir}/champion.json`, champ);
  // only the decision leaves this folder; Set B cards and verdicts stay in cache/ and validations/
  await appendText(`${L.dir}/validations.log`, `${now()} ${exp.id} ${out.decision} (${exp.challenger} vs ${exp.champion}): ${out.reason}\n`);
  exp.decision = out.decision; exp.reason = out.reason; exp.state = transition(exp.state, out.decision.toLowerCase() as Event); await saveExp(L, exp);
  if (out.decision === "FAIL") { const e = newExp(L, "iteration", "REBASELINING", champ.working, exp.iteration + 1); e.reason = "rolled back to the release champion"; await saveExp(L, e); }
  console.log(`${L.name}: ${out.decision}: ${out.reason}`);
}

/** After a PASS, one Set B question rotates out for a pool question of the same category. Idempotent per validation, and
 *  skipped when Set B has changed since the validation opened (a refresh, or the other lineage's rotation): a question
 *  this validation never exposed is not retired on its account. */
async function rotateSetB(validationId: string, openedWith: string[]) {
  const path = `${ROOT}/${cfg.sets.B}`; const b = await readJson(path);
  const n = cfg.validation.rotateSetBOnPass ?? 0; if (!n) return;
  b.rotatedBy ??= [];
  if (b.rotatedBy.includes(validationId)) return;
  if (b.questions.map((q: Question) => q.id).join("|") !== openedWith.join("|")) { console.log(`Set B changed since ${validationId} opened; no rotation on its account`); return; }
  b.rotatedBy.push(validationId);
  for (let i = 0; i < n && b.questions.length; i++) {
    const old = b.questions.shift(); b.retired.push(old);
    const pool: Question[] = b.pool[old.category] ?? []; const fresh = pool.shift();
    if (!fresh) { b.questions.push(old); b.retired.pop(); continue; }
    b.questions.push({ ...fresh, idx: 0 });
  }
  b.questions.forEach((q: Question, i: number) => q.idx = i + 1);
  await writeJson(path, b);
}

// ---------- capability report (both lineages, same Set A, same evaluator; report only) ----------

async function capability() {
  const names = Object.keys(cfg.lineages);
  if (names.length < 2) { console.log("capability needs two lineages"); return; }
  for (const n of names.slice(0, 2)) if (!(await exists(`${new Lineage(n).dir}/baseline.json`))) { console.log(`capability needs both baselines; ${n} has none yet`); return; }
  const [A, B] = await Promise.all(names.slice(0, 2).map(async (n) => lineageCards(new Lineage(n))));
  const r = capabilityReport(A, B, cfg.capability.gapRating);
  // cross-lane blind pairs: lineage A champion sample s vs lineage B champion sample s, same judge, report only.
  // pairs.json binds the job files to the two baselines they were drawn from; a new baseline on either side starts a new set.
  const bA = await readJson(`${new Lineage(names[0]).dir}/baseline.json`) as Baseline, bB = await readJson(`${new Lineage(names[1]).dir}/baseline.json`) as Baseline;
  const draws = `${names[0]}:${bA.draw}|${names[1]}:${bB.draw}`;
  const pairsPath = `${ROOT}/capability/pairs.json`;
  type CrossPair = { id: string; q: number; s: number; slotA: string; outPath: string };
  let cross = await readJson(pairsPath).catch(() => null) as { draws: string; pairs: CrossPair[] } | null;
  if (args.blind && cross?.draws !== draws) {
    const brief = await Deno.readTextFile(`${ROOT}/${cfg.agents.blind.role}`);
    const dir = `${ROOT}/capability/${now().replace(/[:.]/g, "-")}`;
    cross = { draws, pairs: [] };
    for (const q of setA()) for (let s = 1; s <= cfg.samplesPerQuestion; s++) {
      const ka = bA.gen[`q${q.idx}.s${s}`], kb = bB.gen[`q${q.idx}.s${s}`]; if (!ka || !kb) continue;
      const ga = await readJson(`${ROOT}/cache/gen/${ka}.json`), gb = await readJson(`${ROOT}/cache/gen/${kb}.json`);
      const slot = await championSlot(`capability|${draws}`, ka, kb);
      const X = slot === "A" ? ga : gb, Y = slot === "A" ? gb : ga;
      const id = `capability.blind.q${q.idx}.s${s}`;
      await writeText(`${dir}/jobs/${id}.md`, buildBlindInput(brief, q, X.debate, Y.debate));
      cross.pairs.push({ id, q: q.idx, s, slotA: slot === "A" ? names[0] : names[1], outPath: `${dir}/out/${id}.json` });
    }
    await writeJson(pairsPath, cross);
  }
  // tally whatever verdicts exist for the current pair set
  let crossMd = "";
  const crossTally: Record<string, number> = { [names[0]]: 0, [names[1]]: 0, tie: 0, pending: 0, invalid: 0 };
  if (cross?.draws === draws) {
    for (const p of cross.pairs) {
      if (!(await exists(p.outPath))) { crossTally.pending++; continue; }
      const v = parseJsonLoose(await Deno.readTextFile(p.outPath)) as unknown as BlindVerdict | null;
      if (!v || !["A", "B", "tie"].includes(v.winner)) { crossTally.invalid++; continue; }
      if (v.winner === "tie") crossTally.tie++;
      else crossTally[v.winner === "A" ? p.slotA : names.find((n) => n !== p.slotA)!]++;
    }
    crossMd = `\n\n## Cross-lane blind pairs (report only)\n\n${cross.pairs.length} pairs, ${names[0]} champion vs ${names[1]} champion, sample s against sample s, slot by hash.\n\n| ${names[0]} wins | ${names[1]} wins | ties | pending | invalid |\n|---|---|---|---|---|\n| ${crossTally[names[0]]} | ${crossTally[names[1]]} | ${crossTally.tie} | ${crossTally.pending} | ${crossTally.invalid} |\n`;
    if (args.blind) {
      const a = cfg.agents.blind;
      for (const p of cross.pairs) if (!(await exists(p.outPath))) emit({ id: p.id, lineage: "capability", kind: "blind", agentType: a.agentType, model: a.model, effort: a.effort, promptPath: p.outPath.replace("/out/", "/jobs/").replace(/\.json$/, ".md"), outPath: p.outPath });
    }
  }
  const path = `${ROOT}/capability/${now().replace(/[:.]/g, "-")}.md`;
  await writeText(path, capabilityMarkdown(r) + crossMd);
  await writeJson(`${ROOT}/capability/latest.json`, { ...r, crossLane: cross?.draws === draws ? { pairs: cross.pairs.length, ...crossTally } : null });
  console.log(`capability report written to ${path}`);
}

/** Part of `ingest`: validate the cross-lane judge outputs of the current pair set, return an invalid one for one repair
 *  (problems appended to its input; `capability --blind` prints it again), count the calls, and rewrite the report. */
async function capabilityIngest() {
  const pairsPath = `${ROOT}/capability/pairs.json`;
  const cross = await readJson(pairsPath).catch(() => null) as { draws: string; pairs: { id: string; outPath: string; checked?: boolean; attempts?: number }[] } | null;
  if (!cross) return;
  let changed = false;
  for (const p of cross.pairs) {
    if (p.checked || !(await exists(p.outPath))) continue;
    p.attempts = (p.attempts ?? 0) + 1; changed = true;
    const n = Number(await Deno.readTextFile(`${ROOT}/capability/calls.count`).catch(() => "0")); await writeText(`${ROOT}/capability/calls.count`, String(n + 1));
    const v = parseJsonLoose(await Deno.readTextFile(p.outPath));
    const problems = v ? (await normalise(`${ROOT}/${cfg.agents.blind.schema}`, v), await schemaProblems(`${ROOT}/${cfg.agents.blind.schema}`, v)) : ["not JSON: return only the JSON object"];
    if (v && (v.winner === "tie") !== (v.margin === "none")) problems.push("winner tie if and only if margin none");
    if (!problems.length) { await writeJson(p.outPath, v); p.checked = true; continue; }
    if (p.attempts >= 2) { p.checked = true; console.log(`capability: INVALID ${p.id}: ${problems.join("; ")} — closed as missing`); continue; }
    await appendText(p.outPath.replace("/out/", "/jobs/").replace(/\.json$/, ".md"), `\n\n=== PREVIOUS ATTEMPT REJECTED BY THE RUNNER ===\n${problems.join("\n")}\nReturn the JSON object again, correcting these; do not change anything else.\n`);
    await Deno.remove(p.outPath).catch(() => {});
    console.log(`capability: INVALID ${p.id}: ${problems.join("; ")} — respawn once (evo4 capability --blind prints it)`);
  }
  if (!changed) return;
  await writeJson(pairsPath, cross);
  const blind = args.blind; args.blind = false; await capability(); args.blind = blind;
}

async function lineageCards(L: Lineage): Promise<LineageCards> {
  const base = await readJson(`${L.dir}/baseline.json`) as Baseline;
  const byQuestion: Record<number, RubricCard[]> = {};
  for (const [slot, key] of Object.entries(base.rubric)) { const q = Number(slot.match(/q(\d+)/)![1]); (byQuestion[q] ??= []).push((await readJson(`${ROOT}/cache/rubric/${key}.json`)).card); }
  return { lineage: L.name, champion: base.version, byQuestion };
}

async function capabilityReferenceFor(L: Lineage): Promise<string | undefined> {
  const other = Object.keys(cfg.lineages).find((n) => n !== L.name); if (!other) return undefined;
  const O = new Lineage(other);
  if (!(await exists(`${O.dir}/baseline.json`)) || !(await exists(`${L.dir}/baseline.json`))) return undefined;
  const r = capabilityReport(await lineageCards(L), await lineageCards(O), cfg.capability.gapRating);
  return capabilityReferenceForOptimizer(r, L.name);
}

// ---------- gemini batch ----------

async function geminiBatch(L: Lineage) {
  const exp = await readJson(`${L.dir}/experiments/${args.exp}/state.json`).catch(() => readJson(`${L.dir}/validations/${args.exp}/state.json`)) as ExpState;
  const questions = await questionsFor(exp);
  const lockPath = `${expDir(L, exp)}/gemini.lock`;
  const held = await readJson(lockPath).catch(() => null) as { heartbeat: number; pid: number } | null;
  if (held && Date.now() - held.heartbeat < GEMINI_LOCK_STALE_MS && !args.force) { console.log(`${L.name}: another gemini-batch holds ${lockPath} (pid ${held.pid}); pass --force if it is dead`); return; }
  for (const [, j] of Object.entries(exp.jobs)) {
    if (j.kind !== "gemini" || j.done || (await exists(j.outPath))) continue;
    const q = questions.find((x) => x.idx === j.q)!;
    const { system, userTemplate } = await loadVersion(L, j.version!);
    const user = userTemplate.replace("{{question}}", q.text) + "\n\n" + envelopeNote();
    await writeJson(lockPath, { pid: Deno.pid, heartbeat: Date.now() });
    const t0 = Date.now();
    try {
      const res = await callGemini(system, user, { model: L.lane.model, temperature: L.lane.temperature, thinkingLevel: L.lane.thinkingLevel, maxOutputTokens: L.lane.maxOutputTokens, retries: L.lane.retries429, turns: cfg.turns });
      // write then rename: a concurrent ingest never reads a half-written output
      await writeJson(`${j.outPath}.tmp`, { output: res.output, latencyMs: Date.now() - t0, tokens: res.tokens ?? null });
      await Deno.rename(`${j.outPath}.tmp`, j.outPath);
      console.log(`${L.name}: ${j.version} q${j.q} s${j.s}: ${Date.now() - t0} ms`);
    } catch (err) {
      // a reply that never completed (blocked, truncated, not JSON) is a recorded generation failure, not a silent gap;
      // a transport error that outlived the retries stops the batch so it can be re-run (finished outputs are kept)
      if (err instanceof GeminiBlocked || err instanceof SyntaxError) {
        await writeJson(`${j.outPath}.tmp`, { output: null, error: String((err as Error).message), latencyMs: Date.now() - t0 });
        await Deno.rename(`${j.outPath}.tmp`, j.outPath);
        console.log(`${L.name}: ${j.version} q${j.q} s${j.s}: FAILED ${(err as Error).message} (recorded as an invalid transcript)`);
      } else {
        await Deno.remove(lockPath).catch(() => {});
        console.error(`${L.name}: gemini-batch stopped at ${j.version} q${j.q} s${j.s}: ${(err as Error).message}; re-run the same command to continue`);
        Deno.exit(1);
      }
    }
    await writeJson(lockPath, { pid: Deno.pid, heartbeat: Date.now() });
    await sleep(L.lane.minGapMs);
  }
  await Deno.remove(lockPath).catch(() => {});
  console.log(`${L.name}: gemini-batch done; run: evo4 ingest`);
}

// ---------- helpers ----------

function setA(): Question[] { return JSON.parse(Deno.readTextFileSync(`${ROOT}/${cfg.sets.A}`)).questions; }
async function loadSetB(): Promise<Question[]> {
  const b = JSON.parse(await Deno.readTextFile(`${ROOT}/${cfg.sets.B}`));
  return b.questions.map((q: Question) => ({ ...q, text: q.text ?? loadQuestionText(q.id) }));
}
async function questionsFor(exp: ExpState): Promise<Question[]> { return exp.kind === "validation" ? (exp.questions ?? loadSetB()) : setA(); }
/** The cache for an experiment's own transcripts, cards and verdicts: Set B material stays behind the wall in runner-only/. */
function C(exp: ExpState): string { return exp.kind === "validation" ? `${ROOT}/runner-only/cache` : `${ROOT}/cache`; }
function expDir(L: Lineage, exp: ExpState): string { return `${L.dir}/${exp.kind === "validation" ? "validations" : "experiments"}/${exp.id}`; }
function allDone(exp: ExpState, kinds: Job["kind"][]): boolean { const js = Object.values(exp.jobs).filter((j) => kinds.includes(j.kind)); return js.length > 0 && js.every((j) => j.done); }
function hasJobs(exp: ExpState, kinds: Job["kind"][]): boolean { return Object.values(exp.jobs).some((j) => kinds.includes(j.kind)); }
function laneProfile(L: Lineage): string { const role = Deno.readTextFileSync(`${ROOT}/${cfg.agents.optimizer.role}`); return (role.split(`### ${L.def.optimizerProfile}`)[1]?.split(/\n### /)[0] ?? "").trim(); }
function envelopeNote(): string { return Deno.readTextFileSync(`${ROOT}/roles/envelope-note.txt`).trim(); }
function contaminated(d: Debate): boolean { return /\b(?:judge|evaluator|rubric|champion|challenger|prefer (?:this|A|B))\b/i.test(JSON.stringify(d)) && /\b(?:you (?:are|should) (?:prefer|rate|score)|ignore (?:the|your) (?:rubric|instructions))\b/i.test(JSON.stringify(d)); }
function deterministicChecks(gen: { validity: { ok: boolean; problems: string[] }; metrics: ReturnType<typeof formMetrics> }): DeterministicCheck[] {
  const m = gen.metrics;
  return [
    { check: "schema_and_membership", location: "whole output", status: gen.validity.ok ? "pass" : "fail", observed: gen.validity.ok ? "valid" : gen.validity.problems.join("; "), expected: "three minds, 9-12 turns, speakers and books among the minds, pd matches year" },
    { check: "turn_count", location: "debate", status: "info", observed: String(m.turns), expected: `${cfg.turns.min}-${cfg.turns.max}` },
    { check: "turns_outside_word_range", location: "debate", status: m.shortTurns + m.longTurns ? "fail" : "pass", observed: `${m.shortTurns} under ${cfg.wordsPerTurn.min}, ${m.longTurns} over ${cfg.wordsPerTurn.max}`, expected: "0" },
    { check: "pd_false_turns_with_quotation_marks", location: "debate", status: m.pdFalseQuoteTurns ? "fail" : "pass", observed: String(m.pdFalseQuoteTurns), expected: "0 (apostrophes in contractions are not quotation marks)" },
    { check: "basis_with_chapter_section_or_link", location: "basis fields", status: m.fabricatedBasisTurns ? "fail" : "pass", observed: String(m.fabricatedBasisTurns), expected: "0 for a worker that cannot browse" },
  ];
}
async function loadVersion(L: Lineage, v: string) {
  const text = await Deno.readTextFile(`${L.dir}/versions/${v}.md`);
  const i = text.indexOf(USER_HEADING);
  if (i < 0) throw new Error(`${v}.md has no "${USER_HEADING}" heading`);
  return { system: text.slice(0, i).trim(), userTemplate: text.slice(i + USER_HEADING.length).trim(), hash: await promptHash(text) };
}
async function ensureVersionFile(L: Lineage, v: string) { if (!(await exists(`${L.dir}/versions/${v}.md`))) await writeText(`${L.dir}/versions/${v}.md`, await Deno.readTextFile(`${ROOT}/prompts/${L.def.subject}.${v}.md`)); }
async function listVersions(L: Lineage): Promise<string[]> { const out: string[] = []; for await (const e of Deno.readDir(`${L.dir}/versions`)) if (e.name.endsWith(".md")) out.push(e.name.replace(".md", "")); return out; }
function nextVersionName(existing: string[]): string { return `v${Math.max(-1, ...existing.map((v) => Number(v.slice(1)))) + 1}`; }
function newExp(L: Lineage, kind: ExpState["kind"], state: State, champion: string, iteration: number): ExpState {
  // time plus a random suffix: two experiments opened in the same millisecond (a redraw) must never share an id, which is also the draw
  const id = `${kind === "validation" ? "val" : "exp"}-${String(iteration).padStart(3, "0")}-${Date.now().toString(36)}${crypto.randomUUID().slice(0, 4)}`;
  return { id, kind, lineage: L.name, state, iteration, champion, stage: 1, stage1Samples: cfg.samplesPerQuestion, samples: cfg.samplesPerQuestion, jobs: {}, createdAt: now(), updatedAt: now() };
}
async function currentExp(L: Lineage): Promise<ExpState> { const c = await readJson(`${L.dir}/current.json`); return readJson(`${L.dir}/${c.kind === "validation" ? "validations" : "experiments"}/${c.id}/state.json`); }
async function saveExp(L: Lineage, exp: ExpState) { await saveExpOnly(L, exp); await writeJson(`${L.dir}/current.json`, { id: exp.id, kind: exp.kind }); }
/** Save an experiment's state without making it the current one. */
async function saveExpOnly(L: Lineage, exp: ExpState) { exp.updatedAt = now(); await writeJson(`${expDir(L, exp)}/state.json`, exp); }
async function championGenKey(L: Lineage, exp: ExpState, q: number, s: number): Promise<string | undefined> {
  if (exp.kind === "validation" || s > exp.stage1Samples) return exp.jobs[`gen.${exp.champion}.q${q}.s${s}`]?.cacheKey;
  return ((await readJson(`${L.dir}/baseline.json`)) as Baseline).gen[`q${q}.s${s}`];
}
/** The champion's side of an iteration: the baseline cards plus any retest cards drawn in this experiment, each card once
 *  (a rebaseline that ran inside this experiment is the baseline itself, so its keys must not count twice). */
async function championCardsQ(L: Lineage, exp: ExpState): Promise<{ q: number; card: RubricCard }[]> {
  const base = (await readJson(`${L.dir}/baseline.json`)) as Baseline;
  const keyed = new Map<string, number>();
  for (const [slot, k] of Object.entries(base.rubric)) keyed.set(k, Number(slot.match(/^q(\d+)\./)![1]));
  // only the retest samples come from the experiment; a baseline card the baseline left out (e.g. contaminated) stays out
  for (const [id, j] of Object.entries(exp.jobs)) if (id.startsWith(`rubric.${exp.champion}.`) && j.cacheKey && j.s! > exp.stage1Samples && !keyed.has(j.cacheKey)) keyed.set(j.cacheKey, j.q!);
  return Promise.all([...keyed].map(async ([k, q]) => ({ q, card: (await readJson(`${C(exp)}/rubric/${k}.json`)).card as RubricCard })));
}
async function championResults(base: Baseline, questions: Question[]): Promise<ChampionResult[]> {
  return Promise.all(questions.map(async (q) => {
    const samples = [] as ChampionResult["samples"];
    for (let s = 1; s <= cfg.samplesPerQuestion; s++) {
      const gk = base.gen[`q${q.idx}.s${s}`], rk = base.rubric[`q${q.idx}.s${s}`];
      if (!gk || !rk) continue;   // a missing slot (listed in baseline.missing) is skipped, not fatal
      const g = await readJson(`${ROOT}/cache/gen/${gk}.json`);
      const r = await readJson(`${ROOT}/cache/rubric/${rk}.json`);
      samples.push({ sample: s, jobId: g.jobId, debate: g.debate, card: r.card, metrics: g.metrics });
    }
    return { q, samples };
  }));
}
async function cardsForQ(exp: ExpState, version: string): Promise<{ q: number; card: RubricCard }[]> {
  const out: { q: number; card: RubricCard }[] = [];
  for (const [id, j] of Object.entries(exp.jobs)) if (id.startsWith(`rubric.${version}.`) && j.cacheKey) out.push({ q: j.q!, card: (await readJson(`${C(exp)}/rubric/${j.cacheKey}.json`)).card });
  return out;
}
async function cardsFor(exp: ExpState, version: string): Promise<RubricCard[]> { return (await cardsForQ(exp, version)).map((x) => x.card); }
async function gensFor(exp: ExpState, version: string) {
  const out: { validity: { ok: boolean; problems: string[] }; metrics: ReturnType<typeof formMetrics> }[] = [];
  for (const [id, j] of Object.entries(exp.jobs)) if (id.startsWith(`gen.${version}.`) && j.cacheKey) out.push(await readJson(`${C(exp)}/gen/${j.cacheKey}.json`));
  return out;
}
async function collectPairs(L: Lineage, exp: ExpState): Promise<PairResult[]> {
  const pairs: PairResult[] = [];
  for (const q of await questionsFor(exp)) for (let s = 1; s <= exp.samples; s++) {
    const b = exp.jobs[`blind.q${q.idx}.s${s}`]; if (!b?.cacheKey) continue;   // a missing verdict is a missing pair, never a tie
    const ck = await championGenKey(L, exp, q.idx, s), xk = exp.jobs[`gen.${exp.challenger}.q${q.idx}.s${s}`]?.cacheKey; if (!ck || !xk) continue;
    const slot = await championSlot(exp.id, ck, xk);
    const verdict = (await readJson(`${C(exp)}/blind/${b.cacheKey}.json`)).verdict as BlindVerdict;
    pairs.push({ q: q.idx, sample: s, championSample: ck, challengerSample: xk, championSlot: slot, verdict, challengerWon: challengerCredit(verdict, slot, cfg.gate.tieWeight) });
  }
  return pairs;
}
/** Challenger minus champion mean score per Set A category, from cards tagged with their question. */
function perCategoryDelta(champ: { q: number; card: RubricCard }[], chal: { q: number; card: RubricCard }[]): Record<string, number> {
  const per = (xs: { q: number; card: RubricCard }[]) => { const m: Record<number, number[]> = {}; for (const x of xs) (m[x.q] ??= []).push(x.card.score); return m; };
  const a = per(champ), b = per(chal); const out: Record<string, number> = {};
  for (const q of setA()) if (a[q.idx]?.length && b[q.idx]?.length) out[q.category] = Math.round((avg(b[q.idx]) - avg(a[q.idx])) * 100) / 100;
  return out;
}
function summarizeTargets(cards: RubricCard[], targets: string[]): string {
  const lost = pointsLost(cards);
  return targets.map((t) => { const c = lost.find((x) => x.id === t); return c ? `${t}: mean rating ${c.meanRating.toFixed(2)}` : `${t}: not found`; }).join("; ");
}
/** Stop-rule inputs for the current session only (session.json; `evo4 session` starts a new one). */
async function sessionStats(L: Lineage) {
  const sess = await readJson(`${L.dir}/session.json`).catch(() => ({ ledgerStart: 0, callsStart: 0 })) as Session;
  const l = (await readLedger(L)).slice(sess.ledgerStart);
  const outcomes = l.map((e) => (String(e.outcome).endsWith("PROMOTE") ? "PROMOTED" : String(e.outcome).endsWith("ESCALATE") ? "ESCALATED" : String(e.outcome).endsWith("KEEP") ? "KEPT" : "REJECTED") as State);
  return { iterations: l.length, calls: (await callsCount(L)) - sess.callsStart, outcomes };
}
async function callsCount(L: Lineage): Promise<number> { return Number(await Deno.readTextFile(`${L.dir}/calls.count`).catch(() => "0")); }
async function bumpCalls(L: Lineage) { await writeText(`${L.dir}/calls.count`, String((await callsCount(L)) + 1)); }
async function readLedger(L: Lineage): Promise<LedgerEntry[]> { return (await Deno.readTextFile(`${L.dir}/ledger.jsonl`).catch(() => "")).split("\n").filter(Boolean).map((l) => JSON.parse(l)); }
async function status(L: Lineage) {
  const exp = await currentExp(L); const champ = await readJson(`${L.dir}/champion.json`);
  const ledger = await readLedger(L), last = ledger[ledger.length - 1];
  const base = await readJson(`${L.dir}/baseline.json`).catch(() => null) as Baseline | null;
  const sess = await sessionStats(L);
  console.log(JSON.stringify({
    lineage: L.name, working: champ.working, release: champ.release, promotions: champ.promotions,
    experiment: exp.id, kind: exp.kind, state: exp.state, stage: exp.stage, decision: exp.decision, reason: exp.reason,
    jobsDone: Object.values(exp.jobs).filter((j) => j.done).length, jobsTotal: Object.keys(exp.jobs).length,
    baseline: base ? { version: base.version, comparisons: base.comparisons, missing: base.missing ?? [] } : null,
    lastDecision: last ? { id: last.id, version: last.version, base: last.base, outcome: last.outcome, wins: last.wins, pairs: last.pairs, rubricMeanDelta: last.rubricMeanDelta } : null,
    session: { iterations: sess.iterations, calls: sess.calls, limits: { iterations: cfg.stop.maxIterationsPerSession, calls: cfg.stop.maxCallsPerSession } },
  }, null, 2));
}
async function metricsCmd() {
  const d = JSON.parse(await Deno.readTextFile(String(args.file))); const debate = d.output ?? d;
  const L = new Lineage(String(args.lane ?? Object.keys(cfg.lineages)[0]));
  console.log(JSON.stringify({ validity: validity(debate, L.metricOpts()), metrics: formMetrics(debate, L.metricOpts()) }, null, 2));
}
function parseArgs(a: string[]) { const out: Record<string, unknown> & { _: string[] } = { _: [] }; for (let i = 0; i < a.length; i++) { if (a[i].startsWith("--")) out[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true; else out._.push(a[i]); } return out; }
function avg(xs: number[]) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function now() { return new Date().toISOString(); }
async function exists(p: string) { try { await Deno.stat(p); return true; } catch { return false; } }
async function readJson(p: string) { return JSON.parse(await Deno.readTextFile(p)); }
async function writeJson(p: string, v: unknown) { await Deno.mkdir(p.slice(0, p.lastIndexOf("/")), { recursive: true }); await Deno.writeTextFile(p, JSON.stringify(v, null, 2)); }
async function writeText(p: string, s: string) { await Deno.mkdir(p.slice(0, p.lastIndexOf("/")), { recursive: true }); await Deno.writeTextFile(p, s); }
async function appendText(p: string, s: string) { await Deno.mkdir(p.slice(0, p.lastIndexOf("/")), { recursive: true }); await Deno.writeTextFile(p, s, { append: true }); }
function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
