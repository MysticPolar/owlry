# The council, orchestrated

*How the five calls of `council-chat` are sequenced behind the screens of the
mockup, and what the client does when any of them fails. Companion to
`council-backend.md` (the server) and `council-prompts.md` (the words). The
rule throughout is the one the app was built on: the room never goes dark —
every call has a fallback that is already on screen.*

## The flow, screen by screen

```
Council room — ask
   │
   ├─ a suggestion tap, or a typed question that hits a script's keywords
   │      └─► createSession(script)  ─► open ─────────────────────────────► Discussion
   │
   └─ a typed question no script covers, and the live council is ready
          └─► seats breathe, "Seating the council…"
                └─► cast ──► session from the cast ──► figure ×3 ──► open ─► Discussion
                      │  (seats fill, intro cards)    (cards, quotes)   (lines overlay)
                      └─ fails ─► createSession(default script) ─► open   (as today)

Discussion — follow-up / direct / context / passage ─► turn
           — tap an avatar ─► card from the registry; Replace ─► cast(avoid) once ─► replaceSeat ─► open again
           — the reading card is reached ─► book ×3 in the background
Summary    — the cards `open` wrote; no call
Book       — the card from the registry; `book` if it has not arrived
Reader     — the recalled guide as a text of kind "guide"
```

A **curated** thinker is one in `src/content/figures.ts`; a **recalled** one
is a card the model wrote (`council-chat` mode `figure`). The cast is told the
curated names and prefers them, so a well-known thinker usually comes back
under the id the catalogue already has — and keeps its verified quotes.

## 1. Routing: scripted or cast

`src/content/councils/index.ts` — add `matchScore(question, areas): { script, score }`
beside `matchCouncil`. The rule, in `useStore.ask`:

- a suggestion tap (`councilId` given) → scripted, as today;
- a typed question with `score > 0` (any keyword hit) → scripted, as today;
- `score === 0` and `liveCouncilReady()` → the cast path below;
- otherwise (no backend, signed out, `VITE_COUNCIL_LIVE=off`) → the scripted
  default, as today.

`liveCouncilReady()` is async; `ask` stays synchronous for the scripted path
and returns the session id, or `null` while casting (the council screen shows
the casting state from the store, not from the return value).

## 2. The cast path (council room)

Store, transient (never persisted — strip it in `partialize`):
`casting: { question: string; area: Area; startedAt: number } | null`.

1. `ask(question)` → `set({ casting })`, then `liveCast(question, area, { known, avoid: [] })`
   where `known` = every curated figure's `name` (English names; the model is
   told to write them back exactly).
2. **cast returns null** (offline, 401/429, bad reply) → `createSession` with
   the scripted default (`matchCouncil`) exactly as today, `casting: null`,
   `requestOpening`. A toast is not needed; the room simply fills.
3. **cast returns** → for each seat: if `seat.id` is a curated figure, the seat
   is that figure (its book: the curated work whose title matches the cast's
   `book.title` case-insensitively, else the figure's first work with a
   `bookId`, else a recalled book); otherwise the seat is recalled: register a
   **placeholder** card from the cast seat (name, short, label, role; `bio`
   empty, no quotes, dictionary voice lines, `pending: true`) so `figure(id)`
   answers at once. Create the session (below), `casting: null`, set it
   active. The room fills with the existing `seat-in` cascade; the intro cards
   show the cast's `why`.
4. In parallel for each recalled seat: `ensureFigure(id, hint = seat.role)`
   → `liveFigure` → register the card (replacing the placeholder). Then
   `requestOpening(session)`, but not before the three cards are in or **12 s**
   have passed (`Promise.race`), so the dossiers carry the recalled quotes.
   A seat whose card never comes stays a placeholder: paraphrase only, which
   the gate already guarantees.
5. After the figures: `ensureBook` for every recalled book, in the background,
   never awaited by anything on the council screen.

The session: `scriptId: 'cast'`, `title: cast.title`, `area` from the ask, and

```ts
export interface CastSeat {
  id: string; name: string; canonicalName: string; short: string; label: string; role: string;
  why: string; stance: string;
  bookId: string; bookTitle: string; bookYear: string;
}
export interface CastInfo {
  title: string;
  seats: [CastSeat, CastSeat, CastSeat];
  /** a later cast with `avoid` = the seats; any alternate can take any seat */
  alternates: CastSeat[];
}
// CouncilSession gains `cast?: CastInfo`
```

Ids: a recalled figure's id is the cast's `id` (the server's slug). A recalled
book's id is `${keyOf(bookTitle)}--${figureId}` (port `keyOf` and `slug` from
`supabase/functions/_shared/council/minds.ts` into `src/lib/minds.ts`), and the
card that comes back from `book` is stored under **that** id, with
`authorId = figureId`, whatever id the server gave it — the client's ids are
decided by the cast so a session can name them before any card exists.

## 3. The registry: recalled cards behind the content accessors

`src/content/minds.ts` — a module-level registry (no store import, so
`figures.ts` / `books.ts` can use it without a cycle):

- `registerFigureCard(card: MindFigure)`, `registerBookCard(card: MindBook)` —
  keyed by `(id, lang)`; `registerCast(cast: CastInfo)` — placeholders for
  seats and books not yet carded (never overwrite a real card).
- `mindFigure(id): Figure | undefined`, `mindBook(id): Book | undefined` — the
  active language's card, else the other language's, else the placeholder.
- `figure(id)` in `figures.ts` falls back to `mindFigure(id)` before throwing;
  `book(id)` / `maybeBook(id)` in `books.ts` likewise.

Converting a card to the content shape:

- Figure: `initials` from the card, `color` picked by a stable hash of the id
  from the colours the curated figures already use, `portrait` none, `quotes`
  with `gloss`, `voice` from the card (dictionary fallback lines when a slot is
  empty), plus `recalled: true` (and `pending: true` on a placeholder). Add
  both as optional fields to `Figure` in `src/content/types.ts`.
- Book: `palette` from the first curated book of the same `category`
  (`BOOKS.find(...)`), `isbn` none (typographic cover), `text` =
  `{ kind: 'guide', heading: guide.heading || start.label, note: UI[lang].book.guideNote, paragraphs }`,
  `recalled: true`; a placeholder from the cast has `title`, `authorName`,
  `year` (parsed from `bookYear` when it is a plain number, else 0), empty
  `summary`, empty `start`, `pending: true`. Add `recalled?`/`pending?` to
  `Book`.

The store holds the cards durably on the device:
`minds: { figures: Record<string, MindFigure>; books: Record<string, MindBook> }`
keyed `${id}|${lang}` — persisted (bump the persist `version` to 2 with a
pass-through migrate) and **not** synced through `CloudState`: the server keeps
every card in `owlry_council_minds`, so another device re-asks and hits the
cache at no quota. Say so in a comment where `STATE_KEYS` is defined in
`src/lib/sync/index.ts`. On rehydrate (`onRehydrateStorage`) and on every
change, the slice is pushed into the registry; on rehydrate and after
`applySessions`, `ensureMindsFor(sessions)` re-asks for any card a cast session
needs in the active language. `setLang` calls it too, for the new language
(server cache hits, mostly).

`cast` **is** synced: `src/lib/sync/sessions.ts` writes it into `payload` and
reads it back, so a cast session opened on another device can register its
placeholders and re-ask.

## 4. The engine with no script

`scriptFor(session)` returns `castScript(session)` when `session.cast` is set,
else `council(session.scriptId)` as today. `castScript` synthesises a
`CouncilScript` so every derived view keeps working unchanged:

- `id: 'cast'`, `area`, `question`, `title: cast.title`, `keywords: []`;
- per seat: `figureId`, `why: seat.why`, `bookId`, `bookWhy: UI.cast.bookWhy`
  (filled with `{short}`), `r1: [text: seat.stance]`,
  `r2: [text: the figure's first voice.followUp line with {q} = the question]`,
  `differs: seat.label`, `bestStart` on the first seat;
- `alternates`: `cast.alternates` as `AltScript`s, the same list for every
  seat; `candidatesFor` keeps its unseated filter;
- `takeaways`: `UI.cast.commonGround / fits / nextStep` — honest generic lines
  ("The live council writes this council's summary; until it answers, begin
  with the book marked best start." and the like), which `open` overrides.

`replaceSeat` on a cast session: the alternate's `CastSeat` takes the seat's
place in `cast.seats`, the old one is kept on the `Replacement` (`castSeat`)
so `undoReplace` can put it back. The store then `ensureFigure(to)` (with the
12 s cap) and `requestOpening`, whatever `source` was. `setLang` uses
`c.cast ? c.title : council(c.scriptId).title`.

## 5. The dossiers and the gate

`src/lib/councilClient.ts`: `dossiers(session)` builds a recalled seat from
`figure(id)` as today, but marks each quote `provenance: 'model'` when
`figure.recalled`, and `bookTitle` from the seat's book (`book()` falls back
to the placeholder, so the title is always known). `toSegments` sets
`attributed: true` on a matched quote when the figure is recalled, as well as
keeping the flag the server sent. The chat then shows *attributed* (already
wired). `FigureSheet` shows `t.figure.recalled` under a recalled card's works,
and `t.figure.arriving` instead of the bio while `pending`.

## 6. Replace on a cast session

`FigureSheet` calls `ensureAlternates(session.id)` when it opens on a cast
session whose `cast.alternates` is empty: one `liveCast(question, area,
{ known, avoid: the three seats' names })`, its three seats stored as the
alternates (registered as placeholders, their cards fetched in the
background). The Replace button appears when a candidate exists — it mounts
with `fade-up`, since it arrives after the sheet. A failed recast leaves the
button hidden; nothing else changes.

## 7. Books

`ensureBook(bookId)` → `liveBook(title, author, hint = year)` → register
the card under the client's id. Fired in the background after the figures of a
cast session resolve (and by `ensureMindsFor`). `BookScreen` on a `pending`
book shows the title, the author and `t.book.arriving` with a `fade-up`, then
the card when it lands (the store change re-renders it). The reading cards
hide the "Start with …" line while `start.label` is empty. The reader shows
the guide exactly as a curated guide, with the dictionary note.

## 8. Words, motion, rules

- New dictionary keys in **both** languages: `council.casting`,
  `figure.recalled`, `figure.arriving`, `book.arriving`, `book.guideNote`
  (English as the `GUIDE_NOTE` in `books-1.ts`; Chinese as the guide note the
  `zh/books-*` entries use), `cast.bookWhy`, `cast.commonGround`, `cast.fits`,
  `cast.nextStep`. Screens read them through `useT()`, never literals.
- The casting line under the title mounts with `fade-up`; the empty seats keep
  breathing (existing); the seats fill with the existing cascade; the Replace
  button and the "arriving" notes mount with `fade-up`. Transform and opacity
  only, tokens for timing, under 450 ms.
- Mustard yellow is not used for anything new.
- A recalled quote renders as *attributed* everywhere a curated one renders as
  *verbatim*; nothing recalled ever renders as *verbatim*.
- No live call is awaited by a render; everything arrives into the store.

## 9. Done means

1. Offline build (no `VITE_SUPABASE_*`): every existing journey unchanged —
   suggestions, typed questions, follow-ups, replace/undo, summary, book,
   reader, both languages, reduced motion.
2. With a backend (mocked in the smoke test): a typed question with no keyword
   hit shows "Seating the council…", the seats fill from the cast (one curated,
   two recalled), the intro cards show the cast's reasons, Join plays the live
   opening with a recalled quote tagged *attributed*, the summary shows the
   live cards, the recalled book opens with its summary and reads as a guide,
   Replace offers an alternate after one recast, Undo restores, a language
   switch re-asks for cards, and a reload mid-cast lands on the council
   screen with the ask box (casting is transient).
3. Every failure (cast null, figure 404, book 404, open null) leaves a usable
   screen: the scripted default, a placeholder card, an "arriving" note, the
   synthesised script.
4. `npm run typecheck` and `npm run build` pass.
