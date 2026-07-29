# Vendored: foliate-js

A pruned, pinned snapshot of **foliate-js** — the client-side ebook rendering
engine behind the Foliate reader. Used by `src/components/reader/FoliateView.tsx`
to render EPUB (uploaded files + remote public-domain URLs), MOBI/AZW3, and FB2
entirely in the browser. Rendering never sends book contents to a third party;
signed-in uploads may also be mirrored to the user's private Owlry cloud copy.

- **Source:** https://github.com/johnfactotum/foliate-js
- **Commit:** `78914aef4466eb960965702401634c2cb348e9b1` (2026-05-01)
- **License:** MIT (see `LICENSE`). Vendored deps: `vendor/fflate.js` (MIT),
  `vendor/zip.js` (BSD-3-Clause).

## What's included / pruned

Vendored the import closure needed to open EPUB/MOBI/AZW3/FB2:
`view.js`, `epubcfi.js`, `progress.js`, `overlayer.js`, `text-walker.js`,
`paginator.js`, `fixed-layout.js`, `security.js`, `epub.js`, `mobi.js`, `fb2.js`,
`comic-book.js`, `search.js`, `tts.js`, `vendor/fflate.js`, `vendor/zip.js`.

**Pruned:** `pdf.js` + `vendor/pdfjs/` (13 MB) — PDFs are rendered by the app's
own `pdfjs-dist` engine (`src/components/reader/PdfView.tsx`), never by foliate.
Also skipped: `dict.js`, `footnotes.js`, `opds.js`, `quote-image.js`,
`uri-template.js`, `reader.js` (the demo), and build configs.

## Local patches (keep this list current when re-syncing)

1. **Script-blocking with WebKit-safe events.** WebKit blocks callbacks that the
   parent installs in a sandboxed book document unless the iframe also has
   `allow-scripts` (WebKit bug 218086). `security.js` therefore marks only URLs
   produced by Owlry's sanitized, CSP-injected HTML/XHTML serializers as
   event-safe. Trusted browser-decoded raster pages are safe as well.
   `paginator.js` + `fixed-layout.js` grant
   `'allow-same-origin allow-scripts'` only to those provenance-marked URLs;
   SVG, unknown, and unmarked content keeps `'allow-same-origin'`. The explicit
   CSP blocks scripts/workers, executable elements and attributes are stripped,
   and manifest JavaScript is denied before resource rewriting. This restores
   iOS tap/touch/wheel listeners without trusting a book-provided MIME label or
   the experimental iframe `csp` attribute alone.
2. **Prune PDF.** `view.js` `makeBook()`: the `else if (isPDF)` branch (which did
   `await import('./pdf.js')`) now throws `UnsupportedTypeError` — removing the
   only reference to `pdf.js`/`vendor/pdfjs` so they need not be vendored. Foliate
   never receives a PDF (the shell routes PDFs to `PdfView`).
3. **Safe asynchronous view updates.** `paginator.js` captures the active view
   and iframe document before scheduling style/font updates, verifies that they
   are still current before expanding, and makes view/paginator teardown
   null-safe and idempotent. Touch, focus, scroll-animation, font-readiness, and
   resize callbacks all stop after destruction, preventing queued work from
   touching a replaced or torn-down view during reader reloads and hot updates.
   A failed spine load also preserves the current index/view and propagates to
   Owlry's guarded page-turn recovery instead of stranding later navigation.
4. **Type surface for ZIP inspection.** `vendor/zip.d.ts` declares the small
   `BlobReader`/`ZipReader`/`TextWriter` surface used by Owlry's EPUB protection
   preflight; it does not alter the vendored runtime.
5. **Contained book resources.** `epub.js` prepends a restrictive CSP to every
   HTML/XHTML spine document and replaces external or unmanifested subresource
   URL with an inert value; automatic meta refreshes are removed as well. Local
   book assets continue to use `blob:`/`data:`, Owlry's reader fonts remain
   available, and ordinary anchor hrefs are retained for the parent view's
   explicit-click handler. `security.js` also applies the policy directly to
   paginator and fixed-layout iframes before navigation, covering MOBI/AZW3/FB2
   content and SVG spine items; `mobi.js` and `fb2.js` inject the same policy
   into generated documents for WebKit/Firefox, and frames use
   `referrerpolicy="no-referrer"` too.
6. **Handled internal navigation failures.** `paginator.js` routes asynchronous
   selection paging, focus/keyboard scrolling, and touch-snap navigation through
   one rejection guard. Failures emit a bubbling, composed `error` event instead
   of becoming unhandled promise rejections; direct `prev()`/`next()` calls still
   reject normally so Owlry's guarded page-turn UI can report them.
7. **Safe explicit links.** `view.js` opens only `http:`, `https:`, `mailto:`,
   and `tel:` anchor targets, and uses `noopener,noreferrer` for the new context.
   Script/data/custom-scheme links embedded in an untrusted book are inert.
8. **Scrolled spine handoff.** `paginator.js` translates outward wheel or touch
   intent at the live edge of the current scrolled spine item into queued,
   guarded `prev()`/`next()` navigation. Touch intent follows native
   `scrollend` (with an idle fallback) so post-release momentum can complete the
   handoff. Queued turns remain bound to their originating view, slow loads no
   longer discard a queued intent after a fixed one-second poll, carryover and
   rebound trackpad momentum are quarantined without extending that quarantine
   forever, and cancelled pans can still settle. Selection suppression is scoped
   to a selection changed by the active gesture. This keeps short and long
   sections reachable without page controls, skipped sections, or a frozen next
   chapter.
9. **Single-owner mobile page gestures.** Stationary iframe taps are handled by
   Owlry's pointer tap zones; Foliate's touch snap runs only after movement
   crosses a shared drag threshold. This prevents duplicate `snap()`/`next()`
   races at section boundaries, tolerates normal finger jitter, and avoids dead
   chapters caused by `tabindex="-1"` wrappers or a stale text selection.

## Re-syncing

Re-clone at a new pin, copy the same file list, and re-apply the nine patches
above (search for `allow-same-origin` and the `isPDF` branch). foliate-js has no
stable releases; pin a commit deliberately.
