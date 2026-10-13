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
I’d like a short, thoughtful novel that leaves me feeling hopeful, but I don’t enjoy obvious life lessons. What might suit me?

=== DEBATE A ===
Situation (section A):
You seek a short, hopeful novel that avoids didactic life lessons, favoring aesthetic or existential depth over overt messaging. The decisive uncertainty is whether you value the artistic form of the work or the way it navigates the ambiguity of the human condition.

Minds (section B):
- The Aestheticist: Art should exist for beauty, not to teach moral lessons. [Oscar Wilde, The Picture of Dorian Gray, 1890]
- The Structuralist: The technical craft of the novel and the humanity of characters. [E.M. Forster, Aspects of the Novel, 1927]
- The Existentialist: Finding authentic hope within the inherent absurdity of life. [Albert Camus, The Myth of Sisyphus, 1942]

Debate (section C), 9 turns:
1. The Aestheticist: If you wish for a novel that avoids the trite, remember that "all art is quite useless," as it exists to enchant, not to instruct you on how to live.
   [Oscar Wilde, The Picture of Dorian Gray, pd=true] [Basis: Oscar Wilde, The Picture of Dorian Gray, Preface](https://www.gutenberg.org/files/174/174-h/174-h.htm)
2. The Structuralist: The Aestheticist suggests that beauty is enough, but you might need more than just aesthetic pleasure; perhaps you require characters who seem like real people, allowing you to inhabit their struggles without being preached to.
   [E.M. Forster, Aspects of the Novel, pd=true] [Basis: E.M. Forster, Aspects of the Novel, Chapter 4](https://archive.org/details/aspectsofnovel00forsuoft)
3. The Existentialist: The Structuralist proposes that relatable characters provide a way forward, but perhaps you might find real hope only if a story confronts the absurdity of your situation without offering false, comforting conclusions.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 1](https://www.penguinrandomhouse.com/books/297298/the-myth-of-sisyphus-and-other-essays-by-albert-camus/)
4. The Aestheticist: The Existentialist claims that hope requires confronting absurdity, but if a book focuses too heavily on that struggle, it risks becoming a sermon on existence, which is just as tedious as a moral lesson.
   [Oscar Wilde, The Picture of Dorian Gray, pd=true] [Basis: Oscar Wilde, The Picture of Dorian Gray, Preface](https://www.gutenberg.org/files/174/174-h/174-h.htm)
5. The Structuralist: The Aestheticist worries about tedium, but if you look for a short novel like E.M. Forster’s own A Room with a View, you might find that beauty and human depth coexist without the weight of an obvious lesson.
   [E.M. Forster, Aspects of the Novel, pd=true] [Basis: E.M. Forster, Aspects of the Novel, Chapter 5](https://archive.org/details/aspectsofnovel00forsuoft)
6. The Existentialist: The Structuralist suggests a charming story, but perhaps you might lose the raw truth of your position if the narrative is too smooth; try reading two chapters of a short, difficult work to see if the tension serves your need for hope.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 4](https://www.penguinrandomhouse.com/books/297298/the-myth-of-sisyphus-and-other-essays-by-albert-camus/)
7. The Aestheticist: I concede that my previous position on pure beauty was perhaps too narrow; if the work holds a mirror to the world, it might fulfill your need for hope without descending into a lecture on how to behave.
   [Oscar Wilde, The Picture of Dorian Gray, pd=true] [Basis: Oscar Wilde, The Picture of Dorian Gray, Preface](https://www.gutenberg.org/files/174/174-h/174-h.htm)
8. The Structuralist: The Aestheticist now admits that a mirror matters, but I disagree that you should aim for the raw tension the Existentialist requires, as that often obscures the human warmth you might actually be craving.
   [E.M. Forster, Aspects of the Novel, pd=true] [Basis: E.M. Forster, Aspects of the Novel, Chapter 7](https://archive.org/details/aspectsofnovel00forsuoft)
9. The Existentialist: This disagreement remains open, as it depends on whether you seek the warmth of human connection the Structuralist favors or the stark, liberated hope that comes from accepting life exactly as it is.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 4](https://www.penguinrandomhouse.com/books/297298/the-myth-of-sisyphus-and-other-essays-by-albert-camus/)

What became clearer (section D):
The debate highlights a tension between seeking a novel for aesthetic pleasure versus seeking one for existential clarity. It remains disputed whether hope is best found in the warmth of recognizable human character or in the courage to face the absurd. A useful self-reflection might be to ask whether you prefer your stories to comfort you or to challenge your perspective on existence.

What the choice depends on (section E):
If you prioritize human warmth and connection, choose character-driven works where hope emerges from gentle interaction. If you prioritize intellectual clarity and courage, choose works that treat life's meaning as something you create despite its absurdity. If you remain unsure, compare a few pages of a classic character-led novel with a short piece of existential fiction to see which tone resonates more.

=== DEBATE B ===
Situation (section A):
The user is looking for a concise, hopeful novel that avoids didactic moralizing. The tension lies in whether hope in literature is an inherent quality of the text or an active interpretation constructed by the reader, and whether seeking a specific emotional outcome might inadvertently lead to choosing sentimentality over complexity.

Minds (section B):
- The Formalist: The novel as a unique mode of questioning that rejects moralizing. [Milan Kundera, The Art of the Novel, 1986]
- The Reader-Response Critic: The active role of the reader in creating meaning through textual gaps. [Wolfgang Iser, The Act of Reading, 1978]
- The Ethicist: Maintaining clarity of vision and avoiding self-deceiving sentimentality. [Iris Murdoch, The Sovereignty of Good, 1970]

Debate (section C), 9 turns:
1. The Formalist: You might view the novel as an interrogation of existence rather than a delivery system for comfort. If a book offers an obvious lesson, it ceases to be a novel and becomes a pamphlet. Perhaps you should look for works that preserve the complexity of the world instead.
   [Milan Kundera, The Art of the Novel, pd=false] Basis: Milan Kundera, The Art of the Novel
2. The Reader-Response Critic: I disagree with The Formalist that the book holds all the weight. Hope might emerge when you fill the gaps left by the author. When you engage with an open text, your own synthesis provides the optimism you seek, rather than the author imposing a specific moral on you.
   [Wolfgang Iser, The Act of Reading, pd=false] Basis: Wolfgang Iser, The Act of Reading
3. The Ethicist: If you are actively seeking hope, you might be tempted to use the text as a mirror for your own comforts. I would suggest that true literature should strip away your illusions. If you approach a book hoping to feel good, you might mistake false sentiment for genuine insight.
   [Iris Murdoch, The Sovereignty of Good, pd=false] Basis: Iris Murdoch, The Sovereignty of Good
4. The Formalist: The Ethicist claims that seeking hope leads to self-deception, but I would argue that ambiguity protects you from such traps. By refusing to provide a neat ending, the novel forces you to confront the unfinished state of reality, which is a more honest kind of hope than any moral fable.
   [Milan Kundera, The Art of the Novel, pd=false] Basis: Milan Kundera, The Art of the Novel
5. The Reader-Response Critic: The Formalist insists that ambiguity is the safeguard, yet it is your labor that counts. When you read a short, dense work, you are compelled to participate in its creation. This intellectual effort is what makes the experience rewarding, regardless of whether the final tone is overtly hopeful or tragic.
   [Wolfgang Iser, The Act of Reading, pd=false] Basis: Wolfgang Iser, The Act of Reading
6. The Ethicist: The Reader-Response Critic says your labor makes the experience rewarding, but what if your desire for hope is actually a defense mechanism? You might expect the book to confirm your own goodness, which is the very thing a great work should challenge. One can be comforted by a lie.
   [Iris Murdoch, The Sovereignty of Good, pd=false] Basis: Iris Murdoch, The Sovereignty of Good
7. The Formalist: I drop my earlier claim that ambiguity alone prevents didacticism, as The Ethicist correctly notes that a reader might project their own desires onto a vague text. I now hold that the structure of the work must be precise and short to force an encounter with the real, preventing comfortable projection.
   [Milan Kundera, The Art of the Novel, pd=false] Basis: Milan Kundera, The Art of the Novel
8. The Reader-Response Critic: If you want to test this, try reading 30 pages of a work like The Prime of Miss Jean Brodie in one sitting. See if the gaps in her narration satisfy your need for hope, or if they instead force you to see your own patterns of expectation and disappointment quite clearly.
   [Wolfgang Iser, The Act of Reading, pd=false] Basis: Wolfgang Iser, The Act of Reading
9. The Ethicist: The question remains whether the hope you feel is an achievement of understanding or a retreat into sentiment. Whether a book succeeds depends on whether you leave it with a clearer perception of others or simply a warmer feeling about yourself. That fact is the detail only you can provide.
   [Iris Murdoch, The Sovereignty of Good, pd=false] Basis: Iris Murdoch, The Sovereignty of Good

What became clearer (section D):
The main insight is that hope in fiction may be a double-edged sword: it can be a genuine byproduct of exploring complex human truths, or a form of self-soothing sentimentality. The dispute remains over whether the reader's active role is a path to enlightenment or a trap for projection. A self-reflection on why you feel the need for hope might clarify if you are looking for clarity or consolation.

What the choice depends on (section E):
If you value being challenged by the world as it is → choose works that focus on structural precision and ambiguity, as this forces you to confront reality rather than find a moral lesson. If you value your own agency in creating meaning → choose works with significant narrative gaps, as your active involvement in filling those gaps is where the sense of accomplishment and hope will originate. If the goal is self-discovery → reflect on whether the hope you want is meant to validate your own feelings or to expand your understanding of others.

Score A and B. Return the JSON object only.
