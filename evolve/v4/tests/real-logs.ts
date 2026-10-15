// Runs the form metrics, validity and lint over real schema-2 artefacts.
//   npx tsx tests/real-logs.ts <round folder with q*.v*.json> [<base prompt .md> <new prompt .md>]
// Reads files with Node or Deno, whichever is running.
import { formMetrics, validity } from "../runner/metrics.ts";
import { lintDiff } from "../runner/lint.ts";

const read = async (p: string) => (globalThis as { Deno?: { readTextFile: (p: string) => Promise<string> } }).Deno
  ? (globalThis as unknown as { Deno: { readTextFile: (p: string) => Promise<string> } }).Deno.readTextFile(p)
  : (await import("node:fs/promises")).readFile(p, "utf8");
const list = async (dir: string) => (globalThis as { Deno?: unknown }).Deno
  ? (async () => { const out: string[] = []; for await (const e of (globalThis as unknown as { Deno: { readDir: (d: string) => AsyncIterable<{ name: string }> } }).Deno.readDir(dir)) out.push(e.name); return out; })()
  : (await import("node:fs/promises")).readdir(dir);
const argv = (globalThis as { Deno?: { args: string[] } }).Deno?.args ?? (globalThis as unknown as { process: { argv: string[] } }).process.argv.slice(2);

const [dir, basePrompt, newPrompt] = argv;
const M = { canBrowse: false, wordsMin: 25, wordsMax: 65, turnsMin: 9, turnsMax: 12, pdCutoff: 1931 };
const SET_A: string[][] = JSON.parse(await read(new URL("../sets/setA.json", import.meta.url).pathname)).questions.map((q: { topicWords: string[] }) => q.topicWords);

console.log("file                      turns words  wpt  short hedge% opener slot  ?you  theUser pdFq fabBasis valid");
for (const f of (await list(dir)).filter((n) => /^q\d\.v\d+\.(gemini|sonnet)\.s\d\.json$/.test(n)).sort()) {
  const d = JSON.parse(await read(`${dir}/${f}`));
  const debate = d.output ?? d;
  const m = formMetrics(debate, M), v = validity(debate, M);
  console.log(`${f.padEnd(25)} ${String(m.turns).padStart(5)} ${String(m.words).padStart(5)} ${m.meanWordsPerTurn.toFixed(1).padStart(5)} ${String(m.shortTurns).padStart(5)} ${m.hedgeDensity.toFixed(1).padStart(6)} ${String(m.templatedOpeners).padStart(6)} ${String(m.slotMarkers).padStart(5)} ${String(m.questionsToUser).padStart(5)} ${String(m.theUser).padStart(7)} ${String(m.pdFalseQuoteTurns).padStart(4)} ${String(m.fabricatedBasisTurns).padStart(8)}  ${v.ok ? "ok" : v.problems[0]}`);
}

if (basePrompt && newPrompt) {
  const r = lintDiff(await read(basePrompt), await read(newPrompt), SET_A, { minWordLength: 4, allow: ["user", "users", "situation", "question", "questions", "debate", "mind", "minds", "turn", "turns", "book", "books", "author", "option", "options", "decision", "fact", "facts", "person", "people"] });
  console.log(`\nlint ${basePrompt} -> ${newPrompt}: ${r.ok ? "ok" : "REJECT"} ${r.hits.join("; ")}`);
}
