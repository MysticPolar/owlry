// Live council runner: runs one council inside any Claude Code session, with no API key.
//
// Claude Code is the orchestrator and every model call is one subagent call. When Claude Code did
// not start inside this folder the named council-* agents are not loaded, so each call is a
// general-purpose subagent whose prompt is the body of .claude/agents/<agent>.md, one blank line,
// then the task this script prints. The script never calls a model. It builds every task from the
// production prompts (supabase/functions/council/prompts.ts), reads each reply and its wall time
// from the subagent's own transcript, checks that the subagent received exactly the prompt built
// here, and after every step prints a block to show the reader and the next call to make.
//
//   deno run -A scripts/live.ts new "question" [--category c] [--situation "s"] [--turns 9] [--mind sonnet] [--fast haiku]
//   deno run -A scripts/live.ts cast <agentId>          record the cast; prints the council card and the screen call
//   deno run -A scripts/live.ts screen <agentId>        record the screen; prints the cards and any forge calls
//   deno run -A scripts/live.ts forge <slug> <agentId>  record one forge; repeat for each missing card
//   deno run -A scripts/live.ts turn <agentId>          record a turn; prints it and the next call
//   deno run -A scripts/live.ts summary <agentId>       record the summary; writes council/runs/<id>.md and index.html
//   deno run -A scripts/live.ts fail "note"             save what exists with a FAILED note
//   deno run -A scripts/live.ts status | show | prompt  where the run stands | the run file so far | the pending prompts
//
// Record steps accept --reply <file> in place of <agentId> (no timing or prompt check then), and
// --run <id> to pick a run other than the current one.
// Wall times include Claude Code's subagent overhead. Use them to compare runs, not as production latency.

import { cycleForTurn, directorNote, summaryUser } from "../supabase/functions/council/prompts.ts";
import { parseJson } from "../supabase/functions/council/model.ts";
import type {
  CastResult,
  CastSeat,
  Mind,
  ScreenResult,
  Seat,
  Summary,
  Tail,
  Turn,
} from "../supabase/functions/council/types.ts";

const ROOT = decodeURIComponent(new URL("..", import.meta.url).pathname);
const RUNS = Deno.env.get("COUNCIL_RUNS_DIR") ?? `${ROOT}council/runs`;
const MINDS = Deno.env.get("COUNCIL_MINDS_DIR") ?? `${ROOT}council/minds`;
const WORK = Deno.env.get("COUNCIL_WORK_DIR") ?? `${Deno.env.get("TMPDIR") ?? "/tmp"}/owlry-council`;
const PROJECTS = Deno.env.get("CLAUDE_PROJECTS_DIR") ?? `${Deno.env.get("HOME") ?? ""}/.claude/projects`;

type AgentName = "council-caster" | "council-screen" | "council-forge" | "council-mind" | "council-summarizer";
// deno-lint-ignore no-explicit-any
type Json = any;

interface Pending {
  step: string; // "cast 1" | "screen 1" | "forge <slug>" | "turn <n>" | "summary"
  agent: AgentName;
  model: string;
  file: string;
  slug?: string;
}
interface CallRecord {
  step: string;
  model: string;
  agentId: string | null;
  seconds: number | null;
  start: string | null;
  end: string | null;
  promptExact: boolean | null;
  wrapped: boolean;
  tools: string[];
  ok: boolean;
  note?: string;
}
interface LiveSeat extends Seat {
  field: string | null;
}
interface LiveTurn extends Turn {
  name: string;
  words: number;
  cap: number;
  seconds: number | null;
  raw: string;
  tailRaw: string | null;
  firstMatchDiffers: boolean;
  trailing: string | null;
}
interface State {
  id: string;
  question: string;
  situation: string;
  category: string;
  total: number;
  models: { mind: string | null; fast: string | null };
  createdAt: string;
  finishedAt: string | null;
  status: "running" | "done" | "failed";
  failed: string | null;
  pending: Pending[];
  attempt: number;
  exclude: string[];
  cast: CastResult | null;
  castSeats: CastSeat[];
  opening: number;
  screen: ScreenResult | null;
  cards: Record<string, "cached" | "forging" | "forged">;
  seats: LiveSeat[];
  turns: LiveTurn[];
  summary: Summary | null;
  summaryRaw: string | null;
  calls: CallRecord[];
  notes: string[];
}
interface Candidate {
  text: string;
  ts: string | null;
}
interface Reply {
  candidates: Candidate[]; // the subagent's own final text first, then its hand-back message
  start: string | null;
  prompt: string | null;
  wrapped: boolean;
  tools: string[];
}
interface ParsedTurn {
  text: string;
  tail?: Tail;
  tailRaw: string | null;
  firstMatchDiffers: boolean;
  trailing: string | null;
}

const USAGE = `usage:
  live.ts new "question" [--category c] [--situation "s"] [--turns 9] [--mind sonnet] [--fast haiku]
  live.ts cast <agentId> | screen <agentId> | forge <slug> <agentId> | turn <agentId> | summary <agentId>
  live.ts fail "note" | status | show | prompt
  (record steps take --reply <file> instead of an agentId; any step takes --run <id>)`;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const fmt = (s: number | null) => (s == null ? "n/a" : `${s.toFixed(1)} s`);
const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v ? [String(v)] : []);
const elapsed = (from: string | null, to: string | null) =>
  from && to ? Math.round((Date.parse(to) - Date.parse(from)) / 100) / 10 : null;
const statePath = (id: string) => `${RUNS}/${id}.state.json`;

async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

function show(md: string) {
  console.log(`===== SHOW =====\n${md.trim()}\n===== END SHOW =====`);
}

// ---------------------------------------------------------------------------
// Agent bodies, pending calls, state
// ---------------------------------------------------------------------------
async function agentDef(name: AgentName): Promise<{ model: string; body: string }> {
  const md = await Deno.readTextFile(`${ROOT}.claude/agents/${name}.md`);
  const m = md.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
  if (!m) throw new Error(`cannot parse .claude/agents/${name}.md`);
  return { model: m[1].match(/^model:\s*(\S+)/m)?.[1] ?? "sonnet", body: m[2].trim() };
}

/** Queue one subagent call: the full prompt (agent body, blank line, task) goes to a file. */
async function pend(st: State, step: string, agent: AgentName, task: string, slug?: string) {
  const def = await agentDef(agent);
  const fast = agent === "council-screen" || agent === "council-summarizer";
  const dir = `${WORK}/${st.id}`;
  await Deno.mkdir(dir, { recursive: true });
  const file = `${dir}/${step.replace(/\s+/g, "-")}.txt`;
  await Deno.writeTextFile(file, `${def.body}\n\n${task}`);
  st.pending.push({ step, agent, model: (fast ? st.models.fast : st.models.mind) ?? def.model, file, slug });
}

function take(st: State, kind: string, slug?: string): Pending {
  const i = st.pending.findIndex((p) => p.step.split(" ")[0] === kind && (slug === undefined || p.slug === slug));
  if (i < 0) {
    const waiting = st.pending.map((p) => p.step).join(", ") || "nothing (the run is finished or failed)";
    throw new Error(`no pending ${kind}${slug ? ` for ${slug}` : ""}; waiting on: ${waiting}`);
  }
  return st.pending.splice(i, 1)[0];
}

async function printNext(st: State, only?: Pending) {
  for (const p of only ? [only] : st.pending) {
    const full = await Deno.readTextFile(p.file);
    const task = full.slice((await agentDef(p.agent)).body.length + 2);
    const verb = p.step.split(" ")[0];
    console.log(
      `\nNEXT CALL · ${p.step} · Agent(subagent_type: "general-purpose", model: "${p.model}")\n` +
        `prompt: body of .claude/agents/${p.agent}.md, one blank line, then the task below (${full.length} chars in ${p.file})\n` +
        `after it returns: deno run -A scripts/live.ts ${verb === "forge" ? `forge ${p.slug}` : verb} <agentId>\n` +
        `----- task -----\n${task}\n----- end task -----`,
    );
  }
}

async function save(st: State) {
  await Deno.mkdir(RUNS, { recursive: true });
  await Deno.writeTextFile(statePath(st.id), JSON.stringify(st, null, 1));
  await Deno.mkdir(WORK, { recursive: true });
  await Deno.writeTextFile(`${WORK}/current`, st.id);
}

async function load(id?: string): Promise<State> {
  const current = id || (await Deno.readTextFile(`${WORK}/current`).catch(() => "")).trim();
  if (!current) throw new Error('no current run; start one with: live.ts new "question"');
  return JSON.parse(await Deno.readTextFile(statePath(current)));
}

// ---------------------------------------------------------------------------
// Replies: read from the subagent transcript Claude Code keeps on disk
// ---------------------------------------------------------------------------
async function findTranscript(agentId: string): Promise<string | null> {
  const target = `agent-${agentId}.jsonl`;
  const walk = async (dir: string, depth: number): Promise<string | null> => {
    const dirs: string[] = [];
    try {
      for await (const e of Deno.readDir(dir)) {
        if (e.isFile && e.name === target) return `${dir}/${e.name}`;
        if (e.isDirectory) dirs.push(`${dir}/${e.name}`);
      }
    } catch {
      return null;
    }
    if (depth > 0) {
      for (const d of dirs) {
        const found = await walk(d, depth - 1);
        if (found) return found;
      }
    }
    return null;
  };
  return await walk(PROJECTS, 6);
}

/** The subagent's own last text before it handed back is the reply; the hand-back message is a fallback,
 *  because the hand-back sometimes re-wraps the reply ("Turn text delivered: ..."). */
async function readReply(agentId: string | undefined, replyFile: string | undefined): Promise<Reply> {
  if (replyFile) {
    const text = (await Deno.readTextFile(replyFile)).trim();
    return { candidates: [{ text, ts: null }], start: null, prompt: null, wrapped: false, tools: [] };
  }
  if (!agentId) throw new Error("give the subagent's agentId (from the Agent result), or --reply <file>");
  const file = await findTranscript(agentId);
  if (!file) throw new Error(`no transcript for agent ${agentId} under ${PROJECTS}; pass --reply <file> instead`);
  const rows: Json[] = (await Deno.readTextFile(file)).split("\n").filter(Boolean).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
  const first = rows.find((r) => r.type === "user" && r.message && r.timestamp);
  const c = first?.message?.content;
  const prompt = typeof c === "string"
    ? c
    : Array.isArray(c)
    ? c.filter((b: Json) => b.type === "text").map((b: Json) => b.text).join("")
    : null;
  let own: (Candidate & { id: string }) | null = null;
  let handback: Candidate | null = null;
  const tools: string[] = [];
  for (const r of rows) {
    if (handback) break;
    if (r.type !== "assistant" || !Array.isArray(r.message?.content)) continue;
    for (const b of r.message.content) {
      if (b.type === "tool_use") {
        if (b.name === "SubagentHandback") {
          handback = { text: String(b.input?.message ?? "").trim(), ts: r.timestamp ?? null };
          break;
        }
        tools.push(String(b.name));
      } else if (b.type === "text" && String(b.text ?? "").trim()) {
        const id = String(r.message.id ?? r.uuid);
        const text = String(b.text).trim();
        own = own && own.id === id
          ? { id, text: `${own.text}\n\n${text}`, ts: r.timestamp ?? null }
          : { id, text, ts: r.timestamp ?? null };
      }
    }
  }
  const candidates: Candidate[] = [];
  if (own) candidates.push({ text: own.text, ts: own.ts });
  if (handback?.text) candidates.push(handback);
  if (!candidates.length) throw new Error(`agent ${agentId} has no reply in its transcript yet`);
  return {
    candidates,
    start: first?.timestamp ?? null,
    prompt,
    wrapped: !!(own && handback && own.text !== handback.text),
    tools,
  };
}

function pick<T>(reply: Reply, parse: (text: string) => T | null): { value: T | null; text: string; ts: string | null } {
  for (const c of reply.candidates) {
    const value = parse(c.text);
    if (value != null) return { value, text: c.text, ts: c.ts };
  }
  return { value: null, text: reply.candidates[0].text, ts: reply.candidates[0].ts };
}

async function recordCall(
  st: State,
  p: Pending,
  agentId: string | undefined,
  reply: Reply,
  ts: string | null,
  ok: boolean,
  note?: string,
): Promise<CallRecord> {
  let promptExact: boolean | null = null;
  if (reply.prompt != null) {
    const want = (await Deno.readTextFile(p.file)).trimEnd();
    const got = reply.prompt.trimEnd();
    promptExact = want === got;
    if (!promptExact) {
      let i = 0;
      while (i < want.length && i < got.length && want[i] === got[i]) i++;
      console.log(
        `PROMPT MISMATCH in ${p.step} at char ${i} of ${want.length}\n` +
          `  built: ${JSON.stringify(want.slice(Math.max(0, i - 40), i + 60))}\n` +
          `  sent:  ${JSON.stringify(got.slice(Math.max(0, i - 40), i + 60))}`,
      );
    }
  }
  const rec: CallRecord = {
    step: p.step,
    model: p.model,
    agentId: agentId ?? null,
    seconds: elapsed(reply.start, ts),
    start: reply.start,
    end: ts,
    promptExact,
    wrapped: reply.wrapped,
    tools: reply.tools,
    ok,
    note,
  };
  st.calls.push(rec);
  return rec;
}

async function retry(st: State, p: Pending, rec: CallRecord, why: string) {
  st.pending.unshift(p);
  st.notes.push(`${p.step}: ${why}`);
  await save(st);
  show(`**${p.step}** · ${fmt(rec.seconds)} · unusable reply. ${why}`);
  console.log(`RETRY: make the same call again (same prompt and model), or stop with: live.ts fail "${p.step} failed"`);
  await printNext(st, p);
}

// ---------------------------------------------------------------------------
// Prompt builders (council.md, mirroring prompts.ts)
// ---------------------------------------------------------------------------
function castTask(st: State): string {
  return JSON.stringify({
    question: st.question,
    situation: st.situation,
    category: st.category,
    exclude: st.exclude,
    recent: [],
  });
}

const plainTurn = (t: LiveTurn): Turn => ({ turn: t.turn, speaker: t.speaker, cycle: t.cycle, text: t.text, tail: t.tail });

async function mindTask(st: State, t: number): Promise<string> {
  const idx = (st.opening - 1 + t - 1) % 3;
  const me = st.seats[idx];
  const m: Mind = JSON.parse(await Deno.readTextFile(`${MINDS}/${me.slug}.json`));
  const card = {
    school: m.card.school,
    lens: m.lens,
    core_ideas: m.card.core_ideas,
    claims_for: m.card.claims_for,
    claims_against: m.card.claims_against,
    blind_spots: m.card.blind_spots,
    voice: m.card.voice,
    works: (m.books ?? []).map((b) => b.title),
  };
  const note = directorNote({
    cycle: cycleForTurn(t, st.total),
    turn: t,
    totalTurns: st.total,
    question: st.question,
    situation: st.situation || null,
    tension: st.cast?.tension ?? null,
    me,
    others: st.seats.filter((_, j) => j !== idx),
    turns: st.turns.map(plainTurn),
  });
  return `NAME: ${me.name} · LIVED: ${me.lived}\nCARD: ${JSON.stringify(card)}\n${note}`;
}

async function startTurns(st: State) {
  st.seats = [];
  for (let i = 0; i < 3; i++) {
    const cs = st.castSeats[i];
    const slug = slugify(cs.name);
    const m: Mind = JSON.parse(await Deno.readTextFile(`${MINDS}/${slug}.json`));
    st.seats.push({
      seat: (i + 1) as 1 | 2 | 3,
      slug,
      name: m.name || cs.name,
      lived: m.lived ?? cs.lived ?? null,
      field: cs.field ?? null,
      lens: cs.lens,
      why: cs.why,
      intro: "",
      books: m.books?.length ? m.books : (cs.books ?? []).map((b) => ({ title: b.title, author: b.author })),
    });
  }
  await pend(st, "turn 1", "council-mind", await mindTask(st, 1));
}

/** Split at the last line starting with POSITION: (council.md). Production splits at the first match; both are noted. */
function parseTail(full: string): ParsedTurn {
  const lines = full.split("\n");
  let li = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^\s*\*{0,2}POSITION\s*:/i.test(lines[i])) {
      li = i;
      break;
    }
  }
  if (li < 0) return { text: full.trim(), tailRaw: null, firstMatchDiffers: false, trailing: null };
  const before = lines.slice(0, li).join("\n");
  const tailRaw = lines.slice(li).join("\n").trim();
  const lastIdx = (li ? before.length + 1 : 0) + lines[li].search(/\*{0,2}POSITION\s*:/i);
  const firstIdx = full.search(/\*{0,2}POSITION\s*:/i);
  const base: ParsedTurn = {
    text: before.trim(),
    tailRaw,
    firstMatchDiffers: firstIdx >= 0 && firstIdx < lastIdx,
    trailing: lines.slice(li + 1).join("\n").trim() || null,
  };
  const m = tailRaw.match(
    /POSITION\s*:\*{0,2}\s*([\s\S]*?)\s*\|\s*\*{0,2}MOVE\s*:\*{0,2}\s*(hold|shift|concede)\s*\|\s*\*{0,2}OPEN\s*:\*{0,2}\s*([\s\S]*)$/i,
  );
  if (!m) return base;
  const open = m[3].trim().replace(/[.\s]+$/, "");
  return {
    ...base,
    tail: {
      position: m[1].trim(),
      move: m[2].toLowerCase() as Tail["move"],
      open: /^none$/i.test(open) || !open ? null : open,
    },
  };
}

/** Card file in the shape of council/minds/*.json: caster books first, then the forge's works. */
function mindFromForge(cs: CastSeat, card: Json): Mind {
  const works = (card.works ?? []).map((w: Json) => ({
    title: String(w.title),
    author: w.author || cs.name,
    year: w.year ?? null,
    read_free: null,
    buy: null,
  }));
  const head = (t: string) => t.toLowerCase().split(":")[0].trim();
  const books: Json[] = [];
  const seen = new Set<string>();
  for (const b of cs.books ?? []) {
    const k = b.title.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    const w = works.find((x: Json) => head(x.title) === head(k));
    books.push({ title: b.title, author: b.author, year: w ? w.year : null, read_free: null, buy: null });
  }
  for (const w of works) {
    if ([...seen].some((s) => head(s) === head(w.title))) continue;
    seen.add(w.title.toLowerCase());
    books.push(w);
  }
  return {
    slug: slugify(cs.name),
    name: cs.name,
    lived: cs.lived ?? null,
    field: cs.field ?? null,
    lens: cs.lens,
    card: {
      school: card.school,
      lens: cs.lens,
      core_ideas: card.core_ideas ?? [],
      claims_for: card.claims_for ?? [],
      claims_against: card.claims_against ?? [],
      blind_spots: card.blind_spots ?? [],
      voice: card.voice ?? { rules: [], samples: [] },
    },
    books,
  };
}

function forgeIssues(cs: CastSeat, card: Json, raw: string): string[] {
  const out: string[] = [];
  if (card.lens !== cs.lens) out.push("card lens differs from the cast lens");
  if ((card.core_ideas ?? []).length !== 10) out.push(`${(card.core_ideas ?? []).length} core ideas, not 10`);
  if ((card.works ?? []).length > 4) out.push(`${card.works.length} works, over the limit of 4`);
  if (/```/.test(raw)) out.push("JSON wrapped in code fences");
  return out;
}

// ---------------------------------------------------------------------------
// Display blocks and the run file
// ---------------------------------------------------------------------------
function tailLine(t: LiveTurn): string {
  return t.tail
    ? `POSITION: ${t.tail.position} | MOVE: ${t.tail.move} | OPEN: ${t.tail.open ?? "none"}`
    : `(tail not parsed: ${t.tailRaw ?? "missing"})`;
}

function castBlock(st: State, rec: CallRecord): string {
  const c = st.cast!;
  const lines = [
    `**Cast** · ${fmt(rec.seconds)} · ${c.kind}${st.attempt > 1 ? ` · recast without ${st.exclude.join(", ")}` : ""}`,
    `Tension: ${c.tension}`,
    "",
  ];
  st.castSeats.forEach((s, i) =>
    lines.push(
      `${i + 1}. **${s.name}** (${s.lived}, ${s.field}) — ${s.why} · lens: ${s.lens}${
        s.books?.[0] ? ` · *${s.books[0].title}*` : ""
      }`,
    )
  );
  lines.push("", `Opens: ${st.castSeats[st.opening - 1].name}`);
  return lines.join("\n");
}

function cardsLine(st: State): string {
  return "**Cards** · " + st.castSeats.map((s) => {
    const slug = slugify(s.name);
    const state = st.cards[slug];
    const call = [...st.calls].reverse().find((c) => c.step === `forge ${slug}` && c.ok);
    return `${s.name} ${state === "forged" ? `forged in ${fmt(call?.seconds ?? null)}` : state}`;
  }).join(" · ");
}

function turnBlock(t: LiveTurn, rec: CallRecord): string {
  const flags = [
    t.words > t.cap ? "over cap" : "",
    t.tail ? "" : "tail missing",
    rec.promptExact === false ? "prompt mismatch" : "",
    rec.tools.length ? `used tools: ${rec.tools.join(", ")}` : "",
  ].filter(Boolean);
  return `**${t.turn} · ${t.name}** · ${t.cycle} · ${t.words}/${t.cap} words · ${fmt(t.seconds)}${
    flags.length ? ` · ${flags.join(" · ")}` : ""
  }\n\n${t.text}\n\n\`${tailLine(t)}\``;
}

function summaryBlock(st: State, seconds: number | null): string {
  const s = st.summary!;
  return [
    `**Summary** · ${fmt(seconds)}`,
    "",
    `### ${s.title ?? ""}`,
    "",
    "**What they agree on**",
    ...s.agree.map((x) => `- ${x}`),
    "",
    "**Where they differ**",
    ...s.differ.map((x) => `- ${x}`),
    "",
    "**What fits your situation**",
    s.fits ?? "",
    "",
    "**One next step**",
    s.next_step ?? "",
    "",
    "**The books behind the conversation**",
    ...s.books.map((b) => `- *${b.title}* — ${b.author} · ${b.why}`),
  ].join("\n");
}

/** One row per call in order, cached cards after the screen; parallel forges count once in the total. */
function timings(st: State): { rows: [string, string][]; model: number; wall: string | null } {
  const rows: [string, string][] = [];
  let model = 0;
  const firstForge: number[] = [];
  const seenForge = new Set<string>();
  const lastScreen = st.calls.map((c) => c.step.startsWith("screen")).lastIndexOf(true);
  const cachedRows = st.castSeats
    .filter((s) => st.cards[slugify(s.name)] === "cached")
    .map((s): [string, string] => [`card ${s.name}`, "cached"]);
  st.calls.forEach((c, i) => {
    const slug = c.step.startsWith("forge ") ? c.step.slice(6) : "";
    const label = slug
      ? `forge ${st.castSeats.find((s) => slugify(s.name) === slug)?.name ?? slug}`
      : c.step.replace(/^(cast|screen) 1$/, "$1");
    rows.push([`${label}${c.ok ? "" : " (unusable reply)"}`, c.seconds == null ? "n/a" : c.seconds.toFixed(1)]);
    if (i === lastScreen) rows.push(...cachedRows);
    if (c.seconds == null) return;
    if (slug) {
      if (seenForge.has(slug)) model += c.seconds;
      else {
        seenForge.add(slug);
        firstForge.push(c.seconds);
      }
    } else model += c.seconds;
  });
  if (firstForge.length) model += Math.max(...firstForge);
  const starts = st.calls.map((c) => c.start).filter((x): x is string => !!x).map(Date.parse);
  const ends = st.calls.map((c) => c.end).filter((x): x is string => !!x).map(Date.parse);
  let wall: string | null = null;
  if (ends.length) {
    const secs = Math.round((Math.max(...ends) - Math.min(Date.parse(st.createdAt), ...starts)) / 1000);
    wall = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
  }
  return { rows, model: Math.round(model * 10) / 10, wall };
}

function latencyTable(st: State): string {
  const { rows, model, wall } = timings(st);
  const isTurn = (l: string) => /^turn \d+/.test(l);
  const isSummary = (l: string) => l.startsWith("summary");
  const ts = st.turns.map((t) => t.seconds).filter((x): x is number => x != null).sort((a, b) => a - b);
  const median = !ts.length
    ? null
    : ts.length % 2
    ? ts[(ts.length - 1) / 2]
    : (ts[ts.length / 2 - 1] + ts[ts.length / 2]) / 2;
  const lines = ["| step | seconds |", "|---|---|"];
  for (const [l, v] of rows.filter(([l]) => !isTurn(l) && !isSummary(l))) lines.push(`| ${l} | ${v} |`);
  if (st.turns.length) {
    lines.push(
      `| turns 1–${st.turns.length} | ${st.turns.map((t) => (t.seconds == null ? "n/a" : t.seconds.toFixed(1))).join(" · ")}${
        median == null ? "" : ` (median ${median.toFixed(1)})`
      } |`,
    );
  }
  for (const [l, v] of rows.filter(([l]) => isSummary(l))) lines.push(`| ${l} | ${v} |`);
  lines.push(`| all model calls, parallel forges counted once | ${model.toFixed(1)} |`);
  if (wall) lines.push(`| wall clock, question to summary (min:s) | ${wall} |`);
  return lines.join("\n");
}

function checksLine(st: State): string {
  const over = st.turns.filter((t) => t.words > t.cap).map((t) => t.turn);
  const moves = st.turns.filter((t) => t.tail && t.tail.move !== "hold");
  const checked = st.calls.filter((c) => c.promptExact !== null);
  const s = st.summary;
  const sections = s
    ? (["agree", "differ", "fits", "next_step", "books"] as const).filter((k) => {
      const v = s[k];
      return Array.isArray(v) ? v.length > 0 : !!v;
    }).length
    : 0;
  const onePer = s ? st.seats.every((seat) => s.books.filter((b) => b.mind === seat.name).length === 1) : false;
  return [
    `Checks: tails ${st.turns.filter((t) => t.tail).length}/${st.turns.length}`,
    over.length ? `over the word cap on turn${over.length > 1 ? "s" : ""} ${over.join(", ")}` : "every turn inside its word cap",
    `${moves.length} shift/concede${moves.length ? ` (${moves.map((t) => `${t.name} t${t.turn}`).join(", ")})` : ""}`,
    s ? `summary ${sections}/5 sections, ${onePer ? "one book per mind" : "books NOT one per mind"}` : "",
    checked.length ? `prompts received exactly as built ${checked.filter((c) => c.promptExact).length}/${checked.length}` : "",
  ].filter(Boolean).join(" · ");
}

function verification(st: State): string[] {
  const out: string[] = [];
  if (st.castSeats.length) out.push(`Cast: ${st.castSeats.map((s) => `${s.name} — "${s.why}"`).join("; ")}`);
  if (st.screen) {
    out.push(
      `Screen: ${st.screen.verdicts.map((v) => `${v.name} ok=${v.ok}`).join(", ")}${
        st.attempt > 1 ? ` (second cast; the first excluded ${st.exclude.join(", ")})` : ""
      }`,
    );
  }
  if (Object.keys(st.cards).length) {
    out.push(`Cards: ${st.castSeats.map((s) => `${s.name} ${st.cards[slugify(s.name)] ?? "not reached"}`).join(", ")}`);
  }
  if (st.turns.length) {
    const over = st.turns.filter((t) => t.words > t.cap);
    const missing = st.turns.filter((t) => !t.tail);
    const moves = st.turns.filter((t) => t.tail && t.tail.move !== "hold");
    out.push(
      `Tails parsed: ${st.turns.length - missing.length}/${st.turns.length}${
        missing.length ? ` — missing on turns ${missing.map((t) => t.turn).join(",")}` : ""
      }`,
    );
    out.push(
      `Word counts (cap 80 in cycle 1, 60 after): ${st.turns.map((t) => `${t.words}${t.words > t.cap ? "!" : ""}`).join(" / ")}${
        over.length ? ` — over cap on turns ${over.map((t) => t.turn).join(",")}` : " — all inside the caps"
      }`,
    );
    out.push(
      `Moves: ${moves.length} shift/concede (${
        moves.map((t) => `${t.name} t${t.turn} ${t.tail!.move}`).join(", ") || "none"
      }); holds: ${st.turns.filter((t) => t.tail?.move === "hold").length}`,
    );
  }
  if (st.summary) {
    const s = st.summary;
    const has = (k: "agree" | "differ" | "fits" | "next_step" | "books") => {
      const v = s[k];
      return Array.isArray(v) ? v.length > 0 : !!v;
    };
    const onePer = st.seats.every((seat) => s.books.filter((b) => b.mind === seat.name).length === 1);
    out.push(
      `Summary sections: ${(["agree", "differ", "fits", "next_step", "books"] as const).map((k) => `${k}=${has(k) ? "yes" : "NO"}`).join(", ")}; books ${s.books.length} for ${st.seats.length} minds${
        onePer ? " (one per mind)" : " (NOT one per mind)"
      }`,
    );
  }
  const checked = st.calls.filter((c) => c.promptExact !== null);
  if (checked.length) {
    out.push(
      `Prompt fidelity: ${checked.filter((c) => c.promptExact).length}/${checked.length} subagents received exactly the prompt built from prompts.ts and the agent bodies`,
    );
  }
  const wrapped = st.calls.filter((c) => c.wrapped).map((c) => c.step);
  if (wrapped.length) out.push(`The hand-back re-wrapped the reply on ${wrapped.join(", ")}; the subagent's own final text was used`);
  const tooled = st.calls.filter((c) => c.tools.length).map((c) => `${c.step} (${c.tools.join(", ")})`);
  if (tooled.length) out.push(`Subagents used tools despite the no-tools rule: ${tooled.join("; ")}`);
  const firstMatch = st.turns.filter((t) => t.firstMatchDiffers).map((t) => t.turn);
  if (firstMatch.length) {
    out.push(`Turns ${firstMatch.join(",")} contain an earlier "POSITION:"; production's first-match split would cut the visible text there`);
  }
  const trailing = st.turns.filter((t) => t.trailing).map((t) => t.turn);
  if (trailing.length) out.push(`Turns ${trailing.join(",")} have text after the POSITION line`);
  for (const n of st.notes) out.push(`Note: ${n}`);
  return out;
}

function runMarkdown(st: State): string {
  const when = (st.finishedAt ?? st.createdAt).slice(0, 16).replace("T", " ");
  const modelOf = (prefix: string) =>
    st.calls.find((c) => c.step.startsWith(prefix))?.model ??
      st.pending.find((p) => p.step.startsWith(prefix))?.model ?? "the agent default";
  const L: string[] = [
    `# Council run — ${when} UTC${st.status === "failed" ? " — FAILED" : st.status === "running" ? " — in progress" : ""}`,
    "",
    `Harness: Claude Code subagents in fallback mode (general-purpose agents with the council-*.md bodies prepended; cast/forge/minds on ${
      modelOf("cast")
    }, screen/summary on ${modelOf("screen")}). No API key used. Prompts built and replies recorded by scripts/live.ts.`,
  ];
  if (st.failed) L.push("", `**FAILED:** ${st.failed}`);
  L.push(
    "",
    `**Question:** ${st.question}`,
    "",
    `**Situation:** ${st.situation || "none given"}`,
    "",
    `**Category:** ${st.category}${st.cast ? ` · **Kind:** ${st.cast.kind}` : ""}`,
  );
  if (st.cast) L.push("", `**Tension:** ${st.cast.tension}`);
  if (st.castSeats.length) {
    L.push("", "## Council", "");
    st.castSeats.forEach((cs, i) => {
      const seat = st.seats[i];
      const book = (seat?.books ?? cs.books ?? [])[0]?.title ?? "(no book)";
      L.push(`- **${cs.name}** (${seat?.lived ?? cs.lived}) — ${cs.why} · lens: ${cs.lens} · ${book}`);
    });
  }
  if (st.turns.length) {
    L.push("", "## Discussion");
    for (const t of st.turns) L.push("", `**${t.turn} · ${t.name}** — ${t.text}`, "", `\`${tailLine(t)}\``);
  }
  if (st.summary) {
    const s = st.summary;
    L.push(
      "",
      "## Summary",
      "",
      `### ${s.title ?? ""}`,
      "",
      "**What they agree on**",
      ...s.agree.map((x) => `- ${x}`),
      "",
      "**Where they differ**",
      ...s.differ.map((x) => `- ${x}`),
      "",
      "**What fits your situation**",
      s.fits ?? "",
      "",
      "**One next step**",
      s.next_step ?? "",
      "",
      "**The books behind the conversation**",
      ...s.books.map((b) => `- *${b.title}* — ${b.author} · ${b.why}`),
    );
  }
  const { rows, model, wall } = timings(st);
  if (rows.length) {
    L.push(
      "",
      "## Timings (subagent wall seconds; includes Claude Code overhead, not production latency)",
      "",
      "| step | s |",
      "|---|---|",
      ...rows.map(([l, v]) => `| ${l} | ${v} |`),
      `| all model calls, parallel forges counted once | ${model.toFixed(1)} |`,
    );
    if (wall) L.push(`| wall clock, question to last reply, includes orchestration (min:s) | ${wall} |`);
    L.push(
      "",
      "Production estimate for the same run: cast ≈ 3 s, forge (cold, parallel) ≈ 15 s, turns ≈ 2.5 s each, summary ≈ 3 s.",
    );
  }
  L.push("", "## Verification", "", ...verification(st).map((x) => `- ${x}`));
  return L.join("\n") + "\n";
}

async function writeRun(st: State): Promise<string> {
  const file = `${RUNS}/${st.id}.md`;
  await Deno.writeTextFile(file, runMarkdown(st));
  if (!Deno.env.get("COUNCIL_RUNS_DIR")) {
    const out = await new Deno.Command(Deno.execPath(), {
      args: ["run", "--allow-read", "--allow-write", "scripts/view_runs.ts"],
      cwd: ROOT,
      stdout: "piped",
      stderr: "piped",
    }).output();
    console.log(new TextDecoder().decode(out.success ? out.stdout : out.stderr).trim());
  }
  return file;
}

async function failRun(st: State, note: string, block?: string) {
  st.status = "failed";
  st.failed = note;
  st.pending = [];
  st.finishedAt = new Date().toISOString();
  const file = await writeRun(st);
  await save(st);
  show(`${block ? `${block}\n` : ""}**FAILED** · ${note}\nSaved what exists to ${file}`);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
async function cmdNew(args: string[], flags: Record<string, string>) {
  const question = args.join(" ").trim();
  if (!question) throw new Error(USAGE);
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/T(\d{4}).*$/, "-$1");
  const base = `${stamp}-${slugify(question.split(/\s+/).slice(0, 5).join(" "))}`;
  let id = base;
  for (let n = 2; await exists(statePath(id)); n++) id = `${base}-${n}`;
  const turns = Number.parseInt(flags.turns ?? "9", 10);
  const st: State = {
    id,
    question,
    situation: (flags.situation ?? "").trim(),
    category: (flags.category ?? "").trim() || "other",
    total: Number.isFinite(turns) && turns >= 3 ? turns : 9,
    models: { mind: flags.mind || null, fast: flags.fast || null },
    createdAt: now.toISOString(),
    finishedAt: null,
    status: "running",
    failed: null,
    pending: [],
    attempt: 1,
    exclude: [],
    cast: null,
    castSeats: [],
    opening: 1,
    screen: null,
    cards: {},
    seats: [],
    turns: [],
    summary: null,
    summaryRaw: null,
    calls: [],
    notes: [],
  };
  await pend(st, "cast 1", "council-caster", castTask(st));
  await save(st);
  console.log(
    `RUN ${st.id}\nquestion: ${st.question}\nsituation: ${st.situation || "none given"}\n` +
      `category: ${st.category} · turns: ${st.total}\n` +
      `mode: fallback (general-purpose subagents, council-*.md body prepended); no API key`,
  );
  await printNext(st);
}

async function cmdCast(st: State, agentId: string | undefined, flags: Record<string, string>) {
  const p = take(st, "cast");
  const reply = await readReply(agentId, flags.reply);
  const got = pick(reply, (t) => {
    try {
      const c = parseJson<CastResult>(t);
      return Array.isArray(c.seats) && c.seats.length === 3 && c.seats.every((s) => s?.name) ? c : null;
    } catch {
      return null;
    }
  });
  const rec = await recordCall(st, p, agentId, reply, got.ts, !!got.value, got.value ? undefined : "no valid cast JSON");
  if (!got.value) {
    return await retry(st, p, rec, "The cast reply had no valid JSON with three named seats. Production would fail the session here.");
  }
  const cast = got.value;
  st.cast = cast;
  st.castSeats = [1, 2, 3].map((n) => cast.seats.find((s) => s?.seat === n) ?? cast.seats[n - 1]);
  st.opening = Math.min(Math.max(Number(cast.opening_seat) || 1, 1), 3);
  st.cards = {};
  await pend(st, `screen ${st.attempt}`, "council-screen", JSON.stringify({ names: st.castSeats.map((s) => s.name) }));
  await save(st);
  show(castBlock(st, rec));
  await printNext(st);
}

async function cmdScreen(st: State, agentId: string | undefined, flags: Record<string, string>) {
  const p = take(st, "screen");
  const reply = await readReply(agentId, flags.reply);
  const got = pick(reply, (t) => {
    try {
      const r = parseJson<ScreenResult>(t);
      return Array.isArray(r.verdicts) ? r : null;
    } catch {
      return null;
    }
  });
  const rec = await recordCall(st, p, agentId, reply, got.ts, !!got.value, got.value ? undefined : "no valid screen JSON");
  if (!got.value) {
    return await retry(st, p, rec, "The screen reply had no valid JSON verdicts. Production would fail the session here.");
  }
  st.screen = got.value;
  const rejected = got.value.verdicts.filter((v) => v?.ok === false).map((v) => v.name);
  if (rejected.length) {
    const verdicts = got.value.verdicts.map((v) => `${v.name} ${v.ok ? "ok" : `rejected (${v.reason})`}`).join(" · ");
    if (st.attempt >= 2) {
      return await failRun(st, `Cast rejected by the screen twice: ${rejected.join(", ")}`, `**Screen** · ${fmt(rec.seconds)} · ${verdicts}`);
    }
    st.attempt = 2;
    st.exclude = rejected;
    await pend(st, "cast 2", "council-caster", castTask(st));
    await save(st);
    show(`**Screen** · ${fmt(rec.seconds)} · ${verdicts}\nRecasting with ${rejected.join(", ")} excluded.`);
    return await printNext(st);
  }
  const missing: CastSeat[] = [];
  for (const cs of st.castSeats) {
    const slug = slugify(cs.name);
    if (await exists(`${MINDS}/${slug}.json`)) st.cards[slug] = "cached";
    else {
      st.cards[slug] = "forging";
      missing.push(cs);
    }
  }
  for (const cs of missing) {
    await pend(
      st,
      `forge ${slugify(cs.name)}`,
      "council-forge",
      `NAME: ${cs.name}, LIVED: ${cs.lived}, FIELD: ${cs.field}, LENS: ${cs.lens}`,
      slugify(cs.name),
    );
  }
  if (!missing.length) await startTurns(st);
  await save(st);
  show(
    `**Screen** · ${fmt(rec.seconds)} · all three pass\n${cardsLine(st)}${
      missing.length ? `\nForging ${missing.length === 1 ? "one card" : `${missing.length} cards in parallel`}.` : ""
    }`,
  );
  await printNext(st);
}

async function cmdForge(st: State, slug: string | undefined, agentId: string | undefined, flags: Record<string, string>) {
  if (!slug) throw new Error("usage: live.ts forge <slug> <agentId>");
  const p = take(st, "forge", slug);
  const cs = st.castSeats.find((s) => slugify(s.name) === slug);
  if (!cs) throw new Error(`${slug} is not in this cast`);
  const reply = await readReply(agentId, flags.reply);
  const got = pick(reply, (t) => {
    try {
      const c = parseJson<Json>(t);
      return c && typeof c === "object" && typeof c.school === "string" ? c : null;
    } catch {
      return null;
    }
  });
  const rec = await recordCall(st, p, agentId, reply, got.ts, !!got.value, got.value ? undefined : "no valid card JSON");
  if (!got.value) {
    return await retry(st, p, rec, `The forge reply for ${cs.name} was not valid card JSON. Production would fail the session here.`);
  }
  const mind = mindFromForge(cs, got.value);
  await Deno.mkdir(MINDS, { recursive: true });
  await Deno.writeTextFile(`${MINDS}/${slug}.json`, JSON.stringify(mind));
  st.cards[slug] = "forged";
  const issues = forgeIssues(cs, got.value, got.text);
  if (issues.length) st.notes.push(`forge ${cs.name}: ${issues.join("; ")}`);
  const waiting = st.pending.filter((x) => x.step.startsWith("forge")).map((x) => x.slug);
  if (!waiting.length) await startTurns(st);
  await save(st);
  show(
    `**Forged** ${cs.name} · ${fmt(rec.seconds)} · works: ${mind.books.map((b) => b.title.split(":")[0]).join(", ")}${
      issues.length ? ` · ${issues.join("; ")}` : ""
    }${waiting.length ? `\nStill forging: ${waiting.join(", ")}` : `\n${cardsLine(st)}`}`,
  );
  if (!waiting.length) await printNext(st);
}

async function cmdTurn(st: State, agentId: string | undefined, flags: Record<string, string>) {
  const p = take(st, "turn");
  const t = st.turns.length + 1;
  const idx = (st.opening - 1 + t - 1) % 3;
  const me = st.seats[idx];
  const reply = await readReply(agentId, flags.reply);
  const got = pick(reply, (text) => {
    const parsed = parseTail(text);
    return parsed.tail ? parsed : null;
  });
  const parsed = got.value ?? parseTail(got.text);
  const rec = await recordCall(st, p, agentId, reply, got.ts, true, parsed.tail ? undefined : "tail not parsed");
  const cycle = cycleForTurn(t, st.total);
  const turn: LiveTurn = {
    turn: t,
    speaker: me.slug,
    cycle,
    text: parsed.text,
    tail: parsed.tail,
    name: me.name,
    words: countWords(parsed.text),
    cap: cycle === "positions" ? 80 : 60,
    seconds: rec.seconds,
    raw: got.text,
    tailRaw: parsed.tailRaw,
    firstMatchDiffers: parsed.firstMatchDiffers,
    trailing: parsed.trailing,
  };
  st.turns.push(turn);
  if (t < st.total) await pend(st, `turn ${t + 1}`, "council-mind", await mindTask(st, t + 1));
  else {
    const input = summaryUser({
      question: st.question,
      situation: st.situation || null,
      seats: st.seats,
      turns: st.turns.map(plainTurn),
    });
    await pend(st, "summary", "council-summarizer", input);
  }
  await save(st);
  show(turnBlock(turn, rec));
  await printNext(st);
}

async function cmdSummary(st: State, agentId: string | undefined, flags: Record<string, string>) {
  const p = take(st, "summary");
  const reply = await readReply(agentId, flags.reply);
  const got = pick(reply, (t) => {
    try {
      const s = parseJson<Summary>(t);
      return s && typeof s === "object" && ("agree" in s || "title" in s) ? s : null;
    } catch {
      return null;
    }
  });
  const rec = await recordCall(st, p, agentId, reply, got.ts, !!got.value, got.value ? undefined : "no valid summary JSON");
  if (!got.value) return await retry(st, p, rec, "The summary reply was not valid JSON. Production would fail the session here.");
  const s = got.value;
  if (s.agree !== undefined && !Array.isArray(s.agree)) st.notes.push("summarizer returned agree as a string (production normalizes it)");
  if (s.differ !== undefined && !Array.isArray(s.differ)) st.notes.push("summarizer returned differ as a string (production normalizes it)");
  if (/```/.test(got.text)) st.notes.push("summarizer wrapped its JSON in code fences (parsed anyway)");
  st.summaryRaw = got.text;
  st.summary = { ...s, agree: asList(s.agree), differ: asList(s.differ), books: s.books ?? [] };
  st.status = "done";
  st.finishedAt = got.ts ?? new Date().toISOString();
  const file = await writeRun(st);
  await save(st);
  show(`${summaryBlock(st, rec.seconds)}\n\n${latencyTable(st)}\n\n${checksLine(st)}`);
  console.log(`RUN FILE ${file}`);
}

function cmdStatus(st: State) {
  console.log(`RUN ${st.id} · ${st.status}${st.failed ? ` (${st.failed})` : ""}`);
  console.log(`question: ${st.question}`);
  if (st.castSeats.length) {
    console.log(`cast: ${st.castSeats.map((s) => `${s.name} [${st.cards[slugify(s.name)] ?? "not screened"}]`).join(", ")}`);
  }
  console.log(`turns: ${st.turns.length}/${st.total}`);
  console.log(`waiting on: ${st.pending.map((p) => p.step).join(", ") || "nothing"}`);
}

function parseArgs(argv: string[]): { pos: string[]; flags: Record<string, string> } {
  const pos: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[++i] ?? "";
    else pos.push(argv[i]);
  }
  return { pos, flags };
}

if (import.meta.main) {
  const { pos, flags } = parseArgs(Deno.args);
  const [cmd, ...rest] = pos;
  try {
    if (cmd === "new") await cmdNew(rest, flags);
    else if (!cmd) console.log(USAGE);
    else {
      const st = await load(flags.run);
      switch (cmd) {
        case "cast":
          await cmdCast(st, rest[0], flags);
          break;
        case "screen":
          await cmdScreen(st, rest[0], flags);
          break;
        case "forge":
          await cmdForge(st, rest[0], rest[1], flags);
          break;
        case "turn":
          await cmdTurn(st, rest[0], flags);
          break;
        case "summary":
          await cmdSummary(st, rest[0], flags);
          break;
        case "fail":
          await failRun(st, rest.join(" ") || "stopped by the orchestrator");
          break;
        case "status":
          cmdStatus(st);
          break;
        case "show":
          console.log(runMarkdown(st));
          break;
        case "prompt":
          for (const p of st.pending) {
            console.log(`===== ${p.step} (${p.agent}, model ${p.model}) =====\n${await Deno.readTextFile(p.file)}`);
          }
          break;
        default:
          throw new Error(`unknown command "${cmd}"\n${USAGE}`);
      }
    }
  } catch (e) {
    console.error(`error: ${e instanceof Error ? e.message : String(e)}`);
    Deno.exit(1);
  }
}
