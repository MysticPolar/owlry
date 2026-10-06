import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url))

// The Council Room (src/council) — built as its own page into dist/council/,
// served at app.owlry.ai/council/. Deliberately separate from vite.config.ts:
// no PWA plugin (the root worker must never precache or answer for /council/),
// no fontaine, its own public/ (portraits, the room paintings, icons), and its
// own document, so its design tokens never meet Owlry's. `npm run build` runs
// the root build first (which empties dist/), then this one.
export default defineConfig({
  root: at('./src/council'),
  // read .env.local / VITE_* from the repo root like the root app (Vite would look in `root`)
  envDir: at('.'),
  // CI passes ./ (relative) for both builds; the default makes a local build + preview work at /council/
  base: process.env.BASE_PATH || '/council/',
  publicDir: at('./src/council/public'),
  plugins: [react()],
  // imports reach the shared client in src/lib/supabase.ts, outside this root
  server: { port: 5174, fs: { allow: [at('.')] } },
  build: { target: 'es2021', outDir: at('./dist/council'), emptyOutDir: true },
})
