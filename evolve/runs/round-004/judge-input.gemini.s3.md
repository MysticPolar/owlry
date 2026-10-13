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
The user is reflecting on the emotional resonance of the relationship between the Little Prince and his rose. The central tension lies in whether the rose's importance stems from its inherent qualities or from the investment of time and responsibility, a debate that touches on the nature of attachment versus ego.

Minds (section B):
- The Existentialist: The role of consciousness and project in defining meaning. [Jean-Paul Sartre, Being and Nothingness, 1943]
- The Relationship Critic: The distinction between having and being in loving. [Erich Fromm, The Art of Loving, 1956]
- The Classicist: The ascent from physical beauty to ideal truth. [Plato, Symposium, -385]

Debate (section C), 9 turns:
1. The Relationship Critic: The rose matters not because of her thorns or vanity, but because the prince cares for her. Love is an action, a power one exercises, not a passive object one possesses. He makes her unique by the time he devotes to her.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Erich Fromm, The Art of Loving, chapter 2](https://www.marxists.org/archive/fromm/works/1956/art/ch02.htm)
2. The Existentialist: I would argue that the rose is a project. By choosing to water and protect her, the prince creates his own essence through his actions. He is not discovering a hidden value; he is literally inventing the importance of the rose through his commitment.
   [Jean-Paul Sartre, Being and Nothingness, pd=false] [Basis: Jean-Paul Sartre, Being and Nothingness, Part 4, Chapter 1](https://archive.org/details/beingnothingness00sart_0/page/439)
3. The Classicist: One might say that the prince begins with a love for a single, transient object, yet he is actually witnessing a shadow of something greater. As it is written, he who has been instructed thus far in the things of love, will perceive the beautiful object as but a step toward the absolute.
   [Plato, Symposium, pd=true] [Basis: Plato, Symposium, 211b](http://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0174%3Atext%3DSymp.%3Asection%3D211b)
4. The Relationship Critic: The Classicist suggests a hierarchy that ignores the immediate vulnerability of the rose. The prince is not climbing a ladder to the absolute; he is grappling with the reality of an imperfect, demanding companion. The beauty is in the care, not the transcendence.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Erich Fromm, The Art of Loving, chapter 4](https://www.marxists.org/archive/fromm/works/1956/art/ch04.htm)
5. The Existentialist: Exactly. The Classicist attempts to escape the anguish of choice by appealing to an absolute. But the prince knows that if he abandons the rose, she dies. That responsibility is absolute, and it belongs to him alone, independent of any ideal form.
   [Jean-Paul Sartre, Being and Nothingness, pd=false] [Basis: Jean-Paul Sartre, Being and Nothingness, Part 4, Chapter 1](https://archive.org/details/beingnothingness00sart_0/page/479)
6. The Classicist: You mistake the path for the destination. The devotion to the rose is a necessary discipline. Without that initial, singular attachment, the soul remains chaotic. The prince learns through her how to value the essence of beauty itself.
   [Plato, Symposium, pd=true] [Basis: Plato, Symposium, 210a](http://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0174%3Atext%3DSymp.%3Asection%3D210a)
7. The Relationship Critic: I concede that the prince learns through the rose, but the lesson is about the ability to love, not the ability to see some higher beauty. We often mistake love for having, but the rose proves that love is a mode of being.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Erich Fromm, The Art of Loving, chapter 2](https://www.marxists.org/archive/fromm/works/1956/art/ch02.htm)
8. The Existentialist: I must pivot; perhaps the rose is not just his project, but a mirror of his own freedom. By caring for her, he realizes that he is not a fixed thing, but a series of choices. He realizes he can choose to stay or leave, and his choice creates the world he inhabits.
   [Jean-Paul Sartre, Being and Nothingness, pd=false] [Basis: Jean-Paul Sartre, Being and Nothingness, Part 3, Chapter 1](https://archive.org/details/beingnothingness00sart_0/page/233)
9. The Classicist: And there lies the tension. If his choice creates the meaning, is the rose then merely a tool for his self-actualization? Or is she a window into a truth that exists even when he is not looking?
   [Plato, Symposium, pd=true] [Basis: Plato, Symposium, 212a](http://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0174%3Atext%3DSymp.%3Asection%3D212a)

What became clearer (section D):
The debate highlights a deep divide: is the rose important because of the subjective meaning the prince creates through his labor, or because of a shared reality he learns to perceive? The main insight is that the rose serves as a catalyst for growth, though it remains disputed whether that growth is toward an objective ideal or simply the expansion of his own capacity to act.

What the choice depends on (section E):
If you view love as a creative act of the will, the rose's importance is entirely your own responsibility to define. If you view love as a bridge to something larger, the rose is an essential practice in learning to value truth beyond yourself. To learn which view resonates, observe if you feel more empowered by the commitments you have made or more humbled by the beauty you have encountered.

=== DEBATE B ===
Situation (section A):
The user is moved by the relationship between the Little Prince and his rose but struggles to reconcile the rose's demanding, vain nature with the Prince's total devotion to her. This highlights a central tension: whether love is a reflection of our own needs or a profound, intentional choice to commit to something imperfect.

Minds (section B):
- The Ego Critic: The psychological roots of attachment and self-projection. [Sigmund Freud, On Narcissism, 1914]
- The Commitment Theorist: The active, skill-based nature of loving. [Erich Fromm, The Art of Loving, 1956]
- The Duty Moralist: The consistency of will and moral obligation. [Immanuel Kant, Groundwork of the Metaphysics of Morals, 1785]

Debate (section C), 9 turns:
1. The Ego Critic: The rose is merely an extension of the Prince's own ego. He protects her because he finds himself mirrored in her fragility and vanity, essentially projecting his own desire for uniqueness onto an object that he can then claim to nurture.
   [Sigmund Freud, On Narcissism, pd=true] [Basis: Sigmund Freud, On Narcissism, Section 2](https://www.marxists.org/reference/subject/philosophy/works/at/freud.htm)
2. The Commitment Theorist: That is too cynical. Love is not a passive reception of a mirror image; it is an active power. The Prince doesn't love the rose because she is perfect; he loves her because he invested his time and effort into her. Loving is a skill, and she is his practice.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Erich Fromm, The Art of Loving, Chapter 2](https://www.worldcat.org/title/art-of-loving/oclc/1036854181)
3. The Duty Moralist: I agree with the focus on activity. If the Prince's attachment were merely a reflection of his own feelings, it would be capricious. His commitment is significant because he treats the rose as an end in herself, creating a duty that transcends his shifting moods.
   [Immanuel Kant, Groundwork of the Metaphysics of Morals, pd=true] [Basis: Immanuel Kant, Groundwork of the Metaphysics of Morals, Section 2](https://www.gutenberg.org/ebooks/5682)
4. The Ego Critic: But look at the cost of that 'duty.' It leads to a neurosis of guilt. When the Prince leaves, he is haunted. Is that love, or just the ego's inability to let go of an object it has claimed as part of its own territory?
   [Sigmund Freud, On Narcissism, pd=true] [Basis: Sigmund Freud, On Narcissism, Section 3](https://www.marxists.org/reference/subject/philosophy/works/at/freud.htm)
5. The Commitment Theorist: Guilt is often the byproduct of realizing you could have loved better. The Prince didn't know how to understand her vanity, so he fled. He realized later that the time he spent made her unique, not that she was uniquely better than other roses.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Erich Fromm, The Art of Loving, Chapter 4](https://www.worldcat.org/title/art-of-loving/oclc/1036854181)
6. The Duty Moralist: Fromm, you suggest the value is in the 'time spent,' which aligns with my view that we must act as if our choices are universal laws. The Prince chose to be responsible for his rose, a choice he could not abandon without violating his own integrity.
   [Immanuel Kant, Groundwork of the Metaphysics of Morals, pd=true] [Basis: Immanuel Kant, Groundwork of the Metaphysics of Morals, Section 2](https://www.gutenberg.org/ebooks/5682)
7. The Ego Critic: I will concede this: the ego requires a 'tamed' object to feel stable. Perhaps the rose matters because she provides the boundaries the Prince needs to define himself. My initial objection missed that even a narcissistic attachment can become a necessary anchor for the psyche.
   [Sigmund Freud, On Narcissism, pd=true] [Basis: Sigmund Freud, On Narcissism, Section 3](https://www.marxists.org/reference/subject/philosophy/works/at/freud.htm)
8. The Commitment Theorist: Exactly. The beauty isn't in the rose, but in the decision to care. If he hadn't left, he would have remained a boy trapped in a narrow world. The journey allowed him to see that 'taming' is a mutual process of creating meaning where there was none.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Erich Fromm, The Art of Loving, Chapter 2](https://www.worldcat.org/title/art-of-loving/oclc/1036854181)
9. The Duty Moralist: Then the matter is settled: the rose is the embodiment of a vow. We are defined by what we choose to be responsible for, regardless of the object's original merits. We do not find love; we forge it through consistent, willed action.
   [Immanuel Kant, Groundwork of the Metaphysics of Morals, pd=true] [Basis: Immanuel Kant, Groundwork of the Metaphysics of Morals, Section 1](https://www.gutenberg.org/ebooks/5682)

What became clearer (section D):
The debate shifted from viewing the rose as a mere object of vanity to recognizing her as a focal point for the Prince's development. We clarified that the rose matters not because of her intrinsic perfection, but because the Prince chose to accept responsibility for her. What remains disputed is whether this devotion is a healthy maturation of the self or a necessary, perhaps limiting, anchor for an ego seeking stability.

What the choice depends on (section E):
The interpretation of the rose depends on your definition of love: If you view love as a feeling of fulfillment, the rose is a frustrating object that requires too much work. If you view love as an active, willed commitment, the rose is the essential project that gives the Prince's life meaning and moral weight. To learn which view serves you, consider whether you are currently more interested in finding an object that meets your needs or building a relationship that requires your active cultivation.

Score A and B. Return the JSON object only.
