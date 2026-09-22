// Generates the Claude Code test harness from the production prompts, so the two never drift:
//   .claude/agents/council-caster.md      (cast)       model: sonnet
//   .claude/agents/council-screen.md      (screen)     model: haiku
//   .claude/agents/council-forge.md       (forge)      model: sonnet
//   .claude/agents/council-mind.md        (one turn)   model: sonnet
//   .claude/agents/council-summarizer.md  (summary)    model: haiku
//   .claude/commands/council.md           (/council orchestration for the main session)
//
// Run:  deno run --allow-read --allow-write scripts/build_agents.ts
// Then in Claude Code, from the repo root:  /council "your question" --category career

import {
  BENCHES,
  CAST_SYSTEM,
  forgeSystem,
  identityBlock,
  SCREEN_SYSTEM,
  SHARED_RULES,
  SUMMARY_SYSTEM,
} from "../supabase/functions/council/prompts.ts";

const MIND_MODEL = Deno.env.get("COUNCIL_MODEL_MIND_ALIAS") ?? "sonnet";
const FAST_MODEL = Deno.env.get("COUNCIL_MODEL_FAST_ALIAS") ?? "haiku";

const NO_TOOLS = `Do not use any tools. Do not read files. Answer from the input you are given, and return only the requested output.`;

const agents: Record<string, { description: string; model: string; body: string }> = {
  "council-caster": {
    description: "Casts three great minds for a reader's question (Owlry council). Called by /council; returns JSON only.",
    model: MIND_MODEL,
    body: `${CAST_SYSTEM}

Benches (suggested names per category; go outside them whenever fit demands it):
${Object.entries(BENCHES).map(([k, v]) => `- ${k}: ${v.join(", ")}`).join("\n")}

${NO_TOOLS}`,
  },
  "council-screen": {
    description: "Screens proposed council names against the hard rules (hate, extremism, racism, crime, office, private, fictional). Returns JSON only.",
    model: FAST_MODEL,
    body: `${SCREEN_SYSTEM}\n\n${NO_TOOLS}`,
  },
  "council-forge": {
    description: "Builds a persona card (JSON) for one great mind. Called by /council when council/minds/<slug>.json does not exist.",
    model: MIND_MODEL,
    body: `${forgeSystem("{{NAME}}", "{{LIVED}}", "{{FIELD}}", "{{LENS}}")}

The task message gives the real values for {{NAME}}, {{LIVED}}, {{FIELD}} and {{LENS}}; use them everywhere the placeholders appear above.

${NO_TOOLS}`,
  },
  "council-mind": {
    description: "Speaks one council turn as an AI persona inspired by a great mind. Called by /council once per turn with the card and the director's note.",
    model: MIND_MODEL,
    body: `${identityBlock("{{NAME}}", "{{LIVED}}")}

The task message gives the real values for {{NAME}} and {{LIVED}}, then the CARD (JSON), then the director's note. Follow the note for length and focus.

${SHARED_RULES}

${NO_TOOLS} Return the turn text followed by the POSITION line, nothing else.`,
  },
  "council-summarizer": {
    description: "Writes the five-section summary of a council discussion. Called by /council once; returns JSON only.",
    model: FAST_MODEL,
    body: `${SUMMARY_SYSTEM}\n\n${NO_TOOLS}`,
  },
};

const command = `---
description: Run one Owlry council session with subagents and save the transcript. Usage: /council "question" [--category health|career|investing|relationships|literature|other] [--situation "..."] [--turns 9] [--mind sonnet|opus|haiku] [--fast haiku|sonnet]
---

Run one council session for: $ARGUMENTS

You are the orchestrator. Every model call in production is one subagent call here; keep them separate so no mind sees anything but its own input. Use the Agent tool with the named agents below; pass \`model\` when the user gave --mind or --fast. Never write a turn yourself.

Parse the arguments: the quoted text is the question; --category defaults to other; --situation defaults to empty; --turns defaults to 9; --mind defaults to the agents' own model; --fast likewise.

1. Cast. Call \`council-caster\` with JSON: {question, situation, category, exclude: [], recent: []}. Parse the JSON reply: kind, tension, seats[3] (name, lived, field, lens, why, books), opening_seat.
2. Screen. Call \`council-screen\` with {names: [the three names]}. If any verdict has ok=false, call the caster again with exclude = those names and screen again; if it fails twice, stop and report.
3. Cards. For each seat compute slug = lowercase name, non-alphanumerics to "-". If \`council/minds/<slug>.json\` exists, read it. Otherwise call \`council-forge\` (all missing seats in parallel) with "NAME: …, LIVED: …, FIELD: …, LENS: …" and save the JSON reply to that path.
4. Turns. Let N = --turns and cycle(t) = positions for t ≤ ceil(N/3), pressure for t ≤ 2·ceil(N/3), application after. Seat for turn t = (opening_seat − 1 + t − 1) mod 3. For each turn, call \`council-mind\` sequentially with this task message (mirror of directorNote() in prompts.ts):

   NAME: <name> · LIVED: <lived>
   CARD: <the card JSON, plus "works": [book titles]>
   Reader's question: <question>
   Reader's situation: <situation or "none given">
   The tension inside the question: <tension>
   At the table with you:
   - <other name> — AI persona; <why>; lens: <lens>
   - <other name> — AI persona; <why>; lens: <lens>
   Discussion so far:
   <"[n] Name: text" for every earlier turn, visible text only, or "(no one has spoken yet)">
   This is turn <t> of <N>.
   <cycle line>
   End with the POSITION line.

   Cycle lines:
   - positions, turn 1: "Cycle 1 — positions. Up to 80 words. No one has spoken yet, so state your position without replying to anyone. In your first sentence, ground yourself in the work of yours this comes from."
   - positions, later: "Cycle 1 — positions. Up to 80 words. Reply to one claim already made, then state your own position."
   - pressure: "Cycle 2 — pressure. Up to 60 words. Which of your own claims did the others damage most? Concede it or defend it with a reason. Then push the one point that matters most for the reader."
   - application: "Cycle 3 — application. Up to 60 words. No new debate. Given everything said, what should this reader do first, and why? One concrete action in the reader's world, for their stated situation." (append " (no situation given — apply to the question as asked)" when situation is empty)

   Split the reply at the last line starting with POSITION: — the text above it is the visible turn, the line is the tail (position | move | open). Record the wall time of each call.
5. Summary. Call \`council-summarizer\` with JSON: {question, situation, seats: [{name, books}], transcript: "<[n] Name: text …>", tails: [{turn, speaker, position, move, open}]}. Parse the JSON.
6. Save \`council/runs/<YYYYMMDD-HHMM>-<first-five-words-of-question>.md\` containing: the question and situation; the tension; the council card (name · why · lens · first book); each turn as "**n · Name** — text" with its tail on the next line in code formatting; the summary in five sections; a timing table (cast, screen, forge, each turn, summary, total). Print the path, then the council card and the summary.

Note for the reader of these runs: subagent wall times include Claude Code overhead and do not reflect production latency; use them only to compare runs with each other.
`;

async function main() {
  await Deno.mkdir(".claude/agents", { recursive: true });
  await Deno.mkdir(".claude/commands", { recursive: true });
  await Deno.mkdir("council/minds", { recursive: true });
  await Deno.mkdir("council/runs", { recursive: true });
  for (const [name, a] of Object.entries(agents)) {
    const md = `---\nname: ${name}\ndescription: ${a.description}\nmodel: ${a.model}\n---\n\n${a.body}\n`;
    await Deno.writeTextFile(`.claude/agents/${name}.md`, md);
    console.log(`wrote .claude/agents/${name}.md (${a.model})`);
  }
  await Deno.writeTextFile(".claude/commands/council.md", command);
  console.log("wrote .claude/commands/council.md");
}

if (import.meta.main) await main();
