# The Council preview on GitHub Pages

The redesign is reviewed at **https://app.owlry.ai/council/** while the classic
app stays live at the root. One repository gets one Pages site, so the preview
workflow (`.github/workflows/council-preview.yml`) builds both and publishes
them together: the production branch at `/`, this branch under `/council/`.

## The service-worker clash, and how it is handled

The classic app is a PWA. Its service worker is registered at the root of the
origin, so its scope is *everything* on app.owlry.ai, and its workbox
navigation route answers **every** navigation with the classic app's precached
`index.html`. That is right for a single-page app and wrong for `/council/`:
any browser that has opened the classic app gets the classic page there
instead of the Council — and because that page's script paths are relative
(`./assets/index-<hash>.js`), it then fails to load under `/council/` and shows
nothing. A fresh browser has no worker and sees the Council. That is exactly
the "works in one browser, not in mine" symptom.

Two things fix it, both in the preview workflow:

1. **The published worker excludes `/council/`.** Before building the
   production app, `scripts/patch-prod-sw.mjs` adds one workbox option to its
   Vite config — `navigateFallbackDenylist: [/^\/council(\/|$)/]` — and the
   build step fails if the resulting `sw.js` does not carry it. A browser picks
   the new worker up on its next visit to the root app (the worker updates
   itself) or on its own periodic check; from then on `/council/` is a normal
   navigation.
2. **Browsers still holding the old worker repair themselves.** The old worker
   still serves the classic page under `/council/` once, and that page asks
   for `/council/assets/index-<hash>.js`. `scripts/sw-escape-shims.mjs` puts a
   file at exactly those paths: a small module that unregisters the worker and
   reloads, so the second load is the Council. The shims are only ever
   requested by a worker without the denylist, so they retire on their own.
   The script names of the root page that is live at build time are shimmed
   too, in case that page predates the build. Loop guard: the shim sets a
   flag before it reloads and the Council clears it when it boots
   (`src/main.tsx`); a flag still present when the shim runs means the last
   escape went nowhere, so it shows a plain message instead of reloading
   (open `/council/` in a private window, or clear the site's data).

Both were verified locally against the real production worker: an old worker
+ shims self-repairs (twice in a row, after the root re-registers it), and the
patched worker serves the Council directly while the classic app keeps
working at the root.

### What the production branch should do

The patch above only lands in the worker *this* workflow publishes. The
production branch's own `deploy.yml` publishes the unpatched worker and only
the root app, so **every production deploy re-breaks `/council/`** until the
preview workflow runs again. Two small changes on `renovation/homescreen`
make it permanent:

- add the same `navigateFallbackDenylist` line to its `vite.config.ts`
  (`scripts/patch-prod-sw.mjs` shows the exact edit), and
- either have `deploy.yml` also build and publish `/council/` from this
  branch, or re-run "Deploy Council preview" after each production deploy.

Neither is done here: this branch does not push to the production branch.

## Manual escape for one browser

If the page is still blank in a browser after the workflow has run: open
`app.owlry.ai/council/` in a private window, or clear the site's data for
app.owlry.ai (Chrome: DevTools → Application → Service workers → Unregister;
Safari: Settings → Safari → Advanced → Website Data), then reload.
