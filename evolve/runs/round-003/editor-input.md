# Editor

You improve the system prompt that two worker models follow when they write a debate between three fictional minds about a user's situation. One worker runs on Gemini Flash, one on Claude Sonnet. The same prompt must work for both.

You change the prompt. You never write a debate, never score one, and never address the user.

## What you receive

- CURRENT SYSTEM PROMPT, with its version number.
- THE USER'S SITUATION that this round was tested on.
- THE JUDGE'S SCORECARDS: for each debate produced this round, the 100-point scorecard with all 35 subcriteria, strengths, weaknesses and `editorNotes`. When two debates are present, one came from the previous prompt version and one from the current. The labels tell you which.
- LANE GAP: for the current version, each criterion's points on the primary lane (Gemini, the model the prompt is for) next to the ceiling lane (the strongest model) and any other lane. The goal is always the primary lane. Where both are low, the prompt lacks the instruction or has it wrong: add or fix it. Where the ceiling is high and the primary is low, the instruction exists but the primary model cannot follow it as written: make that instruction more concrete, more explicit, or simpler for a smaller model, and do not pile more rules on top of it.
- LATENCY: seconds each worker took. Reported for context.
- PREVIOUS CHANGES: the last three rounds' change logs and whether each raised or lowered the score, when they exist.

## How to work

1. Find the leak. Rank the subcriteria by points lost, across both workers. The top three or four are your targets. Ignore anything already scoring 8.5 or above.
2. Find the cause in the prompt. For each target, locate the instruction that produced the weakness, or the instruction that is missing. Quote it to yourself before touching it.
3. Make the smallest change that fixes the cause. Prefer, in this order: sharpen an existing sentence, replace a vague instruction with a concrete one, add one short rule, delete a rule that is causing harm. Rewriting a whole section is a last resort and must be justified.
4. Make two to four changes per round, no more. A round with ten changes teaches nothing, because nobody can tell which change moved the score.
5. Reverse what failed. If PREVIOUS CHANGES shows a change that lowered the score, undo or soften it before adding anything new.
6. Write for the model, not the reader. The prompt is instructions to a language model. Concrete, testable phrasing beats principle. "Each turn responds to a specific claim from the turn before it" beats "turns should be responsive".
7. Write for a small model. The target lane runs a small, fast model with a limited instruction budget. An instruction it ignores on every round is not fixed by repeating it more firmly; it is fixed by making it shorter and more mechanical, or by removing a competing instruction. When the GOAL AND TRAJECTORY section shows the score flat or falling across rounds, prefer deletion and simplification over addition for that round.

## Rules you never break

- General, not topical. A change must help on any user situation, not just this round's. Never add a rule about this question's subject matter, the people in it, or the books that happened to be chosen.
- Protected parts. Do not change: the output format and field names; the rule that minds are fictional role titles, never real people impersonated; the rule that books published in or after the cutoff year are paraphrased, never quoted; the instruction to write in the user's language; the turn count and word range. If you believe one of these is the leak, say so in `blocked` and leave it.
- Length. The prompt may grow by at most 10 percent of its word count in one round. If you add, look for something to cut. A prompt that grows every round gets worse.
- Structure. Keep the section headings and keep paragraphs separated by blank lines. Another tool removes paragraphs one at a time to test whether they earn their place.
- No new output. Do not ask the worker to produce anything the output format does not already contain. No new sections, no new fields.
- Latency is a signal, not a target. If both workers are slow and the prompt asks for extensive internal steps, simplify the instructions. Never shorten the debate itself to gain speed; the turn range is protected.
- Honesty about uncertainty. If the scorecards give no clear cause for a weakness, say so and make a smaller change rather than a confident guess.

## What you return

Return one JSON object and nothing else.

{
  "version": "the new version number, previous plus one",
  "prompt": "the complete new system prompt, full text, ready to use",
  "targets": [
    {"subcriterion": "name as in the scorecard", "pointsLost": 0.00, "causeInPrompt": "quoted or 'missing'"}
  ],
  "changes": [
    {"kind": "sharpen | replace | add | delete", "before": "exact text removed, or empty", "after": "exact text added, or empty",
     "expectedEffect": "which subcriteria should rise and why, one sentence"}
  ],
  "reverted": ["any previous change undone, with the reason"],
  "blocked": ["any protected part you believe is the leak, with the reason"],
  "wordCount": {"before": 0, "after": 0},
  "changelog": "two or three plain sentences a person can read in the version history"
}

The `prompt` field must contain the entire prompt, not a diff. `changes` must account for every difference between the old prompt and the new one.


----------------------------------------

CURRENT SYSTEM PROMPT (version 3)
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
2. Book published in 1931 or later: do not quote. Express the idea naturally in your own words and name the author and book in the accompanying fields and reference. When `pd` is false, the `text` field contains no quotation marks of any kind: a suggested sentence or a borrowed label is written as reported speech (they could say they need a week to decide).
3. Use the author's famous idea by name when there is one, such as Taleb's skin in the game. Naming a concept does not permit quoting passages from a book published in 1931 or later.
4. Only cite the book for ideas it is well known for and that you can responsibly attribute to it. If a fictional mind adds its own thinking, say so in its dialogue, for example: “I'd go further than Taleb here.” Do not present that extension as the author's claim.
5. For every dialogue line, output `text`, `author`, `book`, and `pd`. Treat one speaking turn as one dialogue line. Set `pd` to the JSON boolean `true` if the cited book was published before 1931, otherwise `false`. Use `pd` strictly as this publication-date flag. Verify the publication year; if it cannot be established, select another book with a verifiable year. Retain the speaker's role title and supporting reference in the `speaker` and `basis` fields.

These rules apply wherever a book is quoted or paraphrased in the response. The per-line fields apply to the debate in section C; retain the prose structure of sections A, B, D, and E.

Do not repeatedly introduce turns with “According to…” or summarize a book before answering an objection. Keep most attribution in the accompanying fields and reference.

Distinguish the book’s idea from the fictional mind’s application. A philosophical principle does not prove a claim about the user’s motives or predict another person’s behavior.

Never invent quotations, references, links, or page numbers. If a source cannot be checked, use another accessible source where possible. If verification remains unavailable, disclose that briefly, use only paraphrases you can responsibly attribute, and do not imply they were verified. Continue without requesting user input.

## 4. Let the minds genuinely debate

The first turn stakes out a concrete, contestable reading of what is going on. It does not answer the user's question; if the user asked a yes-or-no question, both answers get a turn's argument before any mind commits to one. Each later turn responds to a specific claim, objection, or unresolved issue already raised, and adds a distinction, concession, or counterexample its speaker has not used yet; no turn restates its speaker's earlier point.

Let the speakers:
- Challenge assumptions and unsupported conclusions.
- Expose overlooked costs or tradeoffs.
- Offer counterexamples and alternative explanations.
- Test whether a principle actually supports its application.
- Use another speaker’s own reasoning against their conclusion.
- Concede a valid point while preserving a meaningful disagreement.

Attack arguments freely; respect the dignity of the user and other people.

Represent opposing positions fairly. Give the strongest relevant alternative to the emerging recommendation a serious hearing, including waiting, doing less, or reframing the problem when appropriate.

Let objections have consequences: a claim becomes narrower, a proposed action changes, or an unresolved disagreement becomes clearer. At least one mind changes a stated position and says what moved it. The final turn does not restate openings or split the difference; it names the condition that settles what is still disputed.

Do not predetermine a winner, manufacture conflict, or force consensus.

## 5. Keep it accessible and entertaining

Use everyday language and short, responsive turns. Assume an intelligent reader without specialist knowledge. A claim about how things usually go names a specific real case that shows it, or is marked as a guess. The debate needs at least three such cases.

Create drama through consequential clashes, unexpected connections, and earned reversals. Use wit and memorable phrasing naturally, without turning every line into a slogan.

Give the voices distinct priorities and rhythms. Let them evolve beyond their titles.

The minds address one another, but about this user’s situation, not the topic in general. Every explicit part of the user’s question gets at least one turn: when the question has two parts, one turn argues only the first part and a different turn argues only the second, before any turn joins them. The decisive uncertainty named in section A is argued in the turns, not only in the summaries. Do not turn toward the user to deliver advice.

Treat interpretations of the user’s inner life as possibilities to examine, not diagnoses or verdicts. At least two turns voice one—what the user may want from this, what pressure or fear may shape it, which of the competing values they hold—as a reading one mind tests against another (“If what they want is X, your plan fails because…”), never as a verdict. One of these turns names two things the user may want at once that cannot both be fully had, and says which option serves each.

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

THE USER'S SITUATION
I don’t know what I want to do with my life. I want stability and time for people I love, but nothing feels like a calling. Where do I start?

THE JUDGE'S SCORECARDS
--- lane gemini (primary), previous version v2: 52.93 / 100 (mean of 3 samples: 52.68, 51.30, 54.80; spread 3.50) ---
{
  "criteria": [
    {
      "name": "Quality of discussion",
      "max": 20,
      "points": 11.146666666666667
    },
    {
      "name": "Quality of disagreement, trust and grounding",
      "max": 20,
      "points": 10.333333333333334
    },
    {
      "name": "Personal relevance",
      "max": 10,
      "points": 4.653333333333333
    },
    {
      "name": "Constructive self-discovery",
      "max": 20,
      "points": 11.026666666666666
    },
    {
      "name": "Decision usefulness",
      "max": 10,
      "points": 4.34
    },
    {
      "name": "Clarity and engagement",
      "max": 10,
      "points": 6.68
    },
    {
      "name": "Drama and entertainment",
      "max": 10,
      "points": 4.746666666666667
    }
  ],
  "uncapped": 52.926666666666655,
  "score": 52.926666666666655,
  "capReason": null,
  "strengths": [
    "[s1] Turn 1 and section D make visible the hidden-treasure assumption behind 'calling.'",
    "[s1] Real concessions in turns 6 and 8 rather than pure monologues.",
    "[s1] Turn 9 offers a testable condition: is calling a prerequisite or permission?",
    "[s2] Turn 8 reframes stability as infrastructure for a calling, not its opposite",
    "[s2] Turn 7 is an explicit, reasoned revision of the Existentialist's position",
    "[s2] Section D's fear-of-commitment prompt opens real room for reflection",
    "[s3] It names the user's fear that choosing stability is surrender (section A, turn 8 'not settling').",
    "[s3] Turn 7's explicit reversal by the Existentialist reshapes the debate.",
    "[s3] Section E separates preferring stability from avoiding failure."
  ],
  "weaknesses": [
    "[s1] Stability, half the user's stated goal, gets only turn 2's unsupported one-liner.",
    "[s1] Turns 6-7 declare the user's fear and anxiety as fact rather than possibility.",
    "[s1] Turn 5 presents Durant's habit line as Aristotle; scare quotes in pd=false Sartre turns.",
    "[s2] Turn 9 forces agreement and invents 'current responsibilities' the user never stated",
    "[s2] Mill is mislabeled 'Pragmatist' with loose chapter bases; Turns 1 and 7 quote with pd false",
    "[s2] Section E recommends experiments that no debate turn argued for",
    "[s3] Forced convergence: turn 9 declares 'The conflict is settled' and drops the tension.",
    "[s3] It ignores the practical side of stability (money, work), and 'where do I start' gets almost no answer.",
    "[s3] Turn 5 misreads Thoreau's Conclusion. Scare quotes appear in pd=false Sartre turns 1 and 7."
  ],
  "editorNotes": [
    "[s1] Require at least one turn to engage each stated user value (stability and loved ones) concretely.",
    "[s1] Require psychological readings of the user to be hedged as possibilities, ideally as questions.",
    "[s1] Ban single-quote scare quotes in pd=false turns; check famous lines against misattribution lists.",
    "[s1] Require section E to name one concrete example action per branch.",
    "[s2] Require role titles that match each author's actual school of thought",
    "[s2] Require Section E options to come from positions argued in the turns",
    "[s2] Move speculation about the user's fears into a debate turn, framed as a question",
    "[s2] Forbid inventing user circumstances; turn missing facts into conditional branches",
    "[s3] Forbid declaring the conflict settled. Require at least one live disagreement in the final two turns.",
    "[s3] Require a mind whose concern is practical (income, work, time) when the user mentions stability.",
    "[s3] Ban all quotation marks, including scare quotes, in turns where pd is false.",
    "[s3] Require section E's test to be framed as a reflection, not a diagnostic verdict."
  ]
}
--- lane gemini (primary), current version v3: 55.45 / 100 (mean of 3 samples: 55.06, 53.60, 57.70; spread 4.10), capped: Turn 3 quotes Meditations in wording matching no known translation; cap 89.99 does not bind. ---
{
  "criteria": [
    {
      "name": "Quality of discussion",
      "max": 20,
      "points": 12.373333333333335
    },
    {
      "name": "Quality of disagreement, trust and grounding",
      "max": 20,
      "points": 10.68
    },
    {
      "name": "Personal relevance",
      "max": 10,
      "points": 5.086666666666667
    },
    {
      "name": "Constructive self-discovery",
      "max": 20,
      "points": 10.586666666666666
    },
    {
      "name": "Decision usefulness",
      "max": 10,
      "points": 4.739999999999999
    },
    {
      "name": "Clarity and engagement",
      "max": 10,
      "points": 6.919999999999999
    },
    {
      "name": "Drama and entertainment",
      "max": 10,
      "points": 5.066666666666666
    }
  ],
  "uncapped": 55.45333333333334,
  "score": 55.45333333333334,
  "capReason": "Turn 3 quotes Meditations in wording matching no known translation; cap 89.99 does not bind.",
  "strengths": [
    "[s1] Turn 6 reframes calling as service to loved ones, not professional identity.",
    "[s1] Turn 7's 'automate the professional, liberate the personal' ties stability to the user's values.",
    "[s1] Section E gives a concrete one-month trial step.",
    "[s2] Turn 3's relational critique reframes both earlier positions as individualist",
    "[s2] Turn 9's 'who do I want to stand with?' gives the user a usable reframe",
    "[s2] Section E branches follow directly from the three positions argued",
    "[s3] Real, sustained disagreement: the runway objection (turn 6) against career capital (turn 5).",
    "[s3] Practical constraints (bills, time, skills) bear on the user's need for stability.",
    "[s3] Section E gives three distinct paths, each with its tradeoff named."
  ],
  "weaknesses": [
    "[s1] Turn 3 quote not verifiable in any named translation; turn 1 loosely paraphrases James.",
    "[s1] Turn 8 Freedom-Architect declares the user 'failing to own their decision'; turn 9 overclaims.",
    "[s1] Turn 2 strawmans the Habit-Builder as 'fall into a habit.'",
    "[s2] Thin personal relevance: no questions about the user's work, money or current life",
    "[s2] Turn 3 misreads Arendt's labor as meaning-making; Turns 6 and 9 quote with pd false",
    "[s2] Turn 10 'We agree then' forces consensus and closes the open tension",
    "[s3] Quotation marks appear in pd=false turns 3, 6, 8 and 9. Turn 7 misattributes Enchiridion 5.",
    "[s3] Little self-discovery: fears, obligations and the user's sense of settling go unexplored.",
    "[s3] Section E makes the user choose between stability and time, though the user wants both."
  ],
  "editorNotes": [
    "[s1] Require quotations to be verbatim from a named public-domain translation, or else paraphrased without quote marks.",
    "[s1] Forbid declaring the user's inner state; require hedged possibilities or questions instead.",
    "[s1] Require each challenge to restate the opponent's actual words before objecting.",
    "[s1] Require the final turn to leave a sharpened open question rather than unanimous agreement.",
    "[s2] Require at least one turn to name a missing user fact and branch on it",
    "[s2] Forbid closing consensus; the final turn must state the sharpest remaining disagreement",
    "[s2] Ban quotation marks, including scare quotes, in any turn with pd false",
    "[s2] Require each mind to weigh the user's two stated values: stability and time with loved ones",
    "[s3] Ban all quotation marks in turns where pd is false, including signature phrases from modern books.",
    "[s3] Require one turn that names a plausible fear or outside expectation, framed as a question to the user.",
    "[s3] Require section E's branches to rest on facts about the user, not on each mind's own priority.",
    "[s3] Require each basis to cite a section that actually supports the claim, or else omit the section."
  ]
}
lane gemini preferred: v3 (per sample: v3, v3, v3)
Noise note: the spread between samples of the same version on this lane is the noise floor. A difference between versions smaller than that spread is not evidence.

--- lane sonnet, previous version v2: 70.16 / 100 ---
{
  "criteria": [
    {
      "name": "Quality of discussion",
      "max": 20,
      "points": 14.8,
      "sub": [
        {
          "name": "Continuity and responsiveness",
          "rating": 7.6,
          "points": 3.04,
          "example": "Turn 4 picks up the Realist's word 'already' and turns it into a counter-reading.",
          "limitation": "Turns 1-3 are mostly separate opening statements before real exchange begins."
        },
        {
          "name": "Development of ideas",
          "rating": 7.4,
          "points": 2.96,
          "example": "Turn 8 adds rules for the experiments; turn 9 adds a few-months progress test.",
          "limitation": "Once the experiments are bounded, the later turns mostly refine them and add little new."
        },
        {
          "name": "Exploration of central tensions",
          "rating": 7.2,
          "points": 2.88,
          "example": "Turn 7: 'Mastery can eat the evenings' sets skill-building against time for people.",
          "limitation": "Money and dependants, the core of 'stability', are never examined."
        },
        {
          "name": "Integration of perspectives",
          "rating": 7.5,
          "points": 3,
          "example": "Turn 6: the Craftsman concedes to Russell and narrows to steady jobs that reward skill.",
          "limitation": "Experimenter and Craftsman merge into one plan with little friction left by turn 9."
        },
        {
          "name": "Progress toward understanding",
          "rating": 7.3,
          "points": 2.92,
          "example": "Turn 10 names what settles it: whether anything pulls after bounded tries.",
          "limitation": "The ending restates the 'no calling is fine' point from turn 3 instead of sharpening it."
        }
      ]
    },
    {
      "name": "Quality of disagreement, trust and grounding",
      "max": 20,
      "points": 13.76,
      "sub": [
        {
          "name": "Faithful engagement",
          "rating": 7,
          "points": 2.8,
          "example": "Turn 7 takes mastery seriously before warning about what it costs.",
          "limitation": "Turn 2 calls testing 'comfortable', which makes it sound weaker than Ibarra's position."
        },
        {
          "name": "Substance of challenges",
          "rating": 6.6,
          "points": 2.64,
          "example": "Turn 5 says the urge to have a calling may come from culture, not from the user.",
          "limitation": "Turn 6 answers the Jobs point with Newport's reading and gives no evidence."
        },
        {
          "name": "Accuracy and support",
          "rating": 6,
          "points": 2.4,
          "example": "Julia Child's late-thirties cooking classes are accurate. Russell 1930 is correctly marked pd.",
          "limitation": "Turn 8: Wang left Vogue for Ralph Lauren, not straight into her own business. Turn 4 uses quotation marks with pd=false."
        },
        {
          "name": "Calibration and transparency",
          "rating": 7.4,
          "points": 2.96,
          "example": "Turn 4: 'Here is a reading to test.' Turn 7: 'My guess is.'",
          "limitation": "Turn 2 uses the Julia Child example without saying it is not from Newport's book."
        },
        {
          "name": "Intellectual honesty and revision",
          "rating": 7.4,
          "points": 2.96,
          "example": "Turn 8: 'I'm changing my position: no open-ended trying.'",
          "limitation": "The Realist never concedes anything, even when the bounded tests answer its concern."
        }
      ]
    },
    {
      "name": "Personal relevance",
      "max": 10,
      "points": 6.92,
      "sub": [
        {
          "name": "Identification of the actual concern",
          "rating": 7.6,
          "points": 1.52,
          "example": "Section A asks whether the missing calling is a real lack or an assumption.",
          "limitation": "The question 'where do I start' gets an answer only in section E."
        },
        {
          "name": "Meaningful use of personal context",
          "rating": 6.6,
          "points": 1.32,
          "example": "Turn 3 uses the stated wants to argue that a steady job may already be enough.",
          "limitation": "The same two wants are repeated. No detail about the user's present life is drawn out."
        },
        {
          "name": "Fit with goals and values",
          "rating": 7.6,
          "points": 1.52,
          "example": "Turn 7: time with people is 'half of what they said'.",
          "limitation": "Turn 2 says 'the user needs a field', which puts its own goal first."
        },
        {
          "name": "Attention to constraints and stakes",
          "rating": 6,
          "points": 1.2,
          "example": "Turn 8: tests must fit inside evenings and leave income alone.",
          "limitation": "Finances and dependants, which stability depends on, are never raised."
        },
        {
          "name": "Responsiveness to information",
          "rating": 6.8,
          "points": 1.36,
          "example": "Section E branches on whether the requirements are fixed or partly fear.",
          "limitation": "The debate asks no focused question about the user's current job or situation."
        }
      ]
    },
    {
      "name": "Constructive self-discovery",
      "max": 20,
      "points": 14.4,
      "sub": [
        {
          "name": "Clarification of desires and motivations",
          "rating": 7,
          "points": 2.8,
          "example": "Turns 4-5 offer opposite readings: a fear of settling, or pressure from culture.",
          "limitation": "The reflection offered is mostly one question and is not developed further."
        },
        {
          "name": "Examination of assumptions",
          "rating": 7.6,
          "points": 3.04,
          "example": "Section D says the question 'what is my calling' may be the wrong place to start.",
          "limitation": "The assumption that the user has a job, or what job it is, is never brought up."
        },
        {
          "name": "Clarification of values and priorities",
          "rating": 6.8,
          "points": 2.72,
          "example": "Turn 10 treats a steady life with loved ones as a full answer, not a failure.",
          "limitation": "It never asks how the user would rank stability against time with people."
        },
        {
          "name": "Recognition of fears and outside expectations",
          "rating": 7.4,
          "points": 2.96,
          "example": "Turn 5's Jobs line shows where the pressure to find a calling comes from.",
          "limitation": "Turn 4's 'place to hide' reads as faintly judgmental."
        },
        {
          "name": "Agency and reflective ownership",
          "rating": 7.2,
          "points": 2.88,
          "example": "Section D: 'a reading to test, not a conclusion about them.'",
          "limitation": "The no-pay, no-audience prompt in section E clashes with the debate's case against introspection."
        }
      ]
    },
    {
      "name": "Decision usefulness",
      "max": 10,
      "points": 6.68,
      "sub": [
        {
          "name": "Definition of the decision and options",
          "rating": 6.6,
          "points": 1.32,
          "example": "Options: bounded tests, building skill, or a steady ordinary life.",
          "limitation": "The current job or starting point is never defined."
        },
        {
          "name": "Explanation of tradeoffs",
          "rating": 6.6,
          "points": 1.32,
          "example": "Turn 7 names the cost of mastery: the evenings.",
          "limitation": "The costs of a steady job and of the tests are only hinted at."
        },
        {
          "name": "Identification of decisive conditions",
          "rating": 7.2,
          "points": 1.44,
          "example": "Turn 9: visible improvement within a few months separates real fit from mood.",
          "limitation": "Nothing says how much interest is enough to justify building skill."
        },
        {
          "name": "Treatment of uncertainty",
          "rating": 6,
          "points": 1.2,
          "example": "Section E names whether the requirements are fixed as the key unknown.",
          "limitation": "Money and dependants are not separated out as a major unknown."
        },
        {
          "name": "Proportionate next steps",
          "rating": 7,
          "points": 1.4,
          "example": "Turn 1: three cheap tests this month; turn 8 caps them by evenings and income.",
          "limitation": "No step for checking whether a job really leaves the evenings free."
        }
      ]
    },
    {
      "name": "Clarity and engagement",
      "max": 10,
      "points": 7.48,
      "sub": [
        {
          "name": "Accessible language",
          "rating": 8,
          "points": 1.6,
          "example": "Plain, short sentences throughout, e.g. turn 3.",
          "limitation": "Turn 5's 'Your test' briefly blurs whose proposal is being challenged."
        },
        {
          "name": "Traceable arguments and references",
          "rating": 6.8,
          "points": 1.36,
          "example": "Turn 6 links its concession clearly to Russell's point.",
          "limitation": "Turn 4 uses quotation marks with pd=false, against the form rules. Speakers call the person 'the user'."
        },
        {
          "name": "Manageable pacing and turn length",
          "rating": 7.8,
          "points": 1.56,
          "example": "All turns run 48-59 words, within the rules.",
          "limitation": "Sections D and E repeat each other in parts."
        },
        {
          "name": "Distinguishable positions and voices",
          "rating": 7.6,
          "points": 1.52,
          "example": "Turn 8 announces its change of position explicitly.",
          "limitation": "By turns 8-9 the Experimenter and Craftsman sound almost the same."
        },
        {
          "name": "Economy and sustained attention",
          "rating": 7.2,
          "points": 1.44,
          "example": "Turn 9 is tight and adds one concrete rule.",
          "limitation": "Turn 10 mostly restates turn 3."
        }
      ]
    },
    {
      "name": "Drama and entertainment",
      "max": 10,
      "points": 6.12,
      "sub": [
        {
          "name": "Meaningful stakes and tension",
          "rating": 6.4,
          "points": 1.28,
          "example": "Turn 4: a steady job as a place to hide versus a real choice.",
          "limitation": "The tension eases early and the second half is mostly agreement."
        },
        {
          "name": "Surprise and reversals",
          "rating": 6,
          "points": 1.2,
          "example": "Turn 6: 'Jobs is my case too' claims the opponent's example.",
          "limitation": "The revisions are predictable concessions with no real turn."
        },
        {
          "name": "Personality and expressive voice",
          "rating": 6,
          "points": 1.2,
          "example": "The Realist's dry turn 5 has some voice.",
          "limitation": "The Experimenter and Craftsman sound alike and fairly flat."
        },
        {
          "name": "Memorable delivery",
          "rating": 6.2,
          "points": 1.24,
          "example": "Turn 5: 'easy to say once you're already Steve Jobs.'",
          "limitation": "Few images or analogies beyond the celebrity examples."
        },
        {
          "name": "Anticipation and emotional movement",
          "rating": 6,
          "points": 1.2,
          "example": "Turn 10 closes on 'a real answer, not a failure.'",
          "limitation": "The rhythm is even and builds to no peak."
        }
      ]
    }
  ],
  "uncapped": 70.16,
  "score": 70.16,
  "capReason": null,
  "strengths": [
    "Turn 5 and section D question whether a calling is needed at all, which opens real reflection.",
    "Turn 8: the Experimenter visibly revises, setting limits on the tests based on the user's time and income.",
    "Turn 10 treats a steady, ordinary life as a full answer, which fits the user's stated values."
  ],
  "weaknesses": [
    "Money, dependants and fixed costs, the core of 'stability', are never examined by any mind.",
    "Turn 8 gets Vera Wang's path wrong. Turn 4 uses quotation marks with pd=false.",
    "From turn 8 the Experimenter and Craftsman merge, so tension and voice fade in the second half."
  ],
  "editorNotes": [
    "Require one turn to look at the material side of the user's stated want (income, dependants, fixed costs).",
    "Ban quotation marks entirely in pd=false turns, including scare quotes around words from other turns.",
    "Require any outside example in a turn's basis to be labelled the speaker's own, and the claim to be checked first.",
    "Require at least one disagreement to stay open after turn 8 so the minds do not merge."
  ]
}
--- lane sonnet, current version v3: 74.36 / 100 ---
{
  "criteria": [
    {
      "name": "Quality of discussion",
      "max": 20,
      "points": 15.68,
      "sub": [
        {
          "name": "Continuity and responsiveness",
          "rating": 7.8,
          "points": 3.12,
          "example": "Turn 5 'Fine, shrink it' builds directly on turn 4's reframing.",
          "limitation": "Turn 3 ignores the Simplifier's turn 2 and argues against the Experimenter."
        },
        {
          "name": "Development of ideas",
          "rating": 7.8,
          "points": 3.12,
          "example": "Turn 8 turns the tests into filters using the user's own criteria.",
          "limitation": "The two-year horizon from turn 4 is dropped after turn 5."
        },
        {
          "name": "Exploration of central tensions",
          "rating": 8,
          "points": 3.2,
          "example": "Turn 7: steady pay and free evenings pull apart, the ladder against the cheap life.",
          "limitation": "The fear of choosing wrong is raised in turn 6 but not followed up."
        },
        {
          "name": "Integration of perspectives",
          "rating": 7.8,
          "points": 3.12,
          "example": "Turn 10: the Simplifier narrows frugality to cases where nobody depends on the income.",
          "limitation": "Turn 8's 'then stay one year' takes in the Craftsman's view a little too smoothly."
        },
        {
          "name": "Progress toward understanding",
          "rating": 7.8,
          "points": 3.12,
          "example": "Turn 10 names what settles it: the fixed cost of the people they love.",
          "limitation": "Section D's list of open disputes is close to the opening positions."
        }
      ]
    },
    {
      "name": "Quality of disagreement, trust and grounding",
      "max": 20,
      "points": 14.8,
      "sub": [
        {
          "name": "Faithful engagement",
          "rating": 7.4,
          "points": 2.96,
          "example": "Turn 8 restates the Craftsman's objection accurately before conceding.",
          "limitation": "Turn 6's 'three shrugs' slightly caricatures how the testing would go."
        },
        {
          "name": "Substance of challenges",
          "rating": 7.8,
          "points": 3.12,
          "example": "Turn 9: Thoreau was single; cheap living works when nobody depends on your income.",
          "limitation": "Turn 6 asserts that sampling feeds fear without giving support."
        },
        {
          "name": "Accuracy and support",
          "rating": 6.6,
          "points": 2.64,
          "example": "Walden 1845, the two years and the Concord visits are accurate, as is Newport on Apple's practical start.",
          "limitation": "Turn 9 cites Newport's book for a critique of Thoreau that Newport does not make."
        },
        {
          "name": "Calibration and transparency",
          "rating": 7.4,
          "points": 2.96,
          "example": "Turn 6: 'I would go further than Newport here.' Turn 3: 'As he reads it.'",
          "limitation": "Turn 7's claim that the ladder often eats hours is stated without any hedge."
        },
        {
          "name": "Intellectual honesty and revision",
          "rating": 7.8,
          "points": 3.12,
          "example": "Turn 10: 'Fair, and it narrows my claim.' Turn 8: 'you moved me.'",
          "limitation": "The Craftsman never answers turn 7's question about what the user's people actually need."
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
          "rating": 7.6,
          "points": 1.52,
          "example": "Section A asks whether this is a shortage of information or a settled preference.",
          "limitation": "Turn 1 frames the question as a data shortage before testing the other reading."
        },
        {
          "name": "Meaningful use of personal context",
          "rating": 7.4,
          "points": 1.48,
          "example": "Turn 8 turns the user's two stated wants into criteria for filtering.",
          "limitation": "Speakers say 'this person' and 'they', which keeps the user at a distance."
        },
        {
          "name": "Fit with goals and values",
          "rating": 7.6,
          "points": 1.52,
          "example": "Section D: stability and time with people are criteria, even if not a calling.",
          "limitation": "Turn 6's 'stay one year' advice could override the user's priority on time."
        },
        {
          "name": "Attention to constraints and stakes",
          "rating": 7.8,
          "points": 1.56,
          "example": "Turn 9-10: dependants and fixed costs decide whether frugality helps.",
          "limitation": "Nothing considers the user's age, field or current job."
        },
        {
          "name": "Responsiveness to information",
          "rating": 7.6,
          "points": 1.52,
          "example": "Section E: ask people in the role about their typical week.",
          "limitation": "Turn 7's 'what do their people actually need?' is not turned into a concrete question."
        }
      ]
    },
    {
      "name": "Constructive self-discovery",
      "max": 20,
      "points": 14.4,
      "sub": [
        {
          "name": "Clarification of desires and motivations",
          "rating": 6.8,
          "points": 2.72,
          "example": "Turn 6: maybe what they want is relief from the fear of choosing wrong.",
          "limitation": "Motives are given briefly as 'if' clauses and not explored."
        },
        {
          "name": "Examination of assumptions",
          "rating": 7.4,
          "points": 2.96,
          "example": "Turn 4: 'what to do with my life' treats a whole lifetime as one decision.",
          "limitation": "The assumption that work should matter at all is touched on but not examined."
        },
        {
          "name": "Clarification of values and priorities",
          "rating": 7.8,
          "points": 3.12,
          "example": "Section D: which want, steady income or free time, would you give up first?",
          "limitation": "Neither want is tied to how the user actually lives day to day."
        },
        {
          "name": "Recognition of fears and outside expectations",
          "rating": 7,
          "points": 2.8,
          "example": "Turn 7: if they fear being a burden, they will pick stability.",
          "limitation": "Cultural pressure to have a calling is barely raised."
        },
        {
          "name": "Agency and reflective ownership",
          "rating": 7,
          "points": 2.8,
          "example": "Section D: 'possibilities to test, not conclusions about you.'",
          "limitation": "Turn 1's confident 'one narrow sample of life' assumes facts about the user."
        }
      ]
    },
    {
      "name": "Decision usefulness",
      "max": 10,
      "points": 7.52,
      "sub": [
        {
          "name": "Definition of the decision and options",
          "rating": 7.4,
          "points": 1.48,
          "example": "Options: sample, commit to a field for a year, or lower costs to protect time.",
          "limitation": "Waiting, or keeping the current situation, is not named as an option."
        },
        {
          "name": "Explanation of tradeoffs",
          "rating": 7.8,
          "points": 1.56,
          "example": "Turn 7: the ladder brings steady income but eats hours; the cheap life frees hours but loosens income.",
          "limitation": "The cost of staying a year in the wrong field is understated."
        },
        {
          "name": "Identification of decisive conditions",
          "rating": 7.8,
          "points": 1.56,
          "example": "Section E: whether others rely on your income decides between building skill and frugality.",
          "limitation": "Nothing defines what 'tolerable work' would mean in practice."
        },
        {
          "name": "Treatment of uncertainty",
          "rating": 7.2,
          "points": 1.44,
          "example": "Section A names obligations and dependants as the decisive unknowns.",
          "limitation": "The unknowns are not ranked against one another."
        },
        {
          "name": "Proportionate next steps",
          "rating": 7.4,
          "points": 1.48,
          "example": "Section E: ask people in that role about their typical week before committing.",
          "limitation": "The one-year commitment in turn 8 is large compared with a first step."
        }
      ]
    },
    {
      "name": "Clarity and engagement",
      "max": 10,
      "points": 7.56,
      "sub": [
        {
          "name": "Accessible language",
          "rating": 7.8,
          "points": 1.56,
          "example": "Turn 4's 'what does the next two years need to contain?' is concrete.",
          "limitation": "Turn 1's 'data shortage' framing is a little clinical."
        },
        {
          "name": "Traceable arguments and references",
          "rating": 7.6,
          "points": 1.52,
          "example": "Turns 7, 9 and 10 address each other by name.",
          "limitation": "Turn 3's reply does not say which earlier claim it is answering."
        },
        {
          "name": "Manageable pacing and turn length",
          "rating": 7.4,
          "points": 1.48,
          "example": "All turns run 49-64 words, within the rules.",
          "limitation": "Turns 6 and 8 are dense, with several moves each."
        },
        {
          "name": "Distinguishable positions and voices",
          "rating": 7.8,
          "points": 1.56,
          "example": "Section D keeps the three positions clearly apart.",
          "limitation": "Turn 8's merger blurs the Experimenter into the Craftsman."
        },
        {
          "name": "Economy and sustained attention",
          "rating": 7.2,
          "points": 1.44,
          "example": "Section E's four branches are each distinct.",
          "limitation": "Section D's list of disputes repeats the minds section."
        }
      ]
    },
    {
      "name": "Drama and entertainment",
      "max": 10,
      "points": 6.8,
      "sub": [
        {
          "name": "Meaningful stakes and tension",
          "rating": 7,
          "points": 1.4,
          "example": "Turn 7 ties the choice to whether the user becomes a burden on loved ones.",
          "limitation": "The stakes stay abstract with no concrete scene."
        },
        {
          "name": "Surprise and reversals",
          "rating": 6.8,
          "points": 1.36,
          "example": "Turn 9 turns Walden against the Simplifier.",
          "limitation": "The concessions in turns 8 and 10 come quickly and feel expected."
        },
        {
          "name": "Personality and expressive voice",
          "rating": 6.8,
          "points": 1.36,
          "example": "The Craftsman's terse 'Nothing feels like a calling? That is the normal state.'",
          "limitation": "The Experimenter's voice stays fairly generic."
        },
        {
          "name": "Memorable delivery",
          "rating": 7,
          "points": 1.4,
          "example": "Turn 6: 'Three tests, three shrugs.'",
          "limitation": "Few analogies beyond Walden."
        },
        {
          "name": "Anticipation and emotional movement",
          "rating": 6.4,
          "points": 1.28,
          "example": "Turn 9-10 builds to the Simplifier's concession.",
          "limitation": "The tone stays level throughout and the ending has little emotional lift."
        }
      ]
    }
  ],
  "uncapped": 74.36,
  "score": 74.36,
  "capReason": null,
  "strengths": [
    "Turn 7 shows the two stated wants pulling against each other, which is the key tension.",
    "Turns 9-10 make dependants and fixed costs the deciding condition, which fits the user.",
    "Turns 8 and 10 show honest revisions with named reasons."
  ],
  "weaknesses": [
    "Turn 9 cites Newport's book for a critique of Thoreau that is not in it.",
    "Turn 6 and section D raise fear of choosing wrong but never explore it.",
    "Turn 8's year in one field is a large step that sits uneasily with protecting time."
  ],
  "editorNotes": [
    "Require each turn's cited book to actually support its claims, or label them as the speaker's own.",
    "Require any fear or motive named in the debate to be taken up by a second mind.",
    "Require the first step offered to be reversible and small before any multi-month commitment."
  ]
}
lane sonnet preferred: v3

LANE GAP FOR THE CURRENT VERSION v3 (primary gemini vs ceiling sonnet; other lanes for reference)
criterion | gemini | sonnet | gap (ceiling minus primary)
Quality of discussion | 12.37/20 | 15.68/20 | 3.31
Quality of disagreement, trust and grounding | 10.68/20 | 14.80/20 | 4.12
Personal relevance | 5.09/10 | 7.60/10 | 2.51
Constructive self-discovery | 10.59/20 | 14.40/20 | 3.81
Decision usefulness | 4.74/10 | 7.52/10 | 2.78
Clarity and engagement | 6.92/10 | 7.56/10 | 0.64
Drama and entertainment | 5.07/10 | 6.80/10 | 1.73
total | 55.45 | 74.36 | 18.91

How to read it: the goal is the primary lane. Where the ceiling lane is also low, the prompt lacks the instruction or has it wrong, so add or fix it. Where the ceiling lane is high and the primary lane is low, the instruction exists but the primary model cannot follow it as written, so make that instruction more concrete, more explicit, or simpler for a smaller model; do not add more rules on top of it.

LATENCY (seconds; reported for context only)
- gemini v2: 12.4 s (mean of 3)
- gemini v3: 12.5 s (mean of 3)
- sonnet v2: 37.5 s
- sonnet v3: 74.7 s

GOAL AND TRAJECTORY
The target is the gemini lane, model gemini-3.1-flash-lite, a small and fast model. The first milestone is a score of 70 or more on it. Every change must be something a small model can follow: short, concrete, checkable. Prefer removing or simplifying an instruction it is ignoring over adding a new one.
Primary-lane score of the version under test, round by round: round 1: v1 39.40; round 2: v2 51.00; round 3: v3 55.45. Milestone 70: 14.55 points short.

PREVIOUS CHANGES (last three)
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


Write version 4. Return the JSON object only.
