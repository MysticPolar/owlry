// One-screen summary of each lineage's current baseline: scores per question and sample, the form checks the gate
// applies to challengers, latency, and the weakest cells. Reads only runner files.
//
//   deno run -A evolve/v4/tools/baseline_summary.ts            (from the repository root)

import { pointsLost } from "../runner/scoring.ts";
import type { RubricCard } from "../runner/types.ts";

const P = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/\/$/, "");
const setA = JSON.parse(await Deno.readTextFile(`${P}/sets/setA.json`)).questions as { idx: number; category: string; label: string }[];
for (const lin of ["sonnet", "gemini"]) {
  const base = JSON.parse(await Deno.readTextFile(`${P}/${lin}/baseline.json`).catch(() => "null"));
  if (!base) { console.log(`${lin}: no baseline`); continue; }
  const rows: string[] = [];
  const cards: RubricCard[] = [];
  let fab = 0, pdq = 0, invalid = 0, lat: number[] = [];
  for (const q of setA) {
    const scores: string[] = [];
    for (const s of [1, 2]) {
      const gk = base.gen[`q${q.idx}.s${s}`], rk = base.rubric[`q${q.idx}.s${s}`];
      if (!gk || !rk) { scores.push("missing"); continue; }
      const g = JSON.parse(await Deno.readTextFile(`${P}/cache/gen/${gk}.json`));
      const r = JSON.parse(await Deno.readTextFile(`${P}/cache/rubric/${rk}.json`));
      cards.push(r.card); scores.push(r.card.score.toFixed(2));
      fab += g.metrics.fabricatedBasisTurns; pdq += g.metrics.pdFalseQuoteTurns; invalid += g.validity.ok ? 0 : 1;
      if (typeof g.latencyMs === "number") lat.push(g.latencyMs);
    }
    rows.push(`  q${q.idx} ${q.category.padEnd(8)} ${scores.join("  ")}`);
  }
  const mean = cards.reduce((a, c) => a + c.score, 0) / cards.length;
  console.log(`\n${lin} ${base.version}: mean ${mean.toFixed(2)} over ${cards.length} cards; missing [${(base.missing ?? []).join(", ")}]`);
  console.log(rows.join("\n"));
  console.log(`  form checks over 10 transcripts: invalid ${invalid}, basis with chapter/section/link ${fab}, pd=false turns with quotation marks ${pdq} (challenger limits: 0, 0, 1)`);
  if (lat.length) console.log(`  latency: median ${(lat.sort((a, b) => a - b)[Math.floor(lat.length / 2)] / 1000).toFixed(1)} s`);
  console.log(`  weakest cells: ${pointsLost(cards).slice(0, 5).map((c) => `${c.id} ${c.name.split(/[.,;]/)[0]} ${c.meanRating.toFixed(2)}`).join(" | ")}`);
}
