# AGENTS.md

## Cursor Cloud specific instructions

Owlry is a single Vite + React + TypeScript PWA. Local-only mode (no Supabase env) is fully usable: classic owl brain, IndexedDB persistence, catalog, reader.

### Commands

See `package.json` / README for the standard scripts:

- `npm run dev` — Vite on http://localhost:5173 (use `npm run dev:host` if you need LAN access)
- `npm run lint:css` — Stylelint on `src/styles/*.css` (there is no ESLint script)
- `npm run typecheck` / `npm test` / `npm run build` — as documented in README

### Non-obvious gotchas

- **Guest path:** Onboarding ends at an invite gate. For local demos without Supabase invites, use **PEEK IN AS GUEST**.
- **Live owl is optional:** Without `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, the app stays on the mockup owl. Live Scout/Peek needs hosted Supabase + edge functions + `GEMINI_API_KEY` (server secret). Do not put Gemini keys in Vite env.
- **Open-world books need a file:** Catalog titles recommended by the owl often have no bundled EPUB; **OPEN** prompts an upload (EPUB/PDF/TXT). Built-in placeholder prose is available for some titles via the peek/letter path; page-turn XP is strongest once a real ebook is open in the reader.
- **Covers work without Google Books:** Open Library is the keyless fallback; `VITE_GOOGLE_BOOKS_API_KEY` only upgrades metadata.
- **Smoke tests are Node-only:** `npm test` runs `tsx` scripts — no browser, no backend required.
