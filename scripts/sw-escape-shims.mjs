#!/usr/bin/env node
/* ============================================================
   Escape hatch for browsers that already hold the old production worker.

   Until a browser fetches the production service worker with the /council/
   denylist (it does so on its next visit to the root app, or on its own
   24-hour check), the worker it already has answers /council/ with the
   production index.html — whose scripts are RELATIVE (./assets/index-<hash>.js),
   so the browser then asks for /council/assets/index-<hash>.js. This script
   puts a file at exactly those paths: a tiny module that unregisters the
   worker and reloads, so the second load gets the Council. Stylesheet
   names get an empty file so nothing 404s.

   Self-retiring: a worker with the denylist never serves the production page
   under /council/, so these files are never requested again.

   Loop guard: the shim sets a sessionStorage flag before it reloads and the
   Council clears it when it boots (src/main.tsx). A flag that is still there
   when the shim runs means the last escape did not reach the Council, so it
   shows a plain message instead of reloading again.

   Usage: node scripts/sw-escape-shims.mjs <production dist> <published council dir> [extra asset names…]
   The extra names are for the scripts of the root page that is live right
   now, in case it was built from a different commit than <production dist>.
   ============================================================ */
import { readdirSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const [prodDist, councilOut, ...extra] = process.argv.slice(2);
if (!prodDist || !councilOut) {
  console.error('usage: sw-escape-shims.mjs <production dist> <published council dir> [extra asset names…]');
  process.exit(2);
}
const from = join(prodDist, 'assets');
const to = join(councilOut, 'assets');
if (!existsSync(from)) {
  console.error(`${from}: not found`);
  process.exit(1);
}
mkdirSync(to, { recursive: true });

const SHIM = `/* Council preview — service-worker escape hatch (scripts/sw-escape-shims.mjs).
   This path is only requested when the Owlry app's offline worker answered a
   navigation to /council/ with the Owlry page. Unregister it and load the
   Council for real. */
(async () => {
  const KEY = 'owlry-council-sw-escape';
  try {
    if (sessionStorage.getItem(KEY)) {
      // the Council clears this flag when it boots; still set means the last escape went nowhere — don't loop
      sessionStorage.removeItem(KEY);
      document.body.innerHTML =
        '<p style="font:16px/1.5 system-ui,sans-serif;padding:24px;max-width:36em;margin:0 auto">' +
        'The Council could not unregister the Owlry app\\u2019s offline worker in this browser. ' +
        'Open <b>app.owlry.ai/council/</b> in a private window, or clear this site\\u2019s data and try again.</p>';
      return;
    }
    sessionStorage.setItem(KEY, '1');
    const regs = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistrations() : [];
    await Promise.all(regs.map((r) => r.unregister()));
    location.reload();
  } catch (e) {
    console.error('[council] service-worker escape failed', e);
  }
})();
`;

let js = 0;
let css = 0;
const names = new Set([...readdirSync(from), ...extra.map((n) => basename(n)).filter((n) => /^[\w.-]+$/.test(n))]);
for (const name of names) {
  const target = join(to, name);
  if (existsSync(target)) {
    console.error(`${target}: the Council build has an asset with this exact name — refusing to overwrite`);
    process.exit(1);
  }
  if (name.endsWith('.js')) {
    writeFileSync(target, SHIM);
    js += 1;
  } else if (name.endsWith('.css')) {
    writeFileSync(target, '/* Council preview — empty stand-in for a production stylesheet (see scripts/sw-escape-shims.mjs) */\n');
    css += 1;
  }
}
if (!js) {
  console.error(`${from}: no production scripts found — nothing to shim`);
  process.exit(1);
}
console.log(`wrote ${js} script shims and ${css} stylesheet stand-ins into ${to}`);
