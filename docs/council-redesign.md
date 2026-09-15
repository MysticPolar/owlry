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
2. **Convening.** On submit the three seats fill one by one and an intro card
   explains why each perspective fits. The council is chosen by keyword
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

## Open questions for the backend phase

- Which of the simulated pieces become live first: the council (model +
  retrieval over the source works), or persistence/sync of sessions,
  library and highlights? The store shape is ready for the latter; the engine
  is ready for the former (`figureLines()`).
- Accounts: the welcome/auth screens are mock; Supabase auth from the old app
  can be reattached to `useStore.signIn`.
- Book text: reading guides are placeholders for licensed excerpts or the
  user's own ebook; the old app's foliate-js reader is a candidate for real
  EPUBs.
