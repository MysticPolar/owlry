// legacy.ts — adapter over what the schema-2 harness already had.
//
// The schema-2 CLI (evolve/runner/evo.ts) runs its command switch at import time, so it cannot be imported.
// These three functions reuse the same pieces it used, byte for byte where it matters:
//   callGemini          the shared Gemini client (supabase/functions/_shared/gemini.ts), the same forced JSON
//                       envelope schema, same-model retries on 429 (61 s) and 5xx (exponential), no fallback model
//   frameWorkerPrompt   the INSTRUCTIONS / SYSTEM PROMPT / USER MESSAGE / END framing of `evo worker-prompts`
//   loadQuestionText    the question bank, evolve/questions/bank.json
// Nothing else from evo.ts is needed.

import { callGeminiJson, geminiClient, GeminiBlocked, type ThinkingLevel } from "../../../supabase/functions/_shared/gemini.ts";

export { GeminiBlocked };

export interface GeminiSettings {
  temperature: number;
  thinkingLevel: string;
  maxOutputTokens: number;
  /** the lane's model id; evo4 passes config lanes.gemini.model */
  model?: string;
  /** same-model retries for 429 / 5xx (config lanes.gemini.retries429) */
  retries?: number;
  /** debate turn range for the forced schema (config turns) */
  turns?: { min: number; max: number };
}

const DEFAULT_MODEL = "gemini-3.1-flash-lite";

/** The schema-2 envelope schema (evo.ts `envelopeSchema`), parameterised by the turn range. */
export function envelopeSchema(turns: { min: number; max: number } = { min: 9, max: 12 }) {
  const str = { type: "string" };
  return {
    type: "object",
    additionalProperties: false,
    required: ["situation", "minds", "debate", "clearer", "dependsOn"],
    properties: {
      situation: str,
      minds: {
        type: "array", minItems: 3, maxItems: 3,
        items: { type: "object", additionalProperties: false, required: ["title", "concern", "author", "book", "year"], properties: { title: str, concern: str, author: str, book: str, year: { type: "integer" } } },
      },
      debate: {
        type: "array", minItems: turns.min, maxItems: turns.max,
        items: { type: "object", additionalProperties: false, required: ["speaker", "text", "author", "book", "pd", "basis"], properties: { speaker: str, text: str, author: str, book: str, pd: { type: "boolean" }, basis: str } },
      },
      clearer: str,
      dependsOn: str,
    },
  };
}

let client: ReturnType<typeof geminiClient> | null = null;
function ai() {
  if (client) return client;
  const key = (globalThis as unknown as { Deno: { env: { get(k: string): string | undefined } } }).Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY is not set; run with --env-file=.env.local");
  client = geminiClient(key);
  return client;
}

/** The existing Gemini call: forced JSON schema for the five output fields, same-model retries on 429 and 5xx.
 *  The free-tier gap between calls is handled by the caller (evo4 gemini-batch sleeps lanes.gemini.minGapMs).
 *  Throws GeminiBlocked when the reply never completed; the caller records that as a failed generation. */
export async function callGemini(system: string, user: string, settings: GeminiSettings): Promise<{ output: unknown; tokens?: { input: number; output: number } }> {
  const retries = settings.retries ?? 3;
  for (let attempt = 0; ; attempt++) {
    try {
      const output = await callGeminiJson(ai(), {
        model: settings.model ?? DEFAULT_MODEL,
        system,
        user,
        schema: envelopeSchema(settings.turns),
        temperature: settings.temperature,
        maxOutputTokens: settings.maxOutputTokens,
        thinkingLevel: settings.thinkingLevel as ThinkingLevel,
      });
      return { output };
    } catch (err) {
      if (err instanceof GeminiBlocked) throw err;
      const status = (err as { status?: number })?.status;
      const transient = status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
      if (!transient || attempt >= retries) throw err;
      const wait = status === 429 ? 61000 : 2000 * 2 ** (attempt + 1);
      console.error(`gemini ${status}, retry ${attempt + 1} in ${wait} ms (same model, no fallback)`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

/** The existing worker framing (schema-2 `frame`, roles/worker-envelope.md). The envelope note is already appended to `user`. */
export function frameWorkerPrompt(system: string, user: string): string {
  return [
    "=== INSTRUCTIONS FOR THIS TASK ===",
    "Everything between the markers below is the complete and only instruction set for this task.",
    "Do not read files, do not use any tools, do not apply conventions from this repository or from your own system prompt.",
    "Follow the SYSTEM PROMPT exactly as a production model would, answer the USER MESSAGE, and return only the JSON object it asks for: no prose before or after it, no code fence.",
    "",
    "=== SYSTEM PROMPT ===",
    system,
    "",
    "=== USER MESSAGE ===",
    user,
    "",
    "=== END ===",
  ].join("\n") + "\n";
}

let bank: { questions: { id: string; text: string }[] } | null = null;

/** The question bank lookup used by `evo new` in schema 2 (evolve/questions/bank.json, resolved from this file). */
export function loadQuestionText(id: string): string {
  if (!bank) {
    const D = (globalThis as unknown as { Deno: { readTextFileSync(p: string): string } }).Deno;
    bank = JSON.parse(D.readTextFileSync(decodeURIComponent(new URL("../../questions/bank.json", import.meta.url).pathname)));
  }
  const q = bank!.questions.find((x) => x.id === id);
  if (!q) throw new Error(`question ${id} is not in evolve/questions/bank.json`);
  return q.text;
}
