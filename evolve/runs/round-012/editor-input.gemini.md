# Editor, Gemini lineage

You improve the system prompt a worker follows when it writes a debate between three fictional minds about a user's situation. The worker is `gemini-3.1-flash-lite` at thinking level MEDIUM, a small fast model. Each version runs on five questions, one per category (Health, Wealth, Love, Purpose, Wonder), two samples each, judged on a strict 100-point matrix. The target is 70 or more on every question of a round, not a mean of 70: the lowest question is the binding evidence. The bar does not move. A per-question floor does not license tuning to the lowest category; the next round draws five different questions, and only a change that helps on all five raises the floor.

You never write a debate, score one, or address the user.

## What eleven rounds on this model have shown

- Fixed turn slots are the one kind of change with a record. The direct-question slot (round 9) raised responsiveness on every sample. The revision slot before the last turn (round 9) raised honesty and revision on most samples and was flat on one (4.5 to 4.5). The sized-step turn with the test turn after it (rounds 6 and 9) raised decisive conditions on most samples and lost on one (6.5 to 6.0). The fear-or-putting-off slot added in v11 (round 11) fell on two of three samples (6.5 to 5.5 twice) and was flat on the third, and v11 lost the round to v10. A slot is a bet with evidence behind it, not a sure gain; add one only where the scorecards name the missing content.
- Mandatory hedge words (round 6) raised calibration on every sample (1.87 to 2.11 of 4 points). The judges' comments said they flattened voices; criteria 6 and 7 did not fall in points that round.
- Citation and quotation mechanics were edited four times and never fixed misattribution.
- Across all Gemini samples on disk (rounds 1 to 11) the model writes 251 to 601 words of debate where 780 are allowed; round 11's v11 alone wrote 280 to 465. Word count correlates with score at about 0.5. Nearly every sample uses 9 or 10 turns of the 9 to 12 allowed.
- Recurring failures: arithmetic errors, misattributed quotes, strawman restatements, guesses about the user stated as fact, forced consensus, short debates.

## What you receive

One file, in this order:

- BASE SYSTEM PROMPT: the version to build on and its number. Its heading says one of three things: the current version beat the previous one (build on it); the current version tied with the previous one (the current version is kept and you build on it; a tie is not a loss); or the current version lost and is discarded, and you build on the previous version restored as base. The input shows the system part only; the user section is attached by the runner.
- THE FIVE QUESTIONS, with labels and, where set, a safety flag.
- PAIRED RESULTS: per question, both versions' scores, which won, the two samples each. A gap smaller than the spread between samples is not evidence.
- CRITERION MEANS: the seven criteria averaged over the five questions, both versions, with deltas.
- SCORECARDS: every scorecard in full, grouped by question.
- RECURRING WEAKNESSES: weakness lines on three or more questions.
- GOAL AND TRAJECTORY: the milestone, round means and minimums so far, the held-out score every fifth round.
- LENGTH BUDGET: words now, ceiling, words left, growth allowed this round.
- PREVIOUS CHANGES: the last three changelog entries. An entry's score line reports the paired result of the round that produced it, so a version's own fate is in the next entry's score line; the current version's fate is in PAIRED RESULTS and the BASE SYSTEM PROMPT heading.
- REWRITE ROUND, only on a rewrite round: a section with that exact title and its own word limit. If the file has no REWRITE ROUND section, this is not a rewrite round.
- The last line: "Write version N."

## How to work

1. Start from RECURRING WEAKNESSES and CRITERION MEANS. A weakness on one question is that question's complaint; on three or more it is the prompt's. A weakness on exactly two questions is question-specific unless the SCORECARDS show the same subcriterion low on all five questions; then treat it as the prompt's.
2. Rank subcriteria, not criteria: for each of the 35 subcriteria, take its maximum minus its mean points over every scorecard of the current version in this round (all five questions, both samples). That number is `pointsLost`. The top three or four are your targets. CRITERION MEANS tells you which criterion is low; the scorecards tell you which subcriterion inside it.
3. For each target, find the instruction that produced it, or note that it is missing.
4. Choose the kind of change, in this order:
   - A fixed slot: name the turn and say what it must contain. This model follows slots and ignores principles. Before adding one, list the turns the prompt already claims (the first turn; the turn before the final turn; the final turn; the turn after any proposed step; the turn after each guess about the user; and every floating "one turn" mandate) against the 9-turn minimum. Put the new content in a turn that is free, or merge it into an existing slot. Never give two slots the same turn, and never mandate more turn content than nine turns can hold.
   - A concrete content instruction: what the turn says, not how to phrase it. "Names a real case that went the other way" beats "argues rigorously".
   - Deletion: an instruction ignored across rounds is not fixed by restating it; remove it, or the instruction competing with it.
   Do not add wording formulas. They raise one subcriterion and cost voice and length elsewhere.
5. Two formula sentences are candidates for deletion on one condition only: the one-sentence restatement in the disagreement rule ("A turn that disagrees first restates the claim it disputes in one sentence...") and the maybe/perhaps/might/if list in section 5 with its copy in the section 6 per-line check. Delete either only when, in this round's CRITERION MEANS deltas, criteria 6 and 7 together fell by more than 0.24 points, the calibration gain the hedge list bought in round 6, and the scorecards' limitation notes on criteria 6 or 7 name the formula; otherwise the record says the formula is paying its way. The phrase-repeat inside the revision slot ("repeats a phrase from its own earlier turn as the claim it drops") stays; it is a slot that worked, not a formula. This is a condition, not an order of operations.
6. Use the allowed length: make the slots demand more content (a case, a cost, a question, a revision), not more words. Do not add, change or remove any instruction about word counts or turn counts, existing or new: no minimum words per turn, no "at least N turns", no raised turn mandate. The only lever on length is content per turn.
7. Accuracy. Do not edit the citation or quotation rules (section 3 and the per-line quotation check in section 6); five edits will not succeed where four failed. When accuracy and support is a target, address it through content (a turn that redoes the user's arithmetic and states the result; a mind whose book contains the claim it uses) or by deleting an instruction that invites invention.
8. Two to five changes a round; more only when several recurring weaknesses share a cause. One change is one instruction's worth of diff, however many places it touches: a section 5 rule and its copy in the section 6 per-line check, edited together, count as one change and are listed as one entry with both `before` and `after` texts. Softening an earlier change counts as a change.
9. Versions win or lose; changes do not. Never re-add a change from a version that lost, in the same or a different wording, unless the scorecards of the base version show the exact gap it was meant to fill and you say so in the changelog. If a change in a version that won coincides with a criterion that fell in this round's CRITERION MEANS, soften that change (narrow its trigger or its demand) before adding anything; list it in `reverted`.
10. Write for a small model: short sentences, one instruction each. When the trajectory is flat or falling, prefer deletion.

## Rules you never break

- Build on the base version; every change is a diff against it.
- General, not topical. A change must help on any question in any category. Never add a rule about one question's subject, people or books, or tune to the lowest-scoring category. An instruction may be conditional only on a feature of the user's text (a figure given, a person named, a yes-or-no question asked, a deadline stated, a work named), never on the topic, the category or the safety flag. "For a health question, one turn asks..." is tuning to one of the five in general form; do not write it.
- Protected parts. Do not change: the output format and field names; fictional role titles, never real people; the publication-year quotation rule; the user's language; the turn count and word range. If one of these is the leak, say so in `blocked` and leave it.
- Length. LENGTH BUDGET's growth allowance and ceiling are enforced by code; a version over either is rejected. At the ceiling, cut before adding. Count words the way the code does: whitespace-separated tokens of the system part, nothing more.
- Rewrite. Return a change of kind `rewrite` only when the input has a REWRITE ROUND section, and then as the single change, within that section's word limit. On any other round, never return kind `rewrite`; the growth allowance applies in full.
- Structure. Keep section headings and blank lines between paragraphs.
- No new output fields or sections.
- Honesty. If the scorecards give no clear cause, say so in the changelog and make a smaller change. Do not invent a cause to fill the quota.

## What you return

One JSON object and nothing else. The runner parses it.

{
  "version": "the number named in the input's last line, Write version N: the current version plus one, even when the base is an older version restored after a loss",
  "prompt": "the system part only: the complete text above the heading ## User’s situation, never that heading, the user section or {{question}}; the runner attaches them",
  "targets": [
    {"subcriterion": "name as in the scorecard", "pointsLost": 0.00, "causeInPrompt": "quoted or 'missing'"}
  ],
  "changes": [
    {"kind": "sharpen | replace | add | delete | rewrite", "before": "exact text removed, or empty", "after": "exact text added, or empty",
     "expectedEffect": "which subcriteria should rise and why, one sentence"}
  ],
  "reverted": ["any earlier change softened, with the reason"],
  "blocked": ["any protected part you believe is the leak, with the reason"],
  "wordCount": {"before": 0, "after": 0},
  "changelog": "two or three plain sentences a person can read in the version history"
}

`pointsLost` is the subcriterion's maximum minus its mean points over every scorecard of the current version this round. `wordCount` counts whitespace-separated tokens of the system part (before: the base; after: your `prompt`), the same count the runner uses to accept or reject the version. `prompt` is the whole system part, not a diff. `changes` accounts for every difference from the base, one entry per instruction changed, even when it is applied in two places. `rewrite` appears only on a rewrite round, as the one change.


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
- For someone exploring a topic or a work: what decides between competing explanations is evidence in the topic or text itself, and the next step is one specific thing to look at or reread. Do not recast the question as a decision about the user’s own life.
- For both: preserve the user’s ability to decide for themselves.

Do not infer personality, preferences, or motives from demographic labels.

## 2. Cast exactly three fictional minds

Choose three perspectives suited to this situation. Use descriptive role titles only, such as “The Experimenter” or “The Relationship Critic.” Do not give them personal names or impersonate real thinkers.

Ground each mind primarily in one book by one identifiable thinker. Choose three books that offer meaningfully different ways of understanding the central tension. At most one of the three books may be a general work of philosophy or psychology; the other two are about the user's specific problem or topic.

Each mind should have:
- A distinct concern or value.
- A defensible initial position.
- Something important the others might overlook.

Avoid a fixed optimist, pessimist, and neutral referee. Every mind should contribute, challenge, and face challenges.

The book supplies intellectual grounding, not a script. Each mind may acknowledge limits in its own framework and challenge another mind’s application of its source.

## 3. Ground the arguments without making them scholarly

Use ideas from each mind’s selected book to support its reasoning. Verified means you read the passage in this session; otherwise cite author and book only and paraphrase without quotation marks.

Every speaking turn must include a concise reference to its supporting book and, when verified, the relevant chapter or section. Put this reference in the final `basis` field:
[Basis: Author, Book, section](verified URL)

A reference is required; a quotation is not.

### How to cite

1. Book published before 1931: quote its exact words only if you read them this session; otherwise paraphrase. Keep quotations brief. For a translated or revised text, also verify that the edition supplying the quoted wording was published before 1931.
2. Book published in 1931 or later: do not quote. Express the idea naturally in your own words and name the author and book in the accompanying fields and reference. When `pd` is false, the `text` field contains no quotation marks of any kind: a suggested sentence or a borrowed label is written as reported speech (they could say they need a week to decide).
3. Use the author's famous idea by name, such as Taleb's skin in the game, only when the cited book contains it; a line from the author's other books stays out of this mind's turns. Naming a concept does not permit quoting passages from a book published in 1931 or later.
4. Only cite the book for ideas it is well known for and that you can responsibly attribute to it. If a fictional mind adds its own thinking, say so in its dialogue, for example: “I'd go further than Taleb here.” Do not present that extension as the author's claim.
5. For every dialogue line, output `text`, `author`, `book`, and `pd`. Treat one speaking turn as one dialogue line. Set `pd` to the JSON boolean `true` if the cited book was published before 1931, otherwise `false`. Use `pd` strictly as this publication-date flag. Verify the publication year; if it cannot be established, select another book with a verifiable year. Retain the speaker's role title and supporting reference in the `speaker` and `basis` fields.

These rules apply wherever a book is quoted or paraphrased in the response. The per-line fields apply to the debate in section C; retain the prose structure of sections A, B, D, and E.

Do not repeatedly introduce turns with “According to…” or summarize a book before answering an objection. Keep most attribution in the accompanying fields and reference.

Never invent quotations, references, links, or page numbers. Continue without requesting user input.

## 4. Let the minds genuinely debate

The first turn stakes out a concrete, contestable reading of what is going on. It does not answer the user's question; if the user asked a yes-or-no question, both answers get a turn's argument before any mind commits to one. Each later turn responds to a specific claim, objection, or unresolved issue already raised, and adds a distinction, concession, or counterexample its speaker has not used yet; no turn restates its speaker's earlier point.

Attack arguments freely; respect the dignity of the user and other people.

A turn that disagrees first restates the claim it disputes in one sentence, naming the role title that made it and reusing a phrase from that turn, then gives one reason against it: a real case that went the other way, a cost it leaves out, its speaker’s own earlier words turned against it, or something the user wrote that it does not fit. Give the strongest relevant alternative to the emerging recommendation a serious hearing, including waiting, doing less, or reframing the problem when appropriate.

Let objections have consequences: a claim becomes narrower, a proposed action changes, or an unresolved disagreement becomes clearer. In the turn before the final turn, one mind changes a stated position: it repeats a phrase from its own earlier turn as the claim it drops, names the other mind’s point that moved it, and states the narrower claim it now holds. One disagreement stays open to the end: no turn says the minds agree or that the matter is settled. The final turn does not restate openings or split the difference; it names that open disagreement and what would decide it: a fact about the user they have not given, or a detail in the text or topic they asked about.

One turn proposes one specific step with a number, an amount, or a time frame (for a topic or work, one passage or detail to reread). The turn after any proposed option or step checks it against each explicit constraint the user stated, one by one, and names one cost of choosing it.

## 5. Keep it accessible and entertaining

Use everyday language and short, responsive turns. Assume an intelligent reader without specialist knowledge. A claim about how things usually go names a specific real case that shows it, or is marked as a guess. The debate needs at least three such cases.

The minds address one another, but about this user’s situation, not the topic in general. Every explicit part of the user’s question gets at least one turn: when the question has two parts, one turn argues only the first part and a different turn argues only the second, before any turn joins them. The decisive uncertainty named in section A is argued in the turns, not only in the summaries: one turn asks the user for it in one direct question about something they have already done, felt, or noticed, and says which option or reading each answer favors. Do not invent facts about the user’s circumstances. The minds say I for themselves and you for the user, never the user, but they argue with one another, not at the user.

Every sentence about what the user or anyone else in the situation feels, fears, wants, or will do is a guess, hedged with maybe, perhaps, might, or if, never with must, clearly, always, or obviously. At least two turns each voice one such guess; each starts from something the user wrote and repeats it in reported speech. The turn after each takes it up: it accepts the reading, rejects it with a reason, or offers a rival one, and says what follows. One turn names two things the user may want at once that cannot both be fully had, says which option or reading serves each, and asks the user in one direct question which matters more. One turn names one thing the user may fear or be putting off and, only if the user mentioned another person, what that person may expect of the user; it asks the user in one direct question whether that is the real concern, and says what follows if it is.

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

Keep the dialogue continuous. Avoid mechanical round labels or moderator commentary between turns. Check each line before writing the next: when `pd` is false, `text` contains no quotation marks of any kind, not even around one word; when `pd` is true, quotation marks enclose only verified wording, and anything else is paraphrased; any sentence about what the user or anyone else feels, fears, wants, or will do carries maybe, perhaps, might, or if; `text` says you, never the user.

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
Quality of discussion (20) | 10.04 | -
Quality of disagreement, trust and grounding (20) | 9.44 | -
Personal relevance (10) | 4.24 | -
Constructive self-discovery (20) | 9.98 | -
Decision usefulness (10) | 4.61 | -
Clarity and engagement (10) | 6.22 | -
Drama and entertainment (10) | 4.01 | -
total | 48.54 | -
v1 per question: q1 51.24, q2 54.68, q3 50.40, q4 49.08, q5 37.30; spread between samples of one version is the noise floor: 37.3 to 54.7.

SCORECARDS (every judge sample, grouped by question)
--- q1 Health / Skincare troubleshooting, sample 1, version v1 (current): 51.24 / 100 ---
{
 "criteria": [
  {
   "name": "Quality of discussion",
   "max": 20,
   "points": 11.12,
   "sub": [
    {
     "name": "Continuity and responsiveness",
     "rating": 6,
     "points": 2.4,
     "example": "Turns 4 and 5 explicitly take up the prior speaker's claim.",
     "limitation": "material: Healer turns 3 and 6 ignore prior objections; near-monologue."
    },
    {
     "name": "Development of ideas",
     "rating": 6.8,
     "points": 2.72,
     "example": "Turn 5 adds inflamed-baseline confound; turn 7 builds a 7-day wait on it.",
     "limitation": "material: turn 6 restates turn 3, adding nothing new."
    },
    {
     "name": "Exploration of central tensions",
     "rating": 4.5,
     "points": 1.8,
     "example": "Turn 9 frames single ingredient versus cumulative change.",
     "limitation": "material: irritant vs allergic reaction, strong actives, when to see a doctor never raised."
    },
    {
     "name": "Integration of perspectives",
     "rating": 5.5,
     "points": 2.2,
     "example": "Turn 7: Reductionist absorbs Minimalist's recovery pause into the protocol.",
     "limitation": "material: Healer's stress view never integrated or tested by others."
    },
    {
     "name": "Progress toward understanding",
     "rating": 5,
     "points": 2,
     "example": "Section E ends with an observable 48-hour water test.",
     "limitation": "material: section D's 'cumulative stress' insight is vaguer than turn 5's concrete point."
    }
   ]
  },
  {
   "name": "Quality of disagreement, trust and grounding",
   "max": 20,
   "points": 10.16,
   "sub": [
    {
     "name": "Faithful engagement",
     "rating": 4.8,
     "points": 1.92,
     "example": "Turn 5 restates Reductionist's unsolved-question concern accurately.",
     "limitation": "material: turn 2 opposes testing though turn 1 already stops all three products."
    },
    {
     "name": "Substance of challenges",
     "rating": 6,
     "points": 2.4,
     "example": "Turn 5 names the clean-baseline assumption and the misread it causes; turn 7 answers.",
     "limitation": "material: turn 6 objection is unspecific and unanswered by anyone."
    },
    {
     "name": "Accuracy and support",
     "rating": 3.8,
     "points": 1.52,
     "example": "No quotation marks; all pd false; books exist.",
     "limitation": "material: turns 3, 6 stretch van der Kolk to skin stinging; section E inference unsupported."
    },
    {
     "name": "Calibration and transparency",
     "rating": 5,
     "points": 2,
     "example": "Turns hedge with 'might' rather than asserting diagnoses.",
     "limitation": "material: section E says 'likely reacting to a specific chemical' from a 24-hour stop."
    },
    {
     "name": "Intellectual honesty and revision",
     "rating": 5.8,
     "points": 2.32,
     "example": "Turn 7: Reductionist explicitly drops immediate testing.",
     "limitation": "material: Healer never answers turn 4's unsolved-culprit objection."
    }
   ]
  },
  {
   "name": "Personal relevance",
   "max": 10,
   "points": 4.52,
   "sub": [
    {
     "name": "Identification of the actual concern",
     "rating": 6,
     "points": 1.2,
     "example": "Section D separates finding the culprit from ending discomfort.",
     "limitation": "material: severity and safety of the reaction never treated as part of the concern."
    },
    {
     "name": "Meaningful use of personal context",
     "rating": 4.5,
     "points": 0.9,
     "example": "Turn 1 uses three products started together to set isolation.",
     "limitation": "material: product types or ingredients never used to shape the reasoning."
    },
    {
     "name": "Fit with goals and values",
     "rating": 5.5,
     "points": 1.1,
     "example": "Turn 8 weighs lost skincare progress against clarity.",
     "limitation": "minor: user's skincare goals assumed, not identified."
    },
    {
     "name": "Attention to constraints and stakes",
     "rating": 3.8,
     "points": 0.76,
     "example": "Turn 5 flags reintroducing on inflamed skin as risky.",
     "limitation": "material: no warning signs (swelling, eyes, hives) or medical threshold."
    },
    {
     "name": "Responsiveness to information",
     "rating": 2.8,
     "points": 0.56,
     "example": "Turn 8 asks whether one product feels harshest.",
     "limitation": "material: never asks which products, actives like retinoids or acids, or severity."
    }
   ]
  },
  {
   "name": "Constructive self-discovery",
   "max": 20,
   "points": 10.4,
   "sub": [
    {
     "name": "Clarification of desires and motivations",
     "rating": 6.5,
     "points": 2.6,
     "example": "Section D offers culprit-finding versus quick relief as alternatives with a question.",
     "limitation": "material: appears only in summary; debate turns never explore it."
    },
    {
     "name": "Examination of assumptions",
     "rating": 5.5,
     "points": 2.2,
     "example": "Turn 9 questions the assumption that one ingredient is to blame.",
     "limitation": "material: assumption that products caused it at all, or need for all three, unexamined."
    },
    {
     "name": "Clarification of values and priorities",
     "rating": 5,
     "points": 2,
     "example": "Turn 8: clarity versus routine progress.",
     "limitation": "material: conflict raised once, never weighed by other minds."
    },
    {
     "name": "Recognition of fears and outside expectations",
     "rating": 3.5,
     "points": 1.4,
     "example": "Turn 3 notes being overwhelmed by changes.",
     "limitation": "material: turn 3 casts stinging as skin reflecting stress, edging toward pathologising."
    },
    {
     "name": "Agency and reflective ownership",
     "rating": 5.5,
     "points": 2.2,
     "example": "Section E gives branches the user can choose among.",
     "limitation": "material: few distinctions the user could refine; mostly a protocol handed down."
    }
   ]
  },
  {
   "name": "Decision usefulness",
   "max": 10,
   "points": 5,
   "sub": [
    {
     "name": "Definition of the decision and options",
     "rating": 5.5,
     "points": 1.1,
     "example": "Turns 1, 2, 7: stop all, full pause, staged reintroduction.",
     "limitation": "material: patch testing, keeping one product, or seeing a dermatologist never offered."
    },
    {
     "name": "Explanation of tradeoffs",
     "rating": 5.5,
     "points": 1.1,
     "example": "Turn 8 names lost time as cost of the 7-day wait.",
     "limitation": "material: cost of the multi-week protocol never totalled or compared."
    },
    {
     "name": "Identification of decisive conditions",
     "rating": 5,
     "points": 1,
     "example": "Section E: sting after 48 hours of water favours recovery.",
     "limitation": "material: 7 and 3 day figures not drawn from user facts; branch logic doubtful."
    },
    {
     "name": "Treatment of uncertainty",
     "rating": 3.5,
     "points": 0.7,
     "example": "Turn 9 names the unresolved cause question.",
     "limitation": "material: allergy versus irritation, the consequential unknown, never separated."
    },
    {
     "name": "Proportionate next steps",
     "rating": 5.5,
     "points": 1.1,
     "example": "Section E: log reintroductions one product every 3 days.",
     "limitation": "material: no escalation step if symptoms worsen."
    }
   ]
  },
  {
   "name": "Clarity and engagement",
   "max": 10,
   "points": 6.58,
   "sub": [
    {
     "name": "Accessible language",
     "rating": 7.5,
     "points": 1.5,
     "example": "Turn 7 states plain days and steps.",
     "limitation": "minor: turn 6 'cumulative pressure of routines' is vague."
    },
    {
     "name": "Traceable arguments and references",
     "rating": 6.8,
     "points": 1.36,
     "example": "Turns 4 and 5 name the speaker they answer.",
     "limitation": "minor: turn 6 'If you feel' target ambiguous; turn 3 answers unnamed testing."
    },
    {
     "name": "Manageable pacing and turn length",
     "rating": 7.8,
     "points": 1.56,
     "example": "Nine turns, each within 25 to 65 words.",
     "limitation": "minor: Healer's turns stall pace at 3 and 6."
    },
    {
     "name": "Distinguishable positions and voices",
     "rating": 4.8,
     "points": 0.96,
     "example": "Reductionist's isolation stance is distinct.",
     "limitation": "material: Minimalist and Healer both argue a pause; all speak in identical 'you might' hedges."
    },
    {
     "name": "Economy and sustained attention",
     "rating": 6,
     "points": 1.2,
     "example": "Section E condenses the debate into three branches.",
     "limitation": "material: turn 6 repeats turn 3's overwhelm point."
    }
   ]
  },
  {
   "name": "Drama and entertainment",
   "max": 10,
   "points": 3.46,
   "sub": [
    {
     "name": "Meaningful stakes and tension",
     "rating": 4,
     "points": 0.8,
     "example": "Turn 4: culprit may stay unknown if you just quit.",
     "limitation": "material: tension low; turns 1 and 2 largely agree on stopping."
    },
    {
     "name": "Surprise and reversals",
     "rating": 4,
     "points": 0.8,
     "example": "Turn 7: Reductionist drops immediate testing.",
     "limitation": "material: turn 7 reversal names no turn or argument that changed his mind."
    },
    {
     "name": "Personality and expressive voice",
     "rating": 3,
     "points": 0.6,
     "example": "Healer's body-signal framing gives slight colour.",
     "limitation": "material: all three minds flat, uniformly hedged."
    },
    {
     "name": "Memorable delivery",
     "rating": 2.8,
     "points": 0.56,
     "example": "Turn 9's 48-hour water test is concrete.",
     "limitation": "material: no analogy, vivid example or sharp line anywhere."
    },
    {
     "name": "Anticipation and emotional movement",
     "rating": 3.5,
     "points": 0.7,
     "example": "Turn 9 sets up an unresolved test.",
     "limitation": "material: uniform low intensity across all nine turns."
    }
   ]
  }
 ],
 "uncapped": 51.24,
 "score": 51.24,
 "capReason": null,
 "strengths": [
  "Turn 5's inflamed-baseline confound is a real mid-debate distinction that turn 7 uses.",
  "Section E gives observable conditions (48-hour water test) tied to options.",
  "Section D poses culprit versus quick relief as a question the user can answer."
 ],
 "weaknesses": [
  "Never asks which products or actives, nor gives warning signs for seeing a doctor.",
  "Healer (turns 3, 6) misapplies trauma framing to skin stinging and repeats itself.",
  "Turn 7 reversal unexplained; all three voices flat and alike in hedging."
 ],
 "editorNotes": [
  "Require one turn to ask for the consequential missing facts (product names, actives, severity) with what each answer implies.",
  "Require minds whose sources actually fit the domain; forbid stretching a book to an unrelated mechanism.",
  "Require any change of position to name the earlier turn and argument that caused it.",
  "For health situations, require a safety threshold branch (when to stop and see a professional)."
 ]
}
--- q2 Wealth / Career tradeoff, sample 1, version v1 (current): 54.68 / 100 ---
{
 "criteria": [
  {
   "name": "Quality of discussion",
   "max": 20,
   "points": 11.24,
   "sub": [
    {
     "name": "Continuity and responsiveness",
     "rating": 6.5,
     "points": 2.6,
     "example": "T4-T6 each answer the prior speaker's claim by name.",
     "limitation": "Material: templated 'X claims... but' openers, T2-T9; replies restate rather than build."
    },
    {
     "name": "Development of ideas",
     "rating": 5.5,
     "points": 2.2,
     "example": "T4 adds burnout eroding productivity; T8 adds simulated-commute test.",
     "limitation": "Material: no mid-debate distinction is taken up later; T5 sovereignty dropped after T6."
    },
    {
     "name": "Exploration of central tensions",
     "rating": 5.3,
     "points": 2.12,
     "example": "T2-T3 set present time against future earning power.",
     "limitation": "Material: commute mode, remote days, family time never raised by any mind."
    },
    {
     "name": "Integration of perspectives",
     "rating": 4.8,
     "points": 1.92,
     "example": "T7 Optimizer reshapes view toward Strategist's capital point.",
     "limitation": "Material: T7 shift unexplained; Stoic and Strategist never qualify each other."
    },
    {
     "name": "Progress toward understanding",
     "rating": 6,
     "points": 2.4,
     "example": "Section D frames sovereignty now versus leverage later.",
     "limitation": "Material: ends on rhetorical T9 question, no sharper test of growth claim."
    }
   ]
  },
  {
   "name": "Quality of disagreement, trust and grounding",
   "max": 20,
   "points": 10.56,
   "sub": [
    {
     "name": "Faithful engagement",
     "rating": 5.5,
     "points": 2.2,
     "example": "T4 restates Strategist's option argument accurately before objecting.",
     "limitation": "Material: T7 credits Strategist with 'reduce hours elsewhere', never said; T3 dismisses Stoic."
    },
    {
     "name": "Substance of challenges",
     "rating": 5,
     "points": 2,
     "example": "T4 names burnout assumption undermining T3's long-term gains.",
     "limitation": "Material: T6 overstates a 25% raise ending wage work; T4 'high probability' unsupported."
    },
    {
     "name": "Accuracy and support",
     "rating": 5.8,
     "points": 2.32,
     "example": "T2 paraphrase of Seneca's 'life is long' line is faithful.",
     "limitation": "Material: optionality pinned on Skin in the Game; T4 burnout probability unsupported."
    },
    {
     "name": "Calibration and transparency",
     "rating": 5.3,
     "points": 2.12,
     "example": "Frequent 'might' and 'if' hedges in T1, T3, T6.",
     "limitation": "Material: T2 'no sum of money can replace' and T4 'high probability' overconfident."
    },
    {
     "name": "Intellectual honesty and revision",
     "rating": 4.8,
     "points": 1.92,
     "example": "T7 Optimizer explicitly drops his T1 hourly-wage claim.",
     "limitation": "Material: T7 drops sound claim for vague reason; Stoic never answers T6."
    }
   ]
  },
  {
   "name": "Personal relevance",
   "max": 10,
   "points": 4.46,
   "sub": [
    {
     "name": "Identification of the actual concern",
     "rating": 6,
     "points": 1.2,
     "example": "Section A frames math problem versus lifestyle question.",
     "limitation": "Material: never asks what 'worth it' means to this user."
    },
    {
     "name": "Meaningful use of personal context",
     "rating": 4.5,
     "points": 0.9,
     "example": "Section E converts 90 minutes into 15 hours weekly.",
     "limitation": "Material: only the two given numbers used; current commute never considered."
    },
    {
     "name": "Fit with goals and values",
     "rating": 4,
     "points": 0.8,
     "example": "Section E branches on capital need versus daily well-being.",
     "limitation": "Material: user's own priorities never asked; speakers' values dominate T2, T5."
    },
    {
     "name": "Attention to constraints and stakes",
     "rating": 3.8,
     "points": 0.76,
     "example": "T8 trial respects time cost of two weeks.",
     "limitation": "Material: T6 invents existing financial constraints; transit mode, family, remote ignored."
    },
    {
     "name": "Responsiveness to information",
     "rating": 4,
     "points": 0.8,
     "example": "Section E gives three conditional branches.",
     "limitation": "Material: no question on transit mode, current commute, or remote options."
    }
   ]
  },
  {
   "name": "Constructive self-discovery",
   "max": 20,
   "points": 11.52,
   "sub": [
    {
     "name": "Clarification of desires and motivations",
     "rating": 6.3,
     "points": 2.52,
     "example": "Section D: fear of stagnation versus wanting the lifestyle, as alternatives.",
     "limitation": "Material: appears only in summary; no debate turn explores either motive."
    },
    {
     "name": "Examination of assumptions",
     "rating": 5.8,
     "points": 2.32,
     "example": "T2 surfaces assumption that time is merely currency.",
     "limitation": "Material: assumption that the job brings growth (T3) never examined."
    },
    {
     "name": "Clarification of values and priorities",
     "rating": 6,
     "points": 2.4,
     "example": "T5 sovereignty over one's day set against T6 future independence.",
     "limitation": "Material: no question asking the user to rank these values."
    },
    {
     "name": "Recognition of fears and outside expectations",
     "rating": 4.5,
     "points": 1.8,
     "example": "Section D names fear of stagnation.",
     "limitation": "Material: social, family or obligation pressures never mentioned anywhere."
    },
    {
     "name": "Agency and reflective ownership",
     "rating": 6.2,
     "points": 2.48,
     "example": "T8 trial and section E branches are user-testable.",
     "limitation": "Material: T9 closes with leading 'can you really have both?'."
    }
   ]
  },
  {
   "name": "Decision usefulness",
   "max": 10,
   "points": 5.18,
   "sub": [
    {
     "name": "Definition of the decision and options",
     "rating": 4.8,
     "points": 0.96,
     "example": "Section E frames accept versus decline by priority.",
     "limitation": "Material: negotiation, remote days, relocation, or counteroffer never raised."
    },
    {
     "name": "Explanation of tradeoffs",
     "rating": 5.3,
     "points": 1.06,
     "example": "Section E: 15 hours weekly against salary jump.",
     "limitation": "Material: T1 hourly-wage calculation never done; raise value never quantified."
    },
    {
     "name": "Identification of decisive conditions",
     "rating": 5,
     "points": 1,
     "example": "T8: after 14 days, does money feel worth the time.",
     "limitation": "Material: section E conditions not countable; no observable growth threshold."
    },
    {
     "name": "Treatment of uncertainty",
     "rating": 4.3,
     "points": 0.86,
     "example": "T3 and T6 flag growth as conditional 'if'.",
     "limitation": "Material: growth and burnout uncertainty not separated from minor unknowns."
    },
    {
     "name": "Proportionate next steps",
     "rating": 6.5,
     "points": 1.3,
     "example": "T8 simulated commute for 14 days is cheap and concrete.",
     "limitation": "Minor: section E 'inquire' step lacks specifics on what to ask."
    }
   ]
  },
  {
   "name": "Clarity and engagement",
   "max": 10,
   "points": 6.72,
   "sub": [
    {
     "name": "Accessible language",
     "rating": 7,
     "points": 1.4,
     "example": "Plain phrasing throughout; T8 instructions concrete.",
     "limitation": "Minor: T2 'carriage of transit', T4 'marginal productivity' slightly opaque."
    },
    {
     "name": "Traceable arguments and references",
     "rating": 6.8,
     "points": 1.36,
     "example": "Each turn names whose point it answers, T2-T9.",
     "limitation": "Material: T7 'as the Strategist suggests' maps to no clear turn."
    },
    {
     "name": "Manageable pacing and turn length",
     "rating": 7.3,
     "points": 1.46,
     "example": "Nine turns, each roughly 45 to 60 words.",
     "limitation": "Minor: uniform turn rhythm, no short sharp exchanges."
    },
    {
     "name": "Distinguishable positions and voices",
     "rating": 6.5,
     "points": 1.3,
     "example": "Optimizer, Stoic, Strategist hold distinct positions.",
     "limitation": "Material: all three use identical 'X claims... but' openers; voices sound alike."
    },
    {
     "name": "Economy and sustained attention",
     "rating": 6,
     "points": 1.2,
     "example": "T8 introduces fresh practical content late.",
     "limitation": "Material: openers recap prior turns verbatim, e.g. T5, T6."
    }
   ]
  },
  {
   "name": "Drama and entertainment",
   "max": 10,
   "points": 5,
   "sub": [
    {
     "name": "Meaningful stakes and tension",
     "rating": 5.5,
     "points": 1.1,
     "example": "T5 frames commute as trading sovereignty for wage.",
     "limitation": "Material: tension stays abstract; no concrete life cost named."
    },
    {
     "name": "Surprise and reversals",
     "rating": 4.5,
     "points": 0.9,
     "example": "T7 Optimizer abandons his T1 calculation.",
     "limitation": "Material: T7 reversal has no traced cause from an earlier argument."
    },
    {
     "name": "Personality and expressive voice",
     "rating": 5,
     "points": 1,
     "example": "Stoic's T2 Seneca-flavoured line has some colour.",
     "limitation": "Material: Optimizer and Strategist read as flat, templated voices."
    },
    {
     "name": "Memorable delivery",
     "rating": 5.5,
     "points": 1.1,
     "example": "T8: sit in a chair 90 minutes before and after work.",
     "limitation": "Material: few analogies or sharp lines beyond T8."
    },
    {
     "name": "Anticipation and emotional movement",
     "rating": 4.5,
     "points": 0.9,
     "example": "T9 ends on a pointed question.",
     "limitation": "Material: constant even intensity; no build or release across turns."
    }
   ]
  }
 ],
 "uncapped": 54.68,
 "score": 54.68,
 "capReason": null,
 "strengths": [
  "T8 simulated 14-day commute is a concrete, cheap test the user can run.",
  "Section D frames sovereignty now versus leverage later, offering two motives as alternatives.",
  "Three distinct positions (utility, finite life, optionality) each answer the prior speaker."
 ],
 "weaknesses": [
  "Personal relevance thin: no question on transit mode, current commute, remote days or family (all minds).",
  "T7 Optimizer reversal lacks a traced cause and drops the useful hourly-wage calculation.",
  "Templated 'X claims... but' openers flatten voices and recap prior turns, T2-T9."
 ],
 "editorNotes": [
  "Require at least two turns to pose questions on missing facts (transit mode, remote days, current commute) with what each answer implies.",
  "Require any reversal to cite the specific earlier turn and argument that changed the speaker's mind.",
  "Ban formulaic openers restating the prior speaker; require a mid-debate distinction that a later turn uses.",
  "Ask for one countable threshold from the user's own numbers, e.g. effective hourly wage after commute."
 ]
}
--- q3 Love / One-sided friendship, sample 1, version v1 (current): 50.40 / 100 ---
{
 "criteria": [
  {
   "name": "Quality of discussion",
   "max": 20,
   "points": 9.8,
   "sub": [
    {
     "name": "Continuity and responsiveness",
     "rating": 5.5,
     "points": 2.2,
     "example": "Turn 9 answers turn 8's wait test; turn 5 rebuts turn 4.",
     "limitation": "Material: turns 1-3 are parallel monologues; turn 3 ignores turn 2."
    },
    {
     "name": "Development of ideas",
     "rating": 5,
     "points": 2,
     "example": "Turn 6 introduces habit versus indifference; turn 7 reframes as unshared expectations.",
     "limitation": "Material: habit distinction never feeds turns 8-10 or how to speak up."
    },
    {
     "name": "Exploration of central tensions",
     "rating": 4.5,
     "points": 1.8,
     "example": "Turn 8 versus turn 9: testing by silence against the anxiety it costs.",
     "limitation": "Material: whether and how to say something, the user's question, is never examined."
    },
    {
     "name": "Integration of perspectives",
     "rating": 5,
     "points": 2,
     "example": "Turn 7: Attachment Theorist drops pure attachment framing after turn 6.",
     "limitation": "Material: turn 4's dismissal of Aristotle never answered; turn 9 objection left hanging."
    },
    {
     "name": "Progress toward understanding",
     "rating": 4.5,
     "points": 1.8,
     "example": "Section E separates oblivious from indifferent friend.",
     "limitation": "Material: turn 10 ends on vague truth-versus-comfort; open question not sharper."
    }
   ]
  },
  {
   "name": "Quality of disagreement, trust and grounding",
   "max": 20,
   "points": 10.2,
   "sub": [
    {
     "name": "Faithful engagement",
     "rating": 4.5,
     "points": 1.8,
     "example": "Turn 6 grants friend may value the friendship while conceding the habit.",
     "limitation": "Material: turn 5 caricatures economist as treating people like assets; turn 4 misstates Aristotle."
    },
    {
     "name": "Substance of challenges",
     "rating": 5,
     "points": 2,
     "example": "Turn 9 names the anxiety cost of turn 8's three-week wait.",
     "limitation": "Material: economist never answers turn 9; turn 5 assumption not tested."
    },
    {
     "name": "Accuracy and support",
     "rating": 5.5,
     "points": 2.2,
     "example": "No quotation marks; paraphrases of Aristotle Book VIII equality broadly faithful.",
     "limitation": "Minor: turn 8's three weeks unsupported; turn 5 avoidant typology loosely Bowlby's."
    },
    {
     "name": "Calibration and transparency",
     "rating": 5.5,
     "points": 2.2,
     "example": "Turns 1, 5, 6 hedge with maybe and might.",
     "limitation": "Material: turn 8 asserts three weeks is long enough with no evidence."
    },
    {
     "name": "Intellectual honesty and revision",
     "rating": 5,
     "points": 2,
     "example": "Turn 7 explicitly revises the Attachment Theorist's position.",
     "limitation": "Material: Social Economist never concedes turn 5 or turn 9; withheld concession."
    }
   ]
  },
  {
   "name": "Personal relevance",
   "max": 10,
   "points": 4.9,
   "sub": [
    {
     "name": "Identification of the actual concern",
     "rating": 5.5,
     "points": 1.1,
     "example": "Turn 10 names whether you should speak up as the open question.",
     "limitation": "Material: never asks what saying something would mean or what the user wants from it."
    },
    {
     "name": "Meaningful use of personal context",
     "rating": 5,
     "points": 1,
     "example": "Turn 9 uses the user's 'lovely' meetings to weigh the wait's cost.",
     "limitation": "Material: 'if I stop texting, nothing happens' detail barely shapes reasoning."
    },
    {
     "name": "Fit with goals and values",
     "rating": 5,
     "points": 1,
     "example": "Section E ties choice to whether energy feels drained.",
     "limitation": "Material: turn 10 truth-versus-comfort is the speakers' framing, not the user's stated aim."
    },
    {
     "name": "Attention to constraints and stakes",
     "rating": 4.5,
     "points": 0.9,
     "example": "Turn 9 notes losing the lovely meetings during silence.",
     "limitation": "Material: turn 10 invents confrontation stakes; friendship length, friend's circumstances ignored."
    },
    {
     "name": "Responsiveness to information",
     "rating": 4.5,
     "points": 0.9,
     "example": "Section E branches on fear of loss versus drained energy.",
     "limitation": "Material: no question about friend's life, history, or prior conversations; needed detail never asked."
    }
   ]
  },
  {
   "name": "Constructive self-discovery",
   "max": 20,
   "points": 10.2,
   "sub": [
    {
     "name": "Clarification of desires and motivations",
     "rating": 5.5,
     "points": 2.2,
     "example": "Section D: notice whether fear of losing friend outweighs valuing your energy.",
     "limitation": "Material: turn 1 offers a single motive; debate focuses on friend's motives, not user's."
    },
    {
     "name": "Examination of assumptions",
     "rating": 5.5,
     "points": 2.2,
     "example": "Turn 6 questions that non-initiation means indifference; could be habit.",
     "limitation": "Material: user's assumption that speaking up means confrontation never surfaced."
    },
    {
     "name": "Clarification of values and priorities",
     "rating": 5,
     "points": 2,
     "example": "Turn 10 and section D: reciprocity versus preserving harmony.",
     "limitation": "Material: truth-versus-comfort is a false binary; other values left unexplored."
    },
    {
     "name": "Recognition of fears and outside expectations",
     "rating": 4.5,
     "points": 1.8,
     "example": "Turn 9 names anxiety a silent wait might bring.",
     "limitation": "Material: turn 5 labels friend avoidant; resentment, fairness norms unexplored."
    },
    {
     "name": "Agency and reflective ownership",
     "rating": 5,
     "points": 2,
     "example": "Section E conditions the user can accept or reject.",
     "limitation": "Material: few questions posed to the user; turn 8 prescribes rather than invites."
    }
   ]
  },
  {
   "name": "Decision usefulness",
   "max": 10,
   "points": 5.1,
   "sub": [
    {
     "name": "Definition of the decision and options",
     "rating": 5.5,
     "points": 1.1,
     "example": "Section E: keep initiating, pause, or neutral request to lead next time.",
     "limitation": "Material: speaking up directly, and how, never laid out as an option."
    },
    {
     "name": "Explanation of tradeoffs",
     "rating": 5,
     "points": 1,
     "example": "Turn 9 gives the cost of the waiting test.",
     "limitation": "Material: cost of continuing to initiate never weighed; speaking up costed only as confrontation."
    },
    {
     "name": "Identification of decisive conditions",
     "rating": 5,
     "points": 1,
     "example": "Section E: observe response to one neutral request to lead.",
     "limitation": "Material: turn 8's three weeks not drawn from user facts; no observable threshold."
    },
    {
     "name": "Treatment of uncertainty",
     "rating": 4.5,
     "points": 0.9,
     "example": "Section E separates oblivious from indifferent friend.",
     "limitation": "Material: consequential unknowns not ranked against minor ones."
    },
    {
     "name": "Proportionate next steps",
     "rating": 5.5,
     "points": 1.1,
     "example": "Section E's single neutral request is low-cost and proportionate.",
     "limitation": "Material: turn 8's three-week silence is arbitrary and heavier than needed."
    }
   ]
  },
  {
   "name": "Clarity and engagement",
   "max": 10,
   "points": 5.8,
   "sub": [
    {
     "name": "Accessible language",
     "rating": 7,
     "points": 1.4,
     "example": "Plain phrasing throughout, e.g. turn 6 habit that could be corrected.",
     "limitation": "Minor: turn 4 'subsidizing' and turn 2 'skin in the game' lean on jargon."
    },
    {
     "name": "Traceable arguments and references",
     "rating": 4.5,
     "points": 0.9,
     "example": "Turn 9's 'That 3-week wait' clearly points to turn 8.",
     "limitation": "Material: turns 4 and 5 'you' ambiguously addresses a mind or the user."
    },
    {
     "name": "Manageable pacing and turn length",
     "rating": 5,
     "points": 1,
     "example": "Ten short turns, easy to read.",
     "limitation": "Material: turns 1, 3, 4, 9 fall under 25 words."
    },
    {
     "name": "Distinguishable positions and voices",
     "rating": 6,
     "points": 1.2,
     "example": "Three distinct lenses; turn 7 explicitly changes position.",
     "limitation": "Minor: voices similar in tone; Aristotle marked only by 'In truth'."
    },
    {
     "name": "Economy and sustained attention",
     "rating": 6.5,
     "points": 1.3,
     "example": "No verbatim repetition across turns.",
     "limitation": "Minor: section D partly restates turn 10's truth-versus-comfort."
    }
   ]
  },
  {
   "name": "Drama and entertainment",
   "max": 10,
   "points": 4.4,
   "sub": [
    {
     "name": "Meaningful stakes and tension",
     "rating": 5,
     "points": 1,
     "example": "Turn 4: subsidizing their social life while getting nothing back.",
     "limitation": "Material: tension dissipates after turn 7; low stakes overall."
    },
    {
     "name": "Surprise and reversals",
     "rating": 4,
     "points": 0.8,
     "example": "Turn 7 Attachment Theorist drops attachment framing.",
     "limitation": "Material: turn 7 names no argument that changed its mind; templated reversal."
    },
    {
     "name": "Personality and expressive voice",
     "rating": 4.5,
     "points": 0.9,
     "example": "Turn 5's sharp 'You treat people like assets'.",
     "limitation": "Material: flat expression throughout; turn 5 edges toward caricature."
    },
    {
     "name": "Memorable delivery",
     "rating": 4.5,
     "points": 0.9,
     "example": "Turn 4's subsidizing image is the one vivid line.",
     "limitation": "Material: no analogies or concrete scenes elsewhere."
    },
    {
     "name": "Anticipation and emotional movement",
     "rating": 4,
     "points": 0.8,
     "example": "Turns 8-9 create brief suspense over the waiting test.",
     "limitation": "Material: turn 10 fizzles to 'remains open'; uniform rhythm."
    }
   ]
  }
 ],
 "uncapped": 50.4,
 "score": 50.4,
 "capReason": null,
 "strengths": [
  "Turn 6 reframes non-initiation as possible habit, opening a gentler path than accusation.",
  "Section E offers a low-cost observable step: one neutral request for the friend to lead.",
  "Turn 9 tests turn 8's waiting plan by naming its emotional cost."
 ],
 "weaknesses": [
  "Debate never addresses what saying something would look like, the user's actual question (turns 1-10).",
  "Social Economist never answers turn 5 or turn 9; turn 7's reversal names no cause.",
  "Turn 8's three-week number is invented; turns 1, 3, 4, 9 fall under 25 words."
 ],
 "editorNotes": [
  "Require at least one turn to draft and test the literal words the user could say.",
  "Require each challenged mind to answer the objection in its next turn, conceding or rebutting.",
  "Forbid numbers not drawn from the user's facts; ask focused questions about missing facts instead.",
  "Require any change of position to name the earlier turn and argument that caused it."
 ]
}
--- q4 Purpose / Comparison and expectations, sample 1, version v1 (current): 49.08 / 100 ---
{
 "criteria": [
  {
   "name": "Quality of discussion",
   "max": 20,
   "points": 10.12,
   "sub": [
    {
     "name": "Continuity and responsiveness",
     "rating": 5.2,
     "points": 2.08,
     "example": "Turn 7 answers turn 6's reading step with its concrete cost.",
     "limitation": "Material: turns 1-3 are parallel openings; turn 5 answers a claim nobody made."
    },
    {
     "name": "Development of ideas",
     "rating": 4.8,
     "points": 1.92,
     "example": "Turn 8 introduces two competing fears: being left behind versus an ill-fitting life.",
     "limitation": "Material: turn 8's distinction arrives late; turn 9 reframes rather than uses it."
    },
    {
     "name": "Exploration of central tensions",
     "rating": 5.3,
     "points": 2.12,
     "example": "Turns 1-3 set imitation, building capital, and control against each other.",
     "limitation": "Material: whether the user wants homes or marriage at all is never probed."
    },
    {
     "name": "Integration of perspectives",
     "rating": 4.5,
     "points": 1.8,
     "example": "Turn 8 Social Observer drops the imitation claim for a conflict reading.",
     "limitation": "Material: turn 8 concession has no cause; Coach and Stoic never reshape each other."
    },
    {
     "name": "Progress toward understanding",
     "rating": 5.5,
     "points": 2.2,
     "example": "Section D sharpens to milestones themselves versus fear of losing connection.",
     "limitation": "Material: section D claims minds agree distress is a choice; no turn says so."
    }
   ]
  },
  {
   "name": "Quality of disagreement, trust and grounding",
   "max": 20,
   "points": 8.84,
   "sub": [
    {
     "name": "Faithful engagement",
     "rating": 3.8,
     "points": 1.52,
     "example": "Turn 7 states the Stoic step's benefit before objecting to its cost.",
     "limitation": "Material: turn 5 attributes an unsaid claim; turn 4 recasts Stoicism as disconnecting from peers."
    },
    {
     "name": "Substance of challenges",
     "rating": 4.5,
     "points": 1.8,
     "example": "Turn 7: Stoic reading builds no skills or financial security if milestones matter.",
     "limitation": "Material: turn 4 objection attacks a position turn 3 never took; no target answers."
    },
    {
     "name": "Accuracy and support",
     "rating": 4.5,
     "points": 1.8,
     "example": "Turn 3 renders Enchiridion section 1 on control faithfully.",
     "limitation": "Material: turn 4 inverts Girard, who treats mimetic dependence as illusion; vague chapter bases."
    },
    {
     "name": "Calibration and transparency",
     "rating": 4.8,
     "points": 1.92,
     "example": "Turn 1 hedges: 'you might feel behind because you are imitating'.",
     "limitation": "Material: turn 3 states the cause of distress as fact; section D overstates agreement."
    },
    {
     "name": "Intellectual honesty and revision",
     "rating": 4.5,
     "points": 1.8,
     "example": "Turn 8 explicitly withdraws the imitation claim.",
     "limitation": "Material: turn 8 revision unexplained; Coach never answers turn 4 or concedes anything."
    }
   ]
  },
  {
   "name": "Personal relevance",
   "max": 10,
   "points": 4.3,
   "sub": [
    {
     "name": "Identification of the actual concern",
     "rating": 6,
     "points": 1.2,
     "example": "Section D asks whether 'behind' concerns milestones or losing friends.",
     "limitation": "Minor: not wanting milestones yet feeling behind stays implicit until section D."
    },
    {
     "name": "Meaningful use of personal context",
     "rating": 4.5,
     "points": 0.9,
     "example": "Turn 3 names friends' homes and marriages as outside the user's control.",
     "limitation": "Material: context is generic; no detail changes an argument or next step."
    },
    {
     "name": "Fit with goals and values",
     "rating": 4.5,
     "points": 0.9,
     "example": "Turn 7 conditions milestones on 'if you eventually decide those matter'.",
     "limitation": "Material: turns 2 and 5 push milestone urgency the user doubts wanting."
    },
    {
     "name": "Attention to constraints and stakes",
     "rating": 3.5,
     "points": 0.7,
     "example": "Turn 7 mentions financial security as a stake.",
     "limitation": "Material: turn 5 invents a closing window; age, finances, relationships never considered."
    },
    {
     "name": "Responsiveness to information",
     "rating": 3,
     "points": 0.6,
     "example": "Section E branches on whether fear of isolation is intense.",
     "limitation": "Material: no question asks age, partner status, or whether user wants these things."
    }
   ]
  },
  {
   "name": "Constructive self-discovery",
   "max": 20,
   "points": 11.4,
   "sub": [
    {
     "name": "Clarification of desires and motivations",
     "rating": 6.2,
     "points": 2.48,
     "example": "Section D offers milestones versus fear of losing connection as alternatives.",
     "limitation": "Material: turn 1 leads with imitation, turn 3 asserts distress cause; alternatives only at end."
    },
    {
     "name": "Examination of assumptions",
     "rating": 5.5,
     "points": 2.2,
     "example": "Turn 1 surfaces assuming peers' goals are the standard for success.",
     "limitation": "Material: assumption that 'behind' implies a shared timeline is never examined directly."
    },
    {
     "name": "Clarification of values and priorities",
     "rating": 5.5,
     "points": 2.2,
     "example": "Section E sets autonomy and peace against long-term flexibility.",
     "limitation": "Material: turn 9 frames the alternative as 'social validation', loading the choice."
    },
    {
     "name": "Recognition of fears and outside expectations",
     "rating": 5.5,
     "points": 2.2,
     "example": "Turn 8 names fear of being left behind and fear of an unsuitable life.",
     "limitation": "Material: turn 2 amplifies fear ('empty-handed later') rather than examining it."
    },
    {
     "name": "Agency and reflective ownership",
     "rating": 5.8,
     "points": 2.32,
     "example": "Section E: notice relief or anxiety when envisioning a different life.",
     "limitation": "Minor: debate turns mostly prescribe; ownership offered only in sections D and E."
    }
   ]
  },
  {
   "name": "Decision usefulness",
   "max": 10,
   "points": 4.26,
   "sub": [
    {
     "name": "Definition of the decision and options",
     "rating": 4,
     "points": 0.8,
     "example": "Turn 9 frames inward reframing versus outward action.",
     "limitation": "Material: no concrete options named; waiting or a small experiment never defined."
    },
    {
     "name": "Explanation of tradeoffs",
     "rating": 4.8,
     "points": 0.96,
     "example": "Turn 7 names the cost of the Stoic path: no skills or security built.",
     "limitation": "Material: costs of pursuing milestones one doubts wanting are never stated."
    },
    {
     "name": "Identification of decisive conditions",
     "rating": 4.5,
     "points": 0.9,
     "example": "Section E: relief versus anxiety when picturing a divergent life.",
     "limitation": "Material: first two section E conditions are abstract value preferences, not observable."
    },
    {
     "name": "Treatment of uncertainty",
     "rating": 3.5,
     "points": 0.7,
     "example": "Turn 7 allows the user may 'eventually decide' milestones matter.",
     "limitation": "Material: consequential unknowns are not separated from minor ones anywhere."
    },
    {
     "name": "Proportionate next steps",
     "rating": 4.5,
     "points": 0.9,
     "example": "Turn 6: read Enchiridion sections 1-3 today.",
     "limitation": "Material: only the Stoic path gets a step; Coach's path has none."
    }
   ]
  },
  {
   "name": "Clarity and engagement",
   "max": 10,
   "points": 6.16,
   "sub": [
    {
     "name": "Accessible language",
     "rating": 6.8,
     "points": 1.36,
     "example": "Turn 3 explains control in plain terms about friends' timelines.",
     "limitation": "Minor: 'build the capital' and 'identity you need' in turns 2, 5 stay abstract."
    },
    {
     "name": "Traceable arguments and references",
     "rating": 4.5,
     "points": 0.9,
     "example": "Turns 4 and 5 open by naming whom they answer.",
     "limitation": "Material: turns 4 and 7 use 'I' ambiguously; turn 5 cites a claim never made."
    },
    {
     "name": "Manageable pacing and turn length",
     "rating": 7.5,
     "points": 1.5,
     "example": "Nine turns, each roughly 36 to 47 words.",
     "limitation": "Minor: uniform turn length gives an even, unvaried pace."
    },
    {
     "name": "Distinguishable positions and voices",
     "rating": 5.5,
     "points": 1.1,
     "example": "Three titled minds hold distinct positions on imitation, control, timing.",
     "limitation": "Material: shared hedged register; turn 8 position change stated without cause."
    },
    {
     "name": "Economy and sustained attention",
     "rating": 6.5,
     "points": 1.3,
     "example": "Little repetition across turns; each adds a point.",
     "limitation": "Minor: turn 5 restates turn 2's window worry without new content."
    }
   ]
  },
  {
   "name": "Drama and entertainment",
   "max": 10,
   "points": 4,
   "sub": [
    {
     "name": "Meaningful stakes and tension",
     "rating": 5,
     "points": 1,
     "example": "Turn 7 sets peace against future security as a real cost.",
     "limitation": "Material: stakes stay abstract; no concrete scene of the user's life."
    },
    {
     "name": "Surprise and reversals",
     "rating": 3.5,
     "points": 0.7,
     "example": "Turn 8 Social Observer drops the imitation claim.",
     "limitation": "Material: turn 8 reversal names no earlier argument that changed its mind."
    },
    {
     "name": "Personality and expressive voice",
     "rating": 4,
     "points": 0.8,
     "example": "Turn 3 Stoic: 'If you wish to be free, you must accept'.",
     "limitation": "Material: minds sound alike, flat hedged phrasing throughout."
    },
    {
     "name": "Memorable delivery",
     "rating": 3.5,
     "points": 0.7,
     "example": "Turn 2: 'you might find yourself empty-handed later'.",
     "limitation": "Material: no analogies, vivid examples, or sharp lines anywhere."
    },
    {
     "name": "Anticipation and emotional movement",
     "rating": 4,
     "points": 0.8,
     "example": "Turn 8 shifts tone from diagnosis to recognising two fears.",
     "limitation": "Material: constant even tone; no build or release across turns."
    }
   ]
  }
 ],
 "uncapped": 49.08,
 "score": 49.08,
 "capReason": null,
 "strengths": [
  "Section D offers two plausible motives as alternatives with a question the user can answer.",
  "Turn 7 names a concrete cost of the Stoic step instead of rejecting it.",
  "Turn 8 introduces the useful two-fears distinction: left behind versus an unsuitable life."
 ],
 "weaknesses": [
  "Turn 5 Developmental Coach answers a claim the Social Observer never made; turn 4 misreads turn 3.",
  "No turn asks whether the user wants these milestones, their age, or circumstances.",
  "Turn 8 reversal is uncaused, and section D invents agreement that distress is a choice."
 ],
 "editorNotes": [
  "Require a 'Responding to X' turn to paraphrase only what X actually said in a named turn.",
  "Require any change of position to name the earlier turn and argument that caused it.",
  "Require at least one turn to ask the user a consequential missing fact and state what each answer implies.",
  "Require section E conditions to be observable in the user's life, each favouring a named option."
 ]
}
--- q5 Wonder / Geography and causation, sample 1, version v1 (current): 37.30 / 100 ---
{
 "criteria": [
  {
   "name": "Quality of discussion",
   "max": 20,
   "points": 7.92,
   "sub": [
    {
     "name": "Continuity and responsiveness",
     "rating": 5.2,
     "points": 2.08,
     "example": "Turns 4-6 name and answer prior turns' claims about water, land, pressure.",
     "limitation": "Minor: turn 7 ignores turn 6; turn 8 discusses reading difficulty, not climate."
    },
    {
     "name": "Development of ideas",
     "rating": 3.5,
     "points": 1.4,
     "example": "Turn 3 adds NAO variability beyond the two openings.",
     "limitation": "Material: no mid-debate distinction later used; turns 7-8 add nothing new."
    },
    {
     "name": "Exploration of central tensions",
     "rating": 3.8,
     "points": 1.52,
     "example": "Turns 4-5 contrast heat transport with how land distributes heat.",
     "limitation": "Material: prevailing westerlies, west-versus-east-coast contrast, ocean heat storage never raised."
    },
    {
     "name": "Integration of perspectives",
     "rating": 3.8,
     "points": 1.52,
     "example": "Turn 9 combines current heat with atmospheric pressure.",
     "limitation": "Material: turn 9 synergy is forced agreement with no traced cause."
    },
    {
     "name": "Progress toward understanding",
     "rating": 3.5,
     "points": 1.4,
     "example": "Section D separates heat source from heat distribution.",
     "limitation": "Material: ending asks what user values, not a sharper causal question."
    }
   ]
  },
  {
   "name": "Quality of disagreement, trust and grounding",
   "max": 20,
   "points": 7.44,
   "sub": [
    {
     "name": "Faithful engagement",
     "rating": 4.5,
     "points": 1.8,
     "example": "Turn 4 restates Analyst's barrier claim before rebutting it.",
     "limitation": "Material: turn 5 strawmans 'current is everything'; turn 9 drops a claim never made."
    },
    {
     "name": "Substance of challenges",
     "rating": 4.2,
     "points": 1.68,
     "example": "Turn 4: topography does not transport heat, unlike currents.",
     "limitation": "Material: no objection names an assumption and what breaks; turn 6 restates."
    },
    {
     "name": "Accuracy and support",
     "rating": 2.8,
     "points": 1.12,
     "example": "Stommel's The Gulf Stream is a real, apt source.",
     "limitation": "Material: Diamond ch.10 concerns crop diffusion; Lamb title garbled; turn 6 NAO 'override entirely' overstated."
    },
    {
     "name": "Calibration and transparency",
     "rating": 3.5,
     "points": 1.4,
     "example": "Turn 6 frames temporary trend as something to wonder about.",
     "limitation": "Material: turn 1 asserts 'primary driver' flatly; contested science presented without hedging."
    },
    {
     "name": "Intellectual honesty and revision",
     "rating": 3.6,
     "points": 1.44,
     "example": "Turn 9 Historian explicitly drops a prior claim.",
     "limitation": "Material: Theorist never concedes atmosphere's role; turn 9 revision lacks stated reason."
    }
   ]
  },
  {
   "name": "Personal relevance",
   "max": 10,
   "points": 3,
   "sub": [
    {
     "name": "Identification of the actual concern",
     "rating": 3.5,
     "points": 0.7,
     "example": "Section A frames ocean currents versus geography as the question.",
     "limitation": "Material: factual question recast as preference in turn 9 and section D."
    },
    {
     "name": "Meaningful use of personal context",
     "rating": 2.5,
     "points": 0.5,
     "example": "Turn 8 considers user's possible lack of oceanography background.",
     "limitation": "Material: no user detail shapes any argument; places compared never specified."
    },
    {
     "name": "Fit with goals and values",
     "rating": 3.5,
     "points": 0.7,
     "example": "Section E routes answer by what the user wants explained.",
     "limitation": "Material: turn 9 asks which mechanism user 'values', not which is true."
    },
    {
     "name": "Attention to constraints and stakes",
     "rating": 3,
     "points": 0.6,
     "example": "Turn 8 notes technical density cost of Stommel's heat budget.",
     "limitation": "Material: section A invents user's intent; turn 8 assumes missing background."
    },
    {
     "name": "Responsiveness to information",
     "rating": 2.5,
     "points": 0.5,
     "example": "Section E branches on what the user seeks.",
     "limitation": "Material: never asks which places are compared, e.g. Norway versus Labrador."
    }
   ]
  },
  {
   "name": "Constructive self-discovery",
   "max": 20,
   "points": 6.4,
   "sub": [
    {
     "name": "Clarification of desires and motivations",
     "rating": 3.5,
     "points": 1.4,
     "example": "Section D: interest in mechanism versus historical stability patterns.",
     "limitation": "Material: alternatives forced onto a factual question; no answerable question beyond turn 9."
    },
    {
     "name": "Examination of assumptions",
     "rating": 4.5,
     "points": 1.8,
     "example": "Turn 3 challenges treating climate differences as static.",
     "limitation": "Material: user's assumption that one factor dominates is never examined directly."
    },
    {
     "name": "Clarification of values and priorities",
     "rating": 2.5,
     "points": 1,
     "example": "Turn 9 contrasts ocean mechanism with wind mechanism.",
     "limitation": "Material: valuing a mechanism is misplaced; no real priority conflict clarified."
    },
    {
     "name": "Recognition of fears and outside expectations",
     "rating": 1.5,
     "points": 0.6,
     "example": "Turn 8 acknowledges data may feel dense.",
     "limitation": "Material: absent; no expectation or pressure behind the curiosity explored."
    },
    {
     "name": "Agency and reflective ownership",
     "rating": 4,
     "points": 1.6,
     "example": "Section E offers three conditional lenses user can pick.",
     "limitation": "Material: options are framings, not distinctions user can test or refine."
    }
   ]
  },
  {
   "name": "Decision usefulness",
   "max": 10,
   "points": 3.5,
   "sub": [
    {
     "name": "Definition of the decision and options",
     "rating": 3.5,
     "points": 0.7,
     "example": "Section E names ocean, landmass and NAO explanations.",
     "limitation": "Material: no real decision defined; explanatory weighting never resolved."
    },
    {
     "name": "Explanation of tradeoffs",
     "rating": 3.5,
     "points": 0.7,
     "example": "Turn 8: heat-budget focus costs sight of wind patterns.",
     "limitation": "Material: other lenses' costs not named."
    },
    {
     "name": "Identification of decisive conditions",
     "rating": 3,
     "points": 0.6,
     "example": "Section E: year-to-year variation points to NAO data.",
     "limitation": "Material: no observable test, e.g. comparing west versus east coasts."
    },
    {
     "name": "Treatment of uncertainty",
     "rating": 3,
     "points": 0.6,
     "example": "Turn 6 raises temporary trend versus permanent state.",
     "limitation": "Material: consensus versus contested mechanisms never separated."
    },
    {
     "name": "Proportionate next steps",
     "rating": 4.5,
     "points": 0.9,
     "example": "Turn 7 Stommel chapter 1; section E NAO data.",
     "limitation": "Minor: steps generic; no simple map or coast comparison suggested."
    }
   ]
  },
  {
   "name": "Clarity and engagement",
   "max": 10,
   "points": 5.84,
   "sub": [
    {
     "name": "Accessible language",
     "rating": 6.5,
     "points": 1.3,
     "example": "Turn 1 conveyor-belt image explains heat transport plainly.",
     "limitation": "Minor: 'synergy', 'steady-state heat budget' left unexplained."
    },
    {
     "name": "Traceable arguments and references",
     "rating": 6,
     "points": 1.2,
     "example": "Turns 4-6 name the mind they answer.",
     "limitation": "Material: turn 9 'the claim' points to turn 3, which never made it."
    },
    {
     "name": "Manageable pacing and turn length",
     "rating": 7.2,
     "points": 1.44,
     "example": "Nine turns, each within length limits.",
     "limitation": "Minor: uniform rhythm; turns 7-8 stall the argument."
    },
    {
     "name": "Distinguishable positions and voices",
     "rating": 4.5,
     "points": 0.9,
     "example": "Each mind holds a distinct factor: ocean, land, pressure.",
     "limitation": "Material: all three speak in the same 'You might' register."
    },
    {
     "name": "Economy and sustained attention",
     "rating": 5,
     "points": 1,
     "example": "Short turns keep the exchange brief.",
     "limitation": "Material: turn 5 restates turn 2; turns 7-8 meta-discussion of reading."
    }
   ]
  },
  {
   "name": "Drama and entertainment",
   "max": 10,
   "points": 3.2,
   "sub": [
    {
     "name": "Meaningful stakes and tension",
     "rating": 3,
     "points": 0.6,
     "example": "Turn 4 pits ocean scale against land barriers.",
     "limitation": "Material: tension is abstract; no vivid contrast like Bergen versus Labrador."
    },
    {
     "name": "Surprise and reversals",
     "rating": 2.5,
     "points": 0.5,
     "example": "Turn 9 Historian drops NAO primacy.",
     "limitation": "Material: reversal has no stated cause; template, not traced change."
    },
    {
     "name": "Personality and expressive voice",
     "rating": 3.5,
     "points": 0.7,
     "example": "Turn 7 Theorist cites 'my book' with authorial pride.",
     "limitation": "Material: voices flat and interchangeable across all nine turns."
    },
    {
     "name": "Memorable delivery",
     "rating": 4,
     "points": 0.8,
     "example": "Turn 1 conveyor belt; turn 5 Canadian Shield hypothetical.",
     "limitation": "Material: no sharp or concrete example lands."
    },
    {
     "name": "Anticipation and emotional movement",
     "rating": 3,
     "points": 0.6,
     "example": "Turn 3 widens the frame to centuries.",
     "limitation": "Material: constant low intensity; ending dissolves into preference."
    }
   ]
  }
 ],
 "uncapped": 37.3,
 "score": 37.3,
 "capReason": null,
 "strengths": [
  "Turns 4-6 answer named prior claims rather than ignoring them.",
  "Turn 3 adds NAO variability, widening the frame beyond static causes.",
  "Section E gives conditional lenses for what the user wants explained."
 ],
 "weaknesses": [
  "Environmental Analyst leans on Diamond ch.10, about crop diffusion, not climate; Lamb title garbled.",
  "Westerlies and west-versus-east-coast contrast never raised; core mechanism missing.",
  "Turn 9 reversal and 'which do you value' recast a factual question as preference."
 ],
 "editorNotes": [
  "For factual questions, require minds whose sources actually address the mechanism asked about.",
  "Require at least one mid-debate distinction (e.g. west versus east coast) later turns must use.",
  "Forbid reversals without naming the earlier turn's argument that caused them.",
  "Do not convert factual questions into value preferences; end with a testable comparison."
 ]
}

RECURRING WEAKNESSES of v1 (a complaint that appears on three or more of the five questions; these are the general faults, the rest may be question-specific)
(none recurred on three or more questions; look at CRITERION MEANS for what is low everywhere)

GOAL AND TRAJECTORY
The target for this lineage is 70 or more on the gemini lane, on every question of a round. The prompt must stay general across Health, Wealth, Love, Purpose and Wonder; the next round draws five different questions.
Round means of the version under test so far: round 12 v1 48.54 (min 37.3).

LENGTH BUDGET (enforced in code; a version over it is rejected)
The system prompt is 1884 words. The absolute ceiling is 1900 words, so 16 words are left in total, and this round may add at most 16 words net. You are at the ceiling: every word you add must be paid for by a word you cut.

PREVIOUS CHANGES (last three)
## v1 — baseline — 2026-10-13
Started from castDebate.v11.md, the last version of the single-lineage loop (rounds 1 to 11, which raised Gemini from about 52.8 to 57.3 on a paired head-to-head against the original). Its history is in CHANGELOG.md.


Write version 2. Return the JSON object only.
