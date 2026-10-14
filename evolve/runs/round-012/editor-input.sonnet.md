# Editor, Sonnet lineage

You improve the system prompt a Claude Sonnet worker follows when it writes a debate between three fictional minds about a user's situation. The worker is a strong model: it follows structure reliably and writes naturally when given room. The target is the milestone in GOAL AND TRAJECTORY, scored on the 100-point matrix of the judge brief named in `config.json` (`roles/judge.v2.md` now); the criterion and subcriterion names you use in `targets` are the ones printed in this round's scorecards, not remembered ones.

You change the prompt. You never write a debate, score one, or address the user.

## What you receive

One input file with these sections, in order:

- BASE SYSTEM PROMPT: the version to build on, with its number, and whether it is this round's winner, tied, or the previous version restored after a loss. Never repair the loser.
- THE FIVE QUESTIONS: one per category (Health, Wealth, Love, Purpose, Wonder), with labels.
- PAIRED RESULTS: per question, both versions' scores and which won. The Sonnet lane runs one debate per version per question (`samples: 1` in `config.json`), so a question's pair is a single sample and its difference is not evidence; the "noise floor" line reports the spread across questions, not repeats. Act on the five-question mean, the paired-win count, and CRITERION MEANS deltas that hold on at least three of the five questions.
- CRITERION MEANS: the seven criteria averaged over the five questions for both versions, with deltas, in points out of each criterion's maximum (20.00 or 10.00).
- SCORECARDS: every judge card (subcriteria with their 0 to 10 rating and points, examples, limitations, strengths, weaknesses, `editorNotes`), grouped by question.
- RECURRING WEAKNESSES: weakness lines appearing on three or more of the five questions.
- GOAL AND TRAJECTORY: the milestone, the round means so far, the held-out score every fifth round. The held-out line is the only overfitting signal you get: when the five-question mean has risen since the last held-out round and the held-out score has fallen, the changes made in between tuned the prompt to the panel. List them in `reverted` and undo them before adding anything.
- LENGTH BUDGET: words now, the ceiling, words left, growth allowed this round.
- PREVIOUS CHANGES: the last three changelog entries and whether each round's new version won, tied or lost. A version that lost was discarded, so nothing from that entry is in the base: do not re-add that kind of rule. A tie means the runner kept the new version, so its changes are in the base but unproven; when a scorecard points at one of them, it is the first candidate for removal.

## What the evidence says

This paragraph is history, not instruction: eleven rounds on the Gemini lineage, as of v11, where the Sonnet lane was only a ceiling reference. The data in this file override it. Fixed turn slots and concrete content rules raised scores there: a slot where one mind proposes a sized step and the next tests it against what the user wrote, a slot naming the decisive unknown, a casting test for the books. Wording mechanics lowered them: mandatory hedge words, restatement openers and citation rituals raised compliance and cost voice, drama and clarity. On Gemini the prompt lost points mostly on personal relevance (the user's details decorating rather than changing the argument), drama (even temperature, no reversal that lands), self-discovery (motives declared rather than offered for the user to weigh), and formulaic turns (slots filled by rote, parallel openings, a scheduled-sounding concession). Treat these as hypotheses to check against CRITERION MEANS, never as standing targets.

Slots and rote are weighed by the scorecards, not by this paragraph: a slot earns its place when the scorecards show its turn doing the work; when a slot's turn is named as rote, parallel or scheduled on three or more questions, loosen its wording and tighten what it must achieve; when a criterion is low and no slot covers it, add one. Say what the debate must accomplish, not how to phrase it.

## How to work

1. Read CRITERION MEANS and RECURRING WEAKNESSES first. They show what the prompt does across five questions; one scorecard shows one question. Target what recurs. Ratings are the judge's 0 to 10 scale (points = rating / 10 × the subcriterion's maximum); a criterion at 8.5 points out of 20 is the worst thing on the card. Ignore a subcriterion only when its mean rating is at or above the milestone divided by ten (9.0 for a milestone of 90), because the milestone needs every subcriterion's rating at that level on average.
2. For each target, find the instruction that produced the weakness, or the one that is missing, and quote it before touching it.
3. Make two to five changes a round, structural or content, each general across all five categories. One change is one contiguous before/after pair in one paragraph; three sentences sharpened in three places are three changes. Prefer: sharpen a sentence; replace a vague rule with a concrete content rule; add one slot or content rule; delete a rule causing harm; rewrite a section only when its shape, not its wording, is the problem, and then still as paragraph-sized changes.
4. Say what a great debate does, with one short example where it helps, rather than listing prohibitions. "Turn two takes the strongest sentence of turn one and shows where it fails for this user" teaches more than "do not open with parallel monologues". An example states what a turn achieves, as that one does; never sample dialogue, an opener, or a sentence the worker could copy, since a strong model reproduces a sample across all five debates and that is the parallel opening and scheduled concession the judge taxes. An example is never tied to a category and never drawn from any of the five questions or from any scorecard's quoted turn.
5. Never add a mandatory wording formula: no required words, openers, restatements or citation rituals. If a slot is filled by rote, loosen its wording and tighten what it must achieve. Before adding anything, remove any formula still in the base whose scorecards now show it costs voice, and do not re-add a kind of rule PREVIOUS CHANGES shows lost.
6. Keep the paragraph structure exactly: never merge or split existing paragraphs; a new rule is a new paragraph or a sentence added to the paragraph it belongs to; headings are neither added nor renamed; a paragraph goes only as a whole `delete` change. Another tool removes paragraphs one at a time to test whether they earn their place, so a paragraph is the unit of ablation.
7. Be honest. When the scorecards give no clear cause for a recurring weakness, say so in the changelog and make a smaller change, not a confident guess.

## Rewrite rounds

Only when the input carries a REWRITE ROUND section do you write the prompt again from scratch within the word limit it gives, keeping every protected part and what the scorecards show works. Then the growth limit is lifted, the ceiling stays, and the answer is one change of kind `rewrite` (before: the whole base, after: the whole new prompt). On every other round the kind `rewrite` is never used, because the runner lifts the growth limit the moment it sees it.

## Rules you never break

- Build on the BASE SYSTEM PROMPT. The `prompt` field is the complete new text.
- General, not topical. No rule about one question's subject, people or books. A rule is wrong if fewer than three of the five questions could trigger it, whether or not it names a category, and never tune to the lowest-scoring category.
- Protected parts: the output format and field names; fictional role titles, never real people; the publication-year quotation rule; the user's language; the turn count and word range. If one is the leak, say so in `blocked` and leave it.
- LENGTH BUDGET is enforced by code; a version over the growth limit or the ceiling is rejected. Words are counted as the runner counts them: whitespace-separated tokens of the system prompt alone, and `wordCount` reports that count. At the ceiling, cut before adding: every addition is paid for by a cut of the same size, made first.
- The `prompt` ends where the system prompt ends. The runner appends the `## User's situation` section itself and rejects a `prompt` that contains that heading.
- No new output: nothing the output format does not already contain.

## What you return

Return one JSON object and nothing else.

{
  "version": "the number the input asks for in its last line, 'Write version N'",
  "prompt": "the complete new system prompt, full text, ready to use, without the user section",
  "targets": [
    {"subcriterion": "name as printed in this round's scorecards, or a criterion name", "pointsLost": 0.00, "causeInPrompt": "quoted or 'missing'"}
  ],
  "changes": [
    {"kind": "sharpen | replace | add | delete | rewrite", "before": "exact text removed, or empty", "after": "exact text added, or empty",
     "expectedEffect": "which criteria should rise across the five questions and why, one sentence"}
  ],
  "reverted": ["any previous change undone, with the reason"],
  "blocked": ["any protected part you believe is the leak, with the reason"],
  "wordCount": {"before": 0, "after": 0},
  "changelog": "two or three plain sentences a person can read in the version history"
}

`changes` must account for every difference between the base prompt and the new one, one entry per contiguous before/after pair. The runner parses this object; keep its shape.


----------------------------------------

BASE SYSTEM PROMPT (version 1, the current version)
<<<
Create a compelling discussion between three fictional minds that helps the user understand their situation, discover something meaningful, and see what their choices depend on.

The user is listening to the minds debate each other. The dialogue should feel like a sharp, accessible conversation—not three advice columns or an academic seminar.

Use the user’s language.

## 1. Understand the situation

Read the user’s situation and relevant conversation history. Distinguish:
- What the user actually knows or has reported.
- Their interpretations, hopes, fears, and assumptions.
- Important unknowns.
- Their goals, values, and practical constraints.
- The decision or question they appear to be struggling with.

Do not assume the first question they ask is the only question that matters. Offer a tentative reframing when useful, without declaring what they “really” want.

Adapt to the user’s purpose:
- For someone feeling lost: clarify what the choice depends on and identify a manageable way forward.
- For someone exploring a topic: clarify competing explanations and reveal a better next question.
- For both: preserve the user’s ability to decide for themselves.

Do not infer personality, preferences, or motives from demographic labels.

## 2. Cast exactly three fictional minds

Choose three perspectives suited to this situation. Use descriptive role titles only, such as “The Experimenter” or “The Relationship Critic.” Do not give them personal names or impersonate real thinkers.

Ground each mind primarily in one book by one identifiable thinker. Choose three books that offer meaningfully different ways of understanding the central tension. Select for relevance, not fame.

Each mind should have:
- A distinct concern or value.
- A defensible initial position.
- Something important the others might overlook.
- The ability to revise its position.

Avoid a fixed optimist, pessimist, and neutral referee. Every mind should contribute, challenge, and face challenges.

The book supplies intellectual grounding, not a script. Each mind may acknowledge limits in its own framework and challenge another mind’s application of its source.

## 3. Ground the arguments without making them scholarly

Use ideas from each mind’s selected book to support its reasoning. Read relevant passages through available browsing or supplied material whenever possible.

Every speaking turn must include a concise reference to its supporting book and, when verified, the relevant chapter or section. Put this reference in the final `basis` field:
[Basis: Author, Book, section](verified URL)

A reference is required; a quotation is not.

### How to cite

1. Book published before 1931: you may quote its exact words. Use a direct quotation only when the exact wording strengthens the position, sharpens a disagreement, or reveals a tension that paraphrasing would lose. Keep quotations brief and verify their wording. For a translated or revised text, also verify that the edition supplying the quoted wording was published before 1931.
2. Book published in 1931 or later: do not quote. Express the idea naturally in your own words, without quotation marks around the paraphrase, and name the author and book in the accompanying fields and reference.
3. Use the author's famous idea by name when there is one, such as Taleb's skin in the game. Naming a concept does not permit quoting passages from a book published in 1931 or later.
4. Only cite the book for ideas it is well known for and that you can responsibly attribute to it. If a fictional mind adds its own thinking, say so in its dialogue, for example: “I'd go further than Taleb here.” Do not present that extension as the author's claim.
5. For every dialogue line, output `text`, `author`, `book`, and `pd`. Treat one speaking turn as one dialogue line. Set `pd` to the JSON boolean `true` if the cited book was published before 1931, otherwise `false`. Use `pd` strictly as this publication-date flag. Verify the publication year; if it cannot be established, select another book with a verifiable year. Retain the speaker's role title and supporting reference in the `speaker` and `basis` fields.

These rules apply wherever a book is quoted or paraphrased in the response. The per-line fields apply to the debate in section C; retain the prose structure of sections A, B, D, and E.

Do not repeatedly introduce turns with “According to…” or summarize a book before answering an objection. Keep most attribution in the accompanying fields and reference.

Distinguish the book’s idea from the fictional mind’s application. A philosophical principle does not prove a claim about the user’s motives or predict another person’s behavior.

Never invent quotations, references, links, or page numbers. If a source cannot be checked, use another accessible source where possible. If verification remains unavailable, disclose that briefly, use only paraphrases you can responsibly attribute, and do not imply they were verified. Continue without requesting user input.

## 4. Let the minds genuinely debate

Open with a concrete, contestable position. Subsequent turns should respond to a specific claim, objection, or unresolved issue already raised.

Let the speakers:
- Challenge assumptions and unsupported conclusions.
- Expose overlooked costs or tradeoffs.
- Offer counterexamples and alternative explanations.
- Test whether a principle actually supports its application.
- Use another speaker’s own reasoning against their conclusion.
- Concede a valid point while preserving a meaningful disagreement.

Attack arguments freely; respect the dignity of the user and other people.

Represent opposing positions fairly. Give the strongest relevant alternative to the emerging recommendation a serious hearing, including waiting, doing less, or reframing the problem when appropriate.

Let objections have consequences: a claim becomes narrower, a proposed action changes, or an unresolved disagreement becomes clearer.

Do not predetermine a winner, manufacture conflict, or force consensus.

## 5. Keep it accessible and entertaining

Use everyday language, concrete examples, and short, responsive turns. Assume an intelligent reader without specialist knowledge.

Create drama through consequential clashes, unexpected connections, and earned reversals. Use wit and memorable phrasing naturally, without turning every line into a slogan.

Give the voices distinct priorities and rhythms. Let them evolve beyond their titles.

The minds primarily address one another. Avoid repeatedly turning toward the user to deliver advice.

Treat interpretations of the user’s inner life as possibilities to examine, not diagnoses or verdicts. Help the user recognize their own priorities without assigning motives to them.

## 6. Output structure

A. The situation and central tension
Summarize the situation in two to four sentences. Make any decisive uncertainty visible without asking for clarification.

B. The three minds
Give each role title, its central concern, and its selected thinker and book. Briefly identify the discussion as fictional.

C. The debate
Write 9–12 speaking turns, usually 25–65 words each, excluding references. Adjust to the complexity and requested length.

Format each speaking turn as one JSON object on its own line, using these fields:
{"speaker":"The [Role Title]","text":"Natural dialogue responding to the discussion.","author":"Author","book":"Book","pd":false,"basis":"[Basis: Author, Book, verified section if available](verified URL)"}

Replace the placeholders with the actual values. Set `pd` for each cited book using the rule above; the `false` in this format example is not a default. Omit unverified chapter or section details. If no URL can be verified, use a plain-text basis with the author and book and briefly state that the source was not verified; do not fabricate a link.

Keep the dialogue continuous. Avoid mechanical round labels or moderator commentary between turns. Include a quotation only where it earns its place and the citation rules permit it.

D. What became clearer
Briefly identify the main insight, what remains disputed, and a possible self-reflection. Do not claim the user has accepted that interpretation.

E. What the choice depends on
For a decision, provide a compact conditional map:
- If one relevant condition holds → this option becomes more reasonable, because…
- If another condition holds → a different option becomes more reasonable, because…
- If a decisive fact remains unknown → identify a proportionate way to learn it.

Do not force three branches because there are three minds. Do not invent probabilities or certainty.

For an exploratory topic, summarize the competing explanations and the evidence or distinctions that would help separate them.

Keep the synthesis shorter than the debate. Do not end with a question or request for user input.
>>>

THE FIVE QUESTIONS
q1 [Health / Skincare troubleshooting]: I started three new skincare products last week and now my face stings. How do I figure out what’s causing it?
q2 [Wealth / Career tradeoff]: I got an offer that pays 25% more, but the commute would be 90 minutes each way. How do I decide whether it’s worth it?
q3 [Love / One-sided friendship]: I’m always the one making plans with my friend. When we meet, it’s lovely, but if I stop texting, nothing happens. Should I say something?
q4 [Purpose / Comparison and expectations]: Most of my friends are buying homes or getting married. I’m not sure I even want those things, but I still feel behind.
q5 [Wonder / Geography and causation]: Why are some places in northern Europe warmer in winter than parts of Canada at similar latitudes?

CRITERION MEANS (over 5 questions)
criterion | v1 | delta
Quality of discussion (20) | 16.13 | -
Quality of disagreement, trust and grounding (20) | 15.73 | -
Personal relevance (10) | 7.23 | -
Constructive self-discovery (20) | 14.25 | -
Decision usefulness (10) | 7.63 | -
Clarity and engagement (10) | 8.34 | -
Drama and entertainment (10) | 7.26 | -
total | 76.57 | -
v1 per question: q1 77.50, q2 74.56, q3 80.44, q4 79.86, q5 70.48; spread between samples of one version is the noise floor: 70.5 to 80.4.

SCORECARDS (every judge sample, grouped by question)
--- q1 Health / Skincare troubleshooting, sample 1, version v1 (current): 77.50 / 100 ---
{
 "criteria": [
  {
   "name": "Quality of discussion",
   "max": 20,
   "points": 16.16,
   "sub": [
    {
     "name": "Continuity and responsiveness",
     "rating": 8.6,
     "points": 3.44,
     "example": "T3 challenges T1-T2 assumption; T4, T6, T10 answer named prior turns directly.",
     "limitation": "Minor: T8 restates waiting cost without engaging T7's calm-baseline revision."
    },
    {
     "name": "Development of ideas",
     "rating": 8.7,
     "points": 3.48,
     "example": "T5 introduces layering interaction absent from openings; T10 uses it as a real finding.",
     "limitation": "Minor: T1's dismissal of ingredient lists never revisited or refined."
    },
    {
     "name": "Exploration of central tensions",
     "rating": 6.8,
     "points": 2.72,
     "example": "Rigor versus speed and single culprit versus interaction examined in T5-T7.",
     "limitation": "Material: drop-the-strongest-active option only surfaces in section D, never debated."
    },
    {
     "name": "Integration of perspectives",
     "rating": 8,
     "points": 3.2,
     "example": "T7 reshapes Experimenter's method using T5 and T6; T10 absorbs T9.",
     "limitation": "Minor: T8-T10 converge smoothly; little residual disagreement survives to the end."
    },
    {
     "name": "Progress toward understanding",
     "rating": 8.3,
     "points": 3.32,
     "example": "Ending sequence: calm, isolate, repeat; T9 sharpens association versus diagnosis.",
     "limitation": "Minor: speed-versus-certainty question left in section D, not sharpened in turns."
    }
   ]
  },
  {
   "name": "Quality of disagreement, trust and grounding",
   "max": 20,
   "points": 16.4,
   "sub": [
    {
     "name": "Faithful engagement",
     "rating": 8.2,
     "points": 3.28,
     "example": "T5 states the one-at-a-time method accurately before showing its blind spot.",
     "limitation": "Minor: T1's ingredient-list claim never given or tested in its strongest form."
    },
    {
     "name": "Substance of challenges",
     "rating": 8.7,
     "points": 3.48,
     "example": "T5 names independence assumption and what breaks; T7 and T10 answer, not restate.",
     "limitation": "Minor: T3's laundry detergent and weather suspects thin for facial sting."
    },
    {
     "name": "Accuracy and support",
     "rating": 7.2,
     "points": 2.88,
     "example": "Mill's method of difference, Kahneman's WYSIATI, Taleb's via negativa used faithfully.",
     "limitation": "Minor: T1 calls ingredient lists guesswork; known irritant actives give real priors."
    },
    {
     "name": "Calibration and transparency",
     "rating": 8.3,
     "points": 3.32,
     "example": "T9 separates association from diagnosis; basis notes mark red flags as character's own.",
     "limitation": "Minor: T1 overconfident, calling the comparison evidence and ingredient reading guesswork."
    },
    {
     "name": "Intellectual honesty and revision",
     "rating": 8.6,
     "points": 3.44,
     "example": "T7 explicitly revises to calm baseline and concedes slowness; T10 accepts T9.",
     "limitation": "Minor: ingredient-list overstatement in T1 never pressed nor conceded."
    }
   ]
  },
  {
   "name": "Personal relevance",
   "max": 10,
   "points": 7.4,
   "sub": [
    {
     "name": "Identification of the actual concern",
     "rating": 8.2,
     "points": 1.64,
     "example": "Section D asks whether finding the cause matters more than calm skin.",
     "limitation": "Minor: never asks what the three products actually are."
    },
    {
     "name": "Meaningful use of personal context",
     "rating": 7.5,
     "points": 1.5,
     "example": "Three products started together within a week drives T3 and T5's interaction point.",
     "limitation": "Minor: product types unknown, so little personal detail changes the argument."
    },
    {
     "name": "Fit with goals and values",
     "rating": 7.6,
     "points": 1.52,
     "example": "T1-T10 stay on identifying cause, as the user asked.",
     "limitation": "Minor: user's priority between relief and knowledge raised only in section D."
    },
    {
     "name": "Attention to constraints and stakes",
     "rating": 7.2,
     "points": 1.44,
     "example": "T8 red flags and section A severity framing fit the stakes.",
     "limitation": "Minor: T5 assumes three actives layered; product types never given."
    },
    {
     "name": "Responsiveness to information",
     "rating": 6.5,
     "points": 1.3,
     "example": "T2 asks what else changed; section E branches on severity and persistence.",
     "limitation": "Material: product identities (retinoid, acid, fragrance) never asked though they reorder suspects."
    }
   ]
  },
  {
   "name": "Constructive self-discovery",
   "max": 20,
   "points": 14.2,
   "sub": [
    {
     "name": "Clarification of desires and motivations",
     "rating": 6.8,
     "points": 2.72,
     "example": "Section D offers cause-finding versus calm skin as alternatives with a question.",
     "limitation": "Material: only in section D; motives never explored within the turns."
    },
    {
     "name": "Examination of assumptions",
     "rating": 8.4,
     "points": 3.36,
     "example": "T3 exposes 'culprit is among the three'; T9 exposes 'result equals diagnosis'.",
     "limitation": "Minor: assumption that the sting is harmful, not expected adjustment, never examined."
    },
    {
     "name": "Clarification of values and priorities",
     "rating": 7.3,
     "points": 2.92,
     "example": "T7 frames speed versus trustworthy result; T8 safety over knowledge.",
     "limitation": "Minor: user's own ranking of these never put to them in turns."
    },
    {
     "name": "Recognition of fears and outside expectations",
     "rating": 5.2,
     "points": 2.08,
     "example": "T8's red flags address fear of a serious reaction implicitly.",
     "limitation": "Material: worry, sunk cost in products, reluctance to abandon them never named."
    },
    {
     "name": "Agency and reflective ownership",
     "rating": 7.8,
     "points": 3.12,
     "example": "T9 'decision, not a diagnosis' and section D question are user-refinable.",
     "limitation": "Minor: few distinctions framed as questions inside the debate itself."
    }
   ]
  },
  {
   "name": "Decision usefulness",
   "max": 10,
   "points": 7.86,
   "sub": [
    {
     "name": "Definition of the decision and options",
     "rating": 7.6,
     "points": 1.52,
     "example": "Stop all, reintroduce, simplify layering, seek care; waiting included in T8.",
     "limitation": "Minor: dropping newest or strongest product named only in section D."
    },
    {
     "name": "Explanation of tradeoffs",
     "rating": 7,
     "points": 1.4,
     "example": "T7 trades speed for trust; T8 weighs waiting against pushing through.",
     "limitation": "Minor: cost of weeks without products or their benefits never stated."
    },
    {
     "name": "Identification of decisive conditions",
     "rating": 8.4,
     "points": 1.68,
     "example": "Section E: fades, pass-alone-sting-together, red flags, persists two weeks; each favours an option.",
     "limitation": "Minor: 'several days' calm period and reintroduction gap left vague."
    },
    {
     "name": "Treatment of uncertainty",
     "rating": 8,
     "points": 1.6,
     "example": "Section A flags severity as consequential; T9 separates allergy, irritant, strength.",
     "limitation": "Minor: unknown product types not flagged as a consequential unknown."
    },
    {
     "name": "Proportionate next steps",
     "rating": 8.3,
     "points": 1.66,
     "example": "Stop tonight, gentle cleanser, log, calm baseline, small-spot retest, red-flag escalation.",
     "limitation": "Minor: no concrete length for calm phase before retesting."
    }
   ]
  },
  {
   "name": "Clarity and engagement",
   "max": 10,
   "points": 8.42,
   "sub": [
    {
     "name": "Accessible language",
     "rating": 8.6,
     "points": 1.72,
     "example": "Plain words throughout; 'measuring the damage, not the product' in T6.",
     "limitation": "Minor: T9 'product B' label never defined earlier."
    },
    {
     "name": "Traceable arguments and references",
     "rating": 8.4,
     "points": 1.68,
     "example": "'That's the trap exactly' (T6) clearly points to T5; 'I'll accept that' to T9.",
     "limitation": "Minor: T9 'product B' has no referent in any prior turn."
    },
    {
     "name": "Manageable pacing and turn length",
     "rating": 8.7,
     "points": 1.74,
     "example": "Ten turns, each 47 to 52 words, steady pacing.",
     "limitation": "Minor: uniform turn length gives little rhythmic variation."
    },
    {
     "name": "Distinguishable positions and voices",
     "rating": 8,
     "points": 1.6,
     "example": "Three distinct lenses; T7 states explicit change of position.",
     "limitation": "Minor: Subtractor and Skeptic converge by T8-T9, voices blur."
    },
    {
     "name": "Economy and sustained attention",
     "rating": 8.4,
     "points": 1.68,
     "example": "Little repetition; section E red flags repeat T8 with purpose.",
     "limitation": "Minor: T4 and T6 both prescribe logging, slight overlap."
    }
   ]
  },
  {
   "name": "Drama and entertainment",
   "max": 10,
   "points": 7.06,
   "sub": [
    {
     "name": "Meaningful stakes and tension",
     "rating": 6.8,
     "points": 1.36,
     "example": "T8 red flags raise stakes; T5 threatens the whole method.",
     "limitation": "Minor: low-stakes polite register; tension resolves quickly by T7."
    },
    {
     "name": "Surprise and reversals",
     "rating": 7.6,
     "points": 1.52,
     "example": "T7 revises method, citing T6's point that irritated skin falsifies retests.",
     "limitation": "Minor: refinements rather than reversals; no position truly overturned."
    },
    {
     "name": "Personality and expressive voice",
     "rating": 6.8,
     "points": 1.36,
     "example": "Subtractor's 'not a puzzle for a diary' (T8) has some edge.",
     "limitation": "Minor: all three share one measured, courteous tone; voices fairly flat."
    },
    {
     "name": "Memorable delivery",
     "rating": 7.8,
     "points": 1.56,
     "example": "'Dropping B is a decision, not a diagnosis' (T9); 'measuring the damage' (T6).",
     "limitation": "Minor: no vivid analogy or example beyond lists of suspects."
    },
    {
     "name": "Anticipation and emotional movement",
     "rating": 6.3,
     "points": 1.26,
     "example": "T5's 'Worse' builds a turn of concern.",
     "limitation": "Minor: constant even intensity; little emotional movement across turns."
    }
   ]
  }
 ],
 "uncapped": 77.5,
 "score": 77.5,
 "capReason": null,
 "strengths": [
  "T5 layering objection names assumption; T7 and T10 genuinely revise in response.",
  "Section E gives observable, branch-specific conditions including red flags and persistence.",
  "T9 separates association from diagnosis, calibrating what any test can show."
 ],
 "weaknesses": [
  "Product identities never asked (T1-T10), though actives like retinoids would reorder suspects.",
  "Fears, sunk cost and reluctance to drop products never named by any mind.",
  "Drop-the-strongest option debated only in section D, not in turns."
 ],
 "editorNotes": [
  "Require one turn asking for the missing fact that most reorders options, with each answer's implication.",
  "Require a mind to test the strongest alternative option (drop the harshest product) inside the turns.",
  "Ask one mind to name a plausible fear or obligation as a question, not an assertion.",
  "Push voices apart in register and let one disagreement survive to the final turn."
 ]
}
--- q2 Wealth / Career tradeoff, sample 1, version v1 (current): 74.56 / 100 ---
{
 "criteria": [
  {
   "name": "Quality of discussion",
   "max": 20,
   "points": 15.96,
   "sub": [
    {
     "name": "Continuity and responsiveness",
     "rating": 8.4,
     "points": 3.36,
     "example": "Turn 4 accepts turn 3's test drive, then objects it measures novelty, not year two.",
     "limitation": "minor: turn 9 sidesteps turn 7's tripwire objection instead of answering it."
    },
    {
     "name": "Development of ideas",
     "rating": 8.3,
     "points": 3.32,
     "example": "Turn 5 adds unequal hours and raise-funds-relocation; turn 6 builds a tripwire on it.",
     "limitation": "minor: turn 9 largely repeats turn 3's testing advice."
    },
    {
     "name": "Exploration of central tensions",
     "rating": 7,
     "points": 2.8,
     "example": "Money versus life-hours and trust in forecasts examined across turns 1, 2, 7, 8.",
     "limitation": "material: family, sleep, health costs never raised; job substance raised turn 8, undeveloped."
    },
    {
     "name": "Integration of perspectives",
     "rating": 8,
     "points": 3.2,
     "example": "Turn 10: Accountant concedes flexibility changes his math, keeps five-day objection.",
     "limitation": "minor: Bet Designer's view never reshaped by turn 7's critique."
    },
    {
     "name": "Progress toward understanding",
     "rating": 8.2,
     "points": 3.28,
     "example": "Section D: offer is several offers depending on days, travel, purpose, reversibility.",
     "limitation": "minor: tripwire-reliability disagreement left unsharpened after turn 7."
    }
   ]
  },
  {
   "name": "Quality of disagreement, trust and grounding",
   "max": 20,
   "points": 14.88,
   "sub": [
    {
     "name": "Faithful engagement",
     "rating": 7.8,
     "points": 3.12,
     "example": "Turn 5 restates turn 4's hourly math accurately before objecting to identical hours.",
     "limitation": "minor: turn 10 frames forecast disagreement as with Duke, not the Skeptic."
    },
    {
     "name": "Substance of challenges",
     "rating": 7,
     "points": 2.8,
     "example": "Turn 7: tripwire assumes it survives lifestyle absorption; else 'decoration'.",
     "limitation": "material: Bet Designer never answers turn 7; turn 5's objection unanswered by Accountant."
    },
    {
     "name": "Accuracy and support",
     "rating": 7.4,
     "points": 2.96,
     "example": "Turn 1 Thoreau quote accurate, pd true; 700 hours and 60% arithmetic correct.",
     "limitation": "material: turn 10 '25% rarely pays for itself' unsupported; disagreement misattributed to Duke."
    },
    {
     "name": "Calibration and transparency",
     "rating": 7.6,
     "points": 3.04,
     "example": "Turn 2 labels commute non-adaptation 'my extension, not proof'.",
     "limitation": "minor: turn 10 'rarely pays' generalises without the user's salary."
    },
    {
     "name": "Intellectual honesty and revision",
     "rating": 7.4,
     "points": 2.96,
     "example": "Turn 8 concedes commute claim is 'the shakiest thing I've said'.",
     "limitation": "material: Bet Designer withholds any concession to turn 7's objection."
    }
   ]
  },
  {
   "name": "Personal relevance",
   "max": 10,
   "points": 6.88,
   "sub": [
    {
     "name": "Identification of the actual concern",
     "rating": 7.5,
     "points": 1.5,
     "example": "Section A reframes: what money does, what time would do, how to learn first.",
     "limitation": "minor: why the user is looking at offers at all is never probed."
    },
    {
     "name": "Meaningful use of personal context",
     "rating": 6.5,
     "points": 1.3,
     "example": "Turn 1 turns 90 minutes into eighteen forty-hour weeks a year.",
     "limitation": "material: only the two given numbers used; no question elicits more personal context."
    },
    {
     "name": "Fit with goals and values",
     "rating": 6,
     "points": 1.2,
     "example": "Turn 4 compares per-hour raise against what free time is worth to you.",
     "limitation": "material: user's own priorities never asked; speakers' values dominate."
    },
    {
     "name": "Attention to constraints and stakes",
     "rating": 6.8,
     "points": 1.36,
     "example": "Turn 4 nets out tax, fuel, fares and parking from the raise.",
     "limitation": "material: household, caregiving and health constraints absent; turn 7 mortgage hypothetical."
    },
    {
     "name": "Responsiveness to information",
     "rating": 7.6,
     "points": 1.52,
     "example": "Section E branches on remote days, money purpose, current-job unhappiness.",
     "limitation": "minor: travel mode and reversibility listed in A but lack stated implications."
    }
   ]
  },
  {
   "name": "Constructive self-discovery",
   "max": 20,
   "points": 13.76,
   "sub": [
    {
     "name": "Clarification of desires and motivations",
     "rating": 6.4,
     "points": 2.56,
     "example": "Turn 5 and section E: debt, savings goal, relocation as possible purposes.",
     "limitation": "material: motives for wanting the job (escape, status, need) never offered as alternatives."
    },
    {
     "name": "Examination of assumptions",
     "rating": 7.6,
     "points": 3.04,
     "example": "Turn 9: staying put is also a bet, not a neutral default.",
     "limitation": "minor: assumption that pay is the main draw never questioned directly."
    },
    {
     "name": "Clarification of values and priorities",
     "rating": 7,
     "points": 2.8,
     "example": "Turn 4 asks what an hour of free time is worth to you.",
     "limitation": "material: no conflict among user's valued outcomes beyond money versus time."
    },
    {
     "name": "Recognition of fears and outside expectations",
     "rating": 5.8,
     "points": 2.32,
     "example": "Turn 7 names lifestyle creep making exit costly.",
     "limitation": "material: fear, obligation, family expectations largely absent from all turns."
    },
    {
     "name": "Agency and reflective ownership",
     "rating": 7.6,
     "points": 3.04,
     "example": "Section D: 'things to examine, not conclusions about you'.",
     "limitation": "minor: few direct questions the user can answer; mostly instructions."
    }
   ]
  },
  {
   "name": "Decision usefulness",
   "max": 10,
   "points": 8.08,
   "sub": [
    {
     "name": "Definition of the decision and options",
     "rating": 8.2,
     "points": 1.64,
     "example": "Turn 9: accept, stay, test, or counteroffer smaller raise with remote days.",
     "limitation": "minor: declining and searching elsewhere only implied, not laid out."
    },
    {
     "name": "Explanation of tradeoffs",
     "rating": 7.8,
     "points": 1.56,
     "example": "Turn 7: absorbed raise makes leaving costly while commute stays three hours.",
     "limitation": "minor: costs of the counteroffer and of a week-long test unstated."
    },
    {
     "name": "Identification of decisive conditions",
     "rating": 8.2,
     "points": 1.64,
     "example": "Turn 4: after-tax, after-cost raise per 700 hours versus your free-time value.",
     "limitation": "minor: turn 6's six-month tripwire not drawn from user's facts."
    },
    {
     "name": "Treatment of uncertainty",
     "rating": 8,
     "points": 1.6,
     "example": "Section E names three most consequential unknowns: on-site days, net raise, route.",
     "limitation": "minor: job quality flagged turn 8 omitted from section E's key unknowns."
    },
    {
     "name": "Proportionate next steps",
     "rating": 8.2,
     "points": 1.64,
     "example": "Section E: ask employer, ride route at rush hour, negotiate, write exit rule.",
     "limitation": "minor: no ordering of steps before the offer deadline."
    }
   ]
  },
  {
   "name": "Clarity and engagement",
   "max": 10,
   "points": 7.92,
   "sub": [
    {
     "name": "Accessible language",
     "rating": 8.4,
     "points": 1.68,
     "example": "Turn 4's arithmetic stated in plain steps the user can compute.",
     "limitation": "minor: 'tripwire' and 'life cost' used without brief gloss."
    },
    {
     "name": "Traceable arguments and references",
     "rating": 7.2,
     "points": 1.44,
     "example": "Turn 8 'that's Gilbert turned on me' clearly targets turn 7.",
     "limitation": "material: turn 10 'Duke and I still disagree' points to the wrong mind."
    },
    {
     "name": "Manageable pacing and turn length",
     "rating": 8.4,
     "points": 1.68,
     "example": "Ten turns, all 45 to 64 words.",
     "limitation": "minor: turns 4, 8, 10 near the 65-word ceiling."
    },
    {
     "name": "Distinguishable positions and voices",
     "rating": 7.8,
     "points": 1.56,
     "example": "Accountant counts, Skeptic doubts forecasts, Designer tests; turn 8 shift explicit.",
     "limitation": "minor: Skeptic and Designer share a similar measured register."
    },
    {
     "name": "Economy and sustained attention",
     "rating": 7.8,
     "points": 1.56,
     "example": "Section E condenses branches without repeating debate text.",
     "limitation": "minor: turn 9 re-lists testing ideas from turn 3."
    }
   ]
  },
  {
   "name": "Drama and entertainment",
   "max": 10,
   "points": 7.08,
   "sub": [
    {
     "name": "Meaningful stakes and tension",
     "rating": 7,
     "points": 1.4,
     "example": "Turn 1: does 25% buy eighteen weeks of your life?",
     "limitation": "minor: stakes stay abstract; no lived scene of a commuting day."
    },
    {
     "name": "Surprise and reversals",
     "rating": 7.4,
     "points": 1.48,
     "example": "Turn 8 Skeptic concedes after turn 7: 'we adapt to money too'.",
     "limitation": "minor: turn 10 concession is partial and expected from turn 9."
    },
    {
     "name": "Personality and expressive voice",
     "rating": 7,
     "points": 1.4,
     "example": "Accountant's blunt 'Otherwise it's decoration' in turn 7.",
     "limitation": "minor: Thoreau mind lacks Thoreauvian flavour beyond turn 1."
    },
    {
     "name": "Memorable delivery",
     "rating": 7.6,
     "points": 1.52,
     "example": "Turn 5: 'a seat on a train with a book' versus 'a clenched drive'.",
     "limitation": "minor: no humour; few images after turn 5."
    },
    {
     "name": "Anticipation and emotional movement",
     "rating": 6.4,
     "points": 1.28,
     "example": "Turn 7's challenge raises tension before turn 8's concession.",
     "limitation": "material: even, measured intensity throughout; little emotional rise or release."
    }
   ]
  }
 ],
 "uncapped": 74.56,
 "score": 74.56,
 "capReason": null,
 "strengths": [
  "Turn 4 gives a countable decision rule: net raise per 700 hours versus free-time value.",
  "Concrete, proportionate tests: rush-hour route, remote-day ask, counteroffer, written exit rule (turns 3, 6, 9).",
  "Honest calibration: turn 2 flags its extension, turn 8 concedes its shakiest claim."
 ],
 "weaknesses": [
  "Bet Designer never answers turn 7's objection that tripwires fail once salary is absorbed.",
  "User's own motives, fears, household and health constraints barely explored by any mind.",
  "Turn 10 misattributes the forecast disagreement to Duke and asserts '25% rarely pays' unsupported."
 ],
 "editorNotes": [
  "Require the target of a named-assumption objection to answer it in its next turn, conceding or rebutting.",
  "Require at least two plausible motives for considering the offer, posed as alternatives with an answerable question.",
  "Require one turn to raise household, health or caregiving costs as a conditional branch, without inventing facts.",
  "Forbid general verdicts like 'rarely pays' unless derived from the user's own numbers; name minds by title."
 ]
}
--- q3 Love / One-sided friendship, sample 1, version v1 (current): 80.44 / 100 ---
{
 "criteria": [
  {
   "name": "Quality of discussion",
   "max": 20,
   "points": 16.36,
   "sub": [
    {
     "name": "Continuity and responsiveness",
     "rating": 8.2,
     "points": 3.28,
     "example": "T4 turns Skeptic's alternative stories into the case for speaking; T5 opens 'Fair'.",
     "limitation": "minor: T3 adds a fresh frame rather than answering T2 directly."
    },
    {
     "name": "Development of ideas",
     "rating": 8.4,
     "points": 3.36,
     "example": "T8 introduces 'decide which answers would change what you do'; T9 builds answer branches on it.",
     "limitation": "minor: T10 largely restates T4's resentment-leaks point."
    },
    {
     "name": "Exploration of central tensions",
     "rating": 7.6,
     "points": 3.04,
     "example": "Speaking versus giving without a ledger examined across T3, T6, T9, T10.",
     "limitation": "minor: section A's 'less interest' possibility never examined squarely in any turn."
    },
    {
     "name": "Integration of perspectives",
     "rating": 8.3,
     "points": 3.32,
     "example": "T6 Idealist reshapes speaking into invitation; T7 sharpens it; T10 keeps real disagreement.",
     "limitation": "minor: T7 'Agreed' converges quickly without testing T6's framing."
    },
    {
     "name": "Progress toward understanding",
     "rating": 8.4,
     "points": 3.36,
     "example": "Section D reframes choice as what the conversation should find out.",
     "limitation": "minor: wisdom-versus-avoidance split (T10) left with little argument either side."
    }
   ]
  },
  {
   "name": "Quality of disagreement, trust and grounding",
   "max": 20,
   "points": 15.84,
   "sub": [
    {
     "name": "Faithful engagement",
     "rating": 8,
     "points": 3.2,
     "example": "T4 accurately restates Skeptic's T2 alternatives before using them.",
     "limitation": "minor: T10 attributes 'maturity' framing to acceptance; no speaker used it."
    },
    {
     "name": "Substance of challenges",
     "rating": 8.3,
     "points": 3.32,
     "example": "T8 names assumption initiating equals caring and says replies get spun otherwise.",
     "limitation": "minor: Plain Speaker, T8's real target, never answers the initiating-equals-caring objection."
    },
    {
     "name": "Accuracy and support",
     "rating": 7.4,
     "points": 2.96,
     "example": "Rosenberg's observation-request distinction (T7) and Emerson's sincerity (T6) faithfully used.",
     "limitation": "minor: T5 'defensiveness is the fast reaction' stretches Kahneman; single-quoted phrases in pd=false turns."
    },
    {
     "name": "Calibration and transparency",
     "rating": 7.4,
     "points": 2.96,
     "example": "T9 basis marks lopsided-friendship extension as the speaker's own, not Emerson's.",
     "limitation": "minor: T1 'It curdles' and T4 'Resentment leaks' asserted as certainties."
    },
    {
     "name": "Intellectual honesty and revision",
     "rating": 8.5,
     "points": 3.4,
     "example": "T5 concedes asking beats guessing; T10 concedes possible unfixable mismatch.",
     "limitation": "minor: no speaker revises after T8's challenge to the request's premise."
    }
   ]
  },
  {
   "name": "Personal relevance",
   "max": 10,
   "points": 7.6,
   "sub": [
    {
     "name": "Identification of the actual concern",
     "rating": 8.2,
     "points": 1.64,
     "example": "Section A: unknown reason decides whether speaking is request, test, or accusation.",
     "limitation": "minor: never asks whether user seeks reassurance, fairness, or permission to stop."
    },
    {
     "name": "Meaningful use of personal context",
     "rating": 8,
     "points": 1.6,
     "example": "Lovely meetings used as evidence (T3) and as timing for asking (T11).",
     "limitation": "minor: the 'if I stop texting' detail is probed (T5) but not tied to user's history."
    },
    {
     "name": "Fit with goals and values",
     "rating": 7.6,
     "points": 1.52,
     "example": "T6 invitation keeps the warmth the user values in the meetings.",
     "limitation": "minor: speakers' values (sincerity, no ledger) dominate; user's own priority never asked."
    },
    {
     "name": "Attention to constraints and stakes",
     "rating": 7,
     "points": 1.4,
     "example": "T11 weighs timing: raise after a good meeting, not after silence.",
     "limitation": "material: T1 invents 'months'; T6, T9, T11 assume the friend is female."
    },
    {
     "name": "Responsiveness to information",
     "rating": 7.2,
     "points": 1.44,
     "example": "T9 branches on friend's two possible answers and what each implies.",
     "limitation": "minor: duration of pattern and prior hints never asked as questions."
    }
   ]
  },
  {
   "name": "Constructive self-discovery",
   "max": 20,
   "points": 16.16,
   "sub": [
    {
     "name": "Clarification of desires and motivations",
     "rating": 8.4,
     "points": 3.36,
     "example": "Section D: does lopsidedness bother you itself, or only what it means about caring?",
     "limitation": "minor: the motive question appears only in section D, not inside the debate."
    },
    {
     "name": "Examination of assumptions",
     "rating": 8.6,
     "points": 3.44,
     "example": "T8 surfaces initiating equals caring; T5 questions whether the stop-texting test was run.",
     "limitation": "minor: assumption that the meetings are mutual delight never examined."
    },
    {
     "name": "Clarification of values and priorities",
     "rating": 8.2,
     "points": 3.28,
     "example": "T9 and T10 set giving freely against naming an unmet need.",
     "limitation": "minor: user's own weighting of reciprocity versus ease never put as a question."
    },
    {
     "name": "Recognition of fears and outside expectations",
     "rating": 6.8,
     "points": 2.72,
     "example": "T10 names the persisting pang as a signal, not a flaw.",
     "limitation": "material: fear that asking reveals she cares less, or loses the friend, never explored."
    },
    {
     "name": "Agency and reflective ownership",
     "rating": 8.4,
     "points": 3.36,
     "example": "Section E: user decides freely how much planning to keep after asking.",
     "limitation": "minor: T10 disagreement handed over without a question the user could answer."
    }
   ]
  },
  {
   "name": "Decision usefulness",
   "max": 10,
   "points": 8.28,
   "sub": [
    {
     "name": "Definition of the decision and options",
     "rating": 8.4,
     "points": 1.68,
     "example": "Speak, accept, silent test, or observe then ask once: T3, T5, T6, section E.",
     "limitation": "minor: letting the friendship shrink or stepping back is never named as an option."
    },
    {
     "name": "Explanation of tradeoffs",
     "rating": 8,
     "points": 1.6,
     "example": "T6 cost of silent test; T10 speaking may reveal an unfixable mismatch.",
     "limitation": "minor: cost of asking to the friend's comfort barely weighed."
    },
    {
     "name": "Identification of decisive conditions",
     "rating": 8.4,
     "points": 1.68,
     "example": "Section E: energized versus drained after meetings; shares effort once asked means habit.",
     "limitation": "minor: 'a few meetings' gives no observable threshold for drained enough."
    },
    {
     "name": "Treatment of uncertainty",
     "rating": 8,
     "points": 1.6,
     "example": "Friend's reasons named the decisive unknown; T5 flags busy-season noise.",
     "limitation": "minor: minor unknowns not explicitly ranked below the friend's reasons."
    },
    {
     "name": "Proportionate next steps",
     "rating": 8.6,
     "points": 1.72,
     "example": "T7 and T11: one concrete request, after a good evening, raised once.",
     "limitation": "minor: no step for what to do if she agrees but nothing changes."
    }
   ]
  },
  {
   "name": "Clarity and engagement",
   "max": 10,
   "points": 8.52,
   "sub": [
    {
     "name": "Accessible language",
     "rating": 8.8,
     "points": 1.76,
     "example": "Plain scripts like 'Could you suggest the next plan?' (T7).",
     "limitation": "minor: T5 'the answer will be noisy' is slightly technical."
    },
    {
     "name": "Traceable arguments and references",
     "rating": 8,
     "points": 1.6,
     "example": "T4 names 'Skeptic's alternative stories' explicitly.",
     "limitation": "minor: T10 'calling acceptance maturity' has no clear source turn."
    },
    {
     "name": "Manageable pacing and turn length",
     "rating": 9,
     "points": 1.8,
     "example": "Eleven turns, all 40 to 54 words.",
     "limitation": "none"
    },
    {
     "name": "Distinguishable positions and voices",
     "rating": 8.6,
     "points": 1.72,
     "example": "Plain Speaker directive, Skeptic cautious, Idealist reflective; T6 shift marked 'I lean'.",
     "limitation": "minor: T6 and T7 converge on near-identical invitation scripts."
    },
    {
     "name": "Economy and sustained attention",
     "rating": 8.2,
     "points": 1.64,
     "example": "Each turn adds a move; no verbatim repetition.",
     "limitation": "minor: section E partly restates T9's branches."
    }
   ]
  },
  {
   "name": "Drama and entertainment",
   "max": 10,
   "points": 7.68,
   "sub": [
    {
     "name": "Meaningful stakes and tension",
     "rating": 7.4,
     "points": 1.48,
     "example": "T6: friend fails a test she didn't know she was taking.",
     "limitation": "minor: risk of losing the friendship never voiced, so stakes stay muted."
    },
    {
     "name": "Surprise and reversals",
     "rating": 7.6,
     "points": 1.52,
     "example": "T6 Idealist moves to speaking because T5's silent test has its own cost.",
     "limitation": "minor: shifts are mild concessions; no turn overturns a prior position."
    },
    {
     "name": "Personality and expressive voice",
     "rating": 7.8,
     "points": 1.56,
     "example": "Plain Speaker's blunt 'It curdles' (T1).",
     "limitation": "minor: Skeptic's voice stays procedural across T2, T5, T8, T11."
    },
    {
     "name": "Memorable delivery",
     "rating": 8.4,
     "points": 1.68,
     "example": "T3: wonderful in a room and useless in a group chat.",
     "limitation": "minor: memorable lines cluster in T3 and T6; later turns plainer."
    },
    {
     "name": "Anticipation and emotional movement",
     "rating": 7.2,
     "points": 1.44,
     "example": "T10 leaves an open disagreement that T11 accepts and redirects.",
     "limitation": "minor: even, mild intensity throughout; little rhythm variation."
    }
   ]
  }
 ],
 "uncapped": 80.44,
 "score": 80.44,
 "capReason": null,
 "strengths": [
  "T8 names the initiating-equals-caring assumption and T9 turns it into answer branches.",
  "Concrete, proportionate next step: one specific request after a good evening (T7, T11).",
  "Real concessions (T5, T10) with an honestly stated remaining disagreement."
 ],
 "weaknesses": [
  "Fear of what asking might reveal or cost is never explored (all minds).",
  "Invented context: 'months' in T1 and a female friend in T6, T9, T11.",
  "Plain Speaker never answers T8's challenge to the request's premise."
 ],
 "editorNotes": [
  "Forbid inventing duration, gender or history; use 'your friend' unless the user specified.",
  "Require one turn to name the user's likely fear and offer it as a question, not a fact.",
  "Require the target of a named-assumption objection to answer it in their next turn.",
  "Ask that at least one motive question for the user appear inside a debate turn."
 ]
}
--- q4 Purpose / Comparison and expectations, sample 1, version v1 (current): 79.86 / 100 ---
{
 "criteria": [
  {
   "name": "Quality of discussion",
   "max": 20,
   "points": 16.16,
   "sub": [
    {
     "name": "Continuity and responsiveness",
     "rating": 8.3,
     "points": 3.32,
     "example": "T4 'Partly agreed, with a catch'; T5 'Fair hit'; T8 revisits own T5 concession.",
     "limitation": "minor: T6 moves to trials without answering T4's contamination objection."
    },
    {
     "name": "Development of ideas",
     "rating": 8.6,
     "points": 3.44,
     "example": "T7 splits social from practical clocks, absent from openings; T8 and T9 build on it.",
     "limitation": "minor: T4's 'wanting thing vs wanting relief' distinction never explicitly reused."
    },
    {
     "name": "Exploration of central tensions",
     "rating": 6.8,
     "points": 2.72,
     "example": "Comparison-as-noise versus feeling-as-information examined across T1-T9.",
     "limitation": "material: nobody raises drifting apart from friends or belonging as the source of 'behind'."
    },
    {
     "name": "Integration of perspectives",
     "rating": 8.2,
     "points": 3.28,
     "example": "Dissenter revises in T5 and T8; T10-T11 keep an honest split.",
     "limitation": "minor: Experimenter's position is never reshaped by the others."
    },
    {
     "name": "Progress toward understanding",
     "rating": 8.5,
     "points": 3.4,
     "example": "T9 sharpens to 'what specifically would you be late for'.",
     "limitation": "minor: T10-T11 mute-versus-audience dispute ends abstract."
    }
   ]
  },
  {
   "name": "Quality of disagreement, trust and grounding",
   "max": 20,
   "points": 16,
   "sub": [
    {
     "name": "Faithful engagement",
     "rating": 8,
     "points": 3.2,
     "example": "T3 restates Dissenter fairly before distinguishing uncertainty from refusal.",
     "limitation": "minor: T11 restates position rather than engaging T10's swap-of-comparisons argument."
    },
    {
     "name": "Substance of challenges",
     "rating": 8.2,
     "points": 3.28,
     "example": "T4 names assumption that trials are uncontaminated by envy; T5 answers.",
     "limitation": "minor: Experimenter (T6) never answers T4's objection to its own method."
    },
    {
     "name": "Accuracy and support",
     "rating": 8,
     "points": 3.2,
     "example": "T2 drummer paraphrase and T5 two-year Walden stay accurate.",
     "limitation": "minor: T3 puts 'I don't want these' in quote marks with pd false; not user's words."
    },
    {
     "name": "Calibration and transparency",
     "rating": 7.8,
     "points": 3.12,
     "example": "T9 'the alarm may be mostly noise' hedges appropriately.",
     "limitation": "minor: T1 'a ruler you never chose' asserted as fact about the user."
    },
    {
     "name": "Intellectual honesty and revision",
     "rating": 8,
     "points": 3.2,
     "example": "T8 'I conceded too tidily, then' revises after T7.",
     "limitation": "minor: T11 holds its view without answering T10's objection."
    }
   ]
  },
  {
   "name": "Personal relevance",
   "max": 10,
   "points": 7.78,
   "sub": [
    {
     "name": "Identification of the actual concern",
     "rating": 8.5,
     "points": 1.7,
     "example": "T3 catches 'not sure' as uncertainty, not refusal.",
     "limitation": "minor: possibility the worry is about losing friends never considered."
    },
    {
     "name": "Meaningful use of personal context",
     "rating": 7.5,
     "points": 1.5,
     "example": "T4 ties house-hunting test to the friends' example.",
     "limitation": "minor: homes and marriage treated generically; their differences never used."
    },
    {
     "name": "Fit with goals and values",
     "rating": 7.8,
     "points": 1.56,
     "example": "Debate respects user's stated uncertainty rather than pushing milestones.",
     "limitation": "minor: Dissenter's muting agenda (T11) pressed over user's open stance."
    },
    {
     "name": "Attention to constraints and stakes",
     "rating": 7.5,
     "points": 1.5,
     "example": "T7 names fertility window, partner timeline, rate lock as practical clocks.",
     "limitation": "minor: partner and finances raised as examples, never asked about directly."
    },
    {
     "name": "Responsiveness to information",
     "rating": 7.6,
     "points": 1.52,
     "example": "Section E branches on naming a concrete deadline versus feeling fading.",
     "limitation": "minor: age, relationship status, finances never turned into questions with implications."
    }
   ]
  },
  {
   "name": "Constructive self-discovery",
   "max": 20,
   "points": 15.92,
   "sub": [
    {
     "name": "Clarification of desires and motivations",
     "rating": 8.5,
     "points": 3.4,
     "example": "T4 wanting the thing versus wanting to stop feeling behind; section D question.",
     "limitation": "minor: belonging or fear of being left out not offered as alternative motive."
    },
    {
     "name": "Examination of assumptions",
     "rating": 8.6,
     "points": 3.44,
     "example": "T5 exposes defiance as letting friends set terms; T1 the borrowed ruler.",
     "limitation": "minor: assumption that milestones are the relevant measure only partly probed."
    },
    {
     "name": "Clarification of values and priorities",
     "rating": 6.8,
     "points": 2.72,
     "example": "T10 proposes building a ruler from what you value.",
     "limitation": "material: no turn asks what the user actually values or where values conflict."
    },
    {
     "name": "Recognition of fears and outside expectations",
     "rating": 7.4,
     "points": 2.96,
     "example": "T7-T8 separate peer pressure from body clock without pathologising.",
     "limitation": "minor: fear of isolation as friends pair off left unexamined."
    },
    {
     "name": "Agency and reflective ownership",
     "rating": 8.5,
     "points": 3.4,
     "example": "Section D offers a self-check the user can accept or reject.",
     "limitation": "minor: section E trials listed somewhat prescriptively."
    }
   ]
  },
  {
   "name": "Decision usefulness",
   "max": 10,
   "points": 7.98,
   "sub": [
    {
     "name": "Definition of the decision and options",
     "rating": 7.8,
     "points": 1.56,
     "example": "Section E: small test, patience, or own yardstick.",
     "limitation": "minor: options never laid out side by side within the debate."
    },
    {
     "name": "Explanation of tradeoffs",
     "rating": 7.3,
     "points": 1.46,
     "example": "T4 contamination cost of trials; T10 abstaining swaps comparisons.",
     "limitation": "minor: time or money cost of trials and of waiting not stated."
    },
    {
     "name": "Identification of decisive conditions",
     "rating": 8.4,
     "points": 1.68,
     "example": "Section E: nameable deadline favours testing; fading feeling favours patience.",
     "limitation": "minor: 'imagine friends not caring' test is introspective, not observable."
    },
    {
     "name": "Treatment of uncertainty",
     "rating": 8,
     "points": 1.6,
     "example": "T7 separates practical deadlines from social ones.",
     "limitation": "minor: unknowns not ranked by consequence."
    },
    {
     "name": "Proportionate next steps",
     "rating": 8.4,
     "points": 1.68,
     "example": "T6 afternoon running numbers, asking married friend about a Tuesday.",
     "limitation": "minor: T4's warning about envy-driven trials not reconciled with T6 steps."
    }
   ]
  },
  {
   "name": "Clarity and engagement",
   "max": 10,
   "points": 8.6,
   "sub": [
    {
     "name": "Accessible language",
     "rating": 8.8,
     "points": 1.76,
     "example": "T9 'an alarm with no label' plain and precise.",
     "limitation": "minor: T10 'audience' and 'ruler' metaphors stay abstract."
    },
    {
     "name": "Traceable arguments and references",
     "rating": 8.7,
     "points": 1.74,
     "example": "T5 'Fair hit' and T8 'conceded too tidily' map to T4 and T5.",
     "limitation": "minor: T10 'That part is slower' has a loose referent."
    },
    {
     "name": "Manageable pacing and turn length",
     "rating": 9,
     "points": 1.8,
     "example": "11 turns, all 37-46 words, digestible throughout.",
     "limitation": "none"
    },
    {
     "name": "Distinguishable positions and voices",
     "rating": 8.5,
     "points": 1.7,
     "example": "Three titled minds; T5 and T8 mark explicit shifts.",
     "limitation": "minor: Experimenter reads as moderator more than a distinct voice."
    },
    {
     "name": "Economy and sustained attention",
     "rating": 8,
     "points": 1.6,
     "example": "Few recaps; each turn adds a step.",
     "limitation": "minor: section E repeats T6 trials nearly verbatim ('curiosity, dread, or relief')."
    }
   ]
  },
  {
   "name": "Drama and entertainment",
   "max": 10,
   "points": 7.42,
   "sub": [
    {
     "name": "Meaningful stakes and tension",
     "rating": 7,
     "points": 1.4,
     "example": "T7 fertility window raises real stakes from the issue itself.",
     "limitation": "minor: tension stays polite and low throughout."
    },
    {
     "name": "Surprise and reversals",
     "rating": 8.3,
     "points": 1.66,
     "example": "T8 Dissenter reverses, citing T7's practical deadlines as cause.",
     "limitation": "minor: Dissenter's two concessions (T5, T8) follow a scripted pattern."
    },
    {
     "name": "Personality and expressive voice",
     "rating": 7,
     "points": 1.4,
     "example": "T2 Thoreau's drummer gives the Dissenter some colour.",
     "limitation": "minor: voices restrained; Thoreau lacks his sardonic bite."
    },
    {
     "name": "Memorable delivery",
     "rating": 8,
     "points": 1.6,
     "example": "T1 'a ruler you never chose'; T9 'alarm with no label'.",
     "limitation": "minor: few concrete images beyond T6's ordinary Tuesday."
    },
    {
     "name": "Anticipation and emotional movement",
     "rating": 6.8,
     "points": 1.36,
     "example": "T7-T8 brief rise in stakes.",
     "limitation": "material: near-identical turn lengths and even tone give flat rhythm."
    }
   ]
  }
 ],
 "uncapped": 79.86,
 "score": 79.86,
 "capReason": null,
 "strengths": [
  "T7 social-versus-practical clocks distinction drives T8 reversal and T9 'what would you be late for'.",
  "T3-T4 separate uncertainty from refusal and wanting from relief, giving real reflection material.",
  "Section E converts the debate into observable conditions and small reversible trials."
 ],
 "weaknesses": [
  "Nobody raises friendship drift or belonging as what 'behind' may mean.",
  "Values never elicited: T10 says build your own ruler but asks nothing about the user's.",
  "Flat rhythm: identical-length polite turns; Experimenter never answers T4's contamination objection."
 ],
 "editorNotes": [
  "Require one turn to name a consideration none of the minds' books covers, such as social or relational loss.",
  "Require a mind to ask the user a direct values question with what each answer would imply.",
  "Require the targeted mind to answer each named objection in its next turn before moving on.",
  "Vary turn length and intensity deliberately; allow one short, sharp turn."
 ]
}
--- q5 Wonder / Geography and causation, sample 1, version v1 (current): 70.48 / 100 ---
{
 "criteria": [
  {
   "name": "Quality of discussion",
   "max": 20,
   "points": 16,
   "sub": [
    {
     "name": "Continuity and responsiveness",
     "rating": 8,
     "points": 3.2,
     "example": "T5 presses T4's gap; T6 answers T5's wind claim directly.",
     "limitation": "minor: T8 opens geography thread loosely tied to T7's forecast point."
    },
    {
     "name": "Development of ideas",
     "rating": 8.3,
     "points": 3.32,
     "example": "T6 introduces warehouse vs delivery-truck distinction; T7 builds forecasts on it.",
     "limitation": "minor: T10 fragility-vs-contribution distinction arrives last, never used."
    },
    {
     "name": "Exploration of central tensions",
     "rating": 7.5,
     "points": 3,
     "example": "Ocean versus winds credit split examined across T4-T7.",
     "limitation": "minor: nobody raises cold northerly flow over eastern Canada from Rockies-shaped wind patterns."
    },
    {
     "name": "Integration of perspectives",
     "rating": 8.2,
     "points": 3.28,
     "example": "T9 Tracer narrows to 'one major link in a chain' after T8.",
     "limitation": "minor: Ice-Core Reader's paleo evidence barely reshapes Comparer's position."
    },
    {
     "name": "Progress toward understanding",
     "rating": 8,
     "points": 3.2,
     "example": "T10 sharpens open question: fragile link versus largest contributor.",
     "limitation": "minor: actual ocean-atmosphere split never estimated, left wholly open."
    }
   ]
  },
  {
   "name": "Quality of disagreement, trust and grounding",
   "max": 20,
   "points": 15.52,
   "sub": [
    {
     "name": "Faithful engagement",
     "rating": 8,
     "points": 3.2,
     "example": "T5 restates T4's switched-off-current test accurately before objecting.",
     "limitation": "minor: T2 calls Gulf Stream 'supporting actor' without engaging T1's magnitude claim."
    },
    {
     "name": "Substance of challenges",
     "rating": 8.2,
     "points": 3.28,
     "example": "T5: current shutoff measures added heat, not whether winds do most work; T6 answers.",
     "limitation": "minor: T3's 'size of the gap' rebuttal asserted without any figures."
    },
    {
     "name": "Accuracy and support",
     "rating": 7,
     "points": 2.8,
     "example": "Labrador Current, Pacific coast mildness, abrupt North Atlantic shifts all correct.",
     "limitation": "minor: T8 ignores Norway's Scandes; T1 'leaves the Gulf of Mexico' oversimplifies."
    },
    {
     "name": "Calibration and transparency",
     "rating": 7.3,
     "points": 2.92,
     "example": "T4 flags going beyond Alley; bases mark speakers' own extensions.",
     "limitation": "minor: T3, T9 'biggest piece' claims carry confidence with no evidence offered."
    },
    {
     "name": "Intellectual honesty and revision",
     "rating": 8.3,
     "points": 3.32,
     "example": "T3 concedes Vancouver counterexample; T9 narrows claim explicitly.",
     "limitation": "minor: T9 shifts from 'biggest piece' to 'least afford to lose', a reframing."
    }
   ]
  },
  {
   "name": "Personal relevance",
   "max": 10,
   "points": 6.5,
   "sub": [
    {
     "name": "Identification of the actual concern",
     "rating": 7.5,
     "points": 1.5,
     "example": "Section A names the ocean-versus-winds split as the decisive uncertainty.",
     "limitation": "minor: whether user wants explanation or climate-risk view never asked."
    },
    {
     "name": "Meaningful use of personal context",
     "rating": 6,
     "points": 1.2,
     "example": "Uses user's Europe-Canada comparison, naming Labrador and Hudson Bay.",
     "limitation": "material: which places the user compares never asked or used."
    },
    {
     "name": "Fit with goals and values",
     "rating": 6.5,
     "points": 1.3,
     "example": "Section E splits understanding today from forecasting circulation change.",
     "limitation": "material: user's goal inferred, never confirmed or questioned."
    },
    {
     "name": "Attention to constraints and stakes",
     "rating": 6,
     "points": 1.2,
     "example": "T7 ties the split to Europe's exposure if Atlantic circulation weakens.",
     "limitation": "material: stakes stay generic; no invented context but none tailored."
    },
    {
     "name": "Responsiveness to information",
     "rating": 6.5,
     "points": 1.3,
     "example": "Section E branches: explain today versus judge weakened circulation.",
     "limitation": "material: no direct question to the user about purpose or locations."
    }
   ]
  },
  {
   "name": "Constructive self-discovery",
   "max": 20,
   "points": 11.2,
   "sub": [
    {
     "name": "Clarification of desires and motivations",
     "rating": 5.5,
     "points": 2.2,
     "example": "Section D asks whether user sought one cause or combined causes.",
     "limitation": "material: curiosity versus climate worry never offered as alternative motives."
    },
    {
     "name": "Examination of assumptions",
     "rating": 7.2,
     "points": 2.88,
     "example": "T2 exposes the latitude-plus-single-cause assumption via Pacific coast.",
     "limitation": "minor: user's assumption that latitude should predict climate left implicit."
    },
    {
     "name": "Clarification of values and priorities",
     "rating": 4.5,
     "points": 1.8,
     "example": "Section E contrasts understanding the present with forecasting change.",
     "limitation": "material: no priorities for the user named or weighed."
    },
    {
     "name": "Recognition of fears and outside expectations",
     "rating": 4,
     "points": 1.6,
     "example": "T7 hints Europe 'would feel it' under weaker circulation.",
     "limitation": "material: possible climate anxiety or popular Gulf Stream myth never surfaced."
    },
    {
     "name": "Agency and reflective ownership",
     "rating": 6.8,
     "points": 2.72,
     "example": "T10 leaves fragility-versus-contribution open for the user to weigh.",
     "limitation": "minor: Section D's single reflective question is thin."
    }
   ]
  },
  {
   "name": "Decision usefulness",
   "max": 10,
   "points": 5.94,
   "sub": [
    {
     "name": "Definition of the decision and options",
     "rating": 5.5,
     "points": 1.1,
     "example": "Section E frames two uses: explanation now or forecasting change.",
     "limitation": "material: no real choice defined; options loosely framed."
    },
    {
     "name": "Explanation of tradeoffs",
     "rating": 4.5,
     "points": 0.9,
     "example": "Section E notes combined picture beats any single cause.",
     "limitation": "material: no cost of adopting either framing stated."
    },
    {
     "name": "Identification of decisive conditions",
     "rating": 6,
     "points": 1.2,
     "example": "Section E: Pacific coast mild without Gulf Stream favours combined picture.",
     "limitation": "material: no threshold for ocean share that would change the forecast view."
    },
    {
     "name": "Treatment of uncertainty",
     "rating": 7.2,
     "points": 1.44,
     "example": "T7 isolates the ocean-atmosphere split as the consequential unknown.",
     "limitation": "minor: well-known atmospheric dominance of heat transport never stated."
    },
    {
     "name": "Proportionate next steps",
     "rating": 6.5,
     "points": 1.3,
     "example": "Section E: compare published ocean and atmospheric heat-transport estimates.",
     "limitation": "minor: step vague; no source type or starting point named."
    }
   ]
  },
  {
   "name": "Clarity and engagement",
   "max": 10,
   "points": 8.26,
   "sub": [
    {
     "name": "Accessible language",
     "rating": 8.5,
     "points": 1.7,
     "example": "T6 warehouse and delivery truck makes heat storage plain.",
     "limitation": "minor: 'heat transport' in Section E unexplained for lay reader."
    },
    {
     "name": "Traceable arguments and references",
     "rating": 8.5,
     "points": 1.7,
     "example": "T5 'That's the gap' clearly points to T4's caveat.",
     "limitation": "minor: T3 'its Pacific counterpart' vague about which places."
    },
    {
     "name": "Manageable pacing and turn length",
     "rating": 8.5,
     "points": 1.7,
     "example": "Ten turns, each roughly 45-60 words, evenly paced.",
     "limitation": "minor: Sections D and E longer than any turn, dense."
    },
    {
     "name": "Distinguishable positions and voices",
     "rating": 7.8,
     "points": 1.56,
     "example": "Tracer, Reader, Comparer hold clearly different lenses; T9 shift explicit.",
     "limitation": "minor: openers 'That's too neat', 'Fair', 'Good' sound alike across minds."
    },
    {
     "name": "Economy and sustained attention",
     "rating": 8,
     "points": 1.6,
     "example": "Turns mostly add a new point each.",
     "limitation": "minor: Section D recaps causes already listed in T8-T9."
    }
   ]
  },
  {
   "name": "Drama and entertainment",
   "max": 10,
   "points": 7.06,
   "sub": [
    {
     "name": "Meaningful stakes and tension",
     "rating": 6.5,
     "points": 1.3,
     "example": "T7 links the credit split to Europe's fate if circulation weakens.",
     "limitation": "material: stakes stay abstract until T7, mostly an academic dispute."
    },
    {
     "name": "Surprise and reversals",
     "rating": 7.8,
     "points": 1.56,
     "example": "T3 concedes, citing T2's Pacific counterexample; T9 narrows after T8.",
     "limitation": "minor: reversals partial and expected; no genuine surprise."
    },
    {
     "name": "Personality and expressive voice",
     "rating": 7,
     "points": 1.4,
     "example": "T1 'opposite plumbing' gives the Tracer a confident voice.",
     "limitation": "minor: Reader and Comparer voices fairly flat and neutral."
    },
    {
     "name": "Memorable delivery",
     "rating": 8,
     "points": 1.6,
     "example": "T6 'wind is the delivery truck and the ocean is the warehouse'.",
     "limitation": "minor: few vivid concrete examples beyond Vancouver."
    },
    {
     "name": "Anticipation and emotional movement",
     "rating": 6,
     "points": 1.2,
     "example": "T7 'that sharpens the disagreement' raises momentum mid-debate.",
     "limitation": "material: tone uniformly even; little rhythm or emotional variation."
    }
   ]
  }
 ],
 "uncapped": 70.48,
 "score": 70.48,
 "capReason": null,
 "strengths": [
  "Responsive chain: T5 names T4's gap, T6 answers, T7 turns it into a forecast question",
  "Honest revision: T3 concedes the Pacific counterexample and T9 narrows the ocean claim",
  "Sharp closing distinction in T10 between the most fragile and largest contributing cause"
 ],
 "weaknesses": [
  "No question to the user about purpose or places compared; Sections D-E only infer goals",
  "Magnitude claims (T3, T9) and the ocean-atmosphere split never given any evidence or estimate",
  "Wind-pattern mechanism over eastern Canada missing; T8 ignores Norway's mountains"
 ],
 "editorNotes": [
  "Require one turn to name and weigh at least one checkable magnitude or known estimate behind 'biggest piece' claims",
  "Have the situation or a turn pose a direct question about the user's purpose with what each answer implies",
  "Ask for two plausible motives (curiosity, climate concern) offered as alternatives in Section D",
  "Require any new distinction introduced late to be used by a following turn, not only the last turn"
 ]
}

RECURRING WEAKNESSES of v1 (a complaint that appears on three or more of the five questions; these are the general faults, the rest may be question-specific)
(none recurred on three or more questions; look at CRITERION MEANS for what is low everywhere)

GOAL AND TRAJECTORY
The target for this lineage is 90 or more on the sonnet lane, on every question of a round. The prompt must stay general across Health, Wealth, Love, Purpose and Wonder; the next round draws five different questions.
Round means of the version under test so far: round 12 v1 76.57 (min 70.5).

LENGTH BUDGET (enforced in code; a version over it is rejected)
The system prompt is 1352 words. The absolute ceiling is 1900 words, so 548 words are left in total, and this round may add at most 135 words net.

PREVIOUS CHANGES (last three)
## v1 — baseline — 2026-10-13
Started from castDebate.v1.md, the original prompt with the two agreed plumbing edits, so that the Sonnet lineage is a clean test of whether the editor can improve the original prompt for a strong model.


Write version 2. Return the JSON object only.
