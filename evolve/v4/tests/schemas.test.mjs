// Validates synthetic agent outputs against the v4.2 schemas with Ajv (draft 2020-12).
//   node tests/schemas.test.mjs   (needs ajv in node_modules or NODE_PATH)
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020");
const ajv = new Ajv2020({ strict: false, allErrors: true });
const load = (p) => JSON.parse(readFileSync(new URL("../" + p, import.meta.url), "utf8"));
const map = load("rubric-map.json");
const results = [];
const check = (name, schema, data, expectOk) => { const v = ajv.compile(schema); const ok = v(data); results.push({ name, ok: ok === expectOk, errors: ok ? [] : v.errors.slice(0, 2).map((e) => `${e.instancePath} ${e.message}`) }); };

// ---- rubric
const rubric = load("schemas/rubric.output.schema.json");
const cells = (rating, patch = {}) => map.criteria.flatMap((c) => c.cells.map((cell) => ({ id: cell.id, name: cell.name, rating, example: "T1 shows it", limitation: rating >= 9 ? "none" : "minor: T2 restates", limitation_severity: rating >= 9 ? "none" : "minor", excellent_anchor_met: rating >= 9, ...(patch[cell.id] ?? {}) })));
const base = { schema_version: "rubric-evaluator-4.2.0", rubric_version: "owlry-matrix-v2-bands", evaluation_status: "complete", strengths: ["a", "b", "c"], weaknesses: ["a", "b", "c"], findings: [], cap_reasons: [], rubric_fit_notes: [], symptoms: [{ cell_id: "C1.1", turns: [2], observed: "x", evidence: "" }, { cell_id: "C2.3", turns: [4], observed: "y", evidence: "" }, { cell_id: "C7.2", turns: [8], observed: "z", evidence: "" }], mechanical: [{ pattern: "hedge_saturation", turns: [2, 3] }], question_type_note: "" };
check("rubric: all cells 6.5 valid", rubric, { ...base, cells: cells(6.5) }, true);
check("rubric: 9.4 with minor weakness and anchor valid", rubric, { ...base, cells: cells(6.5, { "C1.3": { rating: 9.4, limitation_severity: "minor", limitation: "minor: T5 slightly late", excellent_anchor_met: true } }) }, true);
check("rubric: 9.6 with minor weakness rejected", rubric, { ...base, cells: cells(6.5, { "C1.3": { rating: 9.6, limitation_severity: "minor", limitation: "minor: T5", excellent_anchor_met: true } }) }, false);
check("rubric: material at 7.5 rejected", rubric, { ...base, cells: cells(6.5, { "C1.1": { rating: 7.5, limitation_severity: "material", limitation: "material: T4" } }) }, false);
check("rubric: 9.2 without anchor rejected", rubric, { ...base, cells: cells(6.5, { "C1.2": { rating: 9.2, limitation_severity: "none", limitation: "none", excellent_anchor_met: false } }) }, false);
check("rubric: 34 cells rejected", rubric, { ...base, cells: cells(6.5).slice(0, 34) }, false);
check("rubric: wrong order rejected", rubric, { ...base, cells: (() => { const c = cells(6.5); [c[0], c[1]] = [c[1], c[0]]; return c; })() }, false);
check("rubric: totals field rejected", rubric, { ...base, cells: cells(6.5), score: 65 }, false);
check("rubric: bad mechanical pattern rejected", rubric, { ...base, cells: cells(6.5), mechanical: [{ pattern: "something_else", turns: [1] }] }, false);
check("rubric: cap on finding valid", rubric, { ...base, cells: cells(6.5), findings: [{ type: "format", severity: "material", status: "observed", location: "T3", description: "quotation marks in pd=false turn", evidence_ids: [] }], cap_reasons: [{ reason: "pd_false_quotation_marks", finding_index: 0 }] }, true);

// ---- optimizer
const opt = load("schemas/optimizer.output.schema.json");
const hyp = { problem: "p", cause_type: "prompt", mechanism: "m", proposed_change: "c", expected_observations: ["o"], falsification_condition: "f", regression_risk: "r", targets: ["C4.4"], expected_delta: 3 };
check("optimizer: propose valid", opt, { schema_version: "optimizer-4.2.0", action: "propose", parent_prompt_id: "v0", kind: "DELETE", hypothesis: hyp, evidence: [{ question_id: "health-04", job_id: "gen.v0.q1.s1", location: "debate[2].text", observation: "x" }], candidate_system_prompt: "P", edits: [{ operation: "delete", before: "x", after: "", reason: "r" }], blocked: [], next_system_action: null, change_summary: "s" }, true);
check("optimizer: no_change valid", opt, { schema_version: "optimizer-4.2.0", action: "no_change", parent_prompt_id: "v0", kind: null, hypothesis: { ...hyp, targets: [] }, evidence: [], candidate_system_prompt: null, edits: [], blocked: [], next_system_action: null, change_summary: "s" }, true);
check("optimizer: no_change with candidate rejected", opt, { schema_version: "optimizer-4.2.0", action: "no_change", parent_prompt_id: "v0", kind: null, hypothesis: hyp, evidence: [], candidate_system_prompt: "P", edits: [], blocked: [], next_system_action: null, change_summary: "s" }, false);
check("optimizer: escalate without next action rejected", opt, { schema_version: "optimizer-4.2.0", action: "escalate", parent_prompt_id: "v0", kind: null, hypothesis: hyp, evidence: [], candidate_system_prompt: null, edits: [], blocked: [], next_system_action: null, change_summary: "s" }, false);
check("optimizer: propose without kind rejected", opt, { schema_version: "optimizer-4.2.0", action: "propose", parent_prompt_id: "v0", kind: null, hypothesis: hyp, evidence: [{ question_id: "q", job_id: "j", location: "l", observation: "o" }], candidate_system_prompt: "P", edits: [{ operation: "delete", before: "x", after: "", reason: "r" }], blocked: [], next_system_action: null, change_summary: "s" }, false);
check("optimizer: bad target id rejected", opt, { schema_version: "optimizer-4.2.0", action: "propose", parent_prompt_id: "v0", kind: "ADD", hypothesis: { ...hyp, targets: ["Drama"] }, evidence: [{ question_id: "q", job_id: "j", location: "l", observation: "o" }], candidate_system_prompt: "P", edits: [{ operation: "add", before: "x", after: "xy", reason: "r" }], blocked: [], next_system_action: null, change_summary: "s" }, false);

// ---- blind
const blind = load("schemas/blind.output.schema.json");
const cmp = [{ aspect: "reasoning", a_location: "A.debate[3].text", a_observation: "x", b_location: "B.debate[3].text", b_observation: "y", advantage: "A", why_it_matters: "z" }];
check("blind: A clear valid", blind, { schema_version: "blind-4.2.0", winner: "A", margin: "clear", reason: "r", comparisons: cmp, best_of_a: "a", best_of_b: "b", concerns: [] }, true);
check("blind: tie with margin none valid", blind, { schema_version: "blind-4.2.0", winner: "tie", margin: "none", reason: "r", comparisons: cmp, best_of_a: "a", best_of_b: "b", concerns: [] }, true);
check("blind: tie with clear margin rejected", blind, { schema_version: "blind-4.2.0", winner: "tie", margin: "clear", reason: "r", comparisons: cmp, best_of_a: "a", best_of_b: "b", concerns: [] }, false);
check("blind: score field rejected", blind, { schema_version: "blind-4.2.0", winner: "A", margin: "clear", reason: "r", comparisons: cmp, best_of_a: "a", best_of_b: "b", concerns: [], score: 70 }, false);
check("blind: old schema version rejected", blind, { schema_version: "blind-4.1.0", winner: "A", margin: "clear", reason: "r", comparisons: cmp, best_of_a: "a", best_of_b: "b", concerns: [] }, false);

// ---- worker
const worker = load("schemas/worker.output.schema.json");
const mind = (t) => ({ title: t, concern: "c", author: "A", book: "B", year: 1843 });
const turn = (t) => ({ speaker: t, text: "x", author: "A", book: "B", pd: true, basis: "Basis: A, B" });
check("worker: valid debate", worker, { situation: "s", minds: [mind("The X"), mind("The Y"), mind("The Z")], debate: Array.from({ length: 9 }, (_, i) => turn(["The X", "The Y", "The Z"][i % 3])), clearer: "c", dependsOn: "d" }, true);
check("worker: 8 turns rejected", worker, { situation: "s", minds: [mind("The X"), mind("The Y"), mind("The Z")], debate: Array.from({ length: 8 }, (_, i) => turn("The X")), clearer: "c", dependsOn: "d" }, false);

let fails = 0;
for (const r of results) { console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : "  " + r.errors.join(" | ")}`); if (!r.ok) fails++; }
console.log(`\n${results.length - fails} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
