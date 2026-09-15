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

Migration: `supabase/migrations/20260915120000_owlry_council.sql`.

### Edge functions

- **`council-chat`** (JWT-gated) — the live council. Modelled on `owl-chat`:
  the caller's JWT is revalidated, the reader is rate-limited (30/hour,
  150/day; an opening counts double), then one schema-forced Gemini call
  writes the words. Two modes:
  - `open` → intros, round one, round two, the takeaways and the reading
    reasons, in one call;
  - `turn` → the replies to a follow-up, a direct question, added context or a
    passage from the reader.

  The client sends the three **dossiers** (name, role, bio, works, verified
  quotes, the seat's book), so `src/content` stays the one source of truth
  and the function stays generic. It is stateless: the client owns the session
  row because the scripted engine writes it too.

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

- The live council is English-only on the client (`lang: 'en'`); the function
  already accepts `zh`.
- After a Replace, only the opening (two rounds + cards) is regenerated live;
  later follow-ups fall back to the script for the new seat.
- Comments on posts are a count in the UI and nothing else yet.
- Book text is still the prototype's public-domain passages and reading
  guides; the classic app's `book-proxy` / foliate-js reader is the candidate
  for real EPUBs.
