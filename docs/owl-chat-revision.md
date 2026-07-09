# Owl Chat — Revision: lazy letter + semantic_query (OwlChat branch)

> **Historical design doc — the lazy-letter-on-tap + digest/semantic_query
> ideas here are still current** and now live as Peek (`owl-peek`, fired on
> tap) and the Haiku digest step inside `owl-chat`. See
> [`owl-chat-memory-system.md`](./owl-chat-memory-system.md) for the as-built
> wire contract, memory system, and persistent history added on top.

> Supersedes the "one streamed call" decision from the files9 SPEC. The goal
> needs the opposite: a digest stage, and a letter that is **generated only when
> the reader taps the card**, with a typewriter reveal. Three calls per turn now,
> not one.

## Why this changes the SPEC

| files9 SPEC locked | This revision |
| --- | --- |
| One call per turn | **Three calls**: A digest → B pick → C letter |
| No `semantic_query` digest | Call A **is** the digest (Haiku) |
| Letter streams inline with the reco | Letter is Call C, **fired on tap**, typewriter-rendered |
| `user_data` recorded only | Call A **reads** memory to build the query (memory selection) |

## The pipeline

```
turn:
  Call A — Haiku  "digest"          in:  message + history + user_memory(prose) + user_data(JSON)
                                    out: semantic_query {themes[], mood, intent, avoid[],
                                         depth, length, language, selected_memory[], note_domain?}
  Call B — Sonnet "pick + bubble"   in:  semantic_query  (+ cached owl persona prompt)
                                    out: HEAD {book_title, author}
                                         BODY {bubble nodes, main book meta, also[], note?, chips}
                                         — NO letter
  → render the bubble, then a letter card (empty: "tap to open")
  server caches {slug → {head, semantic_query, selected_memory, main}}

reader taps the letter card:
  Call C — Sonnet "letter"          in:  {slug} → server looks up {book, semantic_query, selected_memory}
                                    out: letter {res, chap, core, ins[≥3], close, take, ask, fr[3]}
  → typewriter reveal in Letter.tsx; cache {slug → letter} so re-opening never regenerates

after the reply (non-blocking, unchanged):
  prose memory (Sonnet) + structured memory (Haiku) write jobs
```

**Memory selection (the earlier #4 gap):** Call A is where memory is *sorted*. Haiku
reads the full `user_data` + prose line and emits only the relevant slice as
`selected_memory`, which flows into B (the pick) and C (the letter). Nothing else
reads raw `user_data`.

**Retrieval:** with no vector store yet, "retrieval" = the model's open-world
knowledge guided by `semantic_query`. The query is the seam where a real book
index plugs in later (its only job today is to structure intent + select memory).

## Generate-once + typewriter

- The turn reply no longer carries letter content — only a **ref** to offer a letter
  for the main book.
- Tapping fires `fetchLetter(ref)`: if a guide for that ref is already in the
  registry → ready instantly (generate **once**); else status `loading` → Call C
  (live) or catalog `GUIDES` (offline) → register → status `ready`.
- `Letter.tsx` shows "the owl is writing…" while loading, then reveals the letter
  with a **sequential typewriter** (skippable; instant under `prefers-reduced-motion`).

## Models

| Call | Model | Why |
| --- | --- | --- |
| A digest | `claude-haiku-4-5` | light extraction + memory selection |
| B pick + bubble | `claude-sonnet-4-6`, temp 0.8 | judgment + mockup tonality |
| C letter | `claude-sonnet-4-6` | the literary centerpiece (Opus optional) |
| memory prose / structured | Sonnet / Haiku | unchanged |

## Client seam changes

- `fetchOwlTurn` → bubble + book + chips + note, **no letter**.
- new `fetchLetter(ref)` → a `Guide` (offline: catalog `GUIDES`; live: Call C).
- `openLetter` becomes async with `letterStatus: idle|loading|ready`; caches per ref.
- contract splits: turn BODY drops `letter`; a separate letter wire + `validateLetter`
  + `letterToGuide`.

## Files

- server: `digestPrompt.ts` (A, new), `systemPrompt.ts` (B, revised — no letter),
  `letterPrompt.ts` (C, new), `turn.ts` (orchestrate A→B + `handleLetter`), README.
- client: `owlContract.ts` (split), `owlClient.ts` (+`fetchLetter`),
  `store/useStore.ts` (async `openLetter` + `letterStatus`), `Letter.tsx` (typewriter),
  `hooks/useTypewriter.ts` (new).
- tests: `owl-contract-smoke.ts` (turn-without-letter + letter wire).

## Tonality fix (#1)

`systemPrompt.ts` (Call B) gains 3–4 few-shot anchors drawn from the mockup's real
`say` lines, so live bubbles match the mockup cadence, not just "lowercase + warm."
