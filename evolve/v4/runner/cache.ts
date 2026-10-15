// Content-addressed cache keys. A result is reusable exactly when every input
// that could change it is unchanged; everything else is a new baseline.
// Uses Web Crypto (available in Deno and Node 19+). No file I/O here.

export function canonical(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}
function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) o[k] = sortKeys((v as Record<string, unknown>)[k]);
    return o;
  }
  return v;
}

export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface GenKeyInput {
  lineage: string;
  lane: string;
  promptHash: string;        // sha256 of the full subject prompt file (system + user template)
  model: string;
  settings: Record<string, unknown>;  // temperature, thinkingLevel, maxOutputTokens, effort, agentType …
  questionId: string;
  questionText: string;      // included so an edited question never reuses an old transcript
  envelopeVersion: string;   // the envelope note's version
  sample: number;
}
export interface RubricKeyInput {
  transcriptHash: string;    // sha256 of the canonical debate JSON
  rubricVersion: string;     // "rubric.v3"
  model: string;
  effort: string;
  questionType: string;
  canBrowse: boolean;
}
export interface BlindKeyInput {
  aHash: string;             // transcript in slot A
  bHash: string;             // transcript in slot B
  judgeVersion: string;      // "blind.v1"
  model: string;
  effort: string;
}

export const genKey = (i: GenKeyInput) => sha256("gen|" + canonical(i));
export const rubricKey = (i: RubricKeyInput) => sha256("rubric|" + canonical(i));
/** Order matters: A then B is a different judge call from B then A. The runner stores both when it swaps. */
export const blindKey = (i: BlindKeyInput) => sha256("blind|" + canonical(i));
export const promptHash = (fileText: string) => sha256("prompt|" + fileText);
export const transcriptHash = (debate: unknown) => sha256("debate|" + canonical(debate));

/** Deterministic A/B slot from the pair identity, so a resumed run makes the same choice. */
export async function championSlot(seed: string, championKey: string, challengerKey: string): Promise<"A" | "B"> {
  const h = await sha256(`slot|${seed}|${championKey}|${challengerKey}`);
  return parseInt(h.slice(0, 2), 16) % 2 === 0 ? "A" : "B";
}
