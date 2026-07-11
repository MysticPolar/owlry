# Vendored: foliate-js

A pruned, pinned snapshot of **foliate-js** — the client-side ebook rendering
engine behind the Foliate reader. Used by `src/components/reader/FoliateView.tsx`
to render EPUB (uploaded files + remote public-domain URLs), MOBI/AZW3, and FB2
entirely in the browser (no server), keeping the promise that an uploaded book
never leaves the device.

- **Source:** https://github.com/johnfactotum/foliate-js
- **Commit:** `78914aef4466eb960965702401634c2cb348e9b1` (2026-05-01)
- **License:** MIT (see `LICENSE`). Vendored deps: `vendor/fflate.js` (MIT),
  `vendor/zip.js` (BSD-3-Clause).

## What's included / pruned

Vendored the import closure needed to open EPUB/MOBI/AZW3/FB2:
`view.js`, `epubcfi.js`, `progress.js`, `overlayer.js`, `text-walker.js`,
`paginator.js`, `fixed-layout.js`, `epub.js`, `mobi.js`, `fb2.js`,
`comic-book.js`, `search.js`, `tts.js`, `vendor/fflate.js`, `vendor/zip.js`.

**Pruned:** `pdf.js` + `vendor/pdfjs/` (13 MB) — PDFs are rendered by the app's
own `pdfjs-dist` engine (`src/components/reader/PdfView.tsx`), never by foliate.
Also skipped: `dict.js`, `footnotes.js`, `opds.js`, `quote-image.js`,
`uri-template.js`, `reader.js` (the demo), and build configs.

## Local patches (keep this list current when re-syncing)

1. **Script-blocking (security).** `paginator.js` + `fixed-layout.js`: the
   content-iframe sandbox was `'allow-same-origin allow-scripts'`; patched to
   **`'allow-same-origin'`**. Foliate measures pagination from the parent via
   `contentDocument` (needs same-origin) but does NOT need scripts to run inside
   the frame — `allow-scripts` was only a WebKit event workaround. Dropping it
   prevents a malicious ebook from executing scripts against our origin (matches
   the `allowScriptedContent:false` posture of the previous epub.js engine).
2. **Prune PDF.** `view.js` `makeBook()`: the `else if (isPDF)` branch (which did
   `await import('./pdf.js')`) now throws `UnsupportedTypeError` — removing the
   only reference to `pdf.js`/`vendor/pdfjs` so they need not be vendored. Foliate
   never receives a PDF (the shell routes PDFs to `PdfView`).

## Re-syncing

Re-clone at a new pin, copy the same file list, and re-apply the two patches
above (search for `allow-same-origin` and the `isPDF` branch). foliate-js has no
stable releases; pin a commit deliberately.
