# Owlry — mobile-first audit & plan

> Status: **all 5 phases complete.** Decision locked in: on large screens,
> render a **centered phone-width column** (no fake device bezel, no separate
> desktop layout). True mobile-first: design for the phone, present it calmly
> on big screens.
>
> Verified: `npm run typecheck`, `npm run build`, and `npm test` (16/16) pass;
> the icon webfont no longer ships in `dist/`; and the full device matrix was
> run via headless Chromium with screenshots + assertions (see **§8**).
>
> See **§7 Implementation log** and **§8 device-matrix QA** for details.

---

## 1. The core finding

Owlry is **not yet mobile-first** — it is a pixel-perfect port of a single
**380 px "phone-on-a-desk" mockup** with a thin mobile shell added on top. The
CSS says so itself (`src/styles/global.css:1-6`, `419-453`).

What that means in practice:

- The **outer frame** adapts (full-bleed on phones; a toy phone bezel on
  desktop), but the **interior is hard-pinned to a 380 px canvas**:
  ~**780 hardcoded `px` values** and **almost no fluid units** — only
  `100dvh`/`100vh` and **3 media queries total** across the whole stylesheet.
- Between the phones people actually hold — **320 px (iPhone SE / small Android)
  to 430 px (Pro Max)** — nothing scales. At 320 the 40 px headline + fixed
  22 px gutters cramp; at 430 everything sized for 380 floats undersized with
  dead space.
- On tablet/desktop (`@media (min-width:760px)`, `global.css:443`) it **shrinks
  back into a 380 px phone mockup on a desk background** — the literal "phone on
  a PC" we're removing.

It's a phone *mockup* that fills a phone screen, not a responsive website.

## 2. Keep these — the previous pass did real work

- **iOS keyboard handling** — `useKeyboardInset` via `visualViewport`,
  `position:fixed` body pinning, `:has(#qIn:focus)` chat mode
  (`src/hooks/useKeyboardInset.ts`, `global.css:401-406`).
- Safe-area insets top/bottom (`--sat/--sab`), `100dvh`, `overscroll-behavior:
  none`, no tap-highlight, `touch-action:manipulation`,
  `prefers-reduced-motion` (handled twice).
- Strong PWA story (manifest, offline precache, runtime-cached fonts).
- Clean component architecture + swappable content seams.

## 3. Critical issues

### A. Responsiveness (headline problem)
- Locked to a 380 px design; no fluid type/space scale (~780 px literals).
- Discover grid is **fixed 3 columns** (`global.css:154`) at every width.
- No real large-screen treatment — just the shrunken bezel.

### B. Accessibility (serious — and ironic for a reading app)
- **Pinch-zoom disabled** — `maximum-scale=1.0` in `index.html` (WCAG 1.4.4
  fail; blocks users who need to enlarge).
- **Tiny type everywhere** — 8–11 px is the norm (cover spines 8, achievement/
  radar labels 8.5, quote-meta & strip labels 9, much at 10–11). Reader body 15,
  chat 13. Mobile guidance: ~16 body, ≥12 minimum.
- **Contrast fails** — `--fade (#A09683)` on cream ≈ **2.7:1** (needs 4.5:1) and
  it carries *most* secondary labels, at the smallest sizes. `--mut` ≈ 4.9:1 (ok).
- **Touch targets < 44 px** — carousel dots 14×3, copy 28×28, icon buttons
  32–34, shelf spinelets 26×38, weather toggle, calendar/weekday cells.
- **No heading hierarchy** — section titles are styled `<div>`s (`.hl`); no
  `<h1>`/`<main>`/landmarks → poor screen-reader navigation.

### C. Performance
- Imports the **entire Tabler icon webfont** (`src/main.tsx:5`) but uses exactly
  **43 icons**. Swapping to tree-shaken SVGs is the biggest, easiest win.
- **3 Google Font families** with many weights/axes, render-blocking from
  `fonts.googleapis.com`. Subset/self-host + preload the critical face.

### D. Mobile UX polish
- Reader pages via invisible tap-zones (`src/components/overlays/Reader.tsx:46-51`)
  — no swipe, no keyboard paging, undiscoverable; inconsistent with the
  swipeable carousel.
- No `safe-area-inset-left/right` → landscape notch can clip content.

---

## 4. The plan

Each phase is independently shippable. Effort is rough dev time.

### Phase 1 — Remove the "PC toy" & unblock a11y  (~½ day)
**Goal:** stop pretending to be a device; let users zoom.
- `index.html`: drop `maximum-scale=1.0` (and `interactive-widget` stays).
- Replace the `≥760px` phone-bezel block (`global.css:443-453`) with a
  **centered column**: keep the full-bleed mobile app, but on wide screens cap
  `.app` at a comfortable max-width (~440 px), center it, give it a calm
  background and a soft edge (subtle radius/shadow — no literal bezel/notch).
- Add `env(safe-area-inset-left/right)` to root gutters for landscape notches.
- Establish a real `16px` rem base on `:root` so future sizing can use `rem`.

**Acceptance:** desktop shows a centered, full-height reading column (no toy
phone); pinch-zoom works on iOS/Android; nothing clips in landscape.

### Phase 2 — Fluid layout & type  (~1–2 days)
**Goal:** flow gracefully 320 → 480 px (and stay crisp in the centered column).
- Add a **token layer** in `tokens.css` — fluid type ramp + adaptive gutter, e.g.

  ```css
  :root {
    --gutter: clamp(16px, 5vw, 22px);
    --fs-200: clamp(10px, 2.6vw, 11px);   /* meta / labels  */
    --fs-300: clamp(12px, 3.2vw, 13px);   /* body / chat    */
    --fs-400: clamp(14px, 3.6vw, 15px);   /* card titles    */
    --fs-700: clamp(30px, 9vw,  40px);    /* hero headline  */
  }
  /* centered column caps vw growth so type stops scaling past ~480px */
  ```
- Migrate high-traffic surfaces off 380 px literals: masthead, headline, pick
  card, shelves, chat, reader, profile cards.
- Discover grid → `repeat(auto-fill, minmax(96px, 1fr))` (`global.css:154`).
- Raise minimums while migrating: meta ≥ 12, chat ≥ 14, reader default ≥ 16.

**Acceptance:** no horizontal overflow or cramping at 320; no undersized
floating at 430; covers/grid breathe at both ends.

### Phase 3 — Accessibility pass  (~1 day)
**Goal:** meet WCAG AA on contrast + targets; add real semantics.
- Darken or restrict `--fade` to ≥ 4.5:1 on cream (introduce e.g.
  `--fade-strong` for text, keep the light tone for hairlines only).
- Expand interactive hit areas to ≥ 44 px via padding / `::before` overlays
  **without** changing visual size (dots, copy, icon buttons, spinelets, weather
  toggle, calendar cells).
- Add `<main>`, landmark roles, and a real `<h1>`/`<h2>` hierarchy (keep the
  existing `.hl` visual styling on the heading elements).
- Reader: add swipe + Arrow-key paging and a faint visible page-turn affordance.

**Acceptance:** axe/Lighthouse a11y has no contrast or target failures; reader
is operable by swipe and keyboard.

### Phase 4 — Performance  (~½ day)
**Goal:** cut payload, speed first paint.
- Replace the icon webfont with **43 tree-shaken SVGs** (e.g.
  `@tabler/icons-react`); keep the `<Icon>` API so call sites don't change.
- Subset/self-host the 3 font families (or trim weights); `preload` the critical
  face; confirm `font-display:swap`.
- Re-check Lighthouse mobile (target: Perf & A11y ≥ 90).

**Acceptance:** icon-font request gone; total transferred bytes down materially;
Lighthouse mobile Perf/A11y ≥ 90.

### Phase 5 — Device QA matrix
iPhone SE (320/375) · iPhone Pro Max (430) · Pixel (393) · a foldable ·
landscape — across iOS Safari / Android Chrome / Firefox, installed PWA, and the
keyboard-open chat. Verify centered column on tablet/desktop.

---

## 5. Suggested order & risk

1. **Phase 1** first — highest visible payoff, lowest risk, unblocks zoom.
2. **Phase 2** — the substance of "mobile-first"; touches the most CSS, so do it
   on its own and QA on real widths.
3. **Phase 3 / 4** — independent; either order. Phase 4 is mostly mechanical.

Lowest-risk quick wins that could ship immediately if desired: remove
`maximum-scale`, add the responsive Discover grid, and darken `--fade`.

## 6. Out of scope (by decision)
- No separate wide/desktop layout — large screens get the centered phone-width
  column only.
- No content, copy, or game-loop changes; this is layout / a11y / perf only.

---

## 7. Implementation log (Phases 1–4 — shipped)

**Phase 1 — removed the "PC toy", unblocked a11y**
- `index.html`: dropped `maximum-scale=1.0` (pinch-zoom restored).
- `global.css`: the `≥760px` block no longer draws a phone bezel/fake status
  bar — it renders a centered, capped (`--app-max: 440px`), full-height column
  with a soft shadow on a calm backdrop.
- Safe-area left/right folded into `--gutter` (landscape notch safe).
- Real `16px` rem base on `html`.

**Phase 2 — fluid layout & type**
- `tokens.css`: added a `clamp()`-based scale — `--gutter` and
  `--fs-meta/body/lead/read/hero/hero-sm` — that grows 320 → ~440px then holds.
- All screen-level horizontal gutters switched from fixed `22/26/18/24px` to
  `var(--gutter)`; headlines and reading/chat text use the fluid tokens.
- Discover grid is now `repeat(auto-fill, minmax(96px, 1fr))` (was fixed 3 cols).
- Search/composer input bumped to `16px` to stop iOS focus-zoom.

**Phase 3 — accessibility**
- Contrast: `--fade` darkened `#A09683 → #736B57` (~2.7:1 → ~4.8:1 on cream);
  light tone kept as `--hair` for decoration. Smallest meta labels floored at
  ~10px (radar/labels/calendar), reading surfaces at 15–16px.
- Tap targets: transparent `::before` extends small controls (icon buttons,
  save, copy, weather toggle, dots, spinelets, toggles, segmented) toward ~44px
  without changing their visual size.
- Semantics: added `<main>`; each screen title is now an `<h1>`, prominent
  section titles `<h2>`; a heading reset keeps the visual design intact.
- Reader: added horizontal **swipe** + **Arrow-key** paging (the footer
  prev/next buttons remain the visible affordance); edge tap-zones retained.

**Phase 4 — performance**
- Replaced the full Tabler icon **webfont** with **43 tree-shaken SVG icons**
  (`@tabler/icons-react`) via a name-keyed registry; the `<Icon>` API is
  unchanged, glyphs size in `em` / `currentColor` so existing CSS still drives
  them. No `*.woff*` ships anymore.
- Trimmed unused font weights (Bricolage 700, Source Serif upright 600).

## 8. Phase 5 — device-matrix QA (executed)

Run via headless Chromium emulation against the production build
(`vite preview`), screenshotting each viewport and asserting the mobile-first
invariants. Screenshots are in `docs/qa-screenshots/`.

| Viewport | App width | Gutter | Hero | Clipped overflow |
| --- | --- | --- | --- | --- |
| 320 (SE small) | 320 | 16.6px | 31px | none |
| 375 (iPhone)   | 375 | 19.5px | 36px | none |
| 393 (Pixel)    | 393 | 20.4px | 37.7px | none |
| 430 (Pro Max)  | 430 | 22px   | 40px | none |
| 768 (tablet)   | **440 (centered)** | 22px | 40px | none |
| 1280 (desktop) | **440 (centered)** | 22px | 40px | none |

Automated assertions, all passing:
- **No clipped horizontal overflow** at any width (non-scroller elements stay
  within the viewport).
- Gutter + hero **scale fluidly** 320→430, then hold; the column **caps at
  440px and centers** on tablet/desktop (no toy phone, no fake status bar).
- Secondary text colour resolves to `rgb(115,107,87)` (the AA `--fade`).
- **38 inline `<svg class="ti">`, 0 icon-font `<i>`** — webfont fully replaced.
- One `<h1>` per active screen; `<main>` landmark present.
- Viewport meta has **no `maximum-scale`** (pinch-zoom enabled).
- Reader **Arrow-key paging** advances p.1 → p.2.

Still worth a hands-on pass on physical hardware for true touch feel, iOS
Safari `dvh`/keyboard quirks, the installed PWA, and landscape notch insets —
but every invariant the plan set out is verified green here.
