// ============================================================
// owlry — the Gemini client shared by owl-chat + owl-peek.
//
// One place for the four calls' shared plumbing: the client, the two
// model tiers, and — the part worth centralising — deciding whether a
// reply came back whole. Gemini has no single "refusal" flag the way
// the Anthropic SDK did; a reply can die at the prompt
// (promptFeedback.blockReason) or mid-generation (finishReason), so
// both are checked here and collapsed into one GeminiBlocked error
// that callers can catch.
//
// RECITATION is the finishReason to watch: it fires when output matches
// training data too closely, which is a live hazard for Peek — a good
// reading letter quotes a real book closely by design. It surfaces as
// GeminiBlocked like any other stop, so the client falls back for Scout
// and Peek 502s rather than shipping a half-letter.
// ============================================================
import { GoogleGenAI } from 'npm:@google/genai@2.14.0';

/** digest + memory merge — extraction jobs, cheapest tier */
export const MODEL_FAST = 'gemini-3.1-flash-lite';
/** Scout + Peek — the two calls that carry the owl's voice */
export const MODEL_VOICE = 'gemini-3.5-flash';

/** wire values are UPPERCASE — the SDK's ThinkingLevel enum is MINIMAL/LOW/MEDIUM/HIGH */
export type ThinkingLevel = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';

/** the reply never arrived whole — blocked at the prompt, or stopped short of STOP */
export class GeminiBlocked extends Error {
  constructor(readonly reason: string) {
    super(`gemini blocked: ${reason}`);
    this.name = 'GeminiBlocked';
  }
}

export function geminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

interface JsonCallOpts {
  model: string;
  system: string;
  user: string;
  schema: unknown;
  temperature: number;
  maxOutputTokens: number;
  thinkingLevel: ThinkingLevel;
}

/**
 * One schema-forced JSON call. Returns the parsed object, or throws
 * GeminiBlocked (reply didn't complete) / SyntaxError (it did, but wasn't
 * the JSON it promised).
 *
 * Our schemas go via `responseJsonSchema`, NOT `responseSchema` — the two
 * are not interchangeable. `responseSchema` takes Google's own Schema type,
 * which has no `additionalProperties` and spells optionality `nullable:true`;
 * `responseJsonSchema` takes standard JSON Schema and documents support for
 * `additionalProperties`, `anyOf` and `minItems`/`maxItems` — which is what
 * _shared/schemas.ts is written in. Setting both is an error; mime type stays
 * required either way.
 */
export async function callGeminiJson(ai: GoogleGenAI, opts: JsonCallOpts): Promise<unknown> {
  const res = await ai.models.generateContent({
    model: opts.model,
    contents: opts.user,
    config: {
      systemInstruction: opts.system,
      temperature: opts.temperature,
      maxOutputTokens: opts.maxOutputTokens,
      thinkingConfig: { thinkingLevel: opts.thinkingLevel },
      responseMimeType: 'application/json',
      responseJsonSchema: opts.schema,
    },
    // deno-lint-ignore no-explicit-any
  } as any);

  // deno-lint-ignore no-explicit-any
  const r = res as any;

  const blockReason = r.promptFeedback?.blockReason;
  if (blockReason) throw new GeminiBlocked(String(blockReason));

  const finish = r.candidates?.[0]?.finishReason;
  if (finish && finish !== 'STOP') throw new GeminiBlocked(String(finish));

  const text = typeof r.text === 'string' ? r.text.trim() : '';
  if (!text) throw new GeminiBlocked('empty');

  return JSON.parse(text);
}

/**
 * Voice calls prefer the richer model, but production should not go dark just
 * because that model is temporarily unavailable to a project or region. Retry
 * once on the stable Flash-Lite tier for retryable provider/model errors and
 * malformed JSON. Safety/finish blocks are deliberate outcomes and must not
 * be bypassed by asking a second model.
 */
export async function callGeminiJsonWithFallback(
  ai: GoogleGenAI,
  opts: JsonCallOpts,
  fallbackModel = MODEL_FAST,
): Promise<unknown> {
  try {
    return await callGeminiJson(ai, opts);
  } catch (err) {
    const status =
      err && typeof err === 'object' && typeof (err as { status?: unknown }).status === 'number'
        ? (err as { status: number }).status
        : null;
    const retryable =
      err instanceof SyntaxError
      || status === 404
      || status === 408
      || status === 429
      || (status !== null && status >= 500);
    if (err instanceof GeminiBlocked || opts.model === fallbackModel || !retryable) throw err;
    console.warn(`[gemini] ${opts.model} failed; retrying with ${fallbackModel}`, err);
    return callGeminiJson(ai, { ...opts, model: fallbackModel });
  }
}
