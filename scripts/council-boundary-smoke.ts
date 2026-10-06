/* network-free smoke: the Council Room (src/council) stays a separate app.

   Owlry must never import the Council (nothing in its UI points at /council/),
   and the Council may only reach outside its folder for the shared modules
   below — so deleting src/council + vite.council.config.ts removes it whole. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');
const COUNCIL = join(SRC, 'council');
/** what the Council may import from outside src/council (extensionless, repo-relative) */
const SHARED = new Set(['src/lib/supabase', 'src/hooks/useKeyboardInset']);

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(name)) out.push(p);
  }
  return out;
}

/** relative specifiers in import/export-from/import()/side-effect imports and CSS @import / url() */
function specifiers(src: string): string[] {
  const out: string[] = [];
  const re = /(?:from\s+|import\s*\(\s*|import\s+|@import\s+(?:url\()?|url\()\s*['"]?(\.{1,2}\/[^'")\s]+)/g;
  for (const m of src.matchAll(re)) out.push(m[1]);
  return out;
}

const bad: string[] = [];
let checked = 0;
for (const file of walk(SRC)) {
  const inCouncil = file.startsWith(COUNCIL + '/');
  for (const spec of specifiers(readFileSync(file, 'utf8'))) {
    checked++;
    const target = resolve(dirname(file), spec);
    const targetInCouncil = target === COUNCIL || target.startsWith(COUNCIL + '/');
    const where = relative(ROOT, file);
    if (!inCouncil && targetInCouncil) bad.push(`${where} imports the Council (${spec})`);
    if (inCouncil && !targetInCouncil) {
      const rel = relative(ROOT, target).replace(/\.(tsx?|css)$/, '');
      if (!SHARED.has(rel)) bad.push(`${where} reaches outside src/council (${spec}); allowed: ${[...SHARED].join(', ')}`);
    }
  }
}

assert(checked > 100, `expected to scan the import graph, saw only ${checked} specifiers`);
assert(bad.length === 0, `council boundary broken:\n  ${bad.join('\n  ')}`);

console.log(`council-boundary-smoke: ok (${checked} relative imports)`);
