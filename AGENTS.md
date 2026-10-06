# AGENTS.md

## Cursor Cloud specific instructions

Owlry is a single Vite + React + TypeScript PWA. Local-only mode (no Supabase env) is fully usable: classic owl brain, IndexedDB persistence, catalog, reader.

### Two apps, one branch

`main` is the only live branch; every push deploys app.owlry.ai (`.github/workflows/deploy.yml`).

- **Owlry** (`index.html`, `src/` outside `src/council/`, `vite.config.ts`) → `app.owlry.ai/`.
- **The Council Room** (`src/council/`, `vite.council.config.ts`) → `app.owlry.ai/council/`, reachable only by URL and behind an access code. Its own guide is `src/council/AGENTS.md`.
- One `npm run build` builds both into `dist/` (Council in `dist/council/`). They share only `src/lib/supabase.ts` (one Supabase session on the origin) and `src/hooks/useKeyboardInset.ts`; `scripts/council-boundary-smoke.ts` enforces that.
- Never link, redirect or name `/council` anywhere in Owlry (the deploy fails if you do), and keep the `/council/` denylist in `vite.config.ts`'s workbox block — Owlry's service worker covers the whole origin.

### Commands

See `package.json` / README for the standard scripts:

- `npm run dev` — Vite on http://localhost:5173 (use `npm run dev:host` if you need LAN access)
- `npm run dev:council` — the Council Room on http://localhost:5174
- `npm run lint:css` — Stylelint on `src/styles/*.css` (there is no ESLint script)
- `npm run typecheck` / `npm test` / `npm run build` — as documented in README

### Non-obvious gotchas

- **Guest path:** Onboarding ends at an invite gate. For local demos without Supabase invites, use **PEEK IN AS GUEST**.
- **Live owl is optional:** Without `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, the app stays on the mockup owl. Live Scout/Peek needs hosted Supabase + edge functions + `GEMINI_API_KEY` (server secret). Do not put Gemini keys in Vite env.
- **Open-world books need a file:** Catalog titles recommended by the owl often have no bundled EPUB; **OPEN** prompts an upload (EPUB/PDF/TXT). Built-in placeholder prose is available for some titles via the peek/letter path; page-turn XP is strongest once a real ebook is open in the reader.
- **Covers work without Google Books:** Open Library is the keyless fallback; `VITE_GOOGLE_BOOKS_API_KEY` only upgrades metadata.
- **Smoke tests are Node-only:** `npm test` runs `tsx` scripts — no browser, no backend required.
