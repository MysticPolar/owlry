# AGENTS.md

Owlry — "Walk with Great Minds." A single Vite + React + TypeScript web app,
mobile-first, fully usable offline with simulated council conversations.

## Commands

- `npm run dev` — Vite on http://localhost:5173 (`npm run dev:host` for LAN)
- `npm run typecheck` — `tsc -b` (strict; the build runs it first)
- `npm run build` — typecheck + production build to `dist/`
- `npm run preview` — serve `dist/`

There is no test runner yet; the engine is pure and small enough to check by
driving the app. A Playwright journey script used during the build lives in
the session scratchpad and is not part of the repo.

## Where things are

- Content (figures, books, scripted councils) → `src/content/`. Adding a
  council: write a `CouncilScript` (see `content/types.ts`) and register it in
  `content/councils/index.ts`; give each seat at least one alternate.
- Simulation → `src/engine/council.ts`. Every figure message stores a `slot`
  so a replaced seat regenerates deterministically.
- State → `src/store/useStore.ts` (Zustand + localStorage, key
  `owlry-council-v1`). Bump `version` when the persisted shape changes.
- Screens → `src/screens/*.tsx` with a css file each; shared primitives in
  `src/styles/base.css` and `src/components/`.

## Rules of the house

- Only a figure's `quotes` may render as quotations; they must be verbatim and
  carry a source. Everything else is paraphrase and is labelled as such.
- Reading guides are not the book's text and say so; public-domain passages
  name the translator.
- Portraits must have a Wikimedia licence entry in `public/portraits/CREDITS.md`.
- Yellow is for the primary action, the active nav item and the wordmark's
  period. Nothing else.
