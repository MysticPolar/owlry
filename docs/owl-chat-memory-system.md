# Owl Chat & Memory System — as built (OwlChat branch)

Scout (the chat recommendation) and Peek (the tap-to-open reading letter) are
backed by two Supabase edge functions, persistent chat history, and a
two-layer reader memory. This doc describes what's actually in the repo;
`owl-chat-pipeline.md`, `owl-chat-implementation-plan.md`, and
`owl-chat-revision.md` are the design history that led here.

## Identity & gating

Invite-gated Supabase Auth (email + password). `src/lib/supabase.ts` exports a
`supabase` client that is `null` whenever `VITE_SUPABASE_URL`/
`VITE_SUPABASE_ANON_KEY` aren't set — every seam below checks that flag
(`isConfigured`) and falls back to the original fully-offline mockup when it's
absent. `src/components/auth/LoginGate.tsx` is the sign-in/invite-signup UI;
`signup-with-invite` (v4, `supabase/functions/signup-with-invite/`) validates
an invite code against the real `invitation_codes` table and atomically claims
it via the `owlry_claim_invite` RPC.

## The pipeline

```
user message ──▶ owl-chat edge fn (JWT · rate-limited: 20/h, 120/day)
                 ├─ persist the user's turn → owlry_chat_messages
                 ├─ Haiku digest:  message + last 12 turns + full memory
                 │        → semantic_query + selected_memory(≤5) + topic_candidate
                 ├─ Sonnet Scout:  ONLY semantic_query + selected_memory
                 │        → {say, main bookmeta, picks, note?, chips, slug}
                 ├─ persist owl turns (msg/letter/note rows) · stash peek_ctx
                 └─ waitUntil: Haiku memory merge → validated write (never blocks the reply)

tap letter card ─▶ owl-peek edge fn (JWT) → cached? return : Sonnet Peek
                   book + query + selected_memory (dated topics kept) → LetterWire → cached
```

Client seam: `src/lib/owlClient.ts` (`fetchOwlTurn`/`fetchLetter`) calls
`supabase.functions.invoke('owl-chat' | 'owl-peek')`; on any failure — no
backend, network error, malformed response — it falls back to the offline
brain (`src/lib/owlBrain.ts`) / catalog, so the chat never breaks and renders
byte-identically to the mockup when unconfigured.

## Wire contracts

- **Scout** (`src/lib/owlWireV2.ts`): `ChatV2Response` `{say, main, picks, note,
  chips, slug}`. `mapChatV2()` splits `say` into clickable `MsgNode`s via a
  3-tier match (exact title substring → case-insensitive span → deterministic
  append), registers every mentioned book, and returns the same `OwlReply`
  shape the store already consumed — `sendToOwl`'s reply handling needed no
  changes.
- **Peek** (`src/lib/owlContract.ts`): `LetterWire` — unchanged from the design
  docs, maps onto the `Guide` shape `Letter.tsx` renders with a typewriter.

Server-side: `supabase/functions/owl-chat/` and `supabase/functions/owl-peek/`,
sharing `supabase/functions/_shared/` (`schemas.ts` for the JSON-schema
structured-output contracts, `validators.ts` for the business-rule checks JSON
Schema can't express, `memory.ts` for the memory sanitizer, `slug.ts` — a
byte-identical port of `src/lib/cover.ts`'s `slugify()` — and `prompts/` for
the four system prompts).

## Persistent history

Every turn is written to `owlry_chat_messages` (`who`, `kind`, `payload jsonb`,
RLS: own-select only, service-role writes). `src/lib/chatHydrate.ts`
(`rowsToChat`) rebuilds `ChatItem[]` + tray + strip + chips from persisted
payloads, re-registering every book so the UI resolves it exactly as it did
live. The store's `bootstrap()`/`hydrateChat()` load **today's** rows into
Discover (or greet, if none); `src/lib/history.ts` + `History.tsx` list **past**
days and show them read-only, reusing the same chat-item renderer
(`src/components/chat/ChatItems.tsx`) extracted out of `DiscoverScreen`.

## Memory (`owlry_user_memory`, one row per user)

- **Long-term** (`long_term jsonb`, ≤2000 chars): `{profile, focus, taste:
  {loves, avoids, depth, length}, goals, books: [{t, reaction, ts}]}`.
- **Short-term** (`topics jsonb`, ≤1200 chars): dated entries `{d, topic,
  gist, book?}` — this is what lets Peek make a dated callback ("you
  mentioned X on june 12").
- The Haiku merge job emits a full rewrite each turn; `_shared/memory.ts`'s
  `sanitizeLongTerm`/`mergeTopic` enforce the allowlist, enums, every cap, a
  PII scrub, and dedupe/eviction — the model's output is never written raw.
- **View + edit + forget**: RLS grants the signed-in reader full CRUD on their
  own row, so `src/components/profile/MemoryCard.tsx` reads/writes directly via
  `supabase-js` — no edge function involved.

## Testing

`npm test` runs, in order: `owl-smoke` (offline brain), `owl-contract-smoke`
(Peek wire), `owl-wire-v2-smoke` (Scout wire + slug parity against the
server's port), `memory-merge-smoke` (imports the real `_shared/memory.ts`),
`chat-hydrate-smoke`, `store-smoke` (game loop + chat sequencing).

## What's still open

Everything above ships in this repo; deploying it to the live Supabase project
is a separate, explicitly-gated step (schema migration, edge function deploy,
`ANTHROPIC_API_KEY` secret, a test invite code) — see the PR/handover notes for
the exact order.
