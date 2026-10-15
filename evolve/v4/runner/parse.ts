// Tolerant extraction of the one JSON object an agent was asked to write. Pure; no Deno or Node APIs.
//
// Order: the whole text; the contents of a ```json fence; then every balanced {...} candidate, scanning with string and
// escape awareness, first one that parses to an object wins. A greedy /\{[\s\S]*\}/ would swallow prose braces
// ("{anonymous}", "{see brief}") around the object and fail.

export function parseJsonLoose(s: string): Record<string, unknown> | null {
  const asObject = (t: string): Record<string, unknown> | null => {
    try { const v = JSON.parse(t); return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null; } catch { return null; }
  };
  const whole = asObject(s.trim());
  if (whole) return whole;
  for (const m of s.matchAll(/```(?:json)?\s*\n([\s\S]*?)\n?```/g)) { const v = asObject(m[1].trim()); if (v) return v; }
  for (let start = s.indexOf("{"); start >= 0; start = s.indexOf("{", start + 1)) {
    const end = balancedEnd(s, start);
    if (end < 0) continue;
    const v = asObject(s.slice(start, end + 1));
    if (v) return v;
  }
  return null;
}

/** Index of the brace that closes the one at `start`, or -1; braces inside JSON strings do not count. */
function balancedEnd(s: string, start: number): number {
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return i; }
  }
  return -1;
}
