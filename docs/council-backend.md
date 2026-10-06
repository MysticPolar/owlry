# The Council Room — backend

*The Council is the classic owlry with a new visual and a new entry point:
instead of one owl at a desk, three thinkers at a table. The library, the
reading, the profile are the same product, so the backend is the same
backend — the same Supabase project, the same accounts, the same edge-function
patterns — extended with the tables and the one model call the council needs.*

## Shape

Everything is additive and namespaced `public.owlry_council_*`. Nothing that
exists is read or altered, and the Council shares with the classic app:

- **identity** — `auth.users`. An account made in either app works in both.
- **the rate limiter** — `owlry_rl_bump()` over `rate_limit_buckets`.
- **the invite ledger** — `invitation_codes` via `owlry_claim_invite()`.
- **the Gemini client** — `_shared/gemini.ts`, the `GEMINI_API_KEY` secret,
  the same two model tiers with the same Flash-Lite fallback.

| Object | What it holds | Who writes |
| --- | --- | --- |
| `owlry_council_state` | one jsonb row per reader: interests, shelves, reading progress, bookmarks, highlights, prefs (`CloudState` in `src/lib/sync/types.ts`) | the client, compare-and-swap on `revision` (the `owlry_progress` fence, reused) |
| `owlry_council_sessions` | one row per council: seats, transcript, takeaways, live overrides | the client, per-session last-write-wins |
| `owlry_council_profiles` | the public half of a reader: handle (unique), name, bio | its owner; `council-signup` on creation via `owlry_council_claim_handle()` |
| `owlry_council_posts` | the feed: a passage, a book, and what it changed for you | the author (insert/delete); every signed-in reader can read |
| `owlry_council_likes` | (post, reader) pairs — likes are *counted*, never stored on the post | the reader |
| `owlry_council_follows` | (reader, handle) pairs | the reader |
| `owlry_council_minds` | cards recalled from the model for thinkers and books outside the curated catalogue, one per (kind, request key, language) | `council-chat` (service role), after it has checked the card; every signed-in reader can read |

Migrations: `supabase/migrations/20260915120000_owlry_council.sql` and
`20260929120000_owlry_council_minds.sql`.

### Edge functions

- **`council-chat`** (JWT-gated) — the live council. Modelled on `owl-chat`:
  the caller's JWT is revalidated, the reader is rate-limited (30/hour,
  150/day; an opening counts double), then one schema-forced Gemini call
  writes the words. Two modes:
  - `open` → intros, round one, round two, the takeaways and the reading
    reasons, in one call;
  - `turn` → the replies to a follow-up, a direct question, added context or a
    passage from the reader;
  - `cast` → three real thinkers for a question the catalogue has no script
    for, one book each (see *Minds from the model* below);
  - `figure` → a thinker's card from the model's own knowledge — bio, works,
    attributed quotes, voice lines — cached in `owlry_council_minds`;
  - `book` → a book's card and its reading guide, cached the same way.

  The client sends the three **dossiers** (name, role, bio, works, quotes,
  the seat's book), so `src/content` stays the one source of truth for the
  curated seats and the function stays generic. It is stateless but for the
  minds cache: the client owns the session row because the scripted engine
  writes it too. On top of the per-reader limits, one bucket
  (`council-chat:all`) caps the room's Gemini calls per UTC day
  (`COUNCIL_DAILY_CAP`, default 1500) — the project's only spend guard.

- **`council-signup`** (public) — account creation. As with
  `signup-with-invite`, the project has no SMTP, so the account is created
  server-side and auto-confirmed, and the handle is claimed in the same
  request. Invite codes follow the classic ledger; whether one is *required*
  is the Supabase secret `COUNCIL_INVITE_REQUIRED` (default `true`). Public
  endpoints get abused, so it is rate-limited per IP (5/hour) on top.

### The verbatim rule, enforced

The house rule is that only a figure's verified `quotes` render as quotation.
The model is told this; a schema cannot check it; so `council-chat` matches
every `"quote"` segment that comes back against the dossier and demotes
anything else to plain text (`_shared/council/quotes.ts`). The client does the
same check again before it renders (`src/lib/councilClient.ts`).

A dossier quote can itself come from the model (mode `figure`, below). Those
carry `provenance: "model"`; the gate matches them the same way, but the
segment that comes out is marked `attributed: true`, and the chat, the
figure sheet and the About note label it *attributed* rather than *verbatim*.
The word "verbatim" stays reserved for the curated catalogue, whatever the
model said about its own certainty.

## Minds from the model (MVP)

The catalogue in `src/content` is small on purpose — a few dozen thinkers,
their books, eight scripted councils — so most real questions land on a
generic match. The MVP way past that is to ask the model what it knows: three
recall calls in `council-chat`, with the prompts in
`_shared/council/prompts.ts` (`KNOWLEDGE_SYSTEM`, `castUser`, `figureUser`,
`bookUser`), the schemas in `schemas.ts` (`CAST_SCHEMA`, `FIGURE_SCHEMA`,
`BOOK_SCHEMA`) and the post-processing in `minds.ts`. They are recall, not
voice: low temperature, the model's own knowledge, no search, no document.

| Mode | In | Out | Model | Cost |
| --- | --- | --- | --- | --- |
| `cast` | `question`, `area`, `lang`, `known` (names the client holds full cards for — the curated figures — which the model is asked to prefer when one honestly fits), `avoid` (seats already heard) | `title` (2–5 words) and three `seats`: `name`, `canonicalName`, `short`, `label`, `role`, `why`, `stance`, `book {title, year}`; `id` is the catalogue-style slug, so a curated thinker comes back under the id the client already has | `MODEL_VOICE`, Flash-Lite fallback, temperature 0.6 | 1 |
| `figure` | `name`, `hint` (a disambiguating line, usually the cast seat's role), `lang` | the card: `id`, names, `role`, `label`, `initials`, `born`/`died`, `bio`, up to 4 `works`, up to 5 `quotes` (`text`, `lang`, `source {work, loc}`, `gloss`, `certainty`, `provenance: "model"`), `voice` templates with the engine's `{q} {ctx} {passage} {book}` placeholders | `COUNCIL_RECALL_MODEL` (default `MODEL_VOICE`), **no fallback**, temperature 0.3 | 1, or 0 when cached |
| `book` | `title`, `author`, `hint`, `lang` | the card: `id`, `authorId`, titles, `year`, `category`, `axes`, `tags`, `blurb`, an epigraph `quote` or null, `summary {gist, ideas}`, `start {label, title, why}`, `guide {heading, paragraphs}` — the Owlry's own walk through the starting section, never the book's text | as `figure` | 1, or 0 when cached |

What the prompts insist on, and what the code checks afterwards:

- **Real or nothing.** Only thinkers and books that exist; a name the model
  does not recognise comes back `known: false`, which the function turns into
  a `404 unknown_mind` / `unknown_book` — an answer, not a failure; the client
  keeps what it has. Every uncertain field is null or shorter, never filled in
  to look complete.
- **Quotation is sacred, still.** A quote is included only when the model is
  confident of the words *and* the work; no invented chapter or page (`loc`
  stays null); the model marks each `exact` or `attributed`. Whatever it says,
  every recalled quote is `provenance: "model"` and renders as *attributed*.
  `minds.ts` drops quotes without a work, de-duplicates them with the same
  normalisation the gate uses, and caps them at five.
- **Quotes keep their language.** English for English-language authors and
  for the standard translation of others (translator in `loc` only when sure);
  Chinese stays Chinese; a `gloss` carries the reader's language when it
  differs — the same rule as the curated catalogue, so the chat's *译文* line
  works unchanged.
- **The rest is paraphrase**, in the reader's language, with the specific idea
  named; living people by their published work only; no advice on medical,
  legal or financial ground; no markdown inside a field.
- **The guide is not the book.** `book` returns 3–6 guide paragraphs in the
  guide's own words; the client shows them as a `text` of kind `guide` with
  the existing disclaimer.
- **Enums are the client's.** `category` and `axes` are the `Category` and
  `Axis` unions from `src/content/types.ts`, spelled out in the schema and in
  the prompt; the coercer falls back to `Philosophy` / `['philosophy']`.

The recall modes skip the Flash-Lite fallback on purpose: a smaller model
recalls less and invents more, and a wrong card is worse than no card. Point
`COUNCIL_RECALL_MODEL` at a stronger tier if quotes come back thin.

**Cache.** A card is looked up in `owlry_council_minds` by `(kind, key, lang)`
before the rate limiter — a hit costs no quota and no model call — and kept
under both the request key (`keyOf(name)`, or `keyOf(title)--keyOf(author)`)
and the canonical name the model returned, so a later request by either
spelling hits. Every reader therefore gets the same card and the same
attributed quotes, which keeps the gate consistent across sessions. A missing
table (migration not applied yet) reads as a miss and the function still
answers. To refresh a card, delete its rows.

**Checking without a key.** `deno check --node-modules-dir=none
supabase/functions/council-chat/index.ts` typechecks the function (the flag
keeps Deno away from the app's `node_modules`); `minds.ts` and `quotes.ts` are
pure, so the coercers and the gate run under `deno test` with hand-written
replies; every schema compiles under a strict JSON Schema validator and uses
only the keywords the deployed `owl-chat` schemas already use. What cannot be
checked here is the model itself: nothing in this repository can call Gemini
without the project's key, so the first live run of each mode is a manual
step (below).

## Where the backend stands (29 September 2026)

- The Supabase project (`twxzbpfchoctxyjeivvr`, "Owlry Landing Page") is
  **paused** (`INACTIVE`). Nothing below works until it is restored from the
  dashboard.
- The council migration and the two council functions have **never been
  deployed from this branch**: the deploy workflow runs on push to
  `renovation/homescreen` only, and its last run was on that branch on
  30 July. `COUNCIL_BACKEND` is not set, so the `/council/` preview is still
  the offline prototype by design.
- Gemini is reached only through `_shared/gemini.ts` with the function secret
  `GEMINI_API_KEY`; the key never enters the repository, the workflow or the
  Vite build.
- There is no test runner for the functions in CI; `deno check` (above) is the
  local substitute. `owl-chat` currently has two type errors against the
  latest `supabase-js@2` typings; it deploys and runs regardless, since the
  Supabase bundler does not typecheck, but it is worth pinning.

Deployed on 3 October 2026, through the Supabase connection rather than the
workflow: the GitHub integration this session runs under cannot dispatch
workflows (403), so the two council migrations were applied as plain SQL
(the `drop … if exists` lines left out — the connection's tool holds any
`drop` for a confirmation, and on a fresh schema they are no-ops) and the two
functions were uploaded with their `_shared` modules. `council-signup`
answers its own validation errors; `council-chat` gets past the key check
and refuses the anon key with its own `unauthorized`, so the bundle runs.

The switch-on sequence, in order:

1. Restore the project (Supabase dashboard → the paused project → *Restore*).
2. Run **Deploy Supabase backend** from the Actions tab with this branch
   selected. It applies both council migrations and deploys `council-chat` and
   `council-signup`. It needs the `SUPABASE_ACCESS_TOKEN` secret and the
   `SUPABASE_PROJECT_REF` variable, both already used by the July run.
3. Edge Function secrets: `GEMINI_API_KEY` is already there for `owl-chat`;
   add `COUNCIL_INVITE_REQUIRED=false` to open sign-up, and optionally
   `COUNCIL_DAILY_CAP` and `COUNCIL_RECALL_MODEL`.
4. The preview workflow now builds `/council/` with the Supabase keys by
   default; set the repository variable `COUNCIL_BACKEND=off` to get the
   offline prototype back.
5. Smoke-test in this order, each with a signed-in session's JWT as the
   bearer: `cast` for a question outside the eight scripts; `figure` for one
   of its seats (send the cast seat's `role` as `hint`); the same `figure`
   again (expect `cached: true`); `book` for the seat's book; then `open` with
   the recalled seat sent as a dossier whose quotes carry
   `provenance: "model"`, and confirm the copied quote comes back
   `attributed: true`. Read the function logs for `[council-chat]` lines.
6. Apple / Google sign-in: enable the providers in the dashboard when wanted.

## The client

Every seam is a no-op until `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are
set (`src/lib/supabase.ts` exports `null`), so the offline prototype is
unchanged.

- **Live council** (`src/lib/councilClient.ts`, wired in `src/store/useStore.ts`).
  The scripted session is created first and shown at once. The live words are
  requested in the background and *overlay* the same messages (`Message.live`,
  `CouncilSession.live`); playback pauses on a message that is still being
  written (`pending`), so a reader never sees a line change under them.
  Replace drops the live lines (the others' replies name the old thinker),
  re-opens live, and stashes what it dropped on the `Replacement` so Undo
  restores it without a second call. Any failure keeps the script.
- **Auth** (`src/store/useAuth.ts`, `src/lib/auth/api.ts`) — a separate store,
  as in the classic app, so a session never lands in the localStorage blob.
- **Sync** (`src/lib/sync/`) — on sign-in the cloud state is pulled and
  **merged** with what the reader did as a guest (union of shelves,
  highlights, bookmarks; furthest reading progress; newer preferences), the
  councils are pulled and merged per id, the feed is loaded, and the result
  is pushed. While signed in, changes are pushed after a 1.5 s debounce. On
  sign-out the device returns to the demo state.
- **Feed** (`src/lib/social/api.ts`) — cloud posts sit in front of the seed
  posts; likes and follows write through.

## Deploying

1. `Deploy Supabase backend` (`.github/workflows/owl-chat-deploy.yml`) applies
   the migration and deploys both functions alongside the classic ones. It
   runs on push to the live branch; to deploy from the Council branch, run it
   from the Actions tab with the branch selected. It needs the existing
   `SUPABASE_ACCESS_TOKEN` secret and `SUPABASE_PROJECT_REF` variable.
2. `GEMINI_API_KEY` is already a function secret for `owl-chat`; `council-chat`
   reads the same one. Set `COUNCIL_INVITE_REQUIRED=false` there to open
   sign-up.
3. Set the repository variable `COUNCIL_BACKEND=on` and re-run the Pages
   workflow: the `/council/` preview then builds with the same Supabase keys as
   the root app. Until then the preview stays the offline prototype, so it
   never points at tables that don't exist yet.
4. Apple / Google sign-in buttons call `signInWithOAuth`; they work once the
   provider is enabled in the Supabase dashboard and say so until then.

## Not done yet / open

- ~~The live council is English-only on the client.~~ The client now sends the
  reader's language (`lang` in `CloudState`, chosen in Settings) with every
  call.
- **Recalled minds are wired in** (`docs/council-orchestration.md`): a typed
  question no script covers is cast live, the recalled cards sit behind
  `figure()` / `book()` through the registry in `src/content/minds.ts`, and the
  chat, the figure sheet and the book page label them. Still open there: the
  cards are device-local (re-asked from the server cache on another device,
  lazily, as screens are reached); a cast's title stays in the language it was
  asked in; the `known` list sent to `cast` is capped at forty names by the
  function, so the catalogue's order decides who is offered.
- After a Replace, only the opening (two rounds + cards) is regenerated live;
  later follow-ups fall back to the script for the new seat.
- Comments on posts are a count in the UI and nothing else yet.
- Book text is still the prototype's public-domain passages and reading
  guides; the classic app's `book-proxy` / foliate-js reader is the candidate
  for real EPUBs.
