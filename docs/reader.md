# Owlry — in-app reader & the "Open" flow

Tap **Open** on any book → `useStore.openBook(id)` resolves what to read, fast:

1. **Already uploaded on this device?** → read it immediately (offline).
2. **Public-domain source?** → look up an EPUB by title+author via **Gutendex**
   (Project Gutenberg) and open it in the reader.
3. **Neither** → the reader shows an empty state: *"We don't have a free copy of
   this book. Upload your own file to read & track it."* → **Upload modal**.

## Pieces
- `src/lib/ebook/resolve.ts` — Gutendex lookup (title+author → EPUB URL), cached,
  time-boxed (3.5s) so the click stays snappy. Returns `null` ⇒ empty/upload.
- `src/lib/ebook/inspect.ts` — client-side format + **DRM** detection. Rejects
  encrypted EPUB (`META-INF/encryption.xml` / `rights.xml`) and MOBI/AZW.
- `src/lib/ebook/storage.ts` — IndexedDB (idb-keyval): uploaded **bytes** + the
  reading **position** (CFI / page / scroll + percent). Never leaves the device.
- `src/components/overlays/EbookReader.tsx` — the reader shell (reuses the
  `.reader` design system), active-reading timer, progress bar, position persist.
- `src/components/reader/{EpubView,PdfView,TextView}.tsx` — engines, **lazy-loaded**
  (epub.js / pdf.js are split out of the main bundle): EPUB → epub.js, PDF →
  pdf.js, TXT/FB2 → paginated HTML.
- `src/components/overlays/UploadModal.tsx` — `.epub/.pdf/.fb2/.txt` (+ mobi/azw3
  warned), inspect → store locally → render.

## Progress → XP
Progress unit is **percent** (epub.js CFI/locations; pages are unstable in
reflowable EPUB). `reportProgress(percent, secondsRead)` drives **cosmetic** XP by
reusing the existing economy RPCs — one `turn_page` per 5% advanced, gated by ≥8s
of active reading, and `finish` near 100%. Only `{ bookId, percent, seconds }`
reach the server (via `owlry_perform_action`) — **never book text**.

## Guardrails (enforced)
- Uploaded/copyrighted files are **never** hosted, copied, or transmitted — bytes
  stay in IndexedDB on the device.
- **No DRM stripping.** Encrypted files are refused with a clear message.
- No MOBI/AZW (DRM-locked, unsupported). Public-domain fetch only from Gutenberg.
- Position advanced ≠ text read → rewards stay low-value (XP/streak only).

## Plugs in later
- **Mobile (Expo/RN):** swap the storage layer (OPFS/expo-file-system) and the
  engines (RN EPUB/PDF) behind the same `openBook` + `reportProgress` contract.
- **More public-domain sources:** add Standard Ebooks / Open Library to `resolve.ts`.
- **CORS:** some Gutenberg EPUBs lack CORS headers; the reader falls back to the
  upload state on load failure. A PD-only proxy (legal for public-domain files)
  can be slotted into `resolve.ts`/`EpubView` if direct fetch is blocked.
