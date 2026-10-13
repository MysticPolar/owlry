# Changelog of the cast+debate prompt

One entry per version. Newest at the bottom.

## v1 — baseline — 2026-10-13
Question: (none; starting version)
Scores: (none)
Latency: (none)
Words: as written
Changes: none. The author's prompt, with two plumbing edits agreed on 2026-10-13: the placeholder line became `{{question}}`, and the debate length became 9 to 12 turns.

## v2 — from round 1 — 2026-10-13
Question: I'd like to study how to build a successful SaaS for consumer in the age of AI, and what successful principles of a good products can be drawn from the internet…
Scores: gemini: v1 39.40 | sonnet: v1 65.04
Latency: gemini v1 12.7 s | sonnet v1 36.1 s
Words: 1352 -> 1487
Changes: sharpen, sharpen, sharpen, sharpen; blocked: The quotation rule is protected and already explicit; the Gemini lane’s single quote marks in pd=false turns and its wrong chapter citation are compliance failures, not prompt gaps, so nothing was changed there.
Version 2 makes the debate turns carry what version 1 left to the summaries: every explicit part of the user’s question and the decisive unknown must be argued in the turns, and at least two turns examine the user’s possible motives, pressures or values as rival readings rather than verdicts. It also requires one explicit change of position, bans a final turn that restates the openings or splits the difference, and asks that generalisations be backed by a named case or marked as a guess. Four sentence-level sharpenings, no new sections or fields.

## v3 — from round 2 — 2026-10-13
Question (love-01, Love / Dating uncertainty): They’re really affectionate when we meet, but barely reply between dates. Am I asking for too much, or are we looking for different things?
Scores: gemini: v2 51.00 vs v1 49.10 (v2 better) | sonnet: v2 75.62 vs v1 74.92 (v2 better) | fable: v2 74.56 vs v1 75.40 (v1 better)
Latency: gemini v2 11.3 s | sonnet v2 50.1 s | fable v2 613.2 s (subagent lanes corrected to the workers' own durations)
Words: 1487 -> 1620
Changes: sharpen, sharpen, sharpen, add
Version 3 closes the form leak every lane showed: when pd is false the turn's text carries no quotation marks at all, so sample sentences and borrowed labels go in reported speech; the protected rule that post-1931 books are paraphrased, never quoted, is untouched. The first turn now frames the situation instead of answering the user's question, no turn may restate its speaker's earlier point, a two-part question gets a dedicated turn per part, and one turn must name two things the user wants that pull against each other. Four sentence-level changes, 1487 to 1620 words, no new sections or fields; nothing reverted, since v2 raised the primary lane from 49.10 to 51.00.

## v4 — from round 3 — 2026-10-13
Question (purpose-01, Purpose / Unclear direction): I don’t know what I want to do with my life. I want stability and time for people I love, but nothing feels like a calling. Where do I start?
Scores: gemini: v2 52.93 vs v3 55.45 (v3 better) | sonnet: v2 70.16 vs v3 74.36 (v3 better)
Latency: gemini v3 12.5 s | sonnet v3 74.7 s
Words: 1620 -> 1736
Changes: sharpen, sharpen, replace, sharpen
Version 4 makes four instructions checkable for a small model: a reading of the user's inner life must be voiced as a possibility and answered by the next turn, and nothing the user did not say may be stated as fact; one disagreement must stay open and no turn may declare agreement, with the final turn naming what about the user would decide it; the no-quotation-marks rule for pd-false turns moves to the output line as a per-line check, and pd-true quotations must be wording the model knows exactly; and the decisive unknown must be named in a turn as a missing fact with a two-way branch, never invented. Nothing reverted, since v3 raised both lanes. Points lost are summed from the Sonnet subcriterion and a fifth of the Gemini criterion, as the Gemini card has no subcriteria; the prompt grew by about seven percent and the next round should look for a cut.
