# owlry. — Walk with Great Minds

Bring a real question to a council of three great minds. They discuss it in a
group chat — agreeing, disagreeing, answering each other — and hand you a
synthesis, one next step, and one book each to read. **Different perspectives.
A clearer you.**

This branch is the front-end prototype of the redesign (the nine screens on the
"Walk with Great Minds." poster). It is a mobile-first web app with realistic
sample content and simulated AI conversations; the backend is the next phase.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
```

Open it on a phone (or a narrow window) for the full-bleed app; on a desktop
it renders inside a phone frame on a dark desk, like the poster.

## The journey

Ask a question → explore three perspectives → understand the takeaways → open
the relevant reading → save and return.

| # | Screen | Route | What it does |
|---|--------|-------|--------------|
| 1 | Welcome | `#/welcome` | Create an account, sign in, or explore without one |
| 2 | Select interest | `#/interests` | Six tiles, multi-select, "Skip and ask a question" |
| 3 | The Council (Screen 0) | `#/council` | Round table, three empty seats, "What's on your mind?", suggested questions. On submit the seats fill and each thinker is introduced with why they fit |
| 4 | The Discussion (Screen 1) | `#/discussion/:id` | Group chat, two rounds with cross-replies, then the Takeaways and Reading cards. Follow up with everyone or one figure, add context, tap an avatar for background / sources / **Replace** (with undo) |
| 5 | Summary | `#/summary/:id` | What they agree on, where they differ, what fits your situation, one next step, the three books; Save to Library / Continue |
| 6 | Book | `#/book/:id?council=…` | Cover, tags, a verbatim epigraph, why it relates to your question, where to start; Start Reading / Read Book Summary / Save |
| 7 | Reader (Screen 2) | `#/read/:id?council=…` | Literata, three text sizes, bookmarks, saved progress, highlight a passage or **bring it to the council** |
| 8 | Library (Screen 3) | `#/library` | Continue reading, saved books by shelf, All / Reading / Completed, past councils, highlights |
| 9 | Social (Screen 4) | `#/social` | For You / Following feed of passages + reflections; composer asks "What did this change for you?" |
| 10 | Profile (Screen 5) | `#/profile` | Level card, milestones, six-axis reading radar, activity, badges, highlights & reflections |

The Reading tab (`#/reading`) resumes the latest session; Settings
(`#/settings`) edits the profile, text size, account and resets the demo data.

## How the council works (and what is simulated)

Everything the council says is data in `src/content`:

- **`figures.ts`** — ~40 thinkers: role, perspective label, bio, source works,
  and a short list of *verified verbatim quotes with their location*. A figure's
  `voice` holds generic lines for unscripted moments (follow-ups, added
  context, passages from the reader, direct questions).
- **`books-1.ts` / `books-2.ts`** — 45 books: categories, radar axes, a
  summary (gist + main ideas), the recommended starting section, and the
  reader text. Four books carry real public-domain passages from Project
  Gutenberg (`content/texts/*.json`, translator named); the rest carry an
  *Owlry reading guide* to the recommended chapter, labelled as such in the
  reader — never passed off as the book's text.
- **`councils/`** — eight scripted councils, one per interest area plus the
  four questions on the poster: intros, two rounds, follow-up rounds, a
  context round, direct answers, takeaways, and an alternate thinker per seat.

`src/engine/council.ts` turns those into transcripts. Free-text questions are
keyword-matched to the closest council (with a bonus for the reader's chosen
areas); every figure message records which scripted *slot* it came from, so
**Replace** regenerates the whole transcript for the new seat — the newcomer
answers the same question and the others' replies pick up the new name.
To swap in a live model later, replace the bodies in `figureLines()` and keep
the message shape.

Honesty rules the UI enforces:

- Figures are labelled as AI interpretations grounded in their published work
  (council intro, chat header, avatar sheet, settings).
- Only lines from a figure's `quotes` list render as quotations, with a
  "verbatim" tag and a lightweight source link; everything else looks like chat.
- Reading guides are labelled; public-domain passages name the translator.

## Structure

```
src/
  app/          hash router (every screen is a URL), ids
  content/      figures, books, councils, seed posts, PD texts, portrait map
  engine/       the simulated council (pure functions over content + session)
  store/        Zustand store persisted to localStorage (the backend seam)
  components/   chrome (status bar, nav, sheet, toast), owl, avatar, cover,
                council table, chat, council cards, figure sheet, radar
  screens/      one file (+ css) per screen
  styles/       fonts (self-hosted), tokens (the poster's palette), base
public/
  portraits/    Wikimedia Commons portraits + CREDITS.md
```

Design tokens follow the poster: one yellow (`--yellow`) for the primary
action, the active nav item and the wordmark's period; a night room for the
welcome and council screens; cream paper with white cards for everything
after a question is asked. Display type is Archivo (its width axis gives the
condensed marquee and the wide titles from one file), UI is Inter, the reader
is Literata, margin notes are Caveat, the wordmark is Rubik.

## Backend seams (next phase)

- **Persistence** — `src/store/useStore.ts` is one persisted slice; sync it or
  swap the storage adapter.
- **The council** — `src/engine/council.ts` `figureLines()`; messages are
  structured segments (text / quote + source), not HTML.
- **Books and covers** — `content/books.ts`; cover art already comes from Open
  Library by ISBN with a typographic fallback.
- The old app's `supabase/` migrations and edge functions are kept on this
  branch untouched for that work.

## Assets and credits

- Portraits: Wikimedia Commons, per-file licence and author in
  `public/portraits/CREDITS.md`; thinkers without a suitable image show a
  monogram.
- Texts: Project Gutenberg (#2680 Casaubon's *Meditations*, #8438 Chase's
  *Nicomachean Ethics*, #45109 Higginson's *Enchiridion*, #64576 Stewart's
  Seneca).
- Fonts: SIL Open Font License, subset from Google Fonts and self-hosted.
