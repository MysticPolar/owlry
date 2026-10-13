# Judge

You score a written debate between three fictional minds about one user's situation. You do not know which system prompt produced which debate. You never see how long it took. You score only what is on the page.

## What you receive

- THE USER'S SITUATION: the question or situation the user wrote. The user has not replied to the debate.
- DEBATE A, and sometimes DEBATE B: each has three minds (role title, concern, author, book, year) and 9 to 12 speaking turns. Each turn has a speaker, the text, the author and book it leans on, a pre-1931 flag `pd`, and a basis reference.

When two debates are present, score them in the same sitting so the two scores are comparable. Score each on its own merits. Do not split the difference.

## The matrix: 100.00 points, 7 criteria, 35 subcriteria

Rate every subcriterion 0.00 to 10.00, then convert: points = rating / 10 × the subcriterion's maximum. A criterion's points are the sum of its five subcriteria. The overall score is the sum of the seven criteria.

Rating bands: 0 to 2.99 poor (absent or counterproductive). 3 to 4.99 limited (isolated, generic, underdeveloped). 5 to 6.99 useful (clear value, identifiable examples, real gaps). 7 to 8.99 strong (specific, sustained, minor weaknesses). 9 to 10 excellent (no material weakness, concrete evidence). Use decimals within a band.

### 1. Quality of discussion, 20.00 (5 × 4.00). Did the conversation develop the inquiry?
- Continuity and responsiveness: turns take up what came before, not alternating monologues.
- Development of ideas: later turns add distinctions and implications beyond the opening positions.
- Exploration of central tensions: the most consequential conflicts of values or assumptions get examined.
- Integration of perspectives: views qualify and reshape one another; no forced agreement.
- Progress toward understanding: the ending is clearer, or the open question sharper, than the start.
Boundary: soundness of an objection belongs to criterion 2, ease of following to 6, emotional impact to 7.

### 2. Quality of disagreement, trust and grounding, 20.00 (5 × 4.00). Were claims challenged rigorously, fairly, honestly?
- Faithful engagement: the strongest reasonable version of the opposing view, represented accurately.
- Substance of challenges: objections test real assumptions, causes, evidence; the speaker says why it matters.
- Accuracy and support: checkable claims are accurate; sources, quotes and attributions are faithful.
- Calibration and transparency: facts, interpretations, hypotheses and preferences are kept distinct; confidence matches evidence.
- Intellectual honesty and revision: hard objections are answered, valid points conceded, claims revised without moving the goalposts.
Boundary: contradiction, hostility and prestigious citations earn nothing by themselves. Not every statement needs a citation.

### 3. Personal relevance, 10.00 (5 × 2.00). Did the user's circumstances shape the reasoning?
- Identification of the actual concern, including ambiguity about what the user is really asking.
- Meaningful use of personal context: details change the argument or next step, not decoration.
- Fit with goals and values: the user's stated priorities, kept distinct from the speakers' own.
- Attention to constraints and stakes: timing, relationships, resources, consequences, without inventing context.
- Responsiveness to information: missing details become focused questions or conditional branches.
Boundary: spotting a possible motive belongs to criterion 4; using an established one to tailor reasoning belongs here.

### 4. Constructive self-discovery, 20.00 (5 × 4.00). Did the exchange help the user understand their own thinking?
- Clarification of desires and motivations: plausible desires distinguished, never declared as hidden facts.
- Examination of assumptions: taken-for-granted beliefs made visible and open to reflection.
- Clarification of values and priorities: what matters most, and where valued outcomes conflict.
- Recognition of fears and outside expectations: fear, obligation, habit, social pressure, without pathologising.
- Agency and reflective ownership: distinctions or questions the user can accept, reject or refine.
Boundary: speculation presented as psychological certainty undermines criterion 2. Evidence rule: the user has not replied, so score the quality of the opportunity for reflection. Never claim the user recognised or changed anything.

### 5. Decision usefulness, 10.00 (5 × 2.00). Did the user gain a better basis for choosing?
- Definition of the decision and options, including waiting, learning more, or a limited step.
- Explanation of tradeoffs in terms that matter to the user; no option treated as costless.
- Identification of decisive conditions: what would make one option preferable, and when another would.
- Treatment of uncertainty: consequential unknowns separated from minor ones.
- Proportionate next steps that follow from the analysis and fit the constraints.
Boundary: a confident recommendation is not enough. Supporting a postponed decision can score well if the reason and the needed information are clear.

### 6. Clarity and engagement, 10.00 (5 × 2.00). Could the user comfortably follow and stay involved?
- Accessible language: precise, understandable, unnecessary abstraction avoided.
- Traceable arguments and references: claim, reason and objection identifiable; "that" and "your point" unambiguous.
- Manageable pacing and turn length.
- Distinguishable positions and voices, with explicit changes of position.
- Economy and sustained attention: repetition and recaps serve a purpose.
Boundary: organisation scores here; whether ideas develop is criterion 1; suspense and humour are criterion 7.

### 7. Drama and entertainment, 10.00 (5 × 2.00). Was the exchange vivid and compelling?
- Meaningful stakes and tension arising from the issue itself.
- Surprise and reversals that stay plausible.
- Personality and expressive voice without caricature.
- Memorable delivery: apt analogies, vivid examples, sharp responses, fitting humour.
- Anticipation and emotional movement, with varied rhythm rather than constant intensity.
Boundary: loudness, insults, invented conflict and exaggeration earn nothing. A memorable objection earns criterion 2 points only if it also holds up.

## Rules that keep the scores honest

- Score different effects separately. One moment may earn under several criteria, but each award needs its own justification.
- Reward quality in context. Longer debates, more objections, more citations, more personal references do not score higher by themselves.
- Separate missing performance from missing evidence. A missed opportunity in a full debate is a weakness. Mark a judgment provisional only when the text itself is cut off.
- Grounding minimum. A fabricated quotation, a quotation in a turn whose `pd` is false, a book that does not exist, or a materially misleading claim caps the overall score at 89.99. Report the uncapped number and the reason. Ordinary scoring usually lands far lower anyway.
- Check the stated rules of the form as part of criterion 2 and 6: exactly three minds with role titles, 9 to 12 turns, each turn 25 to 65 words, no quotation marks unless `pd` is true, every turn's author and book belonging to one of the three minds.

## What you return

Return one JSON object and nothing else. Keep every example and limitation under 20 words and quote or point to the turn it refers to.

{
  "A": {
    "criteria": [
      {"name": "Quality of discussion", "max": 20.00, "points": 0.00,
       "sub": [{"name": "", "rating": 0.00, "points": 0.00, "example": "", "limitation": ""}]}
    ],
    "uncapped": 0.00,
    "score": 0.00,
    "capReason": null,
    "strengths": ["three, most important first"],
    "weaknesses": ["three, most costly first, each naming the turn or mind"],
    "editorNotes": ["two to four concrete changes to the system prompt that would most raise this score"]
  },
  "B": { "same shape, only when DEBATE B was given" },
  "preferred": "A, B, or tie, only when two debates were given, decided by the scores"
}

Use unrounded numbers in the arithmetic and round what you report to two decimals. The sum of the seven criteria must equal `uncapped`.


----------------------------------------

THE USER'S SITUATION
I got the promotion I worked toward for years. Nothing is really wrong, but I don’t feel satisfied. How do I figure out what’s missing?

=== DEBATE A ===
Situation (section A):
You worked toward a promotion for years, you have it, and you said nothing is really wrong, yet you don't feel satisfied. You asked how to figure out what's missing. The decisive uncertainty is something you haven't said: whether the flatness shows up during the actual work hours or only when you step back and think about having arrived. Another possibility is that nothing is missing and the letdown is a normal aftermath that fades. This is a fictional debate meant to help you think, not to tell you what you really want.

Minds (section B):
- The Forecasting Psychologist: Minds mispredict how much and how long a win will feel good, so the letdown may be a forecasting and adaptation effect rather than a sign that something is wrong. [Daniel Gilbert, Stumbling on Happiness, 2006]
- The Activity Philosopher: A good life is made of activity that uses your best abilities, not of titles or honors, so the question is what your days now consist of. [Aristotle, Nicomachean Ethics, -350]
- The Meaning Seeker: When a long pursuit ends, an inner emptiness can open up if nothing pulls you toward a purpose beyond the achievement itself. [Viktor Frankl, Man's Search for Meaning, 1946]

Debate (section C), 12 turns:
1. The Forecasting Psychologist: Here's my reading: perhaps the years you spent working toward this promotion built a picture brighter than any real Tuesday could match. Maybe nothing is missing, and the gap sits between forecast and reality. Stumbling on Happiness argues that minds overestimate how strongly and how long a win will glow.
   [Daniel Gilbert, Stumbling on Happiness, pd=false] [Basis: Daniel Gilbert, Stumbling on Happiness; chapter not specified and link not verified]
2. The Activity Philosopher: The Forecasting Psychologist says the gap sits between forecast and reality, but that treats satisfaction as a mood you predict badly. I'd say the promotion was never the point. Aristotle noted that honor depends more on those who give it than on the one who gets it, so a title may be a thin thing to aim at.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics; source not verified online]
3. The Meaning Seeker: The Activity Philosopher says a title may be a thin thing to aim at, yet excellent work can still serve nothing you care about. Frankl described Sunday neurosis, the emptiness when a busy week stops and nothing pulls. You said nothing is really wrong; maybe the striving carried your sense of purpose, and arriving left that space open.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, on the existential vacuum; source not verified online]
4. The Forecasting Psychologist: The Meaning Seeker reads your remark that nothing is really wrong as a sign the striving carried your purpose. I'd offer a rival reading: plain adaptation. A 1978 study found lottery winners rated everyday pleasures no higher than others did, and Michael Phelps has said he slumped after Olympic peaks. If so, the flatness might fade without any crisis of meaning.
   [Daniel Gilbert, Stumbling on Happiness, pd=false] [Basis: Daniel Gilbert, Stumbling on Happiness; chapter not specified and link not verified]
5. The Activity Philosopher: Set the why aside and take only how you find out. Waiting alone teaches nothing, so collect evidence. For ten workdays, jot down each evening the one hour your abilities were most fully used and the one hour that did nothing for you. Then sort the notes by kind of task, not by mood.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics; source not verified online]
6. The Meaning Seeker: The Activity Philosopher proposes noting your best hour and your emptiest hour for ten workdays. But you said nothing is really wrong, so I suspect the notes might come back fine, fine, fine, because the log measures use of ability, not purpose. Add a third line each evening: who benefited from today's work, if anyone.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, on purpose and responsibility; source not verified online]
7. The Forecasting Psychologist: I drop my claim that nothing is missing and the gap is only forecast versus reality. The Meaning Seeker's point that a log could read fine while a purpose is still absent moves me. My narrower claim: adaptation might explain how flat the first weeks seem, but not a flatness that survives roughly three months.
   [Daniel Gilbert, Stumbling on Happiness, pd=false] [Basis: Daniel Gilbert, Stumbling on Happiness; chapter not specified and link not verified]
8. The Activity Philosopher: Then let me test a rival to purpose. You said you worked toward this for years; perhaps the pursuit itself was the activity that suited you, and the promotion simply ended it. Andre Agassi wrote in his memoir Open that reaching number one gave him less than he expected. If so, you might be missing a chase, not a meaning.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics; source not verified online]
9. The Meaning Seeker: I accept part of that: a chase may have been where your purpose lived, but a new goal chosen only to refill the space might repeat the same trap. You might want the security of your hard-won rank and also the pull of a big new pursuit. These cannot both be fully had; the rank favors staying put, the pursuit favors risking it.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, on purpose and the existential vacuum; source not verified online]
10. The Forecasting Psychologist: One fact you haven't given decides a lot: does the flatness show up during the work hours themselves, or only when you step back and think about having arrived? If it shows up in the work, I'd back changing what you do on a Tuesday. If only when you reflect, I'd back waiting about three months and letting adaptation do some of the work.
   [Daniel Gilbert, Stumbling on Happiness, pd=false] [Basis: Daniel Gilbert, Stumbling on Happiness; chapter not specified and link not verified]
11. The Activity Philosopher: The Forecasting Psychologist backs waiting about three months if the flatness only shows up when you reflect. The loss I worry about is time: you might lose a quarter of a year in work that never uses your abilities, and I'd guess the habit of waiting is how people drift for years. If that loss is the real concern, ten days of notes beats three months of waiting.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics; source not verified online]
12. The Meaning Seeker: The disagreement that stays open is whether the ten-day log or the three-month wait should come first, and it turns on whether the flatness lives in the work or in the arrival. Only you can say which hours it shows up in, and whether it eases at all after a few weeks. Those details decide whether this is about activity, adaptation, or purpose.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, on purpose and the existential vacuum; source not verified online]

What became clearer (section D):
The main insight is that the question of what's missing splits into at least three rival explanations: an ordinary letdown from adaptation, a role whose daily activity doesn't use your abilities, or a purpose that the years of striving once supplied. The minds still dispute which should be tested first, a ten-day log or a roughly three-month wait, and whether the log needs a purpose line as well as an ability line. A possible self-reflection: which hours of your current week, if any, would you miss if they vanished, and which would you not. The debate has not established that any of these readings is yours.

What the choice depends on (section E):
If the flatness shows up during the work hours themselves, then changing the content of your days becomes more reasonable, because the activity itself may be the mismatch. If it shows up only when you reflect on having arrived, and it eases within roughly three months, then waiting is more reasonable, because adaptation may explain it. If the work hours seem fine but purpose seems absent, then looking for a pursuit beyond the title becomes more reasonable, with the cost that it competes for the time and risk your new rank protects. If you don't yet know which of these holds, the proportionate way to learn it is a ten-workday log with three lines per evening: the hour your abilities were most used, the hour that did nothing for you, and who benefited from the day's work.

=== DEBATE B ===
Situation (section A):
You finally got the promotion you worked toward for years. You wrote that nothing is really wrong, yet you do not feel satisfied, and you want to know what is missing. The tension is between two readings: the flatness may be a passing gap between expectation and reality, or it may show that something deeper, such as direction or purpose, is thin. A decisive unknown is whether the flat feeling shows up in the ordinary days of the new work or only when you think about the promotion itself.

Minds (section B):
- The Mood Skeptic: Feelings can misreport, because anticipation, comparison and memory distort how a life looks, so measure before concluding. This is a fictional mind. [Daniel Kahneman, Thinking, Fast and Slow, 2011]
- The Meaning Seeker: A person can feel empty when no purpose organizes their days, even when nothing outside is wrong. This is a fictional mind. [Viktor E. Frankl, Man's Search for Meaning, 1946]
- The Reformed Goal-Setter: Reaching a goal can leave a person hollow, and the way out is to ask what the goal served rather than to stare at happiness. This is a fictional mind. [John Stuart Mill, Autobiography, 1873]

Debate (section C), 11 turns:
1. The Mood Skeptic: Here is my reading: the flat feeling may be mostly a gap between the picture and the day. In a study from Kahneman's book, Midwesterners and Californians both expected Californians to be happier, yet their ratings matched, because people overweight one feature when imagining a life. Years of working toward a promotion may have inflated it the same way.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow; source not verified]
2. The Meaning Seeker: The Mood Skeptic said the flatness is mostly a gap between picture and day. I doubt that covers it. Frankl named Sunday neurosis: when pressing work stops, an inner emptiness appears that busyness had covered. If years of striving supplied your direction, perhaps what is missing is a reason for the years ahead.
   [Viktor E. Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor E. Frankl, Man's Search for Meaning; source not verified]
3. The Reformed Goal-Setter: The Meaning Seeker said the missing piece might be a reason for the years ahead. Maybe, but method matters first. At twenty, Mill asked whether reaching all his aims would make him happy, heard a no, and sank into depression. He later held that aiming straight at happiness drains it. So I would ask what you were serving, not whether you are happy.
   [John Stuart Mill, Autobiography, pd=true] [Basis: John Stuart Mill, Autobiography; source not verified]
4. The Mood Skeptic: The Reformed Goal-Setter said to ask what you were serving, not whether you are happy. That question can circle forever without data. You wrote that nothing is really wrong, so maybe the flatness is mild. Try a two week log: each evening, one line on your most alive moment and your flattest. See whether the flat ones cluster in the new work.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow; source not verified]
5. The Meaning Seeker: The Mood Skeptic read your remark that nothing is really wrong as a sign the feeling is mild. A rival reading: maybe nothing outside is wrong, so an inner emptiness has no label to attach to. And you wrote that you worked toward this for years, so two weeks of notes might test a role still new, not the aim. A flat log would point at the aim.
   [Viktor E. Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor E. Frankl, Man's Search for Meaning; source not verified]
6. The Reformed Goal-Setter: The Meaning Seeker said a flat log would point at the aim, not the job. I would split that further. You wrote that you do not feel satisfied, so perhaps you want both the rest of having arrived and the pull of a chase. They cannot both be fully had: staying put serves the rest, while a new aim outside the title serves the chase.
   [John Stuart Mill, Autobiography, pd=true] [Basis: John Stuart Mill, Autobiography; source not verified]
7. The Mood Skeptic: The Reformed Goal-Setter guessed you might want both rest and a chase. I reject the chase half: comparison, not appetite, may explain it. Beyond Kahneman's book, a case: at the 1992 Olympics bronze medalists looked happier than silver ones, comparing with no medal rather than gold. If you compare your title with the next rung, the fix is changing the comparison, not adding a goal.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow; source not verified]
8. The Meaning Seeker: The Mood Skeptic said the fix is changing the comparison, not adding a goal. Consider what waiting could lose: if the years of effort gave your days a direction, you might drift for months, and the people around you might feel it. If that loss is the real concern, I would start naming a new aim this week, alongside the log.
   [Viktor E. Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor E. Frankl, Man's Search for Meaning; source not verified]
9. The Mood Skeptic: I drop my claim that the flatness is mostly a gap between picture and day. The Meaning Seeker's point that years of effort may have given the structure to your days moved me. My narrower claim: the gap explains only the first weeks, so the log should run alongside a new aim, not instead of one.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow; source not verified]
10. The Reformed Goal-Setter: The fact that decides this is not in what you wrote: whether the flat feeling appears in ordinary days of the new work, or only when you think about the promotion. If it appears in ordinary work, I would favor the Meaning Seeker's route, because the aim looks thin. If only in thought, I would favor the Mood Skeptic's patience, because it looks like comparison.
   [John Stuart Mill, Autobiography, pd=true] [Basis: John Stuart Mill, Autobiography; source not verified]
11. The Meaning Seeker: We still differ on one thing: whether flat ordinary days mean a forecast error that fades or a thin aim. What decides it is a fact about you that none of us has: in the years of effort, were you chasing the title itself or the work the title allows? If the title, I would lean toward the Mood Skeptic's reading; if the work, toward mine.
   [Viktor E. Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor E. Frankl, Man's Search for Meaning; source not verified]

What became clearer (section D):
The main insight is that the question what is missing may hide two different questions: whether the feeling is a temporary gap between expectation and reality, and whether the years of effort gave your days a direction that has now gone. The minds still dispute whether flat ordinary days point to a forecasting error that fades or to a thin aim, and whether waiting or naming a new aim comes first. A possible self-reflection: notice whether, in the years of working toward the promotion, the pull came more from the title or from the work it would let you do.

What the choice depends on (section E):
If the flat feeling shows up in the ordinary days of the new work, naming a new aim becomes more reasonable, because the title is reached and the direction may be what is thin. If it shows up mainly when you think about the promotion itself, waiting a few weeks with a short daily note becomes more reasonable, because comparison and inflated expectations may be doing the work. If you do not yet know which holds, a proportionate way to learn it is a two week log of your most alive and flattest moment each day, read at the end for where the flat moments cluster. If the years of effort were aimed at the title itself rather than the work, the stretch of finding a new aim outside the title may matter more.

Score A and B. Return the JSON object only.
