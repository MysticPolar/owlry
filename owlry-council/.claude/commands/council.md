---
description: Run one Owlry council session with subagents and save the transcript. Usage: /council "question" [--category health|career|investing|relationships|literature|other] [--situation "..."] [--turns 9] [--mind sonnet|opus|haiku] [--fast haiku|sonnet]
---

Run one council session for: $ARGUMENTS

You are the orchestrator. Every model call in production is one subagent call here; keep them separate so no mind sees anything but its own input. Use the Agent tool with the named agents below; pass `model` when the user gave --mind or --fast. Never write a turn yourself.

Parse the arguments: the quoted text is the question; --category defaults to other; --situation defaults to empty; --turns defaults to 9; --mind defaults to the agents' own model; --fast likewise.

1. Cast. Call `council-caster` with JSON: {question, situation, category, exclude: [], recent: []}. Parse the JSON reply: kind, tension, seats[3] (name, lived, field, lens, why, books), opening_seat.
2. Screen. Call `council-screen` with {names: [the three names]}. If any verdict has ok=false, call the caster again with exclude = those names and screen again; if it fails twice, stop and report.
3. Cards. For each seat compute slug = lowercase name, non-alphanumerics to "-". If `council/minds/<slug>.json` exists, read it. Otherwise call `council-forge` (all missing seats in parallel) with "NAME: …, LIVED: …, FIELD: …, LENS: …" and save the JSON reply to that path.
4. Turns. Let N = --turns and cycle(t) = positions for t ≤ ceil(N/3), pressure for t ≤ 2·ceil(N/3), application after. Seat for turn t = (opening_seat − 1 + t − 1) mod 3. For each turn, call `council-mind` sequentially with this task message (mirror of directorNote() in prompts.ts):

   NAME: <name> · LIVED: <lived>
   CARD: <the card JSON, plus "works": [book titles]>
   Reader's question: <question>
   Reader's situation: <situation or "none given">
   The tension inside the question: <tension>
   At the table with you:
   - <other name> — AI persona; <why>; lens: <lens>
   - <other name> — AI persona; <why>; lens: <lens>
   Discussion so far:
   <"[n] Name: text" for every earlier turn, visible text only, or "(no one has spoken yet)">
   This is turn <t> of <N>.
   <cycle line>
   End with the POSITION line.

   Cycle lines:
   - positions, turn 1: "Cycle 1 — positions. Up to 80 words. No one has spoken yet, so state your position without replying to anyone. In your first sentence, ground yourself in the work of yours this comes from."
   - positions, later: "Cycle 1 — positions. Up to 80 words. Reply to one claim already made, then state your own position."
   - pressure: "Cycle 2 — pressure. Up to 60 words. Which of your own claims did the others damage most? Concede it or defend it with a reason. Then push the one point that matters most for the reader."
   - application: "Cycle 3 — application. Up to 60 words. No new debate. Given everything said, what should this reader do first, and why? One concrete action in the reader's world, for their stated situation." (append " (no situation given — apply to the question as asked)" when situation is empty)

   Split the reply at the last line starting with POSITION: — the text above it is the visible turn, the line is the tail (position | move | open). Record the wall time of each call.
5. Summary. Call `council-summarizer` with JSON: {question, situation, seats: [{name, books}], transcript: "<[n] Name: text …>", tails: [{turn, speaker, position, move, open}]}. Parse the JSON.
6. Save `council/runs/<YYYYMMDD-HHMM>-<first-five-words-of-question>.md` containing: the question and situation; the tension; the council card (name · why · lens · first book); each turn as "**n · Name** — text" with its tail on the next line in code formatting; the summary in five sections; a timing table (cast, screen, forge, each turn, summary, total). Print the path, then the council card and the summary.

Note for the reader of these runs: subagent wall times include Claude Code overhead and do not reflect production latency; use them only to compare runs with each other.
