# Owlry Council Room — deployable scaffold (v2, on-demand minds)

Three great minds, living or dead, cast purely for fit to the reader's question. Nine serial one-to-one
turns in three cycles, a five-section summary, a reply loop. Server: one Supabase Edge Function. Client:
a Zustand store + one React component for the existing Vite app. Model calls go straight to the Claude
Messages API with `fetch` (no SDK).

```
supabase/
  migrations/20260921000000_council.sql   tables + RLS (minds cache, denylist, sessions, turns, summaries)
  functions/council/
    index.ts      orchestrator: cast → screen → cast event → forge (parallel) → 9 turns → summary; reply mode
    prompts.ts    benches per category, cast v2, screen, forge, mind, director's notes, summary, route
    model.ts      Claude API adapter: complete(), stream(), prewarm(), parseJson()
    types.ts      shared types
src/council/
  sse.ts            reads a Server-Sent Events stream over fetch (EventSource can't POST)
  councilStore.ts   Zustand store: talks to the function, paces the reveal, skip, reply
  CouncilRoom.tsx   minimal unstyled component; class names are hooks for the Flat Playbill system
```

No seed data. Every mind is forged by the model on first use and cached in `council_minds`.

---

## How it works, end to end

**1. The reader asks.** `POST /functions/v1/council` with `{action:"start", question, situation?, category?}`
and the user's Supabase access token. `category` is the menu tile: `health | career | investing |
relationships | literature | other`. The function verifies the token, opens an SSE stream, and returns the
response headers immediately.

**2. Cast** (Sonnet 5, JSON, ≈ 3 s). Matching the question to the right minds is the product's first
priority, so this step gets the strong model. The prompt works in two steps: understand the question (its
kind, what it asks underneath the wording, the tension inside it), then cast for fit, then check contrast.
The caster gets the category's bench of 15–20 suggested names (`BENCHES` in `prompts.ts`) but may go
outside it whenever a better fit exists. Each seat returns a `why` — the specific work or idea that makes
this mind fit this question — which the reader sees on the council card.

**3. Screen** (Haiku, ≈ 1 s). An independent check of the three names against the hard rules: never anyone
known primarily for hate, racism, extremism, violence or crime; no sitting politicians; no private
individuals; no fictional characters. Code also checks `council_denylist` first. A rejected name triggers
one recast with that name excluded; a second rejection fails the session.

**4. The `cast` event** goes to the client before any forging: session id, the tension, and three seats
with name, `why`, lens and intro line. The card is on screen at ≈ 3–4 s whether or not the minds are cached.

**5. Forge** (Sonnet 5, once per mind, cached). Any seat not yet in `council_minds` gets a persona card
(school, lens, 10 core ideas, claims for/against, blind spots, voice rules, works). Uncached minds forge in
parallel, so a cold session costs one forge (10–20 s), spent while the reader reads the card. Books are
verified in code: Gutendex first (a Project Gutenberg hit means a free edition and the "read free" button),
Google Books otherwise ("get the book"). A `seats` event updates the card once links exist.

**6. Nine turns, serial, round-robin.** Each turn is one streaming Sonnet call, thinking off, effort low:

- system prompt = one identity block ("an AI persona inspired by X; speak as X would, applied to the
  reader's present-day situation; paraphrase, never quote verbatim; say you're an AI if asked") + shared
  turn rules + two shape examples + the card JSON. Session-independent, so it caches across every session
  that seats that mind (≈ 1,250 tokens, above Sonnet 5's 1,024-token cache minimum).
- user message = the director's note: question, situation, the tension, who is at the table, transcript so
  far, and the cycle instruction — `positions` (turns 1–3, ≤80 words), `pressure` (4–6, ≤60),
  `application` (7–9, ≤60).

Text streams to the client as `delta` events. Every turn ends with a hidden line
`POSITION: … | MOVE: hold|shift|concede | OPEN: …`; the server withholds it from the stream, parses it,
stores it on the turn row and sends it in `turn_end`. That line is the session's state ledger.

**7. Summary** (Haiku, JSON). Title (the question sharpened), agree, differ, fits (drawn only from turns
7–9), one next step, books. URLs come from the cards in code, never from the model.

**8. Reply.** `{action:"reply", session_id, message}`. A message naming a mind goes to that mind (code);
otherwise one Haiku call routes it. At most two mind turns per reply; the second stays silent if the first
reports `OPEN: none`.

**Client pacing.** The server generates at model speed (≈ 30–35 s warm). The store reveals one bubble at a
time with a dwell of ~150 ms per word of the previous one, so the reader never waits after bubble one.
"Skip to the summary" appears from turn 3 and logs the turn index to `council_sessions.skipped_at_turn`
(the only column RLS lets the client update).

---

## Latency, per step (estimates; `council_turns.latency_ms` replaces them after 50 sessions)

| Step | Warm (minds cached) | Cold (a mind cast for the first time) |
|---|---|---|
| Auth + cast (Sonnet) + screen (Haiku) | ≈ 3–4 s | same |
| Council card on screen | ≈ 3–4 s | same — sent before forging |
| Forge uncached minds, in parallel | 0 | +10–20 s, while the reader reads the card |
| First bubble streams | ≈ 5 s | ≈ 15–25 s |
| Turns 2–9 | ≈ 2.5 s each; reading takes ≈ 15 s each | same |
| Summary ready | ≈ 30 s, reader still on bubble 2 | ≈ 45 s |
| Reply: first words | 1–4 s | same |

Cold runs get rare on their own: the cache fills with every session. To pre-fill it, run 50 typical
questions through the API before launch (≈ $3, ≈ 15 minutes).

---

## Deploy

```bash
# 1. Schema
supabase db push                          # applies supabase/migrations/20260921000000_council.sql

# 2. Secrets
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# optional
supabase secrets set COUNCIL_MODEL_MIND=claude-sonnet-5 COUNCIL_MODEL_CAST=claude-sonnet-5 \
  COUNCIL_MODEL_FAST=claude-haiku-4-5-20251001 COUNCIL_TURNS=9 COUNCIL_MIND_THINKING=disabled
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

# 3. Function (keep default JWT verification on; the function also checks the user itself)
supabase functions deploy council

# 4. Client: copy src/council/ into the app, then
#    <CouncilRoom supabase={supabase} category="career" />
```

Local run:

```bash
supabase start && supabase functions serve council --env-file ./supabase/.env.local
curl -N -X POST http://localhost:54321/functions/v1/council \
  -H "Authorization: Bearer <a user's access token>" -H "apikey: <anon key>" \
  -H "content-type: application/json" \
  -d '{"action":"start","category":"career","question":"How does an AI consumer product reach product-market fit, and how do I do GTM for it?"}'
```

Expected events: `cast`, then (cold) `seats`, then `turn_start` / `delta` / `turn_end` × 9, `summary`, `done`.

---

## Three things verified against the docs that would otherwise break the first run

1. **No `temperature` on Sonnet 5 / Opus 5** — a 400 on every request. `model.ts` drops it for that model
   family; the Haiku calls keep theirs.
2. **Thinking is on by default on Sonnet 5.** Mind turns send `thinking: {type:"disabled"}`
   (`COUNCIL_MIND_THINKING=default` to A/B). Cast and forge keep adaptive thinking at low/medium effort.
3. **Prompt caching needs ≥ 1,024 tokens on Sonnet 5** and fails silently below it. Verify after the first
   session: `council_turns.usage.cache_read_input_tokens > 0` on a mind's second turn onward. `prewarm()`
   sends exactly the options the turns use, because thinking config and effort are part of the cache key.

---

## The matching metric

Casting quality is the number one priority and it is measurable. Weekly: pull 20 random sessions,
score each cast `apt / cute / wrong`. Below 80% apt, fix `CAST_SYSTEM` or the benches — nothing else.
`council_minds.uses` tells you which minds get cast most; review those cards first.

---

## Limits and cost

- Supabase Edge Functions: 150 s wall clock on Free, 400 s on Pro; 2 s CPU. A full run is ≈ 35 s of I/O
  wait. `EdgeRuntime.waitUntil` keeps the run alive if the reader closes the app.
- Per session ≈ $0.04–0.06: 9 Sonnet turns (cached card) + Sonnet cast + 2 Haiku calls. A forge is ≈ $0.02,
  once per mind ever.
- Gutendex and Google Books are called without keys; add a Google Books key when it rate-limits.
- CORS is `*`. Set it to `https://app.owlry.ai` before launch.

## Not built yet

- Styling (Flat Playbill), reopening past sessions from the library, saving books to the library.
- The daily letter as a headless run of the same pipeline.
- Legal posture for living figures is deliberately ignored for the MVP; the screen and denylist are
  brand safety, not legal cover.
