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
The user is looking for a short, literary, and hopeful novel that avoids didacticism or heavy-handed morals. They face a tension between their desire for emotional resonance and their aversion to overt 'lessons' in fiction.

Minds (section B):
- The Formalist: Structure, economy of language, and avoiding sentimentality. [Ernest Hemingway, The Old Man and the Sea, 1952]
- The Existentialist: The internal struggle to find meaning in an indifferent world. [Albert Camus, The Stranger, 1942]
- The Humanist: The quiet dignity of ordinary life and interpersonal connection. [E.M. Forster, A Room with a View, 1908]

Debate (section C), 9 turns:
1. The Formalist: If you want hope without a lesson, you need a story that focuses on endurance. Hemingway shows that a man can be destroyed but not defeated, and he does it through action, not preaching. You might consider reading The Old Man and the Sea to see how simple craft provides the meaning.
   [Ernest Hemingway, The Old Man and the Sea, pd=false] [Basis: Ernest Hemingway, The Old Man and the Sea]
2. The Existentialist: The Formalist says that simple craft provides the meaning, but that assumes the world has an inherent order to be captured. Hope might instead come from accepting the lack of order. You could look at Camus, who suggests we find joy in the struggle itself, perhaps in a short work like The Stranger, though it may leave you feeling challenged rather than comforted.
   [Albert Camus, The Stranger, pd=false] [Basis: Albert Camus, The Stranger]
3. The Humanist: The Existentialist claims that hope comes from accepting the lack of order, yet this ignores the grace found in human connection. Forster writes that one must only connect, which offers hope without needing a cold, mechanical lesson. You could try A Room with a View for a story that values the heart over rigid structures.
   [E.M. Forster, A Room with a View, pd=true] [Basis: E.M. Forster, A Room with a View, Chapter 22](https://www.gutenberg.org/files/2641/2641-h/2641-h.htm)
4. The Formalist: The Humanist says that one must only connect, but that risk is often more exhausting than the endurance I proposed. If you want a specific step, spend 30 minutes reading the first ten pages of The Old Man and the Sea to see if the sparse prose gives you the hope you want.
   [Ernest Hemingway, The Old Man and the Sea, pd=false] [Basis: Ernest Hemingway, The Old Man and the Sea]
5. The Humanist: The Formalist suggests spending 30 minutes reading the first ten pages, but starting with the struggle of an old man might feel too grim for someone seeking a hopeful tone. You might find that the warmth of a social setting, as seen in Forster, provides a more immediate sense of hope.
   [E.M. Forster, A Room with a View, pd=true] [Basis: E.M. Forster, A Room with a View, Chapter 1]
6. The Existentialist: The Humanist suggests that the warmth of a social setting provides hope, but perhaps you fear that such warmth is just an illusion hiding the absurdity of life. You might find more hope in the raw honesty of a character who refuses to lie about their situation, even if that honesty feels difficult.
   [Albert Camus, The Stranger, pd=false] [Basis: Albert Camus, The Stranger]
7. The Formalist: I drop the claim that simple craft provides the meaning, because the Humanist point about the necessity of connection reminds me that readers often seek a reflection of their own social world. I now hold that a story is best when it offers a precise image of existence that allows you to decide for yourself what is hopeful.
   [Ernest Hemingway, The Old Man and the Sea, pd=false] [Basis: Ernest Hemingway, The Old Man and the Sea]
8. The Humanist: The Existentialist worries that warmth is an illusion, but if you look at the way Forster portrays the beauty of Italy, you might see that aesthetic appreciation of the world is a form of hope that does not require a didactic lesson. It is a genuine, if fleeting, experience.
   [E.M. Forster, A Room with a View, pd=true] [Basis: E.M. Forster, A Room with a View, Chapter 3]
9. The Existentialist: We remain divided on whether hope is an internal act of endurance or an external act of connection. The final test is whether you feel more grounded when you face the world alone, like Hemingway's fisherman, or when you find yourself caught in the beauty and complication of other people, as in Forster.
   [Albert Camus, The Stranger, pd=false] [Basis: Albert Camus, The Stranger]

What became clearer (section D):
The debate shifted from recommending specific authors to identifying the source of hope: is it the strength of the solitary individual or the beauty of interpersonal connection? The dispute remains open, as it depends on whether the user finds solace in independence or in community.

What the choice depends on (section E):
- If you feel hopeful when you are capable and alone → The Formalist approach (Hemingway) is likely to resonate. 
- If you feel hopeful when you belong to a larger, beautiful world → The Humanist approach (Forster) is likely to resonate. 
- If you are unsure what provides you hope → Read the first chapter of each book to see which emotional tone—stoic endurance or social discovery—feels more authentic to your current state.

=== DEBATE B ===
Situation (section A):
The user is looking for a short, hopeful novel that avoids heavy-handed moral instruction. The central tension lies between the desire for an emotionally resonant experience and an aversion to didacticism, which might indicate a preference for ambiguity over certainty.

Minds (section B):
- The Formalist: The structural integrity of the narrative over the message. [E.M. Forster, Aspects of the Novel, 1927]
- The Reader of Intent: The collaborative gap between text and audience. [Wolfgang Iser, The Act of Reading, 1978]
- The Moral Skeptic: Avoiding prescriptive, self-centered ethics. [Iris Murdoch, The Sovereignty of Good, 1970]

Debate (section C), 9 turns:
1. The Formalist: Perhaps you might consider J.L. Carr’s A Month in the Country. It possesses a rhythm that creates a sense of completion without forcing a moral conclusion upon you, as the pattern of the story is an end in itself.
   [E.M. Forster, Aspects of the Novel, pd=true] [Basis: E.M. Forster, Aspects of the Novel, Chapter 7](https://www.gutenberg.org)
2. The Reader of Intent: The Formalist suggests that the structure alone provides hope, yet I believe it is the blank spaces in the prose that invite you to project your own meaning, which might be exactly how you avoid a didactic lesson.
   [Wolfgang Iser, The Act of Reading, pd=false] [Basis: Wolfgang Iser, The Act of Reading, Chapter 7](https://www.worldcat.org)
3. The Moral Skeptic: If you are looking for hope without moralizing, you might prefer a book that achieves an unselfing of the reader, where the reality of the characters matters more than any lesson the author could teach you.
   [Iris Murdoch, The Sovereignty of Good, pd=false] [Basis: Iris Murdoch, The Sovereignty of Good, Chapter 1](https://www.worldcat.org)
4. The Formalist: The Reader of Intent claims that the gaps in the text create hope, but I argue that hope arises when the plot finally achieves its secret shape, a delicate thing that you might find in the quiet brevity of Penelope Fitzgerald’s work.
   [E.M. Forster, Aspects of the Novel, pd=true] [Basis: E.M. Forster, Aspects of the Novel, Chapter 8](https://www.gutenberg.org)
5. The Reader of Intent: The Formalist claims the shape of the plot creates hope, yet this ignores the reader’s role. If you take 30 minutes to reread the first ten pages of A Month in the Country, you might find that it is your own engagement with the ambiguity that provides the feeling you seek.
   [Wolfgang Iser, The Act of Reading, pd=false] [Basis: Wolfgang Iser, The Act of Reading, Chapter 4](https://www.worldcat.org)
6. The Moral Skeptic: The Reader of Intent suggests the reader creates the meaning, yet I fear this might lead you back to your own ego rather than the truth of the world. A truly hopeful book should show you the world as it is, not as you wish to construct it.
   [Iris Murdoch, The Sovereignty of Good, pd=false] [Basis: Iris Murdoch, The Sovereignty of Good, Chapter 2](https://www.worldcat.org)
7. The Formalist: The Moral Skeptic fears self-centeredness, but maybe a well-made story functions like a mirror that shows you something outside yourself. I drop my claim that the structure is everything; perhaps the structure is merely the vehicle for that unselfing you value.
   [E.M. Forster, Aspects of the Novel, pd=true] [Basis: E.M. Forster, Aspects of the Novel, Chapter 9](https://www.gutenberg.org)
8. The Reader of Intent: If the structure serves the unselfing, then we are in agreement that the reader’s active participation is the key. You might want to seek a book that leaves its central resolution slightly unfinished so you are forced to look outward.
   [Wolfgang Iser, The Act of Reading, pd=false] [Basis: Wolfgang Iser, The Act of Reading, Chapter 8](https://www.worldcat.org)
9. The Moral Skeptic: We remain divided on whether you should look for the author’s intent or your own construction. What would decide this is whether you prefer a book that feels like a quiet, external truth or one that feels like a shared, internal puzzle.
   [Iris Murdoch, The Sovereignty of Good, pd=false] [Basis: Iris Murdoch, The Sovereignty of Good, Chapter 3](https://www.worldcat.org)

What became clearer (section D):
The debate highlights that hope in fiction can arise either from the aesthetic resolution of a narrative pattern or from the reader’s active participation in interpreting ambiguity. A lingering disagreement remains over whether the most meaningful books are those that reflect an objective external truth or those that facilitate a personal construction of meaning.

What the choice depends on (section E):
- If you prefer the comfort of a resolved, beautiful pattern, choose a classic formal work like A Month in the Country. - If you prefer to be an active collaborator who finds hope in uncertainty, choose a more contemporary, fragmented narrative. - If you are unsure which you prefer, read the opening pages of J.L. Carr’s A Month in the Country; if the clarity of the prose feels like a discovery of truth, follow the Formalist, if it feels like a puzzle to be solved, follow the Reader of Intent.

Score A and B. Return the JSON object only.
