// One-screen summary of every gate decision so far: per lineage, each ledger line, the rubric means of both sides, the
// form checks on the challenger's transcripts, and the per-question blind tally. Reads only runner files.
//
//   deno run -A evolve/v4/tools/decisions_summary.ts            (from the repository root)

const P = decodeURIComponent(new URL("..", import.meta.url).pathname).replace(/\/$/, "");
const setA = JSON.parse(await Deno.readTextFile(`${P}/sets/setA.json`)).questions as { idx: number; category: string }[];
const readJson = async (p: string) => JSON.parse(await Deno.readTextFile(p));

for (const lin of ["sonnet", "gemini"]) {
  const ledger = (await Deno.readTextFile(`${P}/${lin}/ledger.jsonl`).catch(() => "")).split("\n").filter(Boolean).map((l) => JSON.parse(l));
  for (const e of ledger) {
    console.log(`\n${lin}: ${e.version} vs ${e.base} -> ${e.outcome}; blind ${e.wins}/${e.pairs} (p=${e.pValue}); rubric delta ${e.rubricMeanDelta >= 0 ? "+" : ""}${e.rubricMeanDelta}`);
    if (e.reason) console.log(`  gate reason: ${e.reason}`);
    console.log(`  by category: ${Object.entries(e.perCategoryDelta).map(([k, v]) => `${k} ${(v as number) >= 0 ? "+" : ""}${v}`).join(", ")}`);
    const exp = await readJson(`${P}/${lin}/experiments/${e.id}/state.json`).catch(() => null);
    if (!exp) continue;
    // challenger form checks and mean card scores of both sides within this experiment (+ the champion's baseline)
    let fab = 0, pdq = 0, invalid = 0, nGen = 0;
    // each card once: the baseline may have been drawn inside this same experiment, so its keys appear in both places
    const keysByVersion: Record<string, Set<string>> = {};
    for (const [id, j] of Object.entries<any>(exp.jobs)) {
      if (!j.cacheKey) continue;
      if (id.startsWith(`gen.${e.version}.`)) {
        const g = await readJson(`${P}/cache/gen/${j.cacheKey}.json`);
        fab += g.metrics.fabricatedBasisTurns; pdq += g.metrics.pdFalseQuoteTurns; invalid += g.validity.ok ? 0 : 1; nGen++;
      }
      if (id.startsWith("rubric.")) (keysByVersion[id.split(".")[1]] ??= new Set()).add(j.cacheKey);
    }
    const base = await readJson(`${P}/${lin}/baseline.json`).catch(() => null);
    if (base && base.version === e.base) for (const k of Object.values<string>(base.rubric)) (keysByVersion[e.base] ??= new Set()).add(k);
    const scores: Record<string, number[]> = {};
    for (const [v, keys] of Object.entries(keysByVersion)) for (const k of keys) (scores[v] ??= []).push((await readJson(`${P}/cache/rubric/${k}.json`)).card.score);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    console.log(`  rubric means: ${Object.entries(scores).map(([v, xs]) => `${v} ${mean(xs).toFixed(2)} (n=${xs.length})`).join(", ")}`);
    console.log(`  challenger form checks over ${nGen} transcripts: invalid ${invalid}, linked/chaptered basis ${fab}, quoted pd=false turns ${pdq}`);
    const pairs = await readJson(`${P}/${lin}/experiments/${e.id}/pairs.json`).catch(() => []);
    const perQ: Record<number, number[]> = {};
    for (const p of pairs) (perQ[p.q] ??= []).push(p.challengerWon);
    console.log(`  blind per question (challenger credit): ${setA.map((q) => `${q.category} ${(perQ[q.idx] ?? []).join("+") || "-"}`).join(", ")}`);
  }
}
