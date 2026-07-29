# Owlry type system — "Three Voices"

State as of the `feat(type)` series on `renovation/homescreen`. This file exists
so the work can be picked up from a cloud session (claude.ai/code) or another
machine without the original conversation.

## The problem it solved

Three unreconciled type dialects ran at once — a legacy night-theme system, the
newer Playbill system, and a reader world — plus a private onboarding
sub-dialect. Concretely: ~50 distinct font sizes, ~45 letter-spacing values in
mixed units (`em` in one stylesheet, `px` in the other), the same "label" role
weighing 800 in one and 600 in the other, screen titles from 13px to 30px across
seven surfaces, ~35 selectors below the iOS 11px floor (worst: 7.5px), and four
Latin-only webfonts while the app ships Simplified Chinese.

## The system

| Role | Family | Owns |
|---|---|---|
| **Mark** | Anton | The logotype **only**, as SVG outlines in `src/components/Wordmark.tsx`. No webfont. |
| **Display** | Fraunces | Everything ≥24px, plus the italic accent (pull-quotes, captions, "why" lines) at any size. |
| **Reading** | Literata | Every paragraph — and book titles/authors at text sizes. |
| **Chrome** | Inter | Everything that is not prose: buttons, labels, chips, meta, forms. |

**The voice rule.** Anton is the theatre's own signage (now only the logotype).
Fraunces is the billing — the works being staged. Literata is the reading.
Inter is the stage crew. A book title ≥24px is Fraunces; below that it is
Literata. A *screen* title is never Literata.

**Rule sheet** (this is the part that must survive a deadline):
- Fraunces roman never appears below 24px. Not "just this once."
- Literata owns every paragraph.
- Inter owns everything that is not prose.
- Anton is reachable only through `<Wordmark />`.
- If a dense row breaks under the sizes, **fix the row** (padding, leading,
  clamp) — never re-open the scale.

## Where things live

- `src/styles/type.css` — **the only file allowed to name a typeface or declare
  `@font-face`.** Holds the four faces + the three family tokens.
- `src/styles/tokens.css` — the ramp: `--t-*` sizes (rem), `--fw-*`, `--lh-*`,
  `--track-*`, and a separate `--icon-*` scale.
- `src/assets/fonts/*.woff2` — self-hosted subsets. In `src/assets/` and **not**
  `public/` on purpose: CI builds with `BASE_PATH=./` so the app also works at
  `github.io/owlry/`, and Vite only rewrites asset URLs it owns.
- `src/components/Wordmark.tsx` — generated from Anton with fontTools; the
  viewBox wraps the real ink so `height: .9814em` matches the text it replaced.
- `src/dev/TypeSpecimen.tsx` — the specimen, at `#type` in dev only.

## The ramp

`--t-display-xl` 40 · `--t-display` 32 · `--t-title` 24 · `--t-heading` 18 ·
`--t-reading` 16 · `--t-body` 16 · `--t-callout` 14 · `--t-label` 13 ·
`--t-micro` 12 (the floor).

Two values are load-bearing and were **measured, not chosen**:

- **`--t-body` is exactly 1rem/16px** because 16px is the threshold below which
  iOS auto-zooms a focused input. The six inputs take `max(var(--t-body), 16px)`,
  so the zoom guard is structural instead of a magic number.
- **`--t-reading` is 16px** because the app's text column is ~312px on a 390px
  phone; at 18px Literata that yields a 31-character measure, well under the
  35–45 a line wants. 16px measures 35. Reading and body share a size and are
  separated by family and leading (Literata 1.65 vs Inter 1.5).

## Font budget

167.6 KB across four subset woff2, down from **606 KB** of Google-hosted
families (Google ships one file per discrete weight: 5× Inter Tight, 2+2
Fraunces). Zero third-party font requests.

Where the bytes went, decided by measurement:
- Literata **keeps** its optical axis (+38 KB) — it carries every paragraph from
  12px captions to the reader's 24px setting.
- Fraunces **pins** its optical axis (−28 KB) — display-only, so the axis earns
  little across 24–40px.
- Fraunces `wght` stays variable because the SVG book jackets use both 400
  (bylines — 28 of the 74 `<text>` nodes carry no weight) and 600 (titles).

Regenerate with `fontTools`: instance the axes, then subset to Latin +
`U+2000-206F` (that block carries the curly quotes, em dashes and ellipses a
literary product is judged on — do not drop it).

## The Ask page — one device, one meaning

The desk mixes prose, book links, recommendations, prompts, and a form. Its
extra law is that each visual treatment carries one meaning:

| Device | Its one meaning | Worn by |
|---|---|---|
| **Underline** | a book Scout can open | `.bk` links in Scout's prose — nothing else |
| **Response prose** | Scout explaining a recommendation | the intro, replies, and `.pb-short-reason` |
| **THE label** | a compact control or status | chrome · `--t-micro` · semibold · `--track-label` · uppercase |

Recommendation results form three editorial units: one compact paper card,
then one short explanation in Scout's normal Literata response voice. The
explanation is not italic, smaller, or otherwise demoted. Book titles are
Literata roman and cased as printed. PEEK is a quiet inline arrow action rather
than a repeated filled button, so the cards support the conversation instead
of becoming a wall of controls.

Starter prompts are natural-case Inter menu rows separated by hairlines.
Post-answer prompts are natural-case Literata phrases in a single horizontal
rail; the rail becomes swipeable only when its contents overflow. Neither
prompt treatment uses pills or underlines. The composer placeholder is chrome
roman because a form control is stage crew, not a pull-quote. The send control
may use brass when enabled; secondary controls stay quiet.

Before this law the desk ran seven letter-spacings at once (`.8px`, `1.4px`,
`1.6px`, `3px`, `.02em`, `.06em`/`.08em`, and the token). Everything now
tracks `--track-label`. If a new Ask control needs an eighth, it doesn't.

## Guardrails

`npm run lint:css` enforces the two invariants: no px font-sizes, no
font-family that is not a token. **Deliberately not in CI** — the only check
gating a deploy today is `tsc` inside the build job, and a stylistic rule should
not be able to block a deploy.

The 15 remaining px exemptions each carry an inline note saying why
(book-jacket art, drop caps, wordmark containers whose font-size drives the
SVG's em sizing). Icons live on `--icon-*` because they are drawn with
font-size but nobody reads them.

## Known gaps

- **The epub reader's font injection is unverified end-to-end.** It renders in a
  `blob:` URL iframe whose base is opaque, so relative and root-absolute hrefs
  both throw; `FoliateView.tsx` now builds absolute URLs at runtime and inlines
  `@font-face`. It typechecks and builds, but exercising it needs a real
  uploaded ebook.
- Inter's metrics differ from Inter Tight's; the tight/nowrap rows
  (`.pb-marquee` capped row, nav labels, `.hist-row-day` min-width,
  `.reader-book-*` ellipsis, `.sh-badge`) want a real-device look.
- CJK renders through designed fallback chains, not a loaded face — never
  visually checked in `zh-CN`.

## Verification

`npx tsc -b` · `npm test` (25) · `npm run build` · `npm run lint:css`.
Browser at 390×844 with `VITE_EXPOSE_STORE=1 npm run dev` — drive the app via
`window.__owlry.getState()`. The two gates worth re-running after any type
change: the **measure** (35–45 characters in `.l-body`) and the **deal-hand
height** (≤340px for three cards).
