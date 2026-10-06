# AGENTS.md — the Council Room (`src/council/`)

"Walk with Great Minds." A second app in this repo: bring a real question to a
council of three thinkers. Vite + React + TypeScript, mobile-first, fully
usable offline with scripted councils. Served at **app.owlry.ai/council/**,
reachable only by URL and behind one access code. Nothing in Owlry links here.

Paths below are relative to `src/council/` unless they start with `src/`,
`supabase/`, `docs/` or `scripts/` (repo root).

## Commands (from the repo root)

- `npm run dev:council` — Vite on http://localhost:5174 (the gate is open in dev)
- `npm run build` — typecheck + both apps; the Council lands in `dist/council/`
- `npm run build:council` — only the Council build (after a root build)
- `npm run preview` — serves `dist/`: Owlry at `/`, the Council at `/council/`
- `npm test` includes `scripts/council-boundary-smoke.ts` (see "The boundary")

The edge functions typecheck with
`deno check --node-modules-dir=none supabase/functions/<fn>/index.ts`
(Deno 2; the flag keeps it away from the app's `node_modules`).

## How it is built and served

- `vite.council.config.ts` (repo root) builds this folder as its own page:
  root `src/council`, `index.html` here, `public/` here (portraits, the room
  paintings, icons), no PWA, its own document — its design tokens share names
  with Owlry's and must never load into the same page.
- Owlry's service worker covers the whole origin; `vite.config.ts` keeps
  `/council/` out of its navigation fallback and precache. Do not remove that.
- The hash router (`app/router.ts`) never reads `location.pathname`, so every
  deep link is `/council/#/…` and Pages needs no 404 fallback.
- Asset URLs go through `import.meta.env.BASE_URL` (`components/CouncilRoom.tsx`,
  `content/portraits.ts`), never a leading `/`.

## The boundary

The Council imports nothing from Owlry except the shared modules
`src/lib/supabase.ts` (one Supabase client, one session on the origin) and
`src/hooks/useKeyboardInset.ts`; Owlry never imports the Council. The smoke
test enforces both directions, so the Council can be removed by deleting this
folder, `vite.council.config.ts` and its two `package.json` scripts.

## The gate

`gate/` holds the access-code door (`access.ts` header explains it); `main.tsx`
shows it until the code is entered or a `?key=` link is opened, and only then
boots the backend. The build needs the repository variable
`VITE_COUNCIL_ACCESS_HASH` (SHA-256 of the code); without it a production
build keeps the door shut. To remove the gate: delete `gate/`, restore the
plain boot in `main.tsx`, drop the variable from `deploy.yml` and
`.env.example`. `sessionMigrate.ts` (first import of `main.tsx`) moves an old
`owlry-council-auth` sign-in onto the shared session once.

## Where things are

- Content (figures, books, scripted councils) → `content/`. Adding a
  council: write a `CouncilScript` (see `content/types.ts`) and register it in
  `content/councils/index.ts`; give each seat at least one alternate.
- Languages → `i18n/` (UI dictionaries `en`/`zh`, one shape; `useT()` in
  React, `UI[getActiveLang()]` elsewhere) and `content/zh/` (Chinese
  layer per figure/book/council/area, merged by the accessors). Reader texts
  in Chinese are `content/texts/zh/`. New UI copy goes in both
  dictionaries; new content gets a `zh/` entry or it shows in English. (The
  gate keeps its own two-language copy in `gate/` so it leaves in one piece.)
- Simulation → `engine/council.ts`. Every figure message stores a `slot`
  so a replaced seat regenerates deterministically.
- State → `store/useStore.ts` (Zustand + localStorage, key
  `owlry-council-v1`). Bump `version` when the persisted shape changes. A
  new durable field must also be named in `lib/sync/types.ts` +
  `merge.ts`, or it is dropped on sign-in.
- Backend seams → `lib/` (the shared `src/lib/supabase.ts` is null without
  env keys; auth, sync, social, the live council all no-op on null). Server
  side lives in `supabase/migrations/2026*_owlry_council*.sql` and
  `supabase/functions/council-*`; design notes in `docs/council-backend.md`.
  `council-chat` also recalls thinkers and books the catalogue lacks from the
  model (modes `cast` / `figure` / `book`, prompts in
  `supabase/functions/_shared/council/prompts.ts`, cached in
  `owlry_council_minds`); a recalled quote is `attributed`, never `verbatim`.
  On the client those cards sit in the registry `content/minds.ts` behind
  `figure()` / `book()`, the store holds them in its `minds` slice
  (device-local, not synced), and a cast session carries its `cast` so the
  engine can synthesise its script — `docs/council-orchestration.md` is the map.
- Screens → `screens/*.tsx` with a css file each; shared primitives in
  `styles/base.css` and `components/`.
- Motion → `App.tsx` renders screens as layers (the old one stays under
  the new one for `--dur-screen`; direction comes from the `DEPTH` table).
  `hooks/usePresence.ts` keeps a sheet, toast or popover mounted for its
  exit animation; `useBump.ts` pops an icon that was just toggled;
  `useAutoGrow.ts` grows the ask boxes. Shared keyframes (`fade-up`, `pop`,
  `pop-in/out`, `sheet-down`, `toast-out`) and the `.cascade` list helper
  live in `styles/base.css`.

## Rules of the house

- Only a figure's `quotes` may render as quotations; they must be verbatim and
  carry a source. Everything else is paraphrase and is labelled as such. The
  live council is held to the same rule in code
  (`supabase/functions/_shared/council/quotes.ts` and `lib/councilClient.ts`),
  not just in the prompt.
- Reading guides are not the book's text and say so; public-domain passages
  name the translator.
- A quote is never translated in place. Chinese shows the original plus a
  `gloss` marked 译文. Screens read strings through `useT()`, never literals.
- Portraits must have a Wikimedia licence entry in `public/portraits/CREDITS.md`.
- The council room is the two paintings in `public/room/` (project artwork, not
  Wikimedia). They are pixel-aligned so the beams can cross-fade, and the seat
  positions in `screens/CouncilScreen.css` are percentages of that frame — new
  art means re-measuring them. `components/CouncilStageSet.tsx` is the drawn
  room used when the painting cannot be fetched; keep it working.
- Mustard yellow is for the primary action, the active nav item, the council
  room's ticker and the wordmark's period. Nothing else.
- Motion: things arrive, they do not appear. Anything that mounts on a tap
  gets an entrance (`fade-up`, `msg-in`, `sheet-up`) and anything that can
  close gets an exit through `usePresence`. Animate `transform` and
  `opacity` only, keep it under 450ms, use the tokens (`--dur`, `--dur-fast`,
  `--dur-screen`, `--ease-out`, `--ease-spring`), and never give two states
  of one element the same keyframe name (the browser will not restart it).
  The global reduced-motion rule in `styles/base.css` covers CSS; JS timing
  goes through `useReduceMotion()`.
