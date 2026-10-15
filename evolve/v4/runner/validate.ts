// Schema validation of agent outputs against the shipped JSON Schemas (draft 2020-12), before the hand-written
// checks in scoring.ts / challenger.ts / evo4.ts ingest. A wrong-shaped output is a validation problem routed to the
// one repair attempt, never an exception that dead-ends a lineage. Deno only (npm:ajv).
//
// Harmless variations are normalised first instead of costing a repair: unknown keys are dropped (the schemas say
// additionalProperties false; the runner reads none of them), "None"/"none." limitations with severity none become
// "none", a null question_type_note becomes "", and omitted optional arrays become []. Problems name the property and
// the allowed values, because the repair attempt is a fresh agent that sees only this text.

import Ajv2020 from "npm:ajv@8.17.1/dist/2020.js";

type AjvError = { instancePath: string; message?: string; keyword: string; params?: Record<string, unknown> };
type Validator = ((d: unknown) => boolean) & { errors?: AjvError[] | null };
const A = (Ajv2020 as unknown as { default?: unknown }).default ?? Ajv2020;
const make = (o: Record<string, unknown>) => new (A as new (o: unknown) => { compile(s: unknown): Validator })({ strict: false, allErrors: true, ...o });
const strict = make({});
const stripper = make({ removeAdditional: true });   // removes keys where the schema says additionalProperties: false
const cache = new Map<string, { check: Validator; strip: Validator }>();

/** Normalise known harmless variations in place (rubric and blind outputs), then drop unknown keys. */
export async function normalise(schemaPath: string, data: unknown): Promise<void> {
  if (!data || typeof data !== "object") return;
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.cells)) for (const c of o.cells as Record<string, unknown>[]) {
    if (c && typeof c === "object" && c.limitation_severity === "none" && typeof c.limitation === "string" && /^\s*none\.?\s*$/i.test(c.limitation)) c.limitation = "none";
  }
  if ("question_type_note" in o && o.question_type_note === null) o.question_type_note = "";
  for (const k of ["findings", "cap_reasons", "rubric_fit_notes", "mechanical", "concerns"]) if (k in o && o[k] == null) o[k] = [];
  if (Array.isArray(o.concerns)) for (const c of o.concerns as Record<string, unknown>[]) if (c && typeof c === "object" && c.evidence_ids == null) c.evidence_ids = [];
  if (Array.isArray(o.findings)) for (const f of o.findings as Record<string, unknown>[]) if (f && typeof f === "object" && f.evidence_ids == null) f.evidence_ids = [];
  (await validators(schemaPath)).strip(data);   // the stripping pass mutates; its verdict is ignored
}

/** Problems (at most `max`) from validating `data` against the schema file at `schemaPath`; [] when valid. */
export async function schemaProblems(schemaPath: string, data: unknown, max = 8): Promise<string[]> {
  const v = (await validators(schemaPath)).check;
  if (v(data)) return [];
  const errs = (v.errors ?? []).filter((e) => e.keyword !== "if");   // "must match then schema" echoes the real error
  return errs.slice(0, max).map(describe);
}

function describe(e: AjvError): string {
  const at = e.instancePath || "(root)", p = e.params ?? {};
  const extra = p.allowedValue !== undefined ? ` (allowed: ${JSON.stringify(p.allowedValue)})`
    : p.allowedValues !== undefined ? ` (allowed: ${(p.allowedValues as unknown[]).map((x) => JSON.stringify(x)).join(", ")})`
    : p.missingProperty !== undefined ? ` (missing: ${p.missingProperty})`
    : p.additionalProperty !== undefined ? ` (unexpected: ${p.additionalProperty})`
    : p.limit !== undefined ? ` (limit: ${p.limit})` : "";
  return `schema: ${at} ${e.message ?? "invalid"}${extra}`;
}

async function validators(schemaPath: string) {
  let v = cache.get(schemaPath);
  if (!v) {
    const schema = JSON.parse(await Deno.readTextFile(schemaPath));
    v = { check: strict.compile(schema), strip: stripper.compile(structuredClone(schema)) };
    cache.set(schemaPath, v);
  }
  return v;
}
