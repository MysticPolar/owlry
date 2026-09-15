#!/usr/bin/env node
/* ============================================================
   Keep /council/ out of the production app's service-worker fallback.

   The classic app (renovation/homescreen) is a PWA: its worker answers
   every in-scope navigation with the precached index.html, and its scope
   is the whole origin. The Council preview is published under /council/ on
   that same origin, so any browser that has opened the classic app gets
   the classic page there instead. The fix is one workbox option —
   navigateFallbackDenylist — and the preview workflow applies it to the
   production checkout it builds, so the published worker carries it
   without the production branch having to change first (though it should:
   see docs/council-preview.md).

   Usage: node scripts/patch-prod-sw.mjs <path to production vite.config.ts>
   Idempotent; exits 1 if the config has no workbox block to patch.
   ============================================================ */
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: patch-prod-sw.mjs <vite.config.ts>');
  process.exit(2);
}
const src = readFileSync(file, 'utf8');
if (src.includes('navigateFallbackDenylist')) {
  console.log(`${file}: navigateFallbackDenylist already present, nothing to do`);
  process.exit(0);
}
const m = /^([ \t]*)workbox:\s*\{[ \t]*$/m.exec(src);
if (!m) {
  console.error(`${file}: no "workbox: {" block found — cannot keep /council/ out of the fallback`);
  process.exit(1);
}
const indent = m[1] + '  ';
const insert =
  `${m[0]}\n` +
  `${indent}// Added by the Council preview workflow (scripts/patch-prod-sw.mjs): the\n` +
  `${indent}// redesign is published under /council/ and must not get this app's page.\n` +
  `${indent}navigateFallbackDenylist: [/^\\/council(\\/|$)/],`;
writeFileSync(file, src.replace(m[0], insert));
console.log(`${file}: added navigateFallbackDenylist for /council/`);
