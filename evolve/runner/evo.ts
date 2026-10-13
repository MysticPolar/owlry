// ============================================================
// evo — the one command-line tool behind the self-evolving prompt loop.
//
// Everything the loop needs that is not a model call lives here: creating
// a round, running the Gemini worker, saving a Sonnet worker's answer,
// building the judge's and editor's inputs, applying the editor's new
// version, and printing a round summary. The master (a model) only ever
// runs these subcommands and spawns the judge, editor and Sonnet worker.
//
// Run from the repository root:
//   deno run --config evolve/deno.json --env-file=.env.local -A evolve/runner/evo.ts <command> [--flag value ...]
//
// Boundary: this file imports the production Gemini client and nothing
// else from the app. No production prompt ever reaches a worker from here;
// the worker sees the subject file and the question, nothing more.
// ============================================================
import { callGeminiJson, geminiClient, GeminiBlocked, type ThinkingLevel } from '../../supabase/functions/_shared/gemini.ts';

const ROOT = new URL('../', import.meta.url).pathname; // evolve/
const RUNS = Deno.env.get('EVO_RUNS_DIR') ?? `${ROOT}runs`;
const SUBJECT_DIR = Deno.env.get('EVO_SUBJECT_DIR') ?? `${ROOT}subject`;
const ROLES_DIR = `${ROOT}roles`;

interface Config {
  subject: string;
  turns: { min: number; max: number };
  wordsPerTurn: { min: number; max: number };
  pdCutoff: number;
  lanes: Record<string, { kind: 'api' | 'subagent'; model: string; thinkingLevel?: ThinkingLevel; temperature?: number; maxOutputTokens?: number; retries429?: number; agentType?: string; effort?: string }>;
  primaryLane: string;
  judge: { agentType: string; model: string; effort: string };
  editor: { agentType: string; model: string; effort: string };
  master: { agentType: string; model: string; effort: string };
  latency: string;
}

interface RoundFile {
  round: number;
  question: string;
  current: number;
  previous: number | null;
  /** per lane, which version sits behind label A and label B for the blind judge */
  blind: Record<string, { A: number; B: number | null }>;
  createdAt: string;
  next?: number;
}

// ---------- small helpers ----------

function args(): Record<string, string> {
  const out: Record<string, string> = {};
  const a = Deno.args.slice(1);
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith('--')) {
      const key = a[i].slice(2);
      const val = i + 1 < a.length && !a[i + 1].startsWith('--') ? a[++i] : 'true';
      out[key] = val;
    }
  }
  return out;
}

function need(flags: Record<string, string>, key: string): string {
  const v = flags[key];
  if (!v) fail(`missing --${key}`);
  return v;
}

function fail(msg: string): never {
  console.error(`evo: ${msg}`);
  Deno.exit(1);
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await Deno.readTextFile(path)) as T;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await Deno.writeTextFile(path, JSON.stringify(value, null, 2) + '\n');
}

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

const pad = (n: number) => String(n).padStart(3, '0');
const roundDir = (r: number) => `${RUNS}/round-${pad(r)}`;

async function loadConfig(): Promise<Config> {
  return readJson<Config>(`${ROOT}config.json`);
}

// ---------- the subject: one file per version, system prompt above the user section ----------

const USER_HEADING = /^## User[’']s situation\s*$/m;

interface Subject {
  version: number;
  system: string;
  userTemplate: string;
  path: string;
}

async function latestVersion(cfg: Config): Promise<number> {
  let max = 0;
  for await (const e of Deno.readDir(SUBJECT_DIR)) {
    const m = e.name.match(new RegExp(`^${cfg.subject}\\.v(\\d+)\\.md$`));
    if (m) max = Math.max(max, Number(m[1]));
  }
  if (max === 0) fail(`no ${cfg.subject}.vN.md in ${SUBJECT_DIR}`);
  return max;
}

async function loadSubject(cfg: Config, version: number): Promise<Subject> {
  const path = `${SUBJECT_DIR}/${cfg.subject}.v${version}.md`;
  const text = await Deno.readTextFile(path);
  const m = USER_HEADING.exec(text);
  if (!m) fail(`${path}: no "## User’s situation" heading; the runner needs it to split system from user`);
  const system = text.slice(0, m.index).trimEnd();
  const userTemplate = text.slice(m.index + m[0].length).trim();
  if (!userTemplate.includes('{{question}}')) fail(`${path}: the user section has no {{question}} placeholder`);
  return { version, system, userTemplate, path };
}

/** the envelope line added to every user message: plumbing, not prompt content */
function envelopeNote(cfg: Config): string {
  return `Return one JSON object and nothing else, with these fields, matching the Output structure above: ` +
    `"situation" (section A, as text), "minds" (section B: exactly three objects with "title", "concern", "author", "book", "year" as the book's first publication year), ` +
    `"debate" (section C: ${cfg.turns.min} to ${cfg.turns.max} turn objects with "speaker", "text", "author", "book", "pd", "basis"), ` +
    `"clearer" (section D, as text), "dependsOn" (section E, as text).`;
}

function userMessage(cfg: Config, s: Subject, question: string): string {
  return s.userTemplate.replace('{{question}}', question.trim()) + '\n\n' + envelopeNote(cfg);
}

function envelopeSchema(cfg: Config) {
  const str = { type: 'string' };
  return {
    type: 'object',
    additionalProperties: false,
    required: ['situation', 'minds', 'debate', 'clearer', 'dependsOn'],
    properties: {
      situation: str,
      minds: {
        type: 'array', minItems: 3, maxItems: 3,
        items: { type: 'object', additionalProperties: false, required: ['title', 'concern', 'author', 'book', 'year'], properties: { title: str, concern: str, author: str, book: str, year: { type: 'integer' } } },
      },
      debate: {
        type: 'array', minItems: cfg.turns.min, maxItems: cfg.turns.max,
        items: { type: 'object', additionalProperties: false, required: ['speaker', 'text', 'author', 'book', 'pd', 'basis'], properties: { speaker: str, text: str, author: str, book: str, pd: { type: 'boolean' }, basis: str } },
      },
      clearer: str,
      dependsOn: str,
    },
  };
}

/** the same checks the schema makes, for answers that arrive as text (the Sonnet lane) */
function validateEnvelope(cfg: Config, v: unknown): string[] {
  const errs: string[] = [];
  const o = v as Record<string, unknown>;
  if (!o || typeof o !== 'object') return ['not an object'];
  for (const k of ['situation', 'clearer', 'dependsOn']) if (typeof o[k] !== 'string') errs.push(`${k}: not a string`);
  const minds = o.minds as unknown[];
  if (!Array.isArray(minds) || minds.length !== 3) errs.push('minds: not exactly three');
  else minds.forEach((m, i) => {
    const x = m as Record<string, unknown>;
    for (const k of ['title', 'concern', 'author', 'book']) if (typeof x[k] !== 'string') errs.push(`minds[${i}].${k}: not a string`);
    if (!Number.isInteger(x.year)) errs.push(`minds[${i}].year: not an integer`);
  });
  const debate = o.debate as unknown[];
  if (!Array.isArray(debate)) errs.push('debate: not an array');
  else {
    if (debate.length < cfg.turns.min || debate.length > cfg.turns.max) errs.push(`debate: ${debate.length} turns, expected ${cfg.turns.min} to ${cfg.turns.max}`);
    debate.forEach((t, i) => {
      const x = t as Record<string, unknown>;
      for (const k of ['speaker', 'text', 'author', 'book', 'basis']) if (typeof x[k] !== 'string') errs.push(`debate[${i}].${k}: not a string`);
      if (typeof x.pd !== 'boolean') errs.push(`debate[${i}].pd: not a boolean`);
    });
  }
  return errs;
}

/** a model's answer as text: strip a code fence if it wrapped the JSON, then parse */
function parseLoose(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) t = fence[1];
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first > 0 || last < t.length - 1) t = t.slice(first, last + 1);
  return JSON.parse(t);
}

// ---------- workers ----------

interface WorkerRecord {
  lane: string;
  version: number;
  model: string;
  settings: Record<string, unknown>;
  latencyMs: number;
  output: unknown;
  savedAt: string;
}

function sonnetFrame(system: string, user: string): string {
  return [
    '=== INSTRUCTIONS FOR THIS TASK ===',
    'Everything between the markers below is the complete and only instruction set for this task.',
    'Do not read files, do not use any tools, do not apply conventions from this repository or from your own system prompt.',
    'Follow the SYSTEM PROMPT exactly as a production model would, answer the USER MESSAGE, and return only the JSON object it asks for: no prose before or after it, no code fence.',
    '',
    '=== SYSTEM PROMPT ===',
    system,
    '',
    '=== USER MESSAGE ===',
    user,
    '',
    '=== END ===',
  ].join('\n');
}

async function cmdGemini(cfg: Config, f: Record<string, string>) {
  const round = Number(need(f, 'round'));
  const version = Number(need(f, 'version'));
  const lane = { ...cfg.lanes.gemini, model: f.model ?? cfg.lanes.gemini.model };
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) fail('GEMINI_API_KEY is not set; run with --env-file=.env.local');
  const rf = await readJson<RoundFile>(`${roundDir(round)}/round.json`);
  const s = await loadSubject(cfg, version);
  const user = userMessage(cfg, s, rf.question);
  const ai = geminiClient(key);
  const settings = { thinkingLevel: lane.thinkingLevel, temperature: lane.temperature, maxOutputTokens: lane.maxOutputTokens, fallback: 'none' };

  let attempt = 0;
  for (;;) {
    const t0 = performance.now();
    try {
      const output = await callGeminiJson(ai, {
        model: lane.model,
        system: s.system,
        user,
        schema: envelopeSchema(cfg),
        temperature: lane.temperature ?? 0.9,
        maxOutputTokens: lane.maxOutputTokens ?? 16384,
        thinkingLevel: lane.thinkingLevel ?? 'MEDIUM',
      });
      const latencyMs = Math.round(performance.now() - t0);
      const errs = validateEnvelope(cfg, output);
      const rec: WorkerRecord = { lane: 'gemini', version, model: lane.model, settings, latencyMs, output, savedAt: new Date().toISOString() };
      const out = `${roundDir(round)}/v${version}.gemini.json`;
      await writeJson(out, rec);
      console.log(`gemini v${version}: ${latencyMs} ms, ${(output as { debate: unknown[] }).debate.length} turns${errs.length ? `, schema notes: ${errs.join('; ')}` : ''} -> ${out}`);
      return;
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (err instanceof GeminiBlocked) fail(`gemini blocked the reply (${err.reason}); nothing saved`);
      const transient = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
      if (transient && attempt < (lane.retries429 ?? 3)) {
        attempt++;
        const wait = 2000 * 2 ** attempt;
        console.error(`gemini ${status}, retry ${attempt} in ${wait} ms (same model, no fallback)`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      throw err;
    }
  }
}

async function cmdWorkerPrompt(cfg: Config, f: Record<string, string>) {
  const round = Number(need(f, 'round'));
  const version = Number(need(f, 'version'));
  const rf = await readJson<RoundFile>(`${roundDir(round)}/round.json`);
  const s = await loadSubject(cfg, version);
  const text = sonnetFrame(s.system, userMessage(cfg, s, rf.question));
  const out = `${roundDir(round)}/worker-prompt.v${version}.sonnet.md`;
  await Deno.writeTextFile(out, text + '\n');
  console.log(out);
}

async function cmdSave(cfg: Config, f: Record<string, string>) {
  const round = Number(need(f, 'round'));
  const version = Number(need(f, 'version'));
  const laneName = need(f, 'lane');
  const latencyMs = Number(need(f, 'latency-ms'));
  const lane = cfg.lanes[laneName] ?? fail(`unknown lane ${laneName}`);
  const text = await Deno.readTextFile(need(f, 'file'));
  let output: unknown;
  try {
    output = parseLoose(text);
  } catch (e) {
    fail(`could not parse the answer as JSON: ${(e as Error).message}`);
  }
  const errs = validateEnvelope(cfg, output);
  if (errs.length) fail(`answer does not match the envelope: ${errs.join('; ')}`);
  const rec: WorkerRecord = { lane: laneName, version, model: lane.model, settings: { agentType: lane.agentType, effort: lane.effort, note: 'latency includes Claude Code subagent overhead' }, latencyMs, output, savedAt: new Date().toISOString() };
  const out = `${roundDir(round)}/v${version}.${laneName}.json`;
  await writeJson(out, rec);
  console.log(`${laneName} v${version}: ${latencyMs} ms, ${(output as { debate: unknown[] }).debate.length} turns -> ${out}`);
}

// ---------- rounds ----------

async function cmdNew(cfg: Config, f: Record<string, string>) {
  const question = f['question-file'] ? await Deno.readTextFile(f['question-file']) : need(f, 'question');
  await Deno.mkdir(RUNS, { recursive: true });
  let round = 1;
  for await (const e of Deno.readDir(RUNS)) {
    const m = e.name.match(/^round-(\d+)$/);
    if (m) round = Math.max(round, Number(m[1]) + 1);
  }
  const current = await latestVersion(cfg);
  const previous = current > 1 ? current - 1 : null;
  // blind labels flip with the round number so neither version always sits at A
  const prevFirst = round % 2 === 1;
  const blind: RoundFile['blind'] = {};
  for (const lane of Object.keys(cfg.lanes)) {
    blind[lane] = previous === null ? { A: current, B: null } : prevFirst ? { A: previous, B: current } : { A: current, B: previous };
  }
  const rf: RoundFile = { round, question: question.trim(), current, previous, blind, createdAt: new Date().toISOString() };
  await Deno.mkdir(roundDir(round), { recursive: true });
  await Deno.writeTextFile(`${roundDir(round)}/question.txt`, rf.question + '\n');
  await writeJson(`${roundDir(round)}/round.json`, rf);
  console.log(`round ${round}: current v${current}${previous ? `, previous v${previous}` : ' (first round, no comparison)'}`);
  console.log(`versions to run: ${previous ? `v${previous} v${current}` : `v${current}`}`);
  console.log(roundDir(round));
}

function renderDebate(rec: WorkerRecord): string {
  const o = rec.output as { situation: string; minds: { title: string; concern: string; author: string; book: string; year: number }[]; debate: { speaker: string; text: string; author: string; book: string; pd: boolean; basis: string }[]; clearer: string; dependsOn: string };
  const lines: string[] = [];
  lines.push('Situation (section A):', o.situation, '');
  lines.push('Minds (section B):');
  for (const m of o.minds) lines.push(`- ${m.title}: ${m.concern} [${m.author}, ${m.book}, ${m.year}]`);
  lines.push('', `Debate (section C), ${o.debate.length} turns:`);
  o.debate.forEach((t, i) => {
    lines.push(`${i + 1}. ${t.speaker}: ${t.text}`);
    lines.push(`   [${t.author}, ${t.book}, pd=${t.pd}] ${t.basis}`);
  });
  lines.push('', 'What became clearer (section D):', o.clearer, '', 'What the choice depends on (section E):', o.dependsOn);
  return lines.join('\n');
}

async function loadWorker(round: number, version: number, lane: string): Promise<WorkerRecord> {
  const p = `${roundDir(round)}/v${version}.${lane}.json`;
  if (!(await exists(p))) fail(`missing ${p}; run the ${lane} worker for v${version} first`);
  return readJson<WorkerRecord>(p);
}

async function cmdJudgeInput(cfg: Config, f: Record<string, string>) {
  const round = Number(need(f, 'round'));
  const lane = need(f, 'lane');
  const rf = await readJson<RoundFile>(`${roundDir(round)}/round.json`);
  const b = rf.blind[lane] ?? fail(`no blind map for lane ${lane}`);
  const judge = await Deno.readTextFile(`${ROLES_DIR}/judge.md`);
  const A = await loadWorker(round, b.A, lane);
  const parts = [judge, '', '----------------------------------------', '', "THE USER'S SITUATION", rf.question, '', '=== DEBATE A ===', renderDebate(A)];
  if (b.B !== null) {
    const B = await loadWorker(round, b.B, lane);
    parts.push('', '=== DEBATE B ===', renderDebate(B));
  }
  parts.push('', b.B !== null ? 'Score A and B. Return the JSON object only.' : 'Only DEBATE A was given. Score it. Return the JSON object only, without a "B" or "preferred" field.');
  const out = `${roundDir(round)}/judge-input.${lane}.md`;
  await Deno.writeTextFile(out, parts.join('\n') + '\n');
  console.log(out);
}

interface Scorecard {
  criteria: { name: string; max: number; points: number; sub?: unknown[] }[];
  uncapped: number;
  score: number;
  capReason: string | null;
  strengths: string[];
  weaknesses: string[];
  editorNotes: string[];
}

async function cmdSaveJudge(_cfg: Config, f: Record<string, string>) {
  const round = Number(need(f, 'round'));
  const lane = need(f, 'lane');
  const rf = await readJson<RoundFile>(`${roundDir(round)}/round.json`);
  const b = rf.blind[lane] ?? fail(`no blind map for lane ${lane}`);
  let raw: { A: Scorecard; B?: Scorecard; preferred?: string };
  try {
    raw = parseLoose(await Deno.readTextFile(need(f, 'file'))) as typeof raw;
  } catch (e) {
    fail(`could not parse the judge's answer as JSON: ${(e as Error).message}`);
  }
  if (!raw.A || typeof raw.A.score !== 'number') fail('judge answer has no A.score');
  if (b.B !== null && (!raw.B || typeof raw.B.score !== 'number')) fail('judge answer has no B.score but two debates were given');
  const scores: Record<string, Scorecard> = { [`v${b.A}`]: raw.A };
  if (b.B !== null && raw.B) scores[`v${b.B}`] = raw.B;
  const preferredVersion = raw.preferred === 'A' ? b.A : raw.preferred === 'B' ? b.B : raw.preferred === 'tie' ? 'tie' : null;
  const rec = { lane, blind: b, scores, preferredVersion, savedAt: new Date().toISOString() };
  const out = `${roundDir(round)}/judge.${lane}.json`;
  await writeJson(out, rec);
  const line = Object.entries(scores).map(([v, s]) => `${v} ${s.score.toFixed(2)}${s.capReason ? ' (capped)' : ''}`).join(', ');
  console.log(`judge ${lane}: ${line}${preferredVersion !== null ? `; preferred ${preferredVersion === 'tie' ? 'tie' : 'v' + preferredVersion}` : ''} -> ${out}`);
}

async function lastChangelog(n: number): Promise<string> {
  const p = `${SUBJECT_DIR}/CHANGELOG.md`;
  if (!(await exists(p))) return '(none yet)';
  const text = await Deno.readTextFile(p);
  const entries = text.split(/\n(?=## v\d+)/).filter((e) => e.startsWith('## v'));
  return entries.slice(-n).join('\n\n') || '(none yet)';
}

async function cmdEditorInput(cfg: Config, f: Record<string, string>) {
  const round = Number(need(f, 'round'));
  const rf = await readJson<RoundFile>(`${roundDir(round)}/round.json`);
  const editor = await Deno.readTextFile(`${ROLES_DIR}/editor.md`);
  const s = await loadSubject(cfg, rf.current);
  const parts = [editor, '', '----------------------------------------', '', `CURRENT SYSTEM PROMPT (version ${rf.current})`, '<<<', s.system, '>>>', '', "THE USER'S SITUATION", rf.question, ''];
  const versions = rf.previous !== null ? [rf.previous, rf.current] : [rf.current];
  parts.push("THE JUDGE'S SCORECARDS");
  for (const lane of Object.keys(cfg.lanes)) {
    const jp = `${roundDir(round)}/judge.${lane}.json`;
    if (!(await exists(jp))) {
      parts.push(`(lane ${lane}: no judge result this round)`);
      continue;
    }
    const j = await readJson<{ scores: Record<string, Scorecard>; preferredVersion: number | string | null }>(jp);
    for (const v of versions) {
      const sc = j.scores[`v${v}`];
      if (!sc) continue;
      const label = v === rf.current ? `current version v${v}` : `previous version v${v}`;
      parts.push(`--- lane ${lane}${lane === cfg.primaryLane ? ' (primary)' : ''}, ${label}: ${sc.score.toFixed(2)} / 100${sc.capReason ? `, capped: ${sc.capReason}` : ''} ---`);
      parts.push(JSON.stringify(sc, null, 2));
    }
    if (j.preferredVersion !== null && j.preferredVersion !== undefined) parts.push(`lane ${lane} preferred: ${j.preferredVersion === 'tie' ? 'tie' : 'v' + j.preferredVersion}`);
    parts.push('');
  }
  parts.push('LATENCY (seconds; reported for context only)');
  for (const lane of Object.keys(cfg.lanes)) {
    for (const v of versions) {
      const p = `${roundDir(round)}/v${v}.${lane}.json`;
      if (await exists(p)) {
        const w = await readJson<WorkerRecord>(p);
        parts.push(`- ${lane} v${v}: ${(w.latencyMs / 1000).toFixed(1)} s`);
      }
    }
  }
  parts.push('', 'PREVIOUS CHANGES (last three)', await lastChangelog(3), '', `Write version ${rf.current + 1}. Return the JSON object only.`);
  const out = `${roundDir(round)}/editor-input.md`;
  await Deno.writeTextFile(out, parts.join('\n') + '\n');
  console.log(out);
}

interface EditorOut {
  version: string | number;
  prompt: string;
  targets: unknown[];
  changes: { kind: string; before: string; after: string; expectedEffect: string }[];
  reverted: string[];
  blocked: string[];
  wordCount: { before: number; after: number };
  changelog: string;
}

const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

async function cmdApplyEditor(cfg: Config, f: Record<string, string>) {
  const round = Number(need(f, 'round'));
  const rf = await readJson<RoundFile>(`${roundDir(round)}/round.json`);
  let e: EditorOut;
  try {
    e = parseLoose(await Deno.readTextFile(need(f, 'file'))) as EditorOut;
  } catch (err) {
    fail(`could not parse the editor's answer as JSON: ${(err as Error).message}`);
  }
  if (typeof e.prompt !== 'string' || e.prompt.trim().length < 200) fail('editor answer has no usable "prompt"');
  if (!Array.isArray(e.changes) || e.changes.length === 0) fail('editor answer lists no changes');
  const cur = await loadSubject(cfg, rf.current);
  const next = rf.current + 1;
  if (USER_HEADING.test(e.prompt)) fail('the editor returned the user section inside the prompt; it must return the system prompt only');
  const before = words(cur.system);
  const after = words(e.prompt);
  const growth = (after - before) / before;
  if (growth > 0.10) fail(`new prompt grew ${(growth * 100).toFixed(0)}% (${before} -> ${after} words); the limit is 10%. Ask the editor for a shorter version`);

  const file = `${SUBJECT_DIR}/${cfg.subject}.v${next}.md`;
  await Deno.writeTextFile(file, e.prompt.trimEnd() + '\n\n## User’s situation\n\n' + cur.userTemplate + '\n');
  await writeJson(`${roundDir(round)}/editor.json`, { ...e, appliedVersion: next, savedAt: new Date().toISOString() });

  // changelog entry: what the round showed, and what changed
  const scoreBits: string[] = [];
  for (const lane of Object.keys(cfg.lanes)) {
    const jp = `${roundDir(round)}/judge.${lane}.json`;
    if (!(await exists(jp))) continue;
    const j = await readJson<{ scores: Record<string, Scorecard>; preferredVersion: number | string | null }>(jp);
    const s = Object.entries(j.scores).map(([v, sc]) => `${v} ${sc.score.toFixed(2)}`).join(' vs ');
    scoreBits.push(`${lane}: ${s}${j.preferredVersion !== null && j.preferredVersion !== undefined && rf.previous !== null ? ` (${j.preferredVersion === 'tie' ? 'tie' : 'v' + j.preferredVersion + ' better'})` : ''}`);
  }
  const latBits: string[] = [];
  for (const lane of Object.keys(cfg.lanes)) {
    const p = `${roundDir(round)}/v${rf.current}.${lane}.json`;
    if (await exists(p)) latBits.push(`${lane} v${rf.current} ${((await readJson<WorkerRecord>(p)).latencyMs / 1000).toFixed(1)} s`);
  }
  const entry = [
    `## v${next} — from round ${round} — ${new Date().toISOString().slice(0, 10)}`,
    `Question: ${rf.question.replace(/\s+/g, ' ').slice(0, 160)}${rf.question.length > 160 ? '…' : ''}`,
    `Scores: ${scoreBits.join(' | ') || '(none)'}`,
    `Latency: ${latBits.join(' | ') || '(none)'}`,
    `Words: ${before} -> ${after}`,
    `Changes: ${e.changes.map((c) => c.kind).join(', ')}${e.reverted?.length ? `; reverted: ${e.reverted.length}` : ''}${e.blocked?.length ? `; blocked: ${e.blocked.join(' / ')}` : ''}`,
    `${e.changelog}`,
  ].join('\n');
  const clp = `${SUBJECT_DIR}/CHANGELOG.md`;
  const head = (await exists(clp)) ? await Deno.readTextFile(clp) : '# Changelog of the cast+debate prompt\n\nOne entry per version. Newest at the bottom.\n';
  await Deno.writeTextFile(clp, head.trimEnd() + '\n\n' + entry + '\n');
  rf.next = next;
  await writeJson(`${roundDir(round)}/round.json`, rf);
  console.log(`applied: v${next} written to ${file} (${before} -> ${after} words, ${e.changes.length} changes)`);
}

/** a readable file of every debate in a round, with its score and latency, for a person to read */
async function cmdRender(cfg: Config, f: Record<string, string>) {
  const round = Number(need(f, 'round'));
  const rf = await readJson<RoundFile>(`${roundDir(round)}/round.json`);
  const versions = rf.previous !== null ? [rf.previous, rf.current] : [rf.current];
  const out: string[] = [`# Round ${round}`, '', `**Question.** ${rf.question}`, ''];
  for (const lane of Object.keys(cfg.lanes)) {
    const jp = `${roundDir(round)}/judge.${lane}.json`;
    const j = (await exists(jp)) ? await readJson<{ scores: Record<string, Scorecard> }>(jp) : null;
    for (const v of versions) {
      const wp = `${roundDir(round)}/v${v}.${lane}.json`;
      if (!(await exists(wp))) continue;
      const w = await readJson<WorkerRecord>(wp);
      const sc = j?.scores[`v${v}`];
      const o = w.output as { situation: string; minds: { title: string; concern: string; author: string; book: string; year: number }[]; debate: { speaker: string; text: string; author: string; book: string; pd: boolean; basis: string }[]; clearer: string; dependsOn: string };
      out.push(`## ${lane} lane, version ${v}`, '');
      out.push(`Model ${w.model}. Latency ${(w.latencyMs / 1000).toFixed(1)} s.${sc ? ` Score ${sc.score.toFixed(2)} / 100${sc.capReason ? ` (capped: ${sc.capReason})` : ''}.` : ''}`, '');
      if (sc) {
        out.push('| criterion | points | max |', '| --- | ---: | ---: |');
        for (const c of sc.criteria) out.push(`| ${c.name} | ${c.points.toFixed(2)} | ${c.max.toFixed(2)} |`);
        out.push('');
        if (sc.weaknesses?.length) out.push(`**Judge's main weaknesses.** ${sc.weaknesses.join(' ')}`, '');
      }
      out.push('### The situation', '', o.situation, '', '### The three minds', '');
      for (const m of o.minds) out.push(`- **${m.title}.** ${m.concern} *(${m.author}, ${m.book}, ${m.year})*`);
      out.push('', `### The debate, ${o.debate.length} turns`, '');
      o.debate.forEach((t, i) => {
        out.push(`**${i + 1}. ${t.speaker}.** ${t.text}`);
        out.push(`<sub>${t.basis}${t.pd ? ' (pre-cutoff work)' : ''}</sub>`, '');
      });
      out.push('### What became clearer', '', o.clearer, '', '### What the choice depends on', '', o.dependsOn, '');
    }
  }
  const path = `${roundDir(round)}/debates.md`;
  await Deno.writeTextFile(path, out.join('\n') + '\n');
  console.log(path);
}

async function cmdSummary(cfg: Config, f: Record<string, string>) {
  const round = Number(need(f, 'round'));
  const rf = await readJson<RoundFile>(`${roundDir(round)}/round.json`);
  const versions = rf.previous !== null ? [rf.previous, rf.current] : [rf.current];
  console.log(`Round ${round}. Question: ${rf.question.replace(/\s+/g, ' ').slice(0, 120)}`);
  console.log('');
  console.log('lane     version  score     latency');
  for (const lane of Object.keys(cfg.lanes)) {
    const jp = `${roundDir(round)}/judge.${lane}.json`;
    const j = (await exists(jp)) ? await readJson<{ scores: Record<string, Scorecard>; preferredVersion: number | string | null }>(jp) : null;
    for (const v of versions) {
      const wp = `${roundDir(round)}/v${v}.${lane}.json`;
      const w = (await exists(wp)) ? await readJson<WorkerRecord>(wp) : null;
      const sc = j?.scores[`v${v}`];
      console.log(`${lane.padEnd(8)} v${String(v).padEnd(7)} ${sc ? sc.score.toFixed(2).padStart(6) : '     -'}    ${w ? (w.latencyMs / 1000).toFixed(1) + ' s' : '-'}`);
    }
    if (j && rf.previous !== null) console.log(`${''.padEnd(8)} preferred: ${j.preferredVersion === 'tie' ? 'tie' : j.preferredVersion === null ? '-' : 'v' + j.preferredVersion}`);
  }
  const ep = `${roundDir(round)}/editor.json`;
  if (await exists(ep)) {
    const e = await readJson<EditorOut & { appliedVersion: number }>(ep);
    console.log('');
    console.log(`Editor wrote v${e.appliedVersion}: ${e.changelog}`);
    for (const c of e.changes) console.log(`- ${c.kind}: ${c.expectedEffect}`);
  } else {
    console.log('');
    console.log('Editor: not run yet.');
  }
}

async function cmdStatus(cfg: Config) {
  const current = await latestVersion(cfg);
  let last = 0;
  if (await exists(RUNS)) for await (const e of Deno.readDir(RUNS)) {
    const m = e.name.match(/^round-(\d+)$/);
    if (m) last = Math.max(last, Number(m[1]));
  }
  console.log(`subject: ${cfg.subject}, current version v${current}, rounds run: ${last}`);
  console.log(`lanes: ${Object.entries(cfg.lanes).map(([k, l]) => `${k} (${l.model}${l.thinkingLevel ? ', ' + l.thinkingLevel : l.effort ? ', ' + l.effort : ''})`).join('; ')}; primary ${cfg.primaryLane}`);
  console.log(`judge ${cfg.judge.model}/${cfg.judge.effort}; editor ${cfg.editor.model}/${cfg.editor.effort}; master ${cfg.master.model}/${cfg.master.effort}; latency ${cfg.latency}`);
  if (last > 0) {
    const rf = await readJson<RoundFile>(`${roundDir(last)}/round.json`);
    console.log(`last round ${last}: ran v${rf.previous ?? ''}${rf.previous ? ' and ' : ''}v${rf.current}${rf.next ? `, produced v${rf.next}` : ', editor not applied yet'}`);
  }
}

function cmdNow() {
  console.log(Date.now());
}

// ---------- entry ----------

const HELP = `evo <command> [--flag value]

  status                                     where things stand
  now                                        current time in ms (for timing subagent lanes)
  new --question "<text>" | --question-file <path>
                                             start a round: folder, question, blind map
  gemini --round R --version V [--model M]   run the Gemini worker, time it, save vV.gemini.json
                                             (--model only when the configured model is down; it is recorded)
  worker-prompt --round R --version V        write the framed prompt for the Sonnet subagent
  save --round R --version V --lane sonnet --latency-ms N --file <answer.txt>
                                             validate and save a subagent worker's answer
  judge-input --round R --lane <lane>        write judge-input.<lane>.md (blind A/B)
  save-judge --round R --lane <lane> --file <answer.txt>
                                             unblind and save judge.<lane>.json
  editor-input --round R                     write editor-input.md
  apply-editor --round R --file <answer.txt> write the next version + changelog
  summary --round R                          one-screen result for a person
  render --round R                           write debates.md: every debate in the round, readable
`;

const cmd = Deno.args[0];
const cfg = await loadConfig();
const flags = args();
switch (cmd) {
  case 'status': await cmdStatus(cfg); break;
  case 'now': cmdNow(); break;
  case 'new': await cmdNew(cfg, flags); break;
  case 'gemini': await cmdGemini(cfg, flags); break;
  case 'worker-prompt': await cmdWorkerPrompt(cfg, flags); break;
  case 'save': await cmdSave(cfg, flags); break;
  case 'judge-input': await cmdJudgeInput(cfg, flags); break;
  case 'save-judge': await cmdSaveJudge(cfg, flags); break;
  case 'editor-input': await cmdEditorInput(cfg, flags); break;
  case 'apply-editor': await cmdApplyEditor(cfg, flags); break;
  case 'summary': await cmdSummary(cfg, flags); break;
  case 'render': await cmdRender(cfg, flags); break;
  default:
    console.log(HELP);
    if (cmd && cmd !== 'help') fail(`unknown command ${cmd}`);
}
