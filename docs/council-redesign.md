# The Council redesign — front-end notes

*Companion to the "Walk with Great Minds." poster. This documents the choices
made while turning the nine frames into a working prototype, so the backend
phase and later design passes know what is deliberate.*

## What the prototype covers

The complete journey, interactive end to end, with realistic content:

1. **Path → council room, every visit.** Opening the app lands on the interest
   screen (previous picks pre-selected), then the council; the welcome screen
   appears only on the first visit. Users can explore without an
   account (the welcome screen's tertiary link and the interest screen's
   "Skip and ask a question"). Interests personalise the suggested questions
   and can be changed later from the interests screen; the free-text matcher
   also gives a small bonus to councils in the chosen areas.
2. **Convening.** On submit the room's beams come up, the three seats fill one
   by one and an intro card explains why each perspective fits. The council is chosen by keyword
   matching against eight scripted councils (`content/councils`); a
   suggestion chip pins its council directly.
3. **The discussion.** Two rounds: a distinct idea each, then a reply to
   another seat (the scripts reference seats as `{0} {1} {2}` so replies
   survive a replacement). Messages type in with a short, length-scaled pause
   (≤1.5s, tap to skip; honours reduced motion). After round two the two
   cards land inline; "View Summary" is available at any time and reveals the
   rest.
4. **Follow-ups.** To everyone (two scripted rounds, then each figure's generic
   voice), to one figure (scripted direct answers, then generic), or as added
   context (a scripted context round that adapts the advice; the context is
   also listed under "What fits your situation").
5. **Replace.** The avatar sheet offers the next relevant alternate for that
   seat; the transcript, takeaways and reading are regenerated; a toast offers
   Undo. Every council ships one alternate per seat (three for the hero
   council's roster of Stoics/habit thinkers/psychologists).
6. **Reading.** Book detail → reader with three sizes, bookmarks (by position),
   saved progress (position + percentage, auto-completed near the end), and a
   selection toolbar: Highlight / To council / Copy with attribution. "To
   council" adds the passage to the most recent council and two figures
   respond (the book's author first if they are seated).
7. **Library, Social, Profile** are lighter, as scoped, but real: saved books
   by shelf with resume, past councils, highlights; a feed with likes, saves,
   follows and a composer that asks "What did this change for you?"; a profile
   with level, milestones, a six-axis radar derived from the books and
   highlights, activity and badges.

## Deliberate departures from the poster

- The discussion and summary screens hide the bottom nav (as in the poster's
  frames 4–6); the back arrow returns to the council room.
- The poster's summary quote for Meditations was a modern paraphrase; the app
  uses a verbatim line from the translation it actually ships (Casaubon,
  1634) so the highlight in the seeded library matches the reader text.
- The interest tiles are a single column at phone width (the poster) and two
  columns on tall/wide screens.
- The council room is a painting rather than the poster's drawn table. The
  poster's frame 3 was a line drawing; the room now fills the top of the
  screen as art, with the marquee title over it and a mustard ticker under it,
  and the drawn version survives as the fallback when the art cannot load.
  The night palette moved with it: navy and cream, and the landing page's
  mustard in place of the poster's pure yellow.
- Social posts quote real lines from the books; the poster's "A calmer mind
  leads to a brighter life." became the poster's own reflection text rather
  than an attributed quote.

## Content provenance

- Verbatim quotes were checked against the named editions/translations; where
  a figure has no line we could verify (Attia, de Botton) they simply have no
  quotes and speak only in paraphrase.
- Public-domain reader passages: Gutenberg #2680 (Meditations, Casaubon),
  #8438 (Nicomachean Ethics, Chase — the file is Chase's 1847 translation,
  not Ross), #45109 (Enchiridion, Higginson), #64576 (Seneca's dialogues,
  Stewart). Cut by `extract_texts.py` during the build; the JSON keeps the
  source and translator.
- 28 of 43 thinkers have a Wikimedia Commons portrait (see
  `public/portraits/CREDITS.md`); the rest show monograms. Wikimedia
  rate-limited the fetch; a later pass can fill the gaps (Simone de Beauvoir,
  Seneca, Epictetus, Cal Newport, Ryan Holiday, Russell, Fogg,
  Thich Nhat Hanh, Walker, Housel, Gottman, de Botton, Bloom, Borges, Harari).

## The Chinese version

Everything the reader sees exists in Chinese: interface, the 43 thinkers, 45
books and their guides, the 8 scripted councils, the six paths, the feed's
seed posts and the four public-domain passages. The switch is in Settings and
follows the browser on first visit.

- `src/i18n/` — `Lang`, the active-language module (`getActiveLang`, `isZh`,
  `fmt`), the `en`/`zh` UI dictionaries, and the `useT()` / `useLang()` hooks.
  The app remounts on a switch (`key={lang}` on the desk) and the store
  rebuilds every scripted council in the new language.
- `src/content/zh/` — overrides per figure / book / council / area, merged
  by the accessors in `src/content/*.ts` so screens never branch on language.
  Chinese keywords are added to (not replacing) the English ones so matching
  works for a question typed in either language.
- `src/content/texts/zh/*.json` — the reader passages, paragraph-for-
  paragraph with the English files (12/12/16/11), each with `basedOn`,
  `source` and `url`. The reader shows a note that the Chinese is the app's
  own rendering of that public-domain translation.
- Quotes: the verbatim rule holds. A `Quote.gloss` is shown under the
  original, marked 译文; nothing translated is ever presented as the quotation.
- The language is a synced preference (`CloudState.lang`) and is sent with
  every `council-chat` call.

## Motion

Everything that moves follows one rule: things arrive, they do not appear.

- **Screens are layers.** `App.tsx` keeps the screen you are leaving mounted
  underneath for one beat while the new one arrives on top, so there is never
  a frame of bare cream or navy between two screens. Direction comes from
  how deep each screen sits in the journey (`DEPTH`): deeper slides in from
  the right, shallower from the left, a tab change just fades. The phone
  clip also takes the destination room's colour.
- **Exits.** Sheets slide back down, toasts slide back out, the reader's
  text-size popover shrinks away — `usePresence()` keeps them mounted for the
  duration. A toast can be tapped away.
- **The council.** The painting fades onto the wall when it has loaded (and
  is fetched quietly at boot). The three seats fill one by one — the empty
  slot and the seated portrait have different keyframes, which is what makes
  the cascade possible. The asked question fades in under the title; the
  intro cards cascade when they are shown. Joining no longer empties the
  room for a frame: the discussion screen seats the council as it opens.
- **The chat.** Every line arrives from just below (a figure, you, the
  typing dots, the cards). A replaced seat's "new" tag pops. Both ask boxes
  grow with what is typed.
- **Reading.** Changing the text size keeps your place in the text, not the
  pixel. Bookmark, save and like icons pop when toggled, never on mount.
- **Lists and reveals.** The welcome marquee rises a line at a time; interest
  tiles, the summary's sections, the book page, the feed, the library and the
  profile's milestones, timeline and badges cascade in; segmented controls
  slide their pill; progress bars ease to their value. Every tappable thing
  gives under the finger, and desktop hover states exist for the demo.
- **Reduced motion** is honoured everywhere: the global rule zeroes CSS
  durations, `useReduceMotion()` zeroes JS timings, and screens simply swap.

## The backend phase

Done in `docs/council-backend.md`: the live council (`council-chat`), accounts
(`council-signup` + Supabase Auth), cloud sync of the library, highlights and
every council, and the shared feed — all on the classic owlry project, all
optional (the prototype above is what runs with no keys). Still open: real
book text (reading guides are placeholders for licensed excerpts or the
reader's own ebook; the classic app's foliate-js reader is the candidate).
