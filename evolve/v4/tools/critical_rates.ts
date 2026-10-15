// How often would past transcripts trip the gate's critical checks? Replays runner/metrics.ts over every worker
// record under evolve/runs/round-* (rounds 1-12, schema 1 and 2) and estimates, by resampling, the chance that a
// challenger whose 10 transcripts look like these is rejected as critical (gate.critical in config.v4.2.json).
//
//   deno run -A evolve/v4/tools/critical_rates.ts            (from the repository root)

import { formMetrics, validity } from "../runner/metrics.ts";

const here = (p: string) => decodeURIComponent(new URL(p, import.meta.url).pathname);
const RUNS = here("../../runs");
const cfg = JSON.parse(await Deno.readTextFile(here("../config.v4.2.json")));
const M = { canBrowse: false, wordsMin: cfg.wordsPerTurn.min, wordsMax: cfg.wordsPerTurn.max, turnsMin: cfg.turns.min, turnsMax: cfg.turns.max, pdCutoff: cfg.pdCutoff };
const C = cfg.gate.critical;

type Row = { file: string; lane: string; pdq: number; fab: number; valid: boolean };
const rows: Row[] = [];
for await (const r of Deno.readDir(RUNS)) {
  if (!r.isDirectory) continue;
  for await (const f of Deno.readDir(`${RUNS}/${r.name}`)) {
    const m = f.name.match(/(?:^|\.)v\d+\.(gemini|sonnet)(?:\.s\d+)?\.json$/);
    if (!m) continue;
    const d = JSON.parse(await Deno.readTextFile(`${RUNS}/${r.name}/${f.name}`));
    const debate = d.output ?? d;
    if (!debate?.debate) continue;
    const met = formMetrics(debate, M);
    rows.push({ file: `${r.name}/${f.name}`, lane: m[1], pdq: met.pdFalseQuoteTurns, fab: met.fabricatedBasisTurns, valid: validity(debate, M).ok });
  }
}

console.log("lane    transcripts  with-pd=false-quotes  with-fabricated-basis  invalid  P(10-transcript challenger is critical)");
for (const lane of ["sonnet", "gemini"]) {
  const xs = rows.filter((x) => x.lane === lane);
  if (!xs.length) continue;
  let crit = 0; const N = 20000;
  for (let i = 0; i < N; i++) {
    let p = 0, fb = 0, inv = 0;
    for (let k = 0; k < 10; k++) { const x = xs[Math.floor(Math.random() * xs.length)]; p += x.pdq; fb += x.fab; inv += x.valid ? 0 : 1; }
    if (p > C.maxPdFalseQuoteTurns || fb > C.maxFabricatedBasisTurns || inv > C.maxInvalidTranscripts) crit++;
  }
  console.log(`${lane.padEnd(8)}${String(xs.length).padStart(11)}  ${String(xs.filter((x) => x.pdq > 0).length).padStart(20)}  ${String(xs.filter((x) => x.fab > 0).length).padStart(21)}  ${String(xs.filter((x) => !x.valid).length).padStart(7)}  ${(crit / N * 100).toFixed(0)}%`);
}
