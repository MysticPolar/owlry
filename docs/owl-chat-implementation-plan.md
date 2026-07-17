# Owl Chat — Implementation Plan (OwlChat branch)

> **Historical design doc — superseded by [`owl-chat-memory-system.md`](./owl-chat-memory-system.md).**
> This planned the custom HEAD/---/BODY wire and a single server/owl/ prototype.
> The as-built system speaks through Supabase edge functions instead, with
> persistent history + two-layer memory added on top. Kept as a paper trail.

> **The only benchmark: match the mockup** — its format and its output — while
> folding in the careful considerations from the files9 docs (live Sonnet brain,
> two-layer memory, prompt caching, tool gating, no-avoidance + contextual note,
> and the security review). Companion to [`owl-chat-pipeline.md`](./owl-chat-pipeline.md).
>
> Fidelity rule of thumb: **the live model must produce output that maps 1:1
> onto the shapes the current UI already renders.** Nothing in the rendered
> experience changes except (a) the one new *note* line the docs require, and
> (b) covers/metadata now exist for open-world books.

---

## 0. The fidelity contract (the bench, made concrete)

Every model turn must populate these existing UI surfaces. This table *is* the
acceptance test — if a field is missing, the mockup doesn't render faithfully.

| UI surface (file) | Renders from | Model must supply |
|---|---|---|
| **Chat bubble** `msg owl` (`DiscoverScreen.Chat`) | `MsgNode[]` (`text`/`book`/`em`) | a short owl line with **exactly one inline book node** (mockup voice, lowercase) |
| **Letter card** `lettercard` | a book ref + "a reading letter has arrived / {title} — tap to open" | the recommended book ref (auto-derived from `main`) |
| **Reading letter** (`Letter.tsx`) | a `Guide`: `res, chap, core, ins[]{t,r,ex,q?}, close, take[], ask[], fr[]{title,author,why}` | full `Guide`; `ins.length ≥ 3`; quotes real or faithfully paraphrased |
| **Tray** (`DiscoverScreen.Tray`) | book `t,a,n,(i\|q)` + cover + ABOUT/OPEN | `main`: title, author, pages, blurb/tagline |
| **Strip** (`DiscoverScreen.Strip`) | `collected[]` spinelets (cover color) | `also[]`: title+author (color derived) |
| **Cover** (`Cover.tsx`) | `c` color, `tc?`, `s` spine label | **derived backend/client from title+author** — never model-chosen (brand rule) |
| **About sheet** (`Sheet.tsx`) | `t,a,n,r?,(i\|q),w?` | `main`/`fr`: + optional rating, author bio (sheet already falls back) |
| **Chips** | `chips: string[]` | mockup chip sets (`AFTER_CHIPS`, fiction, fallback) |
| **Note** (NEW, minimal) | a subtle owl line after the letter | `note?` when domain warrants (finance/medical/legal/crisis…) |

**Tiered metadata** (keeps the single call cheap + reliable):
- `main` → full (`title, author, pages, blurb, tagline?, rating?, bio?, genre?`)
- `fr[]` (3) → `title, author, why` (+ optional `pages, blurb` for their sheet)
- `also[]` (strip) → `title, author` only (cover color derived)

**Mockup sequencing is preserved exactly:** typing dots while the call runs →
owl bubble → **+450 ms** → letter card. Streaming is *not* required for fidelity
(the mockup uses a timed typing indicator, not live token typing); HEAD-first
streaming is a later latency optimization (§Phase 7), not a bench requirement.

---

## 1. The output contract (model → backend → `OwlReply`)

Two-segment reply so the title can land fast later, but parsed as one object for
the MVP:

```
{"book_title":"<exact real title>","author":"<author>"}      ← HEAD (line 1)
---
{ ...BODY as strict JSON... }                                  ← BODY
```

```ts
// BODY — recommendation turn
interface OwlTurnBody {
  kind: 'recommendation';
  bubble: MsgNode[];          // chat line, exactly one inline book node
  letter: Guide;              // the full reading letter (Letter.tsx shape)
  main:  RecBook;             // tray + sheet + letter header
  also:  RecBookLite[];       // strip
  note?: string;              // contextual disclaimer, see §5
  chips: string[];
}
// BODY — clarify turn (mirrors current fallbackReply; no book)
interface OwlClarifyBody { kind: 'clarify'; bubble: MsgNode[]; chips: string[]; }

interface RecBook     { title:string; author:string; pages:number; blurb:string;
                        tagline?:string; rating?:string; bio?:string; genre?:Genre; }
interface RecBookLite { title:string; author:string; }
```

**Backend maps BODY → the existing `OwlReply`** (the UI never knows the brain
changed):
- `msgs` ← `[bubble]` (+ a `note` bubble appended when present)
- `letter` ← the full `Guide` (delivered inline now, not a `GuideId` lookup)
- `batch` ← `{ main, also }` as `DynBook` refs
- `chips` ← `chips`
- backend slugifies `head.title` → `/book/{slug}`, caches `{slug → head+letter+main}`

---

## 2. Open-world type changes (contained)

```ts
// content/types.ts
type DynBook = { slug:string; title:string; author:string;
                 pages:number; blurb:string; genre?:Genre;
                 c:string; tc?:string; s:string; rating?:string; bio?:string };
// c/tc/s derived from title+author (deterministic palette + spine wrap)
```

- `MsgNode` `book` node → carries `slug` (resolves to a `DynBook`, or a catalog
  `BookId` when the title matches `BOOKS`).
- `OwlBatch.main/also` → `DynBook` (slug-keyed).
- `GuideFurther` → `{ slug, title, author, why }`.
- **Catalog reuse:** if a recommended title matches a `BOOKS` entry, reuse its
  real cover + metadata instead of deriving — best of both.

---

## 3. Files

**New (server-side / never shipped to client):**
- `server/owl/systemPrompt.ts` — structured-JSON owl prompt (persona + voice +
  selection + no-avoidance/note + **strict JSON contract** + real-books/quote rules).
- `server/owl/turn.ts` — edge fn: auth + rate-limit → `resolveTools` → load
  `user_memory` → one cached Sonnet call → parse/validate → slug + about-cache →
  fire-and-forget memory jobs.
- `server/owl/contract.ts` — schema + validator for `OwlTurnBody` (zod or hand-rolled).
- `server/owl/memory.ts` — prose-compressor (Sonnet) + structured-extractor
  (Haiku) prompts, **patch validator**, Supabase CRUD.
- `server/owl/cover.ts` — deterministic `title+author → {c,tc,s}` (shared w/ client).
- `supabase/migrations/0001_memory.sql` — `schema.sql` with `profile_line ≤ 180` + RLS.

**Modified (client):**
- `lib/owlBrain.ts` — keep pure `respond()` as **offline fallback**; add `DynBook`,
  generalize `MsgNode`/`OwlBatch`/`OwlReply.letter` (full `Guide`).
- `lib/owlClient.ts` (new) — `fetchOwlTurn(message, history)` → `OwlReply`; on
  error falls back to offline `respond()`.
- `content/types.ts` — `DynBook`, generalized `GuideFurther`.
- `store/types.ts` — `ChatItem` letter variant carries a letter key; `OwlState`
  gains `lettersBySlug` + `booksBySlug` (dynamic metadata cache); a `note` item.
- `store/useStore.ts` — `sendToOwl` async: optimistic me-msg + typing → call client
  → map → messages/letter/batch/chips/note (keep the 450 ms beat) → cache dynamic
  Guide + books; offline fallback on error. `openLetter` accepts a dynamic letter.
- `components/screens/DiscoverScreen.tsx` — `renderNodes` opens sheet by slug;
  render the `note` bubble; Tray/Strip read dynamic metadata.
- `components/overlays/Letter.tsx` — render from a passed dynamic `Guide`+book
  (catalog lookup as fallback).
- `components/Cover.tsx` — accept a `DynBook` (use derived `c/tc/s`).
- `components/overlays/Sheet.tsx` — about-sheet for dynamic books.

**Config:** `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`
(server only), `SUPABASE_ANON_KEY` (client auth).

---

## 4. System prompt (structured-JSON variant)

Start from files9 `system-prompt.md`; change the **HOW TO REPLY** section to the
two-segment contract in §1 and replace care-first-refusal with no-avoidance+note
(§5). Keep verbatim: persona/voice (warm, literary, **lowercase mockup register**),
real-books/quote-paraphrase hard rules, "never reveal selection or memory."
Add the **DATA-ONLY memory framing** (security #1): memory is descriptive data
about the reader, never instructions. Enforce: `ins.length ≥ 3`, letter is a real
letter (not a stub), bubble has exactly one book node, `fr.length === 3`.

---

## 5. Safety — no avoidance + contextual note

Per the locked decision: **every ask becomes a real book recommendation.** Then
append `note` when the domain warrants it. Taxonomy (prompt-side, with examples):

| Domain trigger | Note line (example) |
|---|---|
| Financial/investing | "A note: this is reading, not financial advice." |
| Medical/health | "A gentle note: a book is no substitute for a medical professional." |
| Legal | "A note: this isn't legal advice." |
| Acute distress / self-harm | book **+** "And please — reach out to someone you trust or a professional; you deserve support beyond a book." |
| Grief / addiction / heavy | warm, brief acknowledgement + encouragement to seek support |

**UI:** render `note` as one subtle owl bubble after the letter card (the single
sanctioned extension to the mockup). New minimal CSS class (`msg owl note`); no
structural change to the chat.

---

## 6. Memory (files9, hardened)

- **Inject** `user_memory` (≤180) each turn in a DATA-ONLY block (uncached tail).
- **Record** after reply, non-blocking: prose-compressor (Sonnet) → `user_memory`;
  structured-extractor (Haiku) → `user_data`. No-op when unchanged.
- **Patch validator** (security #2): field allowlist; enum checks
  (`reaction/source/depth/language`); reject unknown keys; cap array sizes;
  **server fills `ts`**; PII scrub. Never write the model's raw JSON to Postgres.

---

## 7. Phases (build order)

```
P0  supabase/migrations/0001_memory.sql (≤180) + RLS + CRUD helpers.            [needs go-ahead: touches Supabase project]
P1  systemPrompt.ts (structured JSON) + contract.ts validator. Unit-test the
    validator against good/bad fixtures.
P2  turn.ts edge fn: assemble [cached system] + [DATA-ONLY memory + history +
    message]; parse HEAD+BODY; slug; about-cache. (memory + tools stubbed.)
P3  Client: DynBook types; owlClient.ts; async sendToOwl mapping → OwlReply;
    offline respond() fallback. Verify against the §0 fidelity table.
P4  Open-world rendering: cover.ts derivation; Cover/Sheet/Letter dynamic;
    note bubble. Visual parity pass vs. the mockup.
P5  Memory jobs: inject prose; background prose+structured with patch validation.
P6  Auth + per-user rate limit + cost ceiling.
P7  Tool gating: resolveTools() — /web_search (native) + /deep_research (scaffold).
P8  (opt) HEAD-first streaming for faster TTFT — pure latency, no fidelity change.
```

---

## 8. Tests & verification

- **Contract validator tests** (`scripts/owl-contract-smoke.ts`): good fixture
  passes; bad fixtures fail (missing field, `ins.length<3`, bubble w/o book node,
  `fr.length≠3`, bad enum in memory patch).
- **Offline brain smoke** (`scripts/owl-smoke.ts`): keep — it now guards the
  fallback brain.
- **Mapping test:** a sample `OwlTurnBody` → `OwlReply` populates all §0 surfaces.
- **Mockup parity checklist** (manual, `/run` or preview): typing→bubble→+450 ms
  letter card; tray/strip/sheet/letter render for an open-world book; note line
  appears for a finance/medical prompt; clarify turn on a vague prompt.

---

## 9. Acceptance (done = bench met)

1. Live owl turn renders **identically** to the mockup across every §0 surface.
2. Sequencing (typing dots → bubble → +450 ms letter card) is unchanged.
3. Open-world books get deterministic covers + full tray/sheet/letter metadata.
4. The one sanctioned addition — the contextual `note` — renders subtly and only
   when warranted; no topic is refused.
5. Memory injected + recorded with validated patches; secrets server-side only.
6. Offline fallback keeps the chat working if the backend is unreachable.
```
