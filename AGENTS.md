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
- Languages → `src/i18n/` (UI dictionaries `en`/`zh`, one shape; `useT()` in
  React, `UI[getActiveLang()]` elsewhere) and `src/content/zh/` (Chinese
  layer per figure/book/council/area, merged by the accessors). Reader texts
  in Chinese are `src/content/texts/zh/`. New UI copy goes in both
  dictionaries; new content gets a `zh/` entry or it shows in English.
- Simulation → `src/engine/council.ts`. Every figure message stores a `slot`
  so a replaced seat regenerates deterministically.
- State → `src/store/useStore.ts` (Zustand + localStorage, key
  `owlry-council-v1`). Bump `version` when the persisted shape changes. A
  new durable field must also be named in `src/lib/sync/types.ts` +
  `merge.ts`, or it is dropped on sign-in.
- Backend seams → `src/lib/` (`supabase.ts` is null without env keys; auth,
  sync, social, the live council all no-op on null). Server side lives in
  `supabase/migrations/20260915120000_owlry_council.sql` and
  `supabase/functions/council-*`; design notes in `docs/council-backend.md`.
- Screens → `src/screens/*.tsx` with a css file each; shared primitives in
  `src/styles/base.css` and `src/components/`.

## Rules of the house

- Only a figure's `quotes` may render as quotations; they must be verbatim and
  carry a source. Everything else is paraphrase and is labelled as such. The
  live council is held to the same rule in code (`_shared/council/quotes.ts`
  and `src/lib/councilClient.ts`), not just in the prompt.
- Reading guides are not the book's text and say so; public-domain passages
  name the translator.
- A quote is never translated in place. Chinese shows the original plus a
  `gloss` marked 译文. Screens read strings through `useT()`, never literals.
- Portraits must have a Wikimedia licence entry in `public/portraits/CREDITS.md`.
- The council room is the two paintings in `public/room/` (project artwork, not
  Wikimedia). They are pixel-aligned so the beams can cross-fade, and the seat
  positions in `CouncilScreen.css` are percentages of that frame — new art means
  re-measuring them. `CouncilStageSet.tsx` is the drawn room used when the
  painting cannot be fetched; keep it working.
- Mustard yellow is for the primary action, the active nav item, the council
  room's ticker and the wordmark's period. Nothing else.
