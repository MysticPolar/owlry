// Capability report: the two lineages run in parallel on the same Set A with the
// same evaluator, so their champions can be compared cell by cell. The report is
// read by people and by the Optimizer (numbers only, as a reference); it is never
// an input to any gate.
//
// A cell where one lineage trails the other by at least `capabilityGap` rating
// points on EVERY question is marked capability-bound: the shortfall is in the
// worker, not in the prompt, and the Optimizer treats cause_type "model" as the
// leading hypothesis there (and escalates rather than adding instructions).

import type { RubricCard } from "./types.ts";

export interface LineageCards { lineage: string; champion: string; byQuestion: Record<number, RubricCard[]> }

export interface CellGap { id: string; name: string; criterion: string; a: number; b: number; gap: number; everyQuestion: boolean; capabilityBound: boolean }

export interface CapabilityReport {
  a: string; b: string;                         // lineage names
  champions: { a: string; b: string };
  total: { a: number; b: number; gap: number };
  byQuestion: { q: number; a: number; b: number; gap: number }[];
  byCriterion: { name: string; a: number; b: number; gap: number }[];
  cells: CellGap[];                              // sorted by gap descending (b − a)
  capabilityBound: string[];                     // cell ids
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const r2 = (x: number) => Math.round(x * 100) / 100;

function cellMeans(cards: RubricCard[]): Map<string, { name: string; criterion: string; rating: number }> {
  const acc = new Map<string, { name: string; criterion: string; sum: number; n: number }>();
  for (const c of cards) for (const cr of c.criteria) for (const s of cr.sub) {
    const a = acc.get(s.id) ?? { name: s.name, criterion: cr.name, sum: 0, n: 0 }; a.sum += s.rating; a.n++; acc.set(s.id, a);
  }
  return new Map([...acc].map(([id, a]) => [id, { name: a.name, criterion: a.criterion, rating: a.sum / a.n }]));
}

export function capabilityReport(A: LineageCards, B: LineageCards, capabilityGap = 2.0): CapabilityReport {
  const qs = [...new Set([...Object.keys(A.byQuestion), ...Object.keys(B.byQuestion)].map(Number))].sort((x, y) => x - y);
  const allA = qs.flatMap((q) => A.byQuestion[q] ?? []), allB = qs.flatMap((q) => B.byQuestion[q] ?? []);
  const ma = cellMeans(allA), mb = cellMeans(allB);
  const cells: CellGap[] = [...ma.keys()].map((id) => {
    const a = ma.get(id)!, b = mb.get(id);
    // "every question": the gap holds in the same direction on each question separately
    const perQ = qs.map((q) => { const ca = cellMeans(A.byQuestion[q] ?? []).get(id)?.rating ?? NaN, cb = cellMeans(B.byQuestion[q] ?? []).get(id)?.rating ?? NaN; return cb - ca; });
    const gap = (b?.rating ?? NaN) - a.rating;
    // README 8, the optimizer brief and the config all define capability-bound as trailing by >= gapRating on EVERY question
    const every = perQ.every((g) => Number.isFinite(g) && Math.sign(g) === Math.sign(gap) && Math.abs(g) >= capabilityGap);
    return { id, name: a.name, criterion: a.criterion, a: r2(a.rating), b: r2(b?.rating ?? NaN), gap: r2(gap), everyQuestion: every, capabilityBound: every && Math.abs(gap) >= capabilityGap };
  }).sort((x, y) => Math.abs(y.gap) - Math.abs(x.gap));
  const crit = (cards: RubricCard[]) => { const m = new Map<string, number[]>(); for (const c of cards) for (const cr of c.criteria) (m.get(cr.name) ?? m.set(cr.name, []).get(cr.name)!).push(cr.points); return m; };
  const ca = crit(allA), cb = crit(allB);
  return {
    a: A.lineage, b: B.lineage, champions: { a: A.champion, b: B.champion },
    total: { a: r2(mean(allA.map((c) => c.score))), b: r2(mean(allB.map((c) => c.score))), gap: r2(mean(allB.map((c) => c.score)) - mean(allA.map((c) => c.score))) },
    byQuestion: qs.map((q) => { const a = mean((A.byQuestion[q] ?? []).map((c) => c.score)), b = mean((B.byQuestion[q] ?? []).map((c) => c.score)); return { q, a: r2(a), b: r2(b), gap: r2(b - a) }; }),
    byCriterion: [...ca.keys()].map((name) => { const a = mean(ca.get(name)!), b = mean(cb.get(name) ?? []); return { name, a: r2(a), b: r2(b), gap: r2(b - a) }; }),
    cells,
    capabilityBound: cells.filter((c) => c.capabilityBound).map((c) => c.id),
  };
}

export function capabilityMarkdown(r: CapabilityReport): string {
  const out = [`# Capability report: ${r.a} (${r.champions.a}) vs ${r.b} (${r.champions.b})`, "",
    `Total: ${r.a} ${r.total.a.toFixed(2)} · ${r.b} ${r.total.b.toFixed(2)} · gap ${sign(r.total.gap)}`, "",
    "| question | " + r.a + " | " + r.b + " | gap |", "|---|---|---|---|",
    ...r.byQuestion.map((q) => `| q${q.q} | ${q.a.toFixed(2)} | ${q.b.toFixed(2)} | ${sign(q.gap)} |`), "",
    "| criterion | " + r.a + " | " + r.b + " | gap |", "|---|---|---|---|",
    ...r.byCriterion.map((c) => `| ${c.name} | ${c.a.toFixed(2)} | ${c.b.toFixed(2)} | ${sign(c.gap)} |`), "",
    "| cell | " + r.a + " | " + r.b + " | gap | every question | capability-bound |", "|---|---|---|---|---|---|",
    ...r.cells.map((c) => `| ${c.id} ${c.name} | ${c.a.toFixed(2)} | ${c.b.toFixed(2)} | ${sign(c.gap)} | ${c.everyQuestion ? "yes" : "no"} | ${c.capabilityBound ? "yes" : ""} |`), "",
    r.capabilityBound.length ? `Capability-bound cells (treat as cause_type model in the trailing lineage): ${r.capabilityBound.join(", ")}` : "No cell meets the capability-bound rule.",
  ];
  return out.join("\n");
}

/** The numbers-only block the trailing lineage's Optimizer receives. */
export function capabilityReferenceForOptimizer(r: CapabilityReport, thisLineage: string): string {
  const other = thisLineage === r.a ? r.b : r.a;
  const mine = (c: CellGap) => (thisLineage === r.a ? c.a : c.b), theirs = (c: CellGap) => (thisLineage === r.a ? c.b : c.a);
  const lines = r.cells.map((c) => `${c.id} ${c.name}: this worker ${mine(c).toFixed(2)}, ${other} ${theirs(c).toFixed(2)}${c.capabilityBound && theirs(c) > mine(c) ? "  ← capability-bound" : ""}`);
  return [`Other lineage on the same Set A, same evaluator version: ${other} (${thisLineage === r.a ? r.champions.b : r.champions.a}), total ${(thisLineage === r.a ? r.total.b : r.total.a).toFixed(2)} vs this worker ${(thisLineage === r.a ? r.total.a : r.total.b).toFixed(2)}.`, "Mean rating per cell (0-10):", ...lines].join("\n");
}

function sign(x: number): string { return (x >= 0 ? "+" : "") + x.toFixed(2); }
