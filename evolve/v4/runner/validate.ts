// Schema validation of agent outputs against the shipped JSON Schemas (draft 2020-12), before the hand-written
// checks in scoring.ts / challenger.ts / evo4.ts ingest. A wrong-shaped output is a validation problem routed to the
// one repair attempt, never an exception that dead-ends a lineage. Deno only (npm:ajv).

import Ajv2020 from "npm:ajv@8.17.1/dist/2020.js";

type Validator = ((d: unknown) => boolean) & { errors?: { instancePath: string; message?: string }[] | null };
const A = (Ajv2020 as unknown as { default?: unknown }).default ?? Ajv2020;
const ajv = new (A as new (o: unknown) => { compile(s: unknown): Validator })({ strict: false, allErrors: true });
const cache = new Map<string, Validator>();

/** Problems (at most `max`) from validating `data` against the schema file at `schemaPath`; [] when valid. */
export async function schemaProblems(schemaPath: string, data: unknown, max = 5): Promise<string[]> {
  let v = cache.get(schemaPath);
  if (!v) { v = ajv.compile(JSON.parse(await Deno.readTextFile(schemaPath))); cache.set(schemaPath, v); }
  if (v(data)) return [];
  return (v.errors ?? []).slice(0, max).map((e) => `schema: ${e.instancePath || "(root)"} ${e.message ?? "invalid"}`);
}
