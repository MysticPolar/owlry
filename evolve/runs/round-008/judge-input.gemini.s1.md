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
You have achieved a long-term goal of a promotion, yet you find yourself feeling hollow instead of fulfilled. You are currently struggling to determine if this dissatisfaction signals a need for a new direction or a failure to appreciate your current state.

Minds (section B):
- The Pleasure Critic: Achieving simple contentment by avoiding unnecessary desire. [Epicurus, Letter to Menoeceus, -341]
- The Purpose Seeker: Aligning one's life with personal virtue and nature. [Seneca, Letters from a Stoic, 65]
- The Responsibility Analyst: Finding meaning through service and engagement beyond the self. [Viktor Frankl, Man's Search for Meaning, 1946]

Debate (section C), 9 turns:
1. The Pleasure Critic: Maybe you are chasing desires that create more wanting rather than removing pain, and perhaps this promotion was a luxury you did not actually need to be happy.
   [Epicurus, Letter to Menoeceus, pd=true] [Basis: Epicurus, Letter to Menoeceus](https://en.wikisource.org/wiki/Letter_to_Menoeceus)
2. The Purpose Seeker: You might be misaligned; perhaps this promotion serves an external status rather than your own nature, making you feel like a stranger in your own life.
   [Seneca, Letters from a Stoic, pd=true] [Basis: Seneca, Letters from a Stoic, Letter 7](https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_7)
3. The Responsibility Analyst: It might not be about desire or nature, but a lack of a meaningful task that transcends your own professional success and impacts the lives of others.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, Chapter 2](https://www.goodreads.com/book/show/4069.Man_s_Search_for_Meaning)
4. The Pleasure Critic: If you chase meaning as a task, you might just be adding more stress, forgetting that living comfortably and simply is the true goal of a human life.
   [Epicurus, Letter to Menoeceus, pd=true] [Basis: Epicurus, Letter to Menoeceus](https://en.wikisource.org/wiki/Letter_to_Menoeceus)
5. The Purpose Seeker: You suggest it is about a task, but if the work itself lacks virtue, no amount of meaning fixes the hollowness you feel when the promotion dust settles.
   [Seneca, Letters from a Stoic, pd=true] [Basis: Seneca, Letters from a Stoic, Letter 82](https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_82)
6. The Responsibility Analyst: I concede that virtue matters, but I revise my position to focus on the idea that the lack you feel might be in the service of others, not just the task itself.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, Chapter 2](https://www.goodreads.com/book/show/4069.Man_s_Search_for_Meaning)
7. The Pleasure Critic: Try spending 3 hours this week doing something that provides no professional utility, to see if the satisfaction returns when you are not performing for a goal.
   [Epicurus, Letter to Menoeceus, pd=true] [Basis: Epicurus, Letter to Menoeceus](https://en.wikisource.org/wiki/Letter_to_Menoeceus)
8. The Purpose Seeker: If you try that and it feels empty, it might mean you are simply bored, rather than unfulfilled by the work you chose to pursue years ago.
   [Seneca, Letters from a Stoic, pd=true] [Basis: Seneca, Letters from a Stoic, Letter 2](https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_2)
9. The Responsibility Analyst: The disagreement remains open; is the dissatisfaction a signal to seek a new mission, or is it simply a lack of simple pleasure that you failed to nourish?
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, Chapter 2](https://www.goodreads.com/book/show/4069.Man_s_Search_for_Meaning)

What became clearer (section D):
The debate highlights a tension between seeking internal peace and pursuing a mission that transcends personal comfort. While the minds disagree on whether the solution lies in simplifying one's life or deepening one's commitment to service, they agree that the dissatisfaction might be a symptom of a mismatch between your actions and your values. A remaining point of contention is whether the feeling is a temporary malaise or a sign of an incorrectly chosen path.

What the choice depends on (section E):
If your dissatisfaction stems from a lack of connection to others → the path of finding a new mission becomes more reasonable, because it shifts your focus away from your own internal state. If your dissatisfaction stems from the exhaustion of maintaining your current status → the path of simplification becomes more reasonable, because it removes the pressure of external validation. If the cause remains unknown → keep a journal for one week to record when you feel most present and when you feel most like you are performing, as this will help distinguish between your needs for peace versus purpose.

=== DEBATE B ===
Situation (section A):
The user has achieved a long-sought professional promotion but feels empty, leading to a struggle with whether their dissatisfaction stems from a lack of purpose, a focus on the wrong goals, or an inherent emptiness in the achievement itself.

Minds (section B):
- The Existentialist: The void between human desire for meaning and the indifference of the world. [Albert Camus, The Myth of Sisyphus, 1942]
- The Utilitarian: The quality and depth of one’s satisfactions. [John Stuart Mill, Utilitarianism, 1861]
- The Stoic: Distinguishing between what is within one’s control and what is not. [Marcus Aurelius, Meditations, 167]

Debate (section C), 9 turns:
1. The Existentialist: You might feel unsatisfied because you believed the promotion was a final summit, but you perhaps have discovered that the climb is the only thing that actually existed.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Camus, The Myth of Sisyphus, Chapter 4](https://en.wikipedia.org/wiki/The_Myth_of_Sisyphus)
2. The Utilitarian: You might be experiencing dissatisfaction because you have pursued an inferior goal; as the author notes, "It is better to be a human being dissatisfied than a fool satisfied; better to be Socrates dissatisfied than a fool satisfied."
   [John Stuart Mill, Utilitarianism, pd=true] [Basis: Mill, Utilitarianism, Chapter 2](https://www.gutenberg.org/files/1124/1124-h/1124-h.htm)
3. The Stoic: You perhaps suffer because you value external accolades that "are not in your power," rather than focusing on the rational integrity of your daily labor.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Aurelius, Meditations, Book 4](https://classics.mit.edu/Antoninus/meditations.4.four.html)
4. The Existentialist: Challenging the Stoic, if you only focus on internal integrity, you might be ignoring the absurdity of the job itself; characterizing work as merely something to be endured risks blinding you to the reality that the job might be inherently hollow.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Camus, The Myth of Sisyphus, Chapter 1](https://en.wikipedia.org/wiki/The_Myth_of_Sisyphus)
5. The Utilitarian: Responding to the Existentialist, you could say that if the job provides no utility to others, your dissatisfaction is a sign that you have prioritized your own career gain over a more meaningful, social good.
   [John Stuart Mill, Utilitarianism, pd=true] [Basis: Mill, Utilitarianism, Chapter 4](https://www.gutenberg.org/files/1124/1124-h/1124-h.htm)
6. The Stoic: I suggest you take this step: tomorrow, spend 30 minutes writing down every task you perform and mark each with whether it served your own rational character or just your status. As the author says, "Things of themselves stand outside the soul, having no access to it, and do not bend or move it."
   [Marcus Aurelius, Meditations, pd=true] [Basis: Aurelius, Meditations, Book 4](https://classics.mit.edu/Antoninus/meditations.4.four.html)
7. The Existentialist: Testing the Stoic's step, if you find that most tasks serve your status, you might conclude that you have spent years building a ladder to nowhere, which explains why the summit feels cold.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Camus, The Myth of Sisyphus, Chapter 1](https://en.wikipedia.org/wiki/The_Myth_of_Sisyphus)
8. The Utilitarian: I drop the claim that you need a higher pleasure; you might just need to shift where you find your utility, perhaps in helping others rather than climbing.
   [John Stuart Mill, Utilitarianism, pd=true] [Basis: Mill, Utilitarianism, Chapter 4](https://www.gutenberg.org/files/1124/1124-h/1124-h.htm)
9. The Stoic: While I accept that utility matters, I still maintain that the missing piece is your own internal focus on what you can control, rather than the external result of your promotion.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Aurelius, Meditations, Book 6](https://classics.mit.edu/Antoninus/meditations.6.six.html)

What became clearer (section D):
The debate clarified that dissatisfaction may arise from a mismatch between personal values and external rewards. A key tension remains between accepting the absurdity of one's professional life versus shifting one's focus to internal virtue or social utility.

What the choice depends on (section E):
If your dissatisfaction is caused by the work itself lacking inherent meaning, then an existential reframing is most reasonable. If your dissatisfaction is caused by a lack of impact on others, then prioritizing utility becomes more reasonable. To learn which is the case, you could observe whether the void persists during your most productive work hours or only in reflection afterward.

Score A and B. Return the JSON object only.
