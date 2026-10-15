// Minimal test harness: runs under `npx tsx tests/run.ts` and `deno run -A tests/run.ts`.
export const results: { name: string; ok: boolean; err?: string }[] = [];
export async function test(name: string, fn: () => void | Promise<void>) {
  try { await fn(); results.push({ name, ok: true }); }
  catch (e) { results.push({ name, ok: false, err: (e as Error).message }); }
}
export function eq<T>(actual: T, expected: T, msg = "") {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg} expected ${b}, got ${a}`);
}
export function ok(cond: unknown, msg = "expected truthy") { if (!cond) throw new Error(msg); }
export function near(actual: number, expected: number, tol: number, msg = "") {
  if (Math.abs(actual - expected) > tol) throw new Error(`${msg} expected ${expected}±${tol}, got ${actual}`);
}
export function report(): number {
  let fails = 0;
  for (const r of results) { console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.ok ? "" : "\n      " + r.err}`); if (!r.ok) fails++; }
  console.log(`\n${results.length - fails} passed, ${fails} failed`);
  return fails;
}
