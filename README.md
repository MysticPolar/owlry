# owlry.

A gamified reading app — small, warm, tactile. You earn **XP** and **ink** by
turning pages, keep a streak, save books to your library, and ask **the owl**
for a hand-written *reading letter*. This is the production web port of the
interactive mockup, built to wrap into native apps (App Store / Google Play)
via Capacitor later.

Built with **React + TypeScript + Vite**, a **Zustand** store persisted to
**IndexedDB**, and an installable **PWA** (manifest + service worker).

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
npm test           # runtime smoke tests (owl brain + game loop)
```

Mobile-first at ~380px. On desktop it renders inside a "phone on a desk" frame;
on phones / installed PWA / a native shell it goes full-bleed and respects safe
areas.

## Architecture

The app is layered so the simulated, fully client-side v1 can be swapped for a
backend or a live model **without touching the UI**. Three seams matter:

| Seam | Where | Swap to |
| --- | --- | --- |
| **Persistence** | `src/store/persistence.ts` | Replace the single `repository` binding (`IndexedDbRepository`) with an `ApiRepository`. The store shape is unchanged. |
| **The owl** | `src/lib/owlBrain.ts` + `src/content/{owl,guides}.ts` | `respond()` is pure intent-matching over standalone content modules. Point it at a live model; messages are structured nodes, not HTML, so the chat keeps rendering as-is. |
| **Book text** | `src/content/reader-text.ts` | Drop a `BookId`-keyed entry into `BOOK_TEXT` to give a title real public-domain pages (Standard Ebooks / Project Gutenberg). |

```
src/
  content/          # standalone, swappable content (the "what")
    books.ts        # the catalog (B + about-sheet meta), ported verbatim
    guides.ts       # the 7 owl reading letters — the v1 owl product
    owl.ts          # intents, chips, flavor lines, fiction pools
    reader-text.ts  # reader prose + the public-domain text seam
    profile.ts      # radar / calendar / quotes seeds
    picks.ts        # today's curated picks
    weather.ts      # weather modes
  lib/
    owlBrain.ts     # the simulated brain: respond(input, session) → reply
    format.ts       # tiny helpers (pct, spine lines, guide guard)
  store/            # state layer (the "how it changes")
    useStore.ts     # Zustand store: the whole game loop
    persistence.ts  # ProgressRepository interface + IndexedDB impl
    seed.ts         # initial loop state
    types.ts        # PersistedState + ephemeral/session types
  components/        # the UI (the "how it looks")
    screens/        # today · discover · library · profile
    overlays/       # reader · letter · sheet
    profile/        # radar chart
    chrome.tsx      # status bar · nav · toast · spark burst · backdrop
  styles/           # tokens.css + global.css (ported near-verbatim)
```

**State split.** `PersistedState` (XP, level, ink, coins, streak, saved /
reading / finished, reading progress) is the durable loop, debounce-saved to
IndexedDB through the repository. Everything else — the owl conversation, the
carousel, weather, open overlays — is ephemeral session/UI state that resets on
reload, matching the mockup.

## The owl post

The discover screen ships the mockup's owl **as-is**: no API calls, no keys.
You type a vibe ("can't sleep", "fresh start", "feeling stuck"), `INTENTS`
regex-match it to one of seven guides, and the owl types back (with a delay) and
posts a **reading letter** — a faithful paraphrase of that book's real argument,
chapter, insights, and a couple of genuine short quotes. `go deeper`, `more like
this`, `something lighter`, and `surprise me` continue the conversation. All of
it lives in `content/guides.ts` + `content/owl.ts` so a live model can replace
the brain later.

## Content & provenance (v1)

- **Covers are the brand.** Every cover is CSS-drawn (illustrated spine, color +
  label) — no cover images, so there's nothing to license.
- **Reader text** is original placeholder literary prose (legally safe — it is
  not a copyrighted excerpt), cycled through the reader exactly as the mockup
  does. `reader-text.ts` is the seam for real public-domain texts; genuinely
  public-domain catalog titles (e.g. *Meditations*) are the first candidates.
- **Owl letters** are original paraphrases written for the mockup; quotes are
  kept short and only where confidently genuine.

**Out of scope for v1** (and already labelled in the UI where relevant):
accounts/sync, payments, social reviews ("coming soon"), and live AI letters.

## PWA & Capacitor readiness

- Manifest + service worker via `vite-plugin-pwa` (Workbox). App shell and
  modern web fonts are precached; Google Fonts are runtime-cached so type
  survives offline. Icons in `public/` (`owl.svg`, `pwa-192`, `pwa-512`,
  `apple-touch-icon`).
- No web-only APIs without a fallback (e.g. clipboard copy degrades to a toast),
  client-side only navigation, and a layout that already fills a device
  viewport — ready to wrap with Capacitor.

## Tests

`npm test` runs two fast runtime smoke suites with `tsx` (no browser): the owl
brain's intent routing and follow-ups, and the store's XP / level-up / ink-cap /
save / reading / finish math.
