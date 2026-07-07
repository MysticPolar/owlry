# Owlry — Product Requirements Document

**One-liner:** Owlry is a gamified reading app where you ask an owl what to read for how you feel, get a hand‑written *reading letter* that lets you taste a book before you commit, and keep a warm daily reading habit alive through a light XP/ink economy.

| | |
|---|---|
| **Product** | Owlry (`owlry`) — v0.1.0 |
| **Live** | https://mysticpolar.github.io/owlry/ (installable PWA) |
| **Status** | Draft · working web build shipping to production on every push |
| **Date** | 2026‑07‑07 |
| **Audience** | Product · Design · Engineering · Content/Editorial · Growth/Data · Marketing |
| **Metaphor** | The *Owlery* — an owl post office staged inside a night theatre ("Owl Theatre") |

---

## 1. Executive summary

Book discovery today is either an algorithmic feed or an infinite wishlist — high friction, low warmth, and easy to bounce off. Readers save books they never start and lose the habit entirely.

Owlry reframes discovery as **correspondence**. You tell **Scout** (the postmaster owl) what's going on; Scout sorts you a **reading letter** — a grounded preview of a real book's argument, chapter, and a few genuine insights — so you can *taste* the book before opening it. Saving what stays with you feeds a gentle game loop (XP, ink, streaks) and a growing "reading identity." Five distinct owls each own one job, giving the app a characterful, curated feel that an algorithm can't fake.

The current build is a fully client-side PWA with an **optional live AI owl** (server-side Claude) that degrades gracefully to a built-in offline brain — so the experience never breaks, online or off.

**The core loop:** **ASK → PEEK → GROW.**

---

## 2. Problem & opportunity

- **Discovery is noisy and joyless.** Ratings and feeds optimize for popularity, not fit or feeling.
- **Commitment is expensive.** A book is hours of your life; readers can't cheaply preview whether it's *for them right now*.
- **The habit is fragile.** Without a reason to return daily, reading falls off the calendar.

**Opportunity:** a warm, characterful curation layer + a low-pressure habit loop that makes *starting* a book feel like opening a letter, and *returning* feel like tending a streak.

---

## 3. Target users

- **Mood readers** who want the *right* book for how they feel today, not a ranked list.
- **Goal-driven readers** who read to solve something (focus, habits, career, money) — served by Scout's dedicated non-fiction desk.
- **Habit rebuilders** who want a gentle, gamified nudge back into daily reading.

All three are served by one chat surface with two "desks" (see §8).

---

## 4. Goals & non-goals

**Goals (v1)**
- Make discovery feel like receiving a personal letter, not browsing a catalog.
- Let readers preview a book's substance before committing ("peek").
- Sustain a daily habit through a self-feeding XP/ink/streak loop.
- Ship as an installable, offline-capable PWA, ready to wrap as a native app (Capacitor).
- Keep the whole backend **optional** — the app is fully usable with zero server.

**Non-goals (v1)** — labelled "coming soon" in the UI where surfaced
- Accounts, cross-device sync, and payments.
- Social/community reviews.
- A large live catalog with licensed cover art or full copyrighted book text.
- Publisher/commerce integrations.

---

## 5. The experience — core loop & screens

**ASK → PEEK → GROW**, delivered across four screens + a set of overlays.

| Screen | Owl | Purpose |
|---|---|---|
| **Today** | Scout | The morning post: "today's" delivered pick(s) ("delivered while you slept"), your XP/ink/coins meter, and a "pick up where you left off" reading strip. |
| **Discover** | Scout | The post desk — a chat where you ask for a book by vibe or goal. Two desks (fiction/everything vs non-fiction office hours), quick-reply chips, and a tray/shelf of picks. |
| **Library** | Keeper | Your shelves in three segments — **Reading**, **Saved**, **Finished** — with per-book progress. |
| **Profile** | Mirror | Your reading identity: a balance **radar**, weekly activity, achievements, an owl-post **calendar**, and kept **quotes** (Scribe). |

**Overlays**
- **Reading letter (Peek)** — the flagship artifact: a paper "letter" with the book's opening feeling, real chapter, a ~60–90 word core argument, exactly three insights (with at most one genuine quote), a closing, two takeaways, two questions, and further-reading neighbours.
- **Reader** — a distraction-free reading surface (tap/swipe/keyboard paging, chapter marker, progress track, save, finish).
- **Book sheet** — an "about" page (author, pages, intro, bio, links).
- **Settings** — reading prefs (text size, reduce motion), the live-owl toggle, the cast playbill, reset, and "watch opening night again."
- **Onboarding ("Opening Night")** — see §6.

**Mobile-first.** On phones (and the installed PWA / native shell) the app runs **full-bleed** at `100dvh`, respecting notch/home-indicator safe areas. On desktop it renders inside a staged "phone on a desk" frame for presentation.

---

## 6. Onboarding — "Opening Night"

A theatrical first-run in five acts, framed as a programme:

1. **Curtain rises** — the marquee (OWLRY · "READ BETTER.") lifts on app open.
2. **The Programme No 1 — the loop:** ASK → PEEK → GROW.
3. **The Programme No 2 — the house economy:** asks & peeks spend ink; every ask & peek pays back XP; reading pages refills the well — the loop feeds itself.
4. **Scout arrives & asks one question** — mood/goal chips.
5. **Your first letter arrives** (Act IV), then **Mirror** is introduced (Act V) — "it watches what you read… and charts who you're becoming."

Skippable at any point; replayable from Settings.

---

## 7. The cast — five owls

Each owl owns exactly one job, one screen, one colour, and one voice. **Distinctness is the governing rule:** no line of copy should be sayable by two owls.

| Owl | Domain | Where | Voice (one line) |
|---|---|---|---|
| **Scout** — postmaster (ember) | Finds your next book; fronts the chat | Today hero + Discover chat | Overeager, warm, lowercase; can't help recommending "one more." |
| **Keeper** — the shelves & the flame (moss) | Library, reading history, the streak | Library + Profile streak | Gruff, numerate, counts twice; soft underneath. |
| **Scribe** — the archive (quill blue) | Quotes & highlights, kept verbatim | Profile → quotes | Precise, pedantic-as-kindness; never rounds a page number. |
| **Peek** — first chapters (teal) | Previews beginnings so you can taste before committing | The reading-letter header | Impatient, breezy, candid; never oversells. |
| **Mirror** — reader of readers (violet) | Reads *you* — the reading-identity radar | Profile | Near-silent; one calm declarative, then silence. |

*(Gold is the house colour — light, letters, XP, the streak flame — never an owl's.)*

---

## 8. Scout's two desks

Scout is one owl with two modes, switchable in the Discover chat:

| | **Everything desk** (default) | **Office Hours** (pro) |
|---|---|---|
| **Recommends** | Fiction **and** non-fiction — whatever fits | Non-fiction only |
| **Opener** | Mood-first — "what's going on?" | Goal-first — "what are we solving?" |
| **Tone** | Wandering, warm | Sharper, outcome-minded (still warm, still lowercase) |
| **Clarify options** | rest · focus · heartache · escape | focus · habits · career · money |
| **Look** | Plain Scout | "Collar on" — distinct pro artwork |

If an Office-Hours visitor wants a novel, Scout points them to the fiction desk "one tap away" and still offers the nearest non-fiction fit.

---

## 9. Gamification & economy

Three currencies drive the loop. Values are exact to the current build; the loop is **self-feeding** — reading replenishes the ink that asking and peeking spend.

| Action | Ink | XP | Notes |
|---|---:|---:|---|
| **Turn a page** | **+2** | +2 | The refill engine — reading funds the loop |
| **Finish a book** | — | +40 | |
| **Save / shelve** | — | +5 | |
| **Ask Scout** (live owl) | **−1** | +3 | Refunded if delivery fails; dry well falls through to the free offline owl |
| **Peek** (open a letter) | **−2** | +10 | Charged up front, refunded on failure; re-opening a cached letter is free |

- **Ink** is capped at **120**. First time it fills to the cap each day → **+50 coins**.
- **XP → Level:** level up every **400 XP** (v1: fixed threshold), with a "level up!" celebration.
- **Streak:** consecutive reading days, tended by Keeper.
- **Dry inkwell** blocks asks/peeks with a gentle nudge ("a few pages will refill it") — never a hard paywall.
- **Persisted locally** (IndexedDB): XP, level, ink, coins, streak, saved/reading/finished shelves, and per-book reading progress. Session/chat state is ephemeral and resets on reload.

---

## 10. AI system — Scout & the letters

The live owl runs **server-side** so no API key ever reaches the browser.

- **Model:** Claude `claude-sonnet-4-6` powers both Scout's chat and the letters, inside the **`owl-chat` Supabase Edge Function** (Deno). A **Gemini `gemini-2.5-flash`** parity path is selectable via a server secret; both share one system prompt and one `{say, letter, picks, chips}` JSON contract.
- **Structured outputs:** replies and letters are validated JSON (schema-enforced), so the UI renders reliably.
- **Zero-token peek cards → generate-on-tap:** every book Scout names spawns a "a reading letter has arrived" card **for free** (straight from the reply payload). The full letter is generated **only when the card is tapped**, always written fresh to *this reader's* ask, then cached for the session.
- **Grounding ("the law of the letter"):** real books only; never invent a title, author, rating, chapter, statistic, page number, or scene; **at most one verbatim quote** in a letter, and only when the wording is certain — otherwise none.
- **Two-desk steering** via a `desk` parameter (see §8).
- **Never breaks:** if the function is missing, offline, refuses, or errors, the client silently falls back to the built-in offline "mockup brain."

---

## 11. Content model

- **Catalog:** **24** curated books, each with title, author, page count, a CSS-drawn cover (colour + label — **no cover images to license**), rating, intro, quote, and author bio.
- **Guides:** **7** hand-written "reading letters" — the classic/offline owl product and the quality bar for live letters. Catalog books reuse their curated letter; open-world books are LLM-generated but rendered identically.
- **Reader text:** original placeholder literary prose (legally safe, not copyrighted excerpts), with a defined seam to swap in genuine **public-domain** texts (e.g. Project Gutenberg / Standard Ebooks).
- **Seeds:** curated "today" picks, profile radar/calendar/quotes, and weather moods.

---

## 12. Technical architecture

- **Frontend:** React 18 + TypeScript on **Vite 5**; **Zustand** store; Tabler icons + an inline SVG owl sprite.
- **Persistence:** **IndexedDB** (`idb-keyval`), debounce-saved. The store is swappable to an API repository without touching the UI.
- **Backend (optional):** **Supabase** — the `owl-chat` Edge Function plus an anon-key client gated behind env vars. **No env vars → the app runs fully local** on the offline brain.
- **PWA:** installable, offline-capable via `vite-plugin-pwa` (Workbox, auto-update). App shell precached; web fonts runtime-cached so type survives offline.
- **Mobile chrome:** `viewport-fit=cover`, `100dvh`, and `env(safe-area-inset-*)` for notch/home-indicator-safe full-bleed layout; native-ready for Capacitor.
- **Hosting & CI:**
  - **App** → GitHub Pages at `/owlry/`, auto-deployed on every push (`deploy.yml`).
  - **Live owl** → a separate **manual** pipeline (`owl-chat-deploy.yml`) deploys the Edge Function.
- **Layered seams** (per the repo README) keep persistence, the owl brain, and book text independently swappable.

---

## 13. Privacy & safety

- The AI provider key is a **server-side Supabase secret only** — never in the browser bundle, the Git repo, or client traffic.
- The app functions with **no account and no network** (local-only mode), so a first-time visitor shares nothing to try it.
- No web-only API is used without a graceful fallback (e.g. clipboard copy degrades to a toast).

---

## 14. Success metrics (proposed)

*Not yet instrumented — proposed targets tied to the core loop, for cross-team alignment.*

- **Activation:** % of new users who complete their first **ask → peek** in the first session.
- **Core-loop engagement:** asks + peeks per weekly active user.
- **Habit:** D1/D7 return rate; median streak length; % of sessions that turn ≥1 page.
- **Preview→read conversion:** % of peeked letters that lead to opening the Reader / saving the book.
- **Identity growth:** % of users who reach a saved-shelf milestone (feeds the Mirror radar).

---

## 15. Release status & roadmap

**Shipped / live**
- Four screens, the five-owl cast, the letter (peek) system, the reading economy, the "Opening Night" onboarding, two Scout desks, full-bleed mobile, and the optional live AI owl with offline fallback.

**Near-term**
- Deploy & bench the live letter quality against the 7-guide bar across both desks.
- Instrument the proposed success metrics.
- Expand the catalog and wire real public-domain reader text.

**Later (currently out of scope)**
- Accounts & cross-device sync · social reviews · payments · native app wrappers (Capacitor → App Store / Play).

---

## 16. Open questions

- Which success metrics become the north star for the first growth milestone?
- Does the XP→level threshold stay fixed (400) or scale with level?
- Catalog growth strategy: curated depth vs. open-world breadth (live-generated letters)?
- Default AI provider (Claude vs Gemini) for cost/latency at scale?
