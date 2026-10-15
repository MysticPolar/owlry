// End-to-end tests of evo4.ts with mock agents. No model is called.
//
//   deno run -A evolve/v4/tests/integration.ts            (from the repository root)
//   deno run -A evolve/v4/tests/integration.ts promote    (only tests whose name contains "promote")
//
// Each test copies the package's data files into a fresh temporary root, points EVO4_ROOT at it, and drives the real CLI
// as a dispatcher would: `next` → write every job's output the way a subagent (or the Gemini batch) would → `ingest`.
// The mock agents read only what a real agent could: the job's prompt file (a rubric or blind job never learns the
// version from the runner; the mock debates carry a marker in their own text so the mock judge can play a policy).

import { test, eq, ok, report } from "./harness.ts";
import { cleanDebate, rawCard } from "./fixtures.ts";

const REPO = decodeURIComponent(new URL("../../../", import.meta.url).pathname).replace(/\/$/, "");
const PKG = `${REPO}/evolve/v4`;
const FILTER = Deno.args[0] ?? "";

// ---------- scratch root and CLI ----------

async function copyDir(src: string, dst: string) {
  await Deno.mkdir(dst, { recursive: true });
  for await (const e of Deno.readDir(src)) {
    if (e.isDirectory) await copyDir(`${src}/${e.name}`, `${dst}/${e.name}`);
    else await Deno.copyFile(`${src}/${e.name}`, `${dst}/${e.name}`);
  }
}

async function makeRoot(patch?: (cfg: Record<string, any>) => void): Promise<string> {
  const root = await Deno.makeTempDir({ prefix: "evo4-it-" });
  for (const d of ["sets", "runner-only", "roles", "prompts", "schemas", "seeds"]) await copyDir(`${PKG}/${d}`, `${root}/${d}`);
  for (const f of ["config.v4.2.json", "rubric-map.json"]) await Deno.copyFile(`${PKG}/${f}`, `${root}/${f}`);
  if (patch) { const c = JSON.parse(await Deno.readTextFile(`${root}/config.v4.2.json`)); patch(c); await Deno.writeTextFile(`${root}/config.v4.2.json`, JSON.stringify(c, null, 2)); }
  return root;
}

async function evo(root: string, ...args: string[]): Promise<{ code: number; out: string; err: string }> {
  const r = await new Deno.Command("deno", { args: ["run", "--config", "evolve/deno.json", "-A", "evolve/v4/runner/evo4.ts", ...args], cwd: REPO, env: { EVO4_ROOT: root, NO_COLOR: "1" }, stdout: "piped", stderr: "piped" }).output();
  return { code: r.code, out: new TextDecoder().decode(r.stdout), err: new TextDecoder().decode(r.stderr) };
}
async function must(root: string, ...args: string[]): Promise<string> {
  const r = await evo(root, ...args);
  if (r.code !== 0) throw new Error(`evo4 ${args.join(" ")} exited ${r.code}\n${r.out}\n${r.err}`);
  return r.out;
}

const readJson = async (p: string) => JSON.parse(await Deno.readTextFile(p));
const exists = async (p: string) => { try { await Deno.stat(p); return true; } catch { return false; } };
async function cur(root: string, lin: string) {
  const c = await readJson(`${root}/${lin}/current.json`);
  return readJson(`${root}/${lin}/${c.kind === "validation" ? "validations" : "experiments"}/${c.id}/state.json`);
}
async function ledger(root: string, lin: string): Promise<any[]> {
  return (await Deno.readTextFile(`${root}/${lin}/ledger.jsonl`).catch(() => "")).split("\n").filter(Boolean).map((l) => JSON.parse(l));
}
async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  if (!(await exists(dir))) return out;
  for await (const e of Deno.readDir(dir)) { const p = `${dir}/${e.name}`; if (e.isDirectory) out.push(...(await walk(p))); else out.push(p); }
  return out;
}

// ---------- mock agents ----------

interface Policy {
  /** the debate a worker returns; null = a reply that never completed (Gemini) / not JSON (subagent); "garbage" = JSON that is not a debate */
  gen?: (lin: string, ver: string, q: number, s: number) => unknown;
  /** rubric rating for a debate (all 35 cells); null = an invalid card */
  rating?: (lin: string, ver: string, q: number, s: number) => number | null;
  /** blind verdict given the two versions in slots A and B */
  blind?: (lin: string, a: string, b: string, q: number, s: number) => "A" | "B" | "tie" | "invalid";
  /** optimizer output given the champion's system prompt and the job input */
  optimizer?: (lin: string, champion: { version: string; system: string }, input: string, n: number) => unknown;
}

const marker = (lin: string, ver: string, q: number, s: number, draw: string) => `[[m:${lin}:${ver}:q${q}:s${s}:${draw}]]`;

function debateFor(lin: string, ver: string, q: number, s: number, draw: string) {
  const d = cleanDebate();
  d.situation = `${marker(lin, ver, q, s, draw)} ${d.situation}`;
  return d;
}

function verdict(winner: "A" | "B" | "tie") {
  return {
    schema_version: "blind-4.2.0", winner, margin: winner === "tie" ? "none" : "clear", reason: "mock",
    comparisons: [{ aspect: "reasoning", a_location: "A.debate[1].text", a_observation: "x", b_location: "B.debate[1].text", b_observation: "y", advantage: winner, why_it_matters: "z" }],
    best_of_a: "a", best_of_b: "b", concerns: [],
  };
}

const WORDS = ["plainly", "steadily", "concretely", "directly", "evenly", "briskly", "patiently", "openly", "warmly", "squarely", "lightly", "firmly"];

/** A valid one-edit proposal: append a word to the sentence that starts "Keep the dialogue continuous". */
export function propose(champion: { version: string; system: string }, n: number, targets = ["C4.4"], kind = "REPLACE") {
  const m = champion.system.match(/Keep the dialogue continuous[^.]*\./);
  if (!m) throw new Error("mock optimizer: anchor sentence not found");
  const before = m[0], after = before.replace(/\.$/, ` and ${WORDS[n % WORDS.length]}.`);
  return {
    schema_version: "optimizer-4.2.0", action: "propose", parent_prompt_id: champion.version, kind,
    hypothesis: { problem: "p", cause_type: "prompt", mechanism: "m", proposed_change: "c", expected_observations: ["o"], falsification_condition: "f", regression_risk: "r", targets, expected_delta: 3 },
    evidence: [{ question_id: "health-04", job_id: "gen.v0.q1.s1", location: "debate[2]", observation: "o" }],
    candidate_system_prompt: champion.system.replace(before, after),
    edits: [{ operation: "replace", before, after, reason: "r" }],
    blocked: [], next_system_action: null, change_summary: `append ${WORDS[n % WORDS.length]}`,
  };
}

let optimizerCalls = 0;

async function spawnJob(root: string, job: any, P: Policy) {
  if (job.kind === "gemini-batch") {
    const exp = job.command.match(/--exp (\S+)/)[1];
    const path = (await exists(`${root}/${job.lineage}/experiments/${exp}/state.json`)) ? `${root}/${job.lineage}/experiments/${exp}/state.json` : `${root}/${job.lineage}/validations/${exp}/state.json`;
    const st = await readJson(path);
    for (const [, j] of Object.entries<any>(st.jobs)) {
      if (j.kind !== "gemini" || j.done || (await exists(j.outPath))) continue;
      const d = P.gen ? P.gen(job.lineage, j.version, j.q, j.s) : undefined;
      const debate = d === undefined ? debateFor(job.lineage, j.version, j.q, j.s, exp) : d;
      await Deno.mkdir(j.outPath.slice(0, j.outPath.lastIndexOf("/")), { recursive: true });
      await Deno.writeTextFile(j.outPath, JSON.stringify(debate === null ? { output: null, error: "gemini blocked: SAFETY", latencyMs: 5 } : { output: debate === "garbage" ? { note: "not a debate" } : debate, latencyMs: 1234, tokens: null }));
    }
    return;
  }
  await Deno.mkdir(job.outPath.slice(0, job.outPath.lastIndexOf("/")), { recursive: true });
  const prompt = await Deno.readTextFile(job.promptPath);
  if (job.kind === "generate") {
    const [, ver, q, s] = job.id.match(/^gen\.(v\d+)\.q(\d+)\.s(\d+)$/);
    const draw = job.outPath.split("/").pop();   // the opaque per-job name: every draw gets its own transcript
    const d = P.gen ? P.gen(job.lineage, ver, +q, +s) : undefined;
    const debate = d === undefined ? debateFor(job.lineage, ver, +q, +s, draw) : d;
    // a real worker restates the situation: carry a canary from the question into the transcript, as a model would
    const canary = prompt.match(/CANARY-\w+/);
    if (canary && debate && typeof debate === "object" && "situation" in (debate as object)) (debate as { situation: string }).situation += ` ${canary[0]}`;
    await Deno.writeTextFile(job.outPath, debate === null ? "I could not produce the JSON." : JSON.stringify(debate === "garbage" ? { note: "not a debate" } : debate));
  } else if (job.kind === "rubric") {
    const m = prompt.match(/\[\[m:([^:]+):(v\d+):q(\d+):s(\d+):[^\]]+\]\]/);
    if (!m) throw new Error(`rubric job ${job.id}: no marker in its debate`);
    const r = P.rating ? P.rating(m[1], m[2], +m[3], +m[4]) : 6;
    await Deno.writeTextFile(job.outPath, r === null ? JSON.stringify({ cells: [] }) : JSON.stringify(rawCard(r)));
  } else if (job.kind === "blind") {
    const a = prompt.split("=== DEBATE A ===")[1].split("=== DEBATE B ===")[0].match(/\[\[m:([^:]+):(v\d+):q(\d+):s(\d+)/)!;
    const b = prompt.split("=== DEBATE B ===")[1].match(/\[\[m:([^:]+):(v\d+):q(\d+):s(\d+)/)!;
    const w = P.blind ? P.blind(job.lineage, `${a[1]}:${a[2]}`, `${b[1]}:${b[2]}`, +a[3], +a[4]) : "tie";
    await Deno.writeTextFile(job.outPath, w === "invalid" ? JSON.stringify({ winner: "C" }) : JSON.stringify(verdict(w)));
  } else if (job.kind === "optimizer") {
    const champ = await readJson(`${root}/${job.lineage}/champion.json`);
    const text = await Deno.readTextFile(`${root}/${job.lineage}/versions/${champ.working}.md`);
    const system = text.slice(0, text.indexOf("## User’s situation")).trim();
    const out = P.optimizer ? P.optimizer(job.lineage, { version: champ.working, system }, prompt, optimizerCalls++) : propose({ version: champ.working, system }, optimizerCalls++);
    await Deno.writeTextFile(job.outPath, typeof out === "string" ? out : JSON.stringify(out));
  }
}

/** Run next → spawn → ingest until `until` holds. Returns every line `next` printed (for assertions). */
async function drive(root: string, lineage: string, P: Policy, until: () => Promise<boolean>, maxSteps = 40): Promise<string[]> {
  const log: string[] = [];
  for (let step = 0; step < maxSteps; step++) {
    if (await until()) return log;
    const out = await must(root, "next", "--lineage", lineage);
    const lines = out.split("\n").filter(Boolean);
    log.push(...lines);
    const jobs = lines.filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
    for (const j of jobs) await spawnJob(root, j, P);
    if (!jobs.length && !lines.some((l) => /WAIT/.test(l))) {
      if (await until()) return log;
      throw new Error(`no jobs and not done after step ${step}: ${lines.join(" | ")}`);
    }
    log.push(...(await must(root, "ingest", "--lineage", lineage)).split("\n").filter(Boolean));
  }
  throw new Error(`not done after ${maxSteps} steps; last lines: ${log.slice(-6).join(" | ")}`);
}

const inState = (root: string, lin: string, ...states: string[]) => async () => states.includes((await cur(root, lin)).state);
/** OPTIMIZING with its optimizer job created (the input file exists): the point at which a person may enter a manual challenger */
const atOptimizer = (root: string, lin: string) => async () => { const e = await cur(root, lin); return e.state === "OPTIMIZING" && Boolean(e.jobs.optimizer); };

const winsFor = (winner: string, rate = 1) => (_lin: string, a: string, b: string, q: number, s: number) => {
  const slot = a.endsWith(`:${winner}`) ? "A" : b.endsWith(`:${winner}`) ? "B" : null;
  if (!slot) return "tie" as const;
  const take = ((q * 7 + s * 3) % 10) / 10 < rate;
  return (take ? slot : slot === "A" ? "B" : "A") as "A" | "B";
};
const challengerWinsAll = (lin: string, a: string, b: string) => {
  // the challenger is the higher version number in a lineage pair
  const va = Number(a.split(":v")[1]), vb = Number(b.split(":v")[1]);
  return (va > vb ? "A" : "B") as "A" | "B";
};
const challengerLosesAll = (lin: string, a: string, b: string) => (challengerWinsAll(lin, a, b) === "A" ? "B" : "A") as "A" | "B";

// ---------- tests ----------

async function T(name: string, fn: () => Promise<void>) { if (!FILTER || name.includes(FILTER)) await test(name, fn); }

await T("bootstrap: both lineages baseline 10 transcripts and 10 cards each, Gemini through the batch job, then a capability report", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap");
  const P: Policy = { rating: (lin) => (lin === "sonnet" ? 7.5 : 5) };
  const log = await drive(root, "all", P, async () => (await atOptimizer(root, "sonnet")()) && (await atOptimizer(root, "gemini")()));
  ok(log.some((l) => l.includes('"kind":"gemini-batch"')), "the Gemini lane is generated by the batch job");
  ok(!log.some((l) => l.includes('"kind":"generate"') && l.includes('"lineage":"gemini"')), "no Gemini subagent jobs");
  // the optimizer jobs were created inside ingest; the first `next` prints them, rebuilding each input with both baselines present
  const printed = (await must(root, "next")).split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
  eq(printed.map((j) => `${j.lineage}:${j.kind}`).sort(), ["gemini:optimizer", "sonnet:optimizer"]);
  for (const lin of ["sonnet", "gemini"]) {
    const b = await readJson(`${root}/${lin}/baseline.json`);
    eq([Object.keys(b.gen).length, Object.keys(b.rubric).length, b.missing.length, b.version], [10, 10, 0, "v0"], `${lin} baseline`);
    eq(await Deno.readTextFile(`${root}/${lin}/calls.count`), "20", `${lin} calls`);
    const input = await Deno.readTextFile(`${root}/${lin}/experiments/${(await cur(root, lin)).id}/jobs/optimizer.md`);
    ok(input.includes("=== CAPABILITY REFERENCE"), `${lin} optimizer input carries the capability reference`);
    ok(!input.includes("[[m:" + (lin === "sonnet" ? "gemini" : "sonnet")), `${lin} optimizer input has no transcript of the other lineage`);
  }
  await must(root, "capability");
  const cap = await readJson(`${root}/capability/latest.json`);
  eq([cap.a, cap.b, cap.total.a, cap.total.b, cap.total.gap], ["gemini", "sonnet", 50, 75, 25], "gap b − a in config order (gemini, sonnet)");
  // cross-lane blind pairs: print jobs, answer them, tally
  const out = await must(root, "capability", "--blind");
  const jobs = out.split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
  eq(jobs.length, 10, "cross-lane jobs");
  for (const j of jobs) await spawnJob(root, j, { blind: (_l, a, b) => (a.startsWith("sonnet") ? "A" : b.startsWith("sonnet") ? "B" : "tie") });
  await must(root, "capability");
  const cap2 = await readJson(`${root}/capability/latest.json`);
  eq([cap2.crossLane.sonnet, cap2.crossLane.gemini, cap2.crossLane.pending], [10, 0, 0], "cross-lane tally");
  eq((await must(root, "capability", "--blind")).split("\n").filter((l) => l.startsWith("{")).length, 0, "answered pairs are not printed again");
});

await T("next is idempotent, ingest prints no jobs, and unread outputs make next WAIT", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  const a = (await must(root, "next", "--lineage", "sonnet")).split("\n").filter((l) => l.startsWith("{"));
  const b = (await must(root, "next", "--lineage", "sonnet")).split("\n").filter((l) => l.startsWith("{"));
  eq(a.length, 10); eq(a, b, "same jobs printed twice");
  await spawnJob(root, JSON.parse(a[0]), {});
  const w = await must(root, "next", "--lineage", "sonnet");
  ok(/WAIT 1 output/.test(w) && !w.includes("{"), "WAIT while an output is not ingested");
  for (const l of a.slice(1)) await spawnJob(root, JSON.parse(l), {});
  const ing = await must(root, "ingest", "--lineage", "sonnet");
  ok(!ing.split("\n").some((l) => l.startsWith("{")), "ingest prints no job lines");
  const again = await must(root, "ingest", "--lineage", "sonnet");
  ok(/state BASELINE/.test(again), "a second ingest changes nothing");
  eq(await Deno.readTextFile(`${root}/sonnet/calls.count`), "10");
  const rub = (await must(root, "next", "--lineage", "sonnet")).split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
  eq(rub.length, 10); ok(rub.every((j) => j.kind === "rubric"));
  const st = await cur(root, "sonnet");
  eq(Object.values<any>(st.jobs).filter((j) => j.kind === "rubric").length, 10, "rubric jobs recorded once each");
});

await T("bootstrap refuses to run twice without --force", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  const out = await must(root, "bootstrap", "--lineage", "sonnet");
  ok(/already bootstrapped/.test(out));
});

await T("control challenge: a manual challenger that wins 10/10 with the rubric up is PROMOTED, then the new champion is re-baselined with fresh samples", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  await drive(root, "sonnet", {}, atOptimizer(root, "sonnet"));
  const before = await cur(root, "sonnet");
  await must(root, "challenge", "--lineage", "sonnet", "--file", `${root}/prompts/castDebate.sonnet.v2.md`, "--note", "control");
  eq((await cur(root, "sonnet")).jobs.optimizer, undefined, "the unspawned optimizer job is withdrawn");
  const P: Policy = { rating: (_l, v) => (v === "v1" ? 7 : 6), blind: challengerWinsAll };
  await drive(root, "sonnet", P, atOptimizer(root, "sonnet"));
  const champ = await readJson(`${root}/sonnet/champion.json`);
  eq([champ.working, champ.promotions, champ.release], ["v1", 1, null]);
  const l = await ledger(root, "sonnet");
  eq([l.length, l[0].outcome, l[0].wins, l[0].pairs], [1, "PROMOTE", 10, 10]);
  eq(l[0].hypothesis.targets, [], "a manual challenger has no target cell");
  eq(Object.keys(l[0].perCategoryDelta).sort(), ["Health", "Love", "Purpose", "Wealth", "Wonder"]);
  ok(Object.values<number>(l[0].perCategoryDelta).every((d) => d === 10), `per-category delta +10 each, got ${JSON.stringify(l[0].perCategoryDelta)}`);
  const b = await readJson(`${root}/sonnet/baseline.json`);
  const after = await cur(root, "sonnet");
  eq([b.version, b.draw === after.id, after.id !== before.id], ["v1", true, true], "baseline redrawn in a new experiment");
  eq((await readJson(`${root}/sonnet/versions/v0.json`)).status, "superseded");
  eq((await readJson(`${root}/sonnet/versions/v1.json`)).status, "working champion");
  // the redraw produced new transcripts, not the winning ones
  const winning = Object.values<any>(before.jobs).filter((j) => j.version === "v1" && j.cacheKey).map((j) => j.cacheKey);
  ok(Object.values<string>(b.gen).every((k) => !winning.includes(k)), "the new baseline never reuses the winning samples");
});

await T("optimizer proposal: 6/10 → RETEST with one more sample per question on both sides → 6/15 → KEEP; champion unchanged", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  // stage 1: the challenger wins q1-q3 (6 pairs); stage 2: it loses all five new pairs
  const P: Policy = { rating: (_l, v) => (v === "v1" ? 6.5 : 6), blind: (lin, a, b, q, s) => (s <= 2 && q <= 3 ? challengerWinsAll(lin, a, b) : challengerLosesAll(lin, a, b)) };
  await drive(root, "sonnet", P, async () => (await ledger(root, "sonnet")).length === 1);
  const l = await ledger(root, "sonnet");
  eq([l[0].outcome, l[0].wins, l[0].pairs], ["RETEST→KEEP", 6, 15]);
  const champ = await readJson(`${root}/sonnet/champion.json`);
  eq(champ.working, "v0");
  const exp = await readJson(`${root}/sonnet/experiments/${l[0].id}/state.json`);
  eq(Object.keys(exp.jobs).filter((k) => /^gen\.v0\.q\d\.s3$/.test(k)).length, 5, "fresh champion samples on retest");
  eq(Object.keys(exp.jobs).filter((k) => /^blind\.q\d\.s3$/.test(k)).length, 5, "five more pairs");
  eq((await readJson(`${root}/sonnet/versions/v1.json`)).status, "keep");
});

await T("three non-promotions on the same target cell ESCALATE and ban it; the next optimizer input lists the ban", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  const P: Policy = { blind: challengerLosesAll, optimizer: (_l, c, _i, n) => propose(c, n, ["C4.4"]) };
  await drive(root, "sonnet", P, async () => (await ledger(root, "sonnet")).length === 3, 60);
  const l = await ledger(root, "sonnet");
  eq(l.map((e) => e.outcome), ["REJECT", "REJECT", "ESCALATE"]);
  const bans = await readJson(`${root}/sonnet/bans.json`);
  eq(bans.map((b: any) => b.target), ["C4.4"]);
  await drive(root, "sonnet", P, atOptimizer(root, "sonnet"));
  const input = await Deno.readTextFile(`${root}/sonnet/experiments/${(await cur(root, "sonnet")).id}/jobs/optimizer.md`);
  ok(/=== BANNED TARGETS ===\nC4\.4 \(until iteration \d+\)/.test(input), "ban listed in the optimizer input");
});

await T("optimizer no_change → KEEP; an invalid proposal is returned with the problems once, twice → KEEP; escalate → ESCALATED; two escalations STOP; a new session resumes", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  const seq: unknown[] = [];
  const P: Policy = { optimizer: (_l, c, _i, n) => seq.length ? (typeof seq[0] === "function" ? (seq.shift() as (c: unknown, n: number) => unknown)(c, n) : seq.shift()) : propose(c, n) };
  const noChange = (c: { version: string }) => ({ schema_version: "optimizer-4.2.0", action: "no_change", parent_prompt_id: c.version, kind: null, hypothesis: { problem: "p", cause_type: "uncertain", mechanism: "m", proposed_change: "none", expected_observations: ["none"], falsification_condition: "f", regression_risk: "r", targets: [], expected_delta: 0 }, evidence: [], candidate_system_prompt: null, edits: [], blocked: [], next_system_action: null, change_summary: "nothing worth testing" });
  const escalate = (c: { version: string }) => ({ ...noChange(c), action: "escalate", hypothesis: { ...noChange(c).hypothesis, cause_type: "model" }, next_system_action: "a stronger worker model", change_summary: "model-bound" });
  const badParent = (c: { version: string; system: string }, n: number) => ({ ...propose(c, n), parent_prompt_id: "v9" });
  seq.push(noChange, badParent, badParent, escalate, escalate);
  await drive(root, "sonnet", P, async () => (await cur(root, "sonnet")).state === "STOPPED", 60);
  const l = await ledger(root, "sonnet");
  eq(l.map((e) => e.outcome), ["KEEP", "KEEP", "ESCALATE", "ESCALATE"]);
  ok(/rejected twice/.test(l[1].hypothesis.statement), "the double rejection is recorded");
  ok(/repeated escalation/.test((await cur(root, "sonnet")).reason));
  ok((await Deno.readTextFile(`${root}/sonnet/escalations.log`)).includes("model: a stronger worker model"));
  const respawned = (await walk(`${root}/sonnet/experiments`)).filter((p) => p.endsWith("jobs/optimizer.md"));
  ok((await Promise.all(respawned.map((p) => Deno.readTextFile(p)))).some((t) => t.includes("=== PREVIOUS ATTEMPT REJECTED BY THE RUNNER ===")), "the problems were appended for the respawn");
  const s = await must(root, "session", "--lineage", "sonnet");
  ok(/state OPTIMIZING/.test(s), `session resumes: ${s}`);
});

await T("a blind verdict invalid twice is a missing pair: 9 of 10 judged → KEEP (incomplete), never a tie or a loss", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  const P: Policy = { rating: (_l, v) => (v === "v1" ? 7 : 6), blind: (lin, a, b, q, s) => (q === 2 && s === 1 ? "invalid" : challengerWinsAll(lin, a, b)) };
  await drive(root, "sonnet", P, async () => (await ledger(root, "sonnet")).length === 1);
  const l = await ledger(root, "sonnet");
  eq([l[0].outcome, l[0].wins, l[0].pairs], ["KEEP", 9, 9]);
  const exp = await readJson(`${root}/sonnet/experiments/${l[0].id}/state.json`);
  ok(exp.reason.includes("incomplete"), exp.reason);
  ok((await Deno.readTextFile(`${root}/sonnet/experiments/${l[0].id}/missing.log`)).includes("blind.q2.s1"));
});

await T("critical: a structurally invalid challenger transcript rejects regardless of a 10/10 blind win", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  const P: Policy = {
    gen: (lin, v, q, s) => { if (v !== "v1" || q !== 4 || s !== 2) return undefined; const d = debateFor(lin, v, q, s, "x"); d.debate.pop(); return d; },   // 8 turns
    rating: (_l, v) => (v === "v1" ? 8 : 6), blind: challengerWinsAll,
  };
  await drive(root, "sonnet", P, async () => (await ledger(root, "sonnet")).length === 1);
  const l = await ledger(root, "sonnet");
  eq(l[0].outcome, "REJECT");
  const exp = await readJson(`${root}/sonnet/experiments/${l[0].id}/state.json`);
  ok(/critical: 1 invalid transcript/.test(exp.reason), exp.reason);
});

await T("Gemini: a reply that never completed is recorded, not scored; a baseline slot that failed is redrawn once alone (fresh sample); on the challenger side it is a critical failure", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "gemini");
  let blocked = 0;
  const P: Policy = {
    gen: (_lin, v, q, s) => (v === "v0" && q === 3 && s === 1 && blocked++ === 0 ? null : v === "v1" && q === 1 && s === 1 ? null : undefined),
  };
  await drive(root, "gemini", P, atOptimizer(root, "gemini"));
  const b = await readJson(`${root}/gemini/baseline.json`);
  eq([b.missing, Object.keys(b.gen).length, blocked], [[], 10, 2], "the failed slot was redrawn once and the baseline is complete");
  const first = await cur(root, "gemini");
  ok((await Deno.readTextFile(`${root}/gemini/experiments/${first.id}/missing.log`)).includes("baseline: redrawing q3.s1 (redraw 1 of 2)"));
  eq(first.refills, { "q3.s1": 1 });
  await drive(root, "gemini", { ...P, blind: challengerWinsAll }, async () => (await ledger(root, "gemini")).length === 1);
  const l = await ledger(root, "gemini");
  eq(l[0].outcome, "REJECT");
  const exp = await readJson(`${root}/gemini/experiments/${l[0].id}/state.json`);
  ok(/critical: 1 invalid transcript\(s\): no reply: gemini blocked: SAFETY/.test(exp.reason), exp.reason);
});

await T("a subagent worker answer that is JSON but not a debate is recorded as invalid without crashing the rubric or blind stages", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  const P: Policy = { gen: (_l, v, q, s) => (v === "v1" && q === 5 && s === 2 ? "garbage" : undefined), blind: challengerWinsAll, rating: (_l, v) => (v === "v1" ? 7 : 6) };
  await drive(root, "sonnet", P, async () => (await ledger(root, "sonnet")).length === 1);
  const l = await ledger(root, "sonnet");
  eq([l[0].outcome, l[0].pairs], ["REJECT", 9]);
});

await T("validation every 3 promotions: PASS moves the release pointer, rotates one Set B question, and the next iteration re-baselines the working champion", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  const rating = (_l: string, v: string) => 6 + Number(v.slice(1)) * 0.25;   // every newer version is a little better
  const P: Policy = { rating, blind: challengerWinsAll };
  await drive(root, "sonnet", P, inState(root, "sonnet", "VALIDATING"), 80);
  const champ = await readJson(`${root}/sonnet/champion.json`);
  eq([champ.working, champ.promotions, champ.promotionsSinceValidation], ["v3", 3, 3]);
  const val = await cur(root, "sonnet");
  eq([val.kind, val.champion, val.challenger, val.questions.length], ["validation", "v0", "v3", 5], "working v3 vs the initial release reference v0, Set B snapshotted");
  const setBBefore = await readJson(`${root}/runner-only/setB.json`);
  await drive(root, "sonnet", P, atOptimizer(root, "sonnet"), 40);
  const after = await readJson(`${root}/sonnet/champion.json`);
  eq([after.release, after.working, after.promotionsSinceValidation], ["v3", "v3", 0]);
  ok((await Deno.readTextFile(`${root}/sonnet/validations.log`)).includes(" PASS (v3 vs v0)"));
  const setB = await readJson(`${root}/runner-only/setB.json`);
  eq([setB.uses, setB.retired.length, setB.retired[0].id, setB.questions[4].id], [1, 1, setBBefore.questions[0].id, "health-03"], "one question rotated in from the pool");
  eq((await readJson(`${root}/sonnet/baseline.json`)).version, "v3", "the working champion was re-baselined after validation");
});

await T("validation FAIL rolls the working champion back to the release reference and re-baselines it; INCONCLUSIVE adds one sample per question and decides on 15 pairs", async () => {
  const root = await makeRoot((c) => { c.validation.everyPromotions = 1; });
  await must(root, "bootstrap", "--lineage", "sonnet");
  // Set A: the challenger wins. Set B: v1 loses every pair → FAIL.
  let setBPolicy: "lose" | "split" = "lose";
  const P: Policy = {
    rating: (_l, v) => (v === "v0" ? 6 : 7),
    blind: (lin, a, b, q, s) => {
      const st = Deno.readTextFileSync(`${root}/${lin}/current.json`).includes('"validation"');
      if (!st) return challengerWinsAll(lin, a, b);
      if (setBPolicy === "lose") return challengerLosesAll(lin, a, b);
      return s === 3 ? challengerWinsAll(lin, a, b) : q <= 3 ? challengerWinsAll(lin, a, b) : challengerLosesAll(lin, a, b);   // 6/10, then +5 → 11/15
    },
  };
  await drive(root, "sonnet", P, async () => (await Deno.readTextFile(`${root}/sonnet/validations.log`).catch(() => "")).includes("FAIL"), 60);
  const c1 = await readJson(`${root}/sonnet/champion.json`);
  eq([c1.working, c1.release], ["v0", null], "rolled back to v0; nothing released");
  eq((await readJson(`${root}/sonnet/versions/v1.json`)).status, "rolled back");
  await drive(root, "sonnet", P, atOptimizer(root, "sonnet"));
  eq((await readJson(`${root}/sonnet/baseline.json`)).version, "v0", "v0 re-baselined after the rollback");
  ok((await Deno.readTextFile(`${root}/sonnet/experiments/${(await cur(root, "sonnet")).id}/jobs/optimizer.md`)).includes("=== NOTICE ===\nThe base prompt changed after a failed validation"), "the optimizer is told the base changed, with no Set B detail");
  setBPolicy = "split";
  await drive(root, "sonnet", P, async () => ((await Deno.readTextFile(`${root}/sonnet/validations.log`)).match(/ (PASS|FAIL|INCONCLUSIVE) /g) ?? []).length === 2, 80);
  const log = await Deno.readTextFile(`${root}/sonnet/validations.log`);
  ok(/ PASS \(v2 vs v0\): blind 11\/15 after retest/.test(log), log);
});

await T("Set B canary: a token planted in every Set B text never reaches an optimizer input or a Set A experiment folder", async () => {
  const root = await makeRoot((c) => { c.validation.everyPromotions = 1; });
  const b = await readJson(`${root}/runner-only/setB.json`);
  for (const q of b.questions) q.text = `${q.text} CANARY-7f3a91`;
  await Deno.writeTextFile(`${root}/runner-only/setB.json`, JSON.stringify(b, null, 2));
  await must(root, "bootstrap", "--lineage", "sonnet");
  const P: Policy = { rating: (_l, v) => 6 + Number(v.slice(1)) * 0.5, blind: challengerWinsAll, gen: (lin, v, q, s) => { const d = debateFor(lin, v, q, s, "c"); return d; } };
  await drive(root, "sonnet", P, async () => (await Deno.readTextFile(`${root}/sonnet/validations.log`).catch(() => "")).includes("PASS"), 60);
  await drive(root, "sonnet", P, atOptimizer(root, "sonnet"));
  const valFiles = await walk(`${root}/sonnet/validations`);
  ok((await Promise.all(valFiles.map((p) => Deno.readTextFile(p)))).some((t) => t.includes("CANARY-7f3a91")), "the canary is present behind the wall (sanity)");
  ok((await Promise.all((await walk(`${root}/runner-only/inbox`)).map((p) => Deno.readTextFile(p)))).some((t) => t.includes("CANARY-7f3a91")), "validation agent files live under runner-only/inbox");
  const leaks: string[] = [];
  for (const p of [...(await walk(`${root}/sonnet/experiments`)), ...(await walk(`${root}/inbox`))]) if ((await Deno.readTextFile(p)).includes("CANARY-7f3a91")) leaks.push(p);
  for (const p of [`${root}/sonnet/ledger.jsonl`, `${root}/sonnet/validations.log`, `${root}/sonnet/baseline.json`]) if ((await Deno.readTextFile(p).catch(() => "")).includes("CANARY-7f3a91")) leaks.push(p);
  for (const p of await walk(`${root}/cache`)) if ((await Deno.readTextFile(p)).includes("CANARY-7f3a91")) leaks.push(p);
  eq(leaks, [], "no leak, including the shared cache");
  ok((await Promise.all((await walk(`${root}/runner-only/cache`)).map((p) => Deno.readTextFile(p)))).some((t) => t.includes("CANARY-7f3a91")), "Set B transcripts are cached under runner-only/cache");
});

await T("stop rules count the current session only: 6 non-promotions stop the lineage, a new session continues", async () => {
  const root = await makeRoot((c) => { c.stop.consecutiveNonPromotions = 2; });
  await must(root, "bootstrap", "--lineage", "sonnet");
  const P: Policy = { blind: challengerLosesAll, optimizer: (_l, c, _i, n) => propose(c, n, [`C${1 + (n % 7)}.1`]) };
  await drive(root, "sonnet", P, inState(root, "sonnet", "STOPPED"), 40);
  ok(/plateau: 2 iterations/.test((await cur(root, "sonnet")).reason));
  eq((await ledger(root, "sonnet")).length, 2);
  await must(root, "session", "--lineage", "sonnet");
  await drive(root, "sonnet", P, async () => (await ledger(root, "sonnet")).length === 3, 30);
  ok((await cur(root, "sonnet")).state !== "STOPPED" || (await ledger(root, "sonnet")).length === 3);
});

await T("ablation iteration: a proposal that is not ABLATE is rejected and returned with the problem", async () => {
  const root = await makeRoot((c) => { c.optimizer.ablationEveryN = 1; });
  await must(root, "bootstrap", "--lineage", "sonnet");
  const P: Policy = { blind: challengerLosesAll };
  // iteration 0 is never an ablation; iteration 1 is
  await drive(root, "sonnet", P, async () => (await ledger(root, "sonnet")).length === 1);
  await drive(root, "sonnet", P, async () => (await ledger(root, "sonnet")).length === 2, 30);
  const l = await ledger(root, "sonnet");
  ok(/only allowed kind is ABLATE/.test(l[1].hypothesis.statement), l[1].hypothesis.statement);
});

// ---------- the review's confirmed findings, one test each ----------

await T("rubric ratings with float-awkward decimals (8.3, 8.7, 9.2 …) are accepted, and a card is scored from the map", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  await drive(root, "sonnet", { rating: () => 8.3 }, atOptimizer(root, "sonnet"));
  const b = await readJson(`${root}/sonnet/baseline.json`);
  eq([Object.keys(b.rubric).length, b.missing], [10, []]);
  const card = (await readJson(`${root}/cache/rubric/${b.rubric["q1.s1"]}.json`)).card;
  eq(card.score, 83);
});

await T("an evaluator that shortens a cell name keeps its card; an invalid card is repaired once with the problems appended to its input", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  // generations only: stop as soon as the rubric jobs exist
  await drive(root, "sonnet", {}, async () => Object.values<any>((await cur(root, "sonnet")).jobs).some((j) => j.kind === "rubric"));
  const jobs = (await must(root, "next", "--lineage", "sonnet")).split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
  eq(jobs.length, 10);
  for (const [i, j] of jobs.entries()) {
    const card = rawCard(6.5);
    if (i === 0) card.cells[30].name = "Meaningful stakes";                       // shortened name: tolerated
    if (i === 1) card.cells[0].rating = 9.2;                                       // 9+ without the anchor: invalid
    await Deno.writeTextFile(j.outPath, JSON.stringify(card));
  }
  const ing = await must(root, "ingest", "--lineage", "sonnet");
  ok(ing.includes(`INVALID ${jobs[1].id}`) && !ing.includes(`INVALID ${jobs[0].id}`), ing);
  const input = await Deno.readTextFile(jobs[1].promptPath);
  ok(input.includes("=== PREVIOUS ATTEMPT REJECTED BY THE RUNNER ===") && input.includes("C1.1"), "the problems are appended for the repair");
  ok(await exists(`${jobs[1].outPath}.rejected1`), "the rejected output is kept, not deleted");
  const again = (await must(root, "next", "--lineage", "sonnet")).split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
  eq(again.map((j) => j.id), [jobs[1].id], "only the invalid job is printed again");
  await Deno.writeTextFile(again[0].outPath, JSON.stringify(rawCard(6.5)));
  await must(root, "ingest", "--lineage", "sonnet");
  eq((await cur(root, "sonnet")).state, "OPTIMIZING");
});

await T("agent paths are opaque: no worker, evaluator or judge file name carries a lineage, a version or an experiment", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  const log = await drive(root, "sonnet", { blind: challengerWinsAll, rating: (_l, v) => (v === "v1" ? 7 : 6) }, async () => (await ledger(root, "sonnet")).length === 1);
  const paths = log.filter((l) => l.startsWith("{")).map((l) => JSON.parse(l)).filter((j) => j.kind !== "optimizer").flatMap((j) => [j.promptPath, j.outPath]);
  ok(paths.length >= 40, `${paths.length} paths`);
  const leaky = paths.filter((p) => /sonnet|gemini|\/v\d+|exp-|val-|rubric|blind|gen\./.test(p.slice(root.length)));
  eq(leaky, []);
});

await T("an optimizer output of the wrong shape (escalate without a hypothesis) is a validation problem, not a crash; twice → KEEP", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  const bad = { schema_version: "optimizer-4.2.0", action: "escalate", parent_prompt_id: "v0", kind: null, hypothesis: null, evidence: [], candidate_system_prompt: null, edits: [], blocked: [], next_system_action: "x", change_summary: "x" };
  await drive(root, "sonnet", { optimizer: () => bad }, async () => (await ledger(root, "sonnet")).length === 1);
  const l = await ledger(root, "sonnet");
  ok(l[0].outcome === "KEEP" && /rejected twice: schema/.test(l[0].hypothesis.statement), l[0].hypothesis.statement);
});

await T("an optimizer that answers in prose twice closes the iteration as KEEP and is never re-issued", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  await drive(root, "sonnet", { optimizer: () => "I think the prompt is fine." }, async () => (await ledger(root, "sonnet")).length === 1);
  const l = await ledger(root, "sonnet");
  ok(/not JSON/.test(l[0].hypothesis.statement), l[0].hypothesis.statement);
  eq(await Deno.readTextFile(`${root}/sonnet/calls.count`), "22", "20 baseline calls + 2 optimizer attempts, all counted");
});

await T("an agent that returns twice without writing is closed as missing, not re-issued forever", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  for (let round = 0; round < 2; round++) {
    const jobs = (await must(root, "next", "--lineage", "sonnet")).split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
    for (const j of jobs.slice(1)) await spawnJob(root, j, {});   // the first worker never writes
    await must(root, "ingest", "--lineage", "sonnet");
  }
  const st = await cur(root, "sonnet");
  const j = st.jobs["gen.v0.q1.s1"];
  eq([j.done, j.misses, j.cacheKey ?? null], [true, 2, null]);
  ok(Object.values<any>(st.jobs).some((x) => x.kind === "rubric"), "the stage moved on to the rubric jobs");
});

await T("a stop limit reached by a promoting iteration still moves the champion pointer before the lineage stops", async () => {
  const root = await makeRoot((c) => { c.stop.maxIterationsPerSession = 1; });
  await must(root, "bootstrap", "--lineage", "sonnet");
  await drive(root, "sonnet", { blind: challengerWinsAll, rating: (_l, v) => (v === "v1" ? 7 : 6) }, inState(root, "sonnet", "STOPPED"), 30);
  const champ = await readJson(`${root}/sonnet/champion.json`);
  eq([champ.working, champ.promotions], ["v1", 1]);
  eq((await readJson(`${root}/sonnet/versions/v0.json`)).status, "superseded");
  eq((await readJson(`${root}/sonnet/baseline.json`)).version, "v1", "re-baselined before stopping");
});

await T("changing the evaluator version after a baseline forces a redraw before the next comparison", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  await drive(root, "sonnet", {}, atOptimizer(root, "sonnet"));
  const b1 = await readJson(`${root}/sonnet/baseline.json`);
  const c = await readJson(`${root}/config.v4.2.json`); c.agents.rubric.version = "rubric-evaluator-4.2.1"; await Deno.writeTextFile(`${root}/config.v4.2.json`, JSON.stringify(c, null, 2));
  const out = await must(root, "next", "--lineage", "sonnet");
  ok(/evaluation configuration changed/.test(out), out);
  await drive(root, "sonnet", {}, atOptimizer(root, "sonnet"));
  const b2 = await readJson(`${root}/sonnet/baseline.json`);
  ok(b2.draw !== b1.draw && b2.fingerprint !== b1.fingerprint, "a new baseline under the new evaluator");
});

await T("an error in one lineage is reported as ERROR and does not stop the other", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap");
  await Deno.remove(`${root}/gemini/champion.json`);
  const r = await evo(root, "next");
  eq(r.code, 0, "one lineage's ERROR is not the command's failure");
  ok(/gemini: ERROR/.test(r.out), r.out);
  eq(r.out.split("\n").filter((l) => l.startsWith("{") && l.includes('"lineage":"sonnet"')).length, 10, "sonnet's jobs are still printed");
});

await T("a validation with missing pairs is never PASS or FAIL: it retests, then ends EXPERIMENTAL", async () => {
  const root = await makeRoot((c) => { c.validation.everyPromotions = 1; });
  await must(root, "bootstrap", "--lineage", "sonnet");
  const P: Policy = {
    rating: (_l, v) => (v === "v0" ? 6 : 7),
    blind: (lin, a, b, q) => {
      const val = Deno.readTextFileSync(`${root}/${lin}/current.json`).includes('"validation"');
      return val && q === 2 ? "invalid" : challengerWinsAll(lin, a, b);   // every Set B pair of question 2 is missing
    },
  };
  await drive(root, "sonnet", P, async () => /EXPERIMENTAL|PASS|FAIL/.test((await cur(root, "sonnet")).state + (await Deno.readTextFile(`${root}/sonnet/validations.log`).catch(() => ""))), 60);
  const log = await Deno.readTextFile(`${root}/sonnet/validations.log`);
  ok(/ INCONCLUSIVE \(v1 vs v0\): incomplete: only 12 of 15 pairs judged/.test(log), log);
  eq((await readJson(`${root}/sonnet/champion.json`)).release, null, "nothing released on an incomplete panel");
});

await T("Set B used maxUsesBeforeRefresh times: the next validation waits for a person (NEEDS_HUMAN) instead of reusing it", async () => {
  const root = await makeRoot((c) => { c.validation.everyPromotions = 1; });
  const b = await readJson(`${root}/runner-only/setB.json`); b.uses = 3; await Deno.writeTextFile(`${root}/runner-only/setB.json`, JSON.stringify(b));
  await must(root, "bootstrap", "--lineage", "sonnet");
  await drive(root, "sonnet", { blind: challengerWinsAll, rating: (_l, v) => (v === "v1" ? 7 : 6) }, inState(root, "sonnet", "NEEDS_HUMAN"), 30);
  ok(/Set B has been used 3 times/.test((await cur(root, "sonnet")).reason));
});

// ---------- the second review's confirmed findings ----------

await T("Gemini outputs written by a running batch never tell the dispatcher to ingest, so the other lineage's printed jobs are not counted as misses", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap");
  const first = (await must(root, "next")).split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
  const batch = first.find((j) => j.kind === "gemini-batch");
  const gst = await cur(root, "gemini");
  const gjobs = Object.values<any>(gst.jobs).filter((j) => j.kind === "gemini").slice(0, 3);
  for (const j of gjobs) { await Deno.mkdir(j.outPath.slice(0, j.outPath.lastIndexOf("/")), { recursive: true }); await Deno.writeTextFile(j.outPath, JSON.stringify({ output: debateFor("gemini", j.version, j.q, j.s, "b"), latencyMs: 1 })); }
  await Deno.writeTextFile(`${root}/gemini/experiments/${gst.id}/gemini.lock`, JSON.stringify({ pid: 1, heartbeat: Date.now() }));
  ok(batch, "batch printed first");
  const second = await must(root, "next");
  ok(/gemini: WAIT gemini-batch running \(3 written, 7 to go\)/.test(second) && !/gemini: .*run ingest/.test(second), second);
  for (const j of first.filter((x) => x.lineage === "sonnet")) await spawnJob(root, j, {});
  await must(root, "ingest");
  const third = await must(root, "next");
  ok(!/run ingest/.test(third), `no ingest instruction while Sonnet rubric jobs are printed: ${third}`);
  ok(third.split("\n").filter((l) => l.includes('"lineage":"sonnet"')).length === 10);
});

await T("a baseline slot that fails all its draws is left out after two redraws, with a WARNING; the gate then expects 9 pairs and can PROMOTE", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  let draws = 0;
  const P: Policy = { gen: (_l, v, q, s) => (v === "v0" && q === 3 && s === 1 ? (draws++, null) : undefined), blind: challengerWinsAll, rating: (_l, v) => (v === "v1" ? 7 : 6) };
  const log = await drive(root, "sonnet", P, async () => (await ledger(root, "sonnet")).length === 1, 40);
  eq(draws, 3, "first draw plus two redraws");
  ok(log.some((l) => /WARNING baseline v0 has 1 missing slot/.test(l)), "the hole is announced");
  const l = await ledger(root, "sonnet");
  eq([l[0].outcome, l[0].wins, l[0].pairs], ["PROMOTE", 9, 9]);
});

await T("a baseline that loses more than half its slots asks for a person instead of optimizing on holes", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  await drive(root, "sonnet", { gen: (_l, v, q) => (v === "v0" && q <= 3 ? null : undefined) }, inState(root, "sonnet", "NEEDS_HUMAN"), 40);
  ok(/baseline: 6 of 10 slots failed 3 draws/.test((await cur(root, "sonnet")).reason));
  ok(!(await exists(`${root}/sonnet/baseline.json`)), "no baseline with holes was written");
});

await T("README step 5 right after bootstrap: the control is queued, tested as soon as the baseline closes, and no optimizer job is ever printed for that slot", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  const q = await must(root, "challenge", "--lineage", "sonnet", "--file", "prompts/castDebate.sonnet.v2.md", "--note", "control");
  ok(/queued prompts\/castDebate.sonnet.v2.md/.test(q), q);
  const log = await drive(root, "sonnet", { blind: challengerWinsAll, rating: (_l, v) => (v === "v1" ? 7 : 6) }, async () => (await ledger(root, "sonnet")).length === 1);
  ok(!log.some((l) => l.includes('"kind":"optimizer"')), "no optimizer job before the control was decided");
  const v1 = await readJson(`${root}/sonnet/versions/v1.json`);
  eq([v1.manual, v1.origin, (await ledger(root, "sonnet"))[0].outcome], [true, "prompts/castDebate.sonnet.v2.md", "PROMOTE"]);
});

await T("a proposal aimed at a banned target is returned for repair, never tested", async () => {
  const root = await makeRoot();
  await Deno.mkdir(`${root}/sonnet`, { recursive: true });
  await must(root, "bootstrap", "--lineage", "sonnet");
  await Deno.writeTextFile(`${root}/sonnet/bans.json`, JSON.stringify([{ target: "C4.4", until: 99 }]));
  await drive(root, "sonnet", { optimizer: (_l, c, _i, n) => propose(c, n, ["C4.4"]) }, async () => (await ledger(root, "sonnet")).length === 1);
  const l = await ledger(root, "sonnet");
  ok(l[0].outcome === "KEEP" && /target C4\.4 is banned until iteration 99/.test(l[0].hypothesis.statement), l[0].hypothesis.statement);
});

await T("a validation reserves its Set B use when it opens; a voluntary validate on an exhausted Set B is refused without touching state", async () => {
  const root = await makeRoot((c) => { c.validation.everyPromotions = 1; });
  await must(root, "bootstrap", "--lineage", "sonnet");
  await drive(root, "sonnet", { blind: challengerWinsAll, rating: (_l, v) => (v === "v1" ? 7 : 6) }, inState(root, "sonnet", "VALIDATING"), 30);
  eq((await readJson(`${root}/runner-only/setB.json`)).uses, 1, "reserved at open");
  const root2 = await makeRoot();
  const b = await readJson(`${root2}/runner-only/setB.json`); b.uses = 3; await Deno.writeTextFile(`${root2}/runner-only/setB.json`, JSON.stringify(b));
  await must(root2, "bootstrap", "--lineage", "sonnet");
  await drive(root2, "sonnet", {}, inState(root2, "sonnet", "OPTIMIZING"));
  const before = await cur(root2, "sonnet");
  const r = await evo(root2, "validate", "--lineage", "sonnet");
  eq(r.code, 2); ok(/Set B has been used 3 times/.test(r.err), r.err);
  eq((await cur(root2, "sonnet")).id, before.id, "state untouched");
});

await T("the optimizer input states the task first and shows why the last challenger was rejected (critical, not quality)", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  const P: Policy = { gen: (lin, v, q, s) => { if (v !== "v1" || q !== 1 || s !== 1) return undefined; const d = debateFor(lin, v, q, s, "x"); d.debate.pop(); return d; }, blind: challengerWinsAll, rating: (_l, v) => (v === "v1" ? 7 : 6) };
  await drive(root, "sonnet", P, async () => (await ledger(root, "sonnet")).length === 1);
  await drive(root, "sonnet", P, atOptimizer(root, "sonnet"));
  await must(root, "next", "--lineage", "sonnet");   // the first print rebuilds the input
  const input = await Deno.readTextFile(`${root}/sonnet/experiments/${(await cur(root, "sonnet")).id}/jobs/optimizer.md`);
  ok(input.indexOf("=== THIS TASK ===") < input.indexOf("=== CHAMPION PROMPT"), "task first");
  ok(/gate reason: critical: 1 invalid transcript/.test(input), "the ledger line says why");
  ok(input.length < 120_000, `input ${input.length} bytes`);
});

await T("harmless variations are accepted: extra fields, a 'None' limitation, a null question_type_note, a judge's confidence field", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  await drive(root, "sonnet", {}, async () => Object.values<any>((await cur(root, "sonnet")).jobs).some((j) => j.kind === "rubric"));
  const jobs = (await must(root, "next", "--lineage", "sonnet")).split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
  for (const j of jobs) {
    const c: any = rawCard(9.2, {}, { question_type_note: null as unknown as string });
    c.overall_comment = "fine"; c.cells[0].criterion = "C1"; c.cells.forEach((x: any) => (x.limitation = "None"));
    c.rubric_fit_notes = "The matrix fits this decision question.";   // a string, as 9 of 10 live evaluators wrote it
    c.mechanical = [{ pattern: "hedge_saturation", turns: [] }];        // a whole-debate pattern, as 4 of 10 live cards wrote it
    await Deno.writeTextFile(j.outPath, "```json\n" + JSON.stringify(c) + "\n```\nTotals omitted {per the brief}.");
  }
  const ing = await must(root, "ingest", "--lineage", "sonnet");
  ok(!/INVALID/.test(ing), ing);
});

await T("the champion's own baseline failing the critical limits is announced (WARNING) and recorded", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  const P: Policy = { gen: (lin, v, q, s) => { if (v !== "v0") return undefined; const d = debateFor(lin, v, q, s, "w"); d.debate[1].basis = "[Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 4](https://example.org)"; return d; } };
  const log = await drive(root, "sonnet", P, atOptimizer(root, "sonnet"));
  ok(log.some((l) => /WARNING the champion v0's own baseline fails the critical limits/.test(l)), "announced");
  ok((await readJson(`${root}/sonnet/baseline.json`)).championCritical.length > 0, "recorded");
});

await T("cross-lane verdicts are validated at ingest: an invalid one is returned for repair, a valid one is tallied", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap");
  await drive(root, "all", {}, async () => (await atOptimizer(root, "sonnet")()) && (await atOptimizer(root, "gemini")()));
  const jobs = (await must(root, "capability", "--blind")).split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
  for (const [i, j] of jobs.entries()) { await Deno.mkdir(j.outPath.slice(0, j.outPath.lastIndexOf("/")), { recursive: true }); await Deno.writeTextFile(j.outPath, i === 0 ? JSON.stringify({ winner: "C" }) : JSON.stringify(verdict("tie"))); }
  const ing = await must(root, "ingest");
  ok(/capability: INVALID capability\.blind\.q1\.s1: .*respawn once/.test(ing), ing);
  const again = (await must(root, "capability", "--blind")).split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
  eq(again.map((j) => j.id), ["capability.blind.q1.s1"]);
  await Deno.writeTextFile(again[0].outPath, JSON.stringify(verdict("tie")));
  await must(root, "ingest");
  const cap = await readJson(`${root}/capability/latest.json`);
  eq([cap.crossLane.tie, cap.crossLane.pending, cap.crossLane.invalid], [10, 0, 0]);
  eq(await Deno.readTextFile(`${root}/capability/calls.count`), "11");
});

// ---------- Option 1: plain-citation controls ----------

await T("a promoted plain-citation Sonnet control protects its plain citation rules instead of the linked format it replaced, and the next proposal is tested", async () => {
  const root = await makeRoot();
  await must(root, "bootstrap", "--lineage", "sonnet");
  const q = await must(root, "challenge", "--lineage", "sonnet", "--file", "prompts/castDebate.sonnet.v2-plain.md", "--note", "control, plain citation");
  ok(/queued/.test(q), q);
  const win: Policy = { blind: challengerWinsAll, rating: (_l, v) => (v === "v1" ? 7 : 6) };
  const log = await drive(root, "sonnet", win, async () => (await ledger(root, "sonnet")).length === 1);
  ok(log.some((l) => /WARNING manual challenger breaks protected spans: missing format_line/.test(l)), "the deliberate change is announced");
  eq((await ledger(root, "sonnet"))[0].outcome, "PROMOTE");
  await drive(root, "sonnet", win, atOptimizer(root, "sonnet"));
  await must(root, "next", "--lineage", "sonnet");
  const input = await Deno.readTextFile(`${root}/sonnet/experiments/${(await cur(root, "sonnet")).id}/jobs/optimizer.md`);
  const spansBlock = input.split("=== PROTECTED SPANS")[1].split("=== SET A")[0];
  ok(spansBlock.includes("[basis_plumbing]") && spansBlock.includes("[format_line@gemini]") && spansBlock.includes("[per_turn_quote_check]"), "plain citation rules protected");
  ok(!spansBlock.includes("(verified URL)"), "the linked format is no longer demanded");
  await drive(root, "sonnet", { blind: challengerLosesAll }, async () => (await ledger(root, "sonnet")).length === 2);
  eq((await ledger(root, "sonnet"))[1].outcome, "REJECT", "the optimizer's proposal passed validation and was judged");
});

const fails = report();
if (fails) Deno.exit(1);
