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

## v5 — from round 4 — 2026-10-13
Question (wonder-01, Wonder / Literary interpretation): I finished The Little Prince, and it felt beautiful, but I’m not sure I understood why the rose mattered so much. How do you read that relationship?
Scores: gemini: v4 51.89 vs v3 51.57 (v4 better) | sonnet: v4 68.08 vs v3 66.56 (v4 better)
Latency: gemini v4 16.5 s | sonnet v4 94.0 s
Words: 1736 -> 1797
Changes: sharpen, sharpen, sharpen, delete
Version 5 stops an exploratory question from being turned into a decision about the user’s own life: section 1 says that for a topic or a work the evidence lies in the material and the next step is one specific thing to look at again, and the closing turn may name a detail in the material, not only a fact about the user, as what would decide the open disagreement. Every reading of the user’s inner life must now start from something the user actually wrote and repeat it, and one turn must name what could be lost and argue from it. One vague sentence telling the voices to evolve beyond their titles is cut; accuracy slips and agreement-only turns are left alone this round because the cards show no prompt sentence causing them.

## v6 — from round 5 — 2026-10-13
Question (health-01, Health / Exercise with constraints): My shifts change every week, and I keep giving up on exercise. How can I build a routine that doesn’t depend on having the same schedule?
Scores: gemini: v4 51.57 vs v5 54.93 (v5 better) | sonnet: v4 74.92 vs v5 75.60 (v5 better)
Latency: gemini v5 11.7 s | sonnet v5 104.1 s
Words: 1797 -> 1847
Changes: replace, sharpen, replace, sharpen
Version 6 turns three judgment-level rules into mechanical ones for the small model. Any sentence about what the user feels, fears, wants or will do must carry maybe, perhaps, might or if and never must, clearly, always or obviously, and that check now runs on every line next to the quotation-mark check; a turn that disagrees first restates the disputed claim in one sentence with its role title before answering it; and the one required change of position must name the claim dropped, the point that moved it and the narrower claim now held. Four sentence-level changes, 1797 to 1847 words, nothing reverted since v5 was preferred on every sample of both lanes; the prompt is 53 words under the ceiling and the next round should cut the vague drama and voices sentences in section 5 if they still earn nothing.

## v7 — from round 6 — 2026-10-13
Question (wealth-01, Wealth / Irregular income): I freelance, so some months are great and others are almost empty. How do I budget when I don’t know what I’ll earn?
Scores: gemini: v6 54.47 vs v5 53.63 (v6 better) | sonnet: v6 71.02 vs v5 69.74 (v6 better)
Latency: gemini v6 18.0 s | sonnet v6 77.6 s
Words: 1847 -> 1876
Changes: replace, sharpen, add, delete
Version 7 makes the minds talk about the user as you, never the user, and say I for themselves, with that check added to the per-line check where the small model follows rules best; the vague advice ban becomes 'argue with one another, not at the user'. One turn must now propose one specific step with a number, an amount or a time frame, and the next turn must test it against something the user wrote, so the debate ends with a sized mechanism rather than a named idea. The two drama and voices sentences that earned nothing across two rounds are cut, so the prompt grows only 29 words to 1876; accuracy, still the largest loss, is left for next round because its clearest cause (a role assignment pushing a mind to argue against its own book) needs a rule this round had no change slot for.

## v8 — from round 7 — 2026-10-13
Question (love-02, Love / Recurring conflict): Every time I bring up something that hurt me, my partner says I’m criticizing them. How can we talk without having the same argument?
Scores: gemini: v6 53.93 vs v7 55.62 (v7 better) | sonnet: v6 66.00 vs v7 71.32 (v7 better)
Latency: gemini v7 13.2 s | sonnet v7 109.0 s
Words: 1876 -> 1897
Changes: sharpen, sharpen, sharpen, replace, delete
Version 8 extends the hedge rule and its per-line check from the user alone to anyone else in the situation, so claims about a partner's fear, motive or refusal must carry maybe, perhaps, might or if like claims about the user. A turn that disagrees must now reuse a phrase from the turn it disputes and give one reason against it, which blocks the straw-man rebuttals and wrong-speaker objections the small model keeps producing. The vague 'select for relevance, not fame' becomes a concrete test (books about the user's kind of problem or topic, not general theories applied from outside), the accuracy fix deferred from round 6, and the redundant winner-conflict-consensus sentence is cut to pay for it: four changes, one applied in two places, 1876 to 1897 words, 3 under the ceiling, so round 8 must cut before it adds; a direct question to the user in the decisive-uncertainty turn is the next cheap sharpen if responsiveness and agency stay low.

## v9 — from round 8 — 2026-10-13
Question (purpose-02, Purpose / Achievement without fulfillment): I got the promotion I worked toward for years. Nothing is really wrong, but I don’t feel satisfied. How do I figure out what’s missing?
Scores: gemini: v8 51.33 vs v7 49.10 (v8 better) | sonnet: v8 68.60 vs v7 67.04 (v8 better)
Latency: gemini v8 10.2 s | sonnet v8 105.4 s
Words: 1897 -> 1899
Changes: replace, sharpen, sharpen, sharpen, delete, replace
Version 9 defines verified as read in this session, so a worker that cannot browse cites author and book only and paraphrases instead of inventing chapter numbers and misquoting, the accuracy leak that has persisted since round 1; the revision is given a fixed slot, the turn before the final turn, and must repeat a phrase from the speaker's own earlier turn as the claim it drops, because the small model follows slots and phrase reuse but skips or fakes a free-floating concession. The loss turn now also names what another person involved may expect of the user, and the vague 'one reason against it' becomes a four-item menu (a real case, a cost left out, the speaker's own words, something the user wrote). To pay for it at the ceiling, the six abstract 'Let the speakers' bullets and the redundant 'ability to revise' bullet are cut: four changes, one applied in two places, 1897 to 1899 words.

## v10 — from round 9 — 2026-10-13
Question (wonder-02, Wonder / Book discovery): I’d like a short, thoughtful novel that leaves me feeling hopeful, but I don’t enjoy obvious life lessons. What might suit me?
Scores: gemini: v8 46.51 vs v9 50.83 (v9 better) | sonnet: v8 70.96 vs v9 66.48 (v8 better)
Latency: gemini v9 12.6 s | sonnet v9 107.6 s
Words: 1899 -> 1882
Changes: sharpen, sharpen, replace, sharpen, delete, delete; reverted: 1
Version 10 narrows the v9 loss turn so it only names another person's expectations when the user mentioned one, and makes that turn and the decisive-uncertainty turn each ask the user one direct question instead of stating a guess as a finding, since every sample lost points for having no focused question and some for pathologising the user. The turn after any proposed option or step now checks it against each explicit constraint the user stated and names one cost, and the famous-idea rule is limited to ideas the cited book actually contains, to stop famous lines being attributed to the wrong book by the same author. Two redundant paragraphs on verification and on principle-versus-application are cut, so the prompt shrinks from 1899 to 1882 words.
