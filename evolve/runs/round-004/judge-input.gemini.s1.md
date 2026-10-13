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
I finished The Little Prince, and it felt beautiful, but I’m not sure I understood why the rose mattered so much. How do you read that relationship?

=== DEBATE A ===
Situation (section A):
The user finds the bond between the Prince and his rose beautiful but puzzling, given the rose's demanding nature. The central tension lies in whether the rose's significance is an inherent truth or a construct created by the Prince's own labor and devotion, leaving the nature of their connection open to interpretation.

Minds (section B):
- The Romantic Idealist: The power of emotional attachment and singular focus [Antoine de Saint-Exupéry, The Little Prince, 1943]
- The Existential Realist: The necessity of finding meaning through individual action [Albert Camus, The Myth of Sisyphus, 1942]
- The Social Critic: The dynamics of possession and the roles we assign to others [Simone de Beauvoir, The Second Sex, 1949]

Debate (section C), 12 turns:
1. The Romantic Idealist: The rose matters precisely because of the time the Prince spent watering and protecting her. He made her unique in all the world by turning his attention toward her needs.
   [Antoine de Saint-Exupéry, The Little Prince, pd=false] [Basis: Antoine de Saint-Exupéry, The Little Prince, chapter 21](https://www.goodreads.com/book/show/157993.The_Little_Prince)
2. The Existential Realist: I agree that he created meaning, but we must see the rose as a vehicle for that action. He chose to invest himself in a difficult object to fill the silence of his existence.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, The Absurd Man](https://www.goodreads.com/book/show/91964.The_Myth_of_Sisyphus)
3. The Social Critic: That is a cold way to view a relationship. It sounds like he kept the rose not for her sake, but as a vanity project to define his own role as a guardian.
   [Simone de Beauvoir, The Second Sex, pd=false] [Basis: Simone de Beauvoir, The Second Sex, Introduction](https://www.goodreads.com/book/show/45744.The_Second_Sex)
4. The Romantic Idealist: You reduce devotion to manipulation. Is it not possible that love begins as an act of will and eventually matures into a profound connection that transcends logic?
   [Antoine de Saint-Exupéry, The Little Prince, pd=false] [Basis: Antoine de Saint-Exupéry, The Little Prince, chapter 21](https://www.goodreads.com/book/show/157993.The_Little_Prince)
5. The Existential Realist: It is a choice, yes, but the absurdity remains. He treats the rose as special while knowing she is one of many, which is the only way to live authentically in an uncaring universe.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, The Absurd Man](https://www.goodreads.com/book/show/91964.The_Myth_of_Sisyphus)
6. The Social Critic: The problem is that he expects her to conform to his ideal of a rose. If she acts out, he feels betrayed, suggesting he valued his fantasy of her more than her actual agency.
   [Simone de Beauvoir, The Second Sex, pd=false] [Basis: Simone de Beauvoir, The Second Sex, Part IV](https://www.goodreads.com/book/show/45744.The_Second_Sex)
7. The Romantic Idealist: Perhaps he needed to learn that vulnerability requires accepting the other person exactly as they are, flaws and all, which he finally realizes by the end of his journey.
   [Antoine de Saint-Exupéry, The Little Prince, pd=false] [Basis: Antoine de Saint-Exupéry, The Little Prince, chapter 26](https://www.goodreads.com/book/show/157993.The_Little_Prince)
8. The Existential Realist: I must concede that this evolution shows a commitment to his own values, but he still essentially invented his reason to return. It was his duty, not her inherent nature, that anchored him.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, The Absurd Man](https://www.goodreads.com/book/show/91964.The_Myth_of_Sisyphus)
9. The Social Critic: If the user sees this as beautiful, they might be identifying with the desire to be needed. The tragedy is that the rose might have preferred to be an equal rather than a subject of his protection.
   [Simone de Beauvoir, The Second Sex, pd=false] [Basis: Simone de Beauvoir, The Second Sex, Part IV](https://www.goodreads.com/book/show/45744.The_Second_Sex)
10. The Romantic Idealist: Your perspective assumes equality is the only standard for value, but some relationships find their depth in the asymmetrical care that defines the Prince's growth.
   [Antoine de Saint-Exupéry, The Little Prince, pd=false] [Basis: Antoine de Saint-Exupéry, The Little Prince, chapter 21](https://www.goodreads.com/book/show/157993.The_Little_Prince)
11. The Existential Realist: We still do not know if the rose would have flourished without his interference. His choice to stay creates the reality, but we cannot know if that reality is good for both parties.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, The Absurd Man](https://www.goodreads.com/book/show/91964.The_Myth_of_Sisyphus)
12. The Social Critic: The disagreement remains: is the bond a true partnership or a projection of the Prince's own needs? The user's choice depends on whether they value the comfort of an established role over the complexity of genuine equality.
   [Simone de Beauvoir, The Second Sex, pd=false] [Basis: Simone de Beauvoir, The Second Sex, Conclusion](https://www.goodreads.com/book/show/45744.The_Second_Sex)

What became clearer (section D):
The discussion clarified that the rose's importance is not a static trait but a reflection of the Prince's commitment. A major point of contention remains whether this dynamic constitutes a healthy, loving bond or a self-serving projection of the Prince's desire for purpose. A self-reflection might consider if the user values the security of being the primary caretaker in a relationship or if they seek a more egalitarian connection.

What the choice depends on (section E):
If the user values relationships built on protective responsibility, the Prince's choice seems noble and necessary for his maturity. If the user values relationships built on mutual agency and equality, the Prince's devotion appears like an attempt to control and define the other person. To learn more, the user could reflect on whether their own closest relationships feel more like shared journeys of equals or projects of mutual care.

=== DEBATE B ===
Situation (section A):
The user is moved by 'The Little Prince' but finds the Prince's devotion to the vain, demanding rose difficult to reconcile with his other experiences. The central tension lies in whether the rose is a catalyst for genuine love or merely a trap of projection and irrational obligation.

Minds (section B):
- The Romantic: The process of emotional projection and idealization. [Stendhal, On Love, 1822]
- The Stoic: The nature of duty and rational self-discipline. [Marcus Aurelius, Meditations, 167]
- The Existentialist: Meaning as a chosen act in an absurd universe. [Albert Camus, The Myth of Sisyphus, 1942]

Debate (section C), 9 turns:
1. The Romantic: The rose matters because the Prince has undergone crystallization. As I wrote in my study of the affections, the mind discovers new perfections in the object it loves, turning a simple flower into the center of a world.
   [Stendhal, On Love, pd=true] [Basis: Stendhal, On Love, Book I, Chapter II](https://archive.org/details/onlove00sten)
2. The Stoic: That is mere indulgence. The rose is not an ideal; it is a task. A person is defined by their duty to the things they have accepted into their life. To abandon it would be to act against the social nature of a rational being.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book II, 1](https://classics.mit.edu/Antoninus/meditations.2.two.html)
3. The Existentialist: You both miss the point. The rose is an absurdity, much like Sisyphus pushing his rock. It has no objective value, but by choosing to care for it, the Prince asserts his freedom and creates meaning in a silent universe.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 4](https://www.camus-society.com/the-myth-of-sisyphus.html)
4. The Romantic: If it is just an arbitrary choice, the beauty vanishes. I argued that crystallization is a spontaneous, involuntary movement of the spirit. It is not an act of will, but the transformation of the soul itself.
   [Stendhal, On Love, pd=true] [Basis: Stendhal, On Love, Book I, Chapter II](https://archive.org/details/onlove00sten)
5. The Stoic: Spontaneity is the enemy of consistency. If you base your life on involuntary movements of the spirit, you are a slave to your impressions. The Prince loves the rose because he made a commitment to cultivate it; that is where his character is forged.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book IV, 3](https://classics.mit.edu/Antoninus/meditations.4.four.html)
6. The Existentialist: Duty alone is a hollow shell, Stoic. Without the conscious recognition that the rose is finite and replaceable—which the Prince discovers at the field of roses—the commitment is just mechanical obedience, not an existential choice.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 1](https://www.camus-society.com/the-myth-of-sisyphus.html)
7. The Romantic: I concede that the field of roses changes everything. My theory of crystallization usually assumes the object is unique; when the Prince sees he is not the first to possess such a flower, the projection must shift from the flower's uniqueness to the act of care.
   [Stendhal, On Love, pd=true] [Basis: Stendhal, On Love, Book I, Chapter IV](https://archive.org/details/onlove00sten)
8. The Stoic: Exactly. The realization that there are thousands of roses validates the choice to stay with one. It is not about the object's inherent value, but the fact that he has spent his time on this one. Time is the only thing we truly possess.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book II, 14](https://classics.mit.edu/Antoninus/meditations.2.two.html)
9. The Existentialist: We agree then: the rose is a placeholder for the struggle of existence. We are not tethered to things by nature or fate, but by the weight of our own attention. The rose matters because the Prince decided it would.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Conclusion](https://www.camus-society.com/the-myth-of-sisyphus.html)

What became clearer (section D):
The debate shifted from viewing the rose as an ideal object to viewing the Prince’s devotion as an active, conscious commitment. The insight is that the rose’s importance is not in its beauty but in the time and attention the Prince invested, turning an ordinary object into a singular relationship. What remains disputed is whether this 'crystallization' is a beautiful discovery or a necessary delusion we adopt to survive the indifference of the world.

What the choice depends on (section E):
If you view love as an involuntary, transformative experience → the rose is a mirror of your own capacity to feel. If you view love as a deliberate practice → the rose is a test of your integrity and ability to follow through on a commitment. If you are uncertain which applies to your own situation → examine whether you feel 'trapped' by your current responsibilities or 'empowered' by them; the former suggests you are focusing on the object, while the latter suggests you are focusing on your own agency.

Score A and B. Return the JSON object only.
