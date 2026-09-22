# owlry. — Walk with Great Minds

Bring a real question to a council of three great minds. They discuss it in a
group chat — agreeing, disagreeing, answering each other — and hand you a
synthesis, one next step, and one book each to read. **Different perspectives.
A clearer you.**

This branch is the redesign (the nine screens on the "Walk with Great Minds."
poster): a mobile-first web app that runs as an offline prototype — scripted
councils, a library in localStorage — and, once the Supabase keys are set,
becomes the real product on the classic owlry backend: accounts, cloud sync,
a shared feed, and councils written live for your question
(`docs/council-backend.md`).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build
```

Open it on a phone (or a narrow window) for the full-bleed app; on a desktop
it renders inside a phone frame on a dark desk, like the poster.

The branch is published for review at **https://app.owlry.ai/council/**, next
to the classic app at the root. If that page is blank in a browser that has
used the classic app, see `docs/council-preview.md` (its offline worker used
to capture `/council/`; the preview now repairs that on its own).

## The journey

Ask a question → explore three perspectives → understand the takeaways → open
the relevant reading → save and return.

| # | Screen | Route | What it does |
|---|--------|-------|--------------|
| 1 | Welcome | `#/welcome` | Create an account, sign in, or explore without one |
| 2 | Select interest | `#/interests` | Six tiles, multi-select, "Skip and ask a question" |
| 3 | The Council (Screen 0) | `#/council` | The painted room fills the top of the screen: three wing chairs with an empty seat on each, the title over them, a ticker under them. "What's on your mind?", suggested questions. On submit the room lights up, the seats fill and each thinker is introduced with why they fit |
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
                (zh/ holds the Chinese versions of all of it)
  i18n/         the two UI dictionaries (en, zh) and the active-language switch
  engine/       the simulated council (pure functions over content + session)
  store/        Zustand store persisted to localStorage (the backend seam)
  components/   chrome (status bar, nav, sheet, toast), owl, avatar, cover,
                council room + drawn stage set, ticker, chat, council cards,
                figure sheet, radar
  screens/      one file (+ css) per screen
  styles/       fonts (self-hosted), tokens (the poster's palette), base
public/
  portraits/    Wikimedia Commons portraits + CREDITS.md
  room/         the two council-room paintings + CREDITS.md
```

Design tokens follow the poster and the landing page: one mustard
(`--yellow`) for the primary action, the active nav item, the ticker and the
wordmark's period; navy and cream for the night screens (welcome, council);
cream paper with white cards for everything after a question is asked.

Motion is one system: screens are layers, so the one you leave stays under
the one arriving (forward slides in from the right, back from the left, a tab
change fades) and nothing ever flashes the bare frame; sheets and toasts leave
the way they came; the council's seats, the chat's lines, the summary's
sections and every list arrive in order; icons pop when they change state,
never when a screen mounts. All of it honours the OS "reduce motion" setting.

The council room itself is a painting — two pixel-aligned frames, the room at
rest and the same room with beams through the window, cross-faded when the
council sits down (`public/room/`, credited there). The three seats are
percentages of that frame, so new art means re-measuring them in
`CouncilScreen.css`. If the painting cannot be fetched, the room falls back to
a drawn stage set in the owls' own language (`CouncilStageSet.tsx`). Display type is Archivo (its width axis gives the
condensed marquee and the wide titles from one file), UI is Inter, the reader
is Literata, margin notes are Caveat, the wordmark is Rubik.

## Languages

The Council speaks English and Chinese. The choice lives in Settings
(语言 / Language), is remembered on the device, synced with the account, and
sent to the live council so the figures answer in the same language.

- The interface comes from one dictionary per language in `src/i18n/ui.ts`;
  both share one shape, so a missing string is a type error.
- Content stays English source-of-truth. `src/content/zh/` carries a Chinese
  layer for every figure, book, scripted council, path, seed post and reading
  guide, merged in by the same accessors (`figure()`, `book()`, `council()`).
  The public-domain reader passages have their own Chinese renderings in
  `src/content/texts/zh/`, prepared from the same Gutenberg editions and
  labelled as the app's own translation, not a published one.
- Verified quotes are never translated in place: the original stays as the
  quotation, and a Chinese gloss appears under it marked 译文.
- The first visit follows the browser (`zh-*` → 中文, anything else →
  English).

## Backend

The Council shares the classic app's Supabase project: the same accounts, the
same rate limiter and invite ledger, the same Gemini client. Everything new is
additive and namespaced `owlry_council_*` — see `docs/council-backend.md`.

- **Off by default.** With no `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  the app is the offline prototype; every seam in `src/lib/` is a no-op.
- **Live council** — `supabase/functions/council-chat` writes the opening and
  every later turn (Gemini, JSON-schema output, the verbatim-quote rule
  enforced server- and client-side). The scripted council is shown first and
  stands in whenever the live one can't be reached.
- **Accounts + sync** — `council-signup` creates the account; `src/lib/sync/`
  merges what you did as a guest with your cloud state (compare-and-swap on a
  revision, as `owlry_progress` does) and keeps every council in its own row.
- **Feed** — posts, likes and follows in `owlry_council_posts` / `_likes` /
  `_follows`, shown in front of the seed posts.
- **Deploy** — `.github/workflows/owl-chat-deploy.yml` applies the migration
  and deploys both functions with the classic ones.

## Assets and credits

- Portraits: Wikimedia Commons, per-file licence and author in
  `public/portraits/CREDITS.md`; thinkers without a suitable image show a
  monogram.
- Texts: Project Gutenberg (#2680 Casaubon's *Meditations*, #8438 Chase's
  *Nicomachean Ethics*, #45109 Higginson's *Enchiridion*, #64576 Stewart's
  Seneca).
- Fonts: SIL Open Font License, subset from Google Fonts and self-hosted.
