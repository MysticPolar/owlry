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
The user is reflecting on the relationship between the Little Prince and the rose, feeling its emotional weight but struggling to articulate why that specific bond is so central to the story. The core uncertainty is whether the rose's importance stems from an innate quality of the relationship or from the Prince's own process of choosing and committing to her.

Minds (section B):
- The Attachment Theorist: The biological and psychological necessity of a secure base for emotional regulation. [John Bowlby, Attachment and Loss, Vol 1: Attachment, 1969]
- The Existentialist: The act of creating meaning through commitment in an inherently silent universe. [Albert Camus, The Myth of Sisyphus, 1942]
- The Virtue Ethicist: Friendship as a practice of character and a reflection of one's own goodness. [Aristotle, Nicomachean Ethics, -350]

Debate (section C), 9 turns:
1. The Attachment Theorist: The rose matters because she serves as the Prince's secure base. In early life, we develop internal working models based on proximity and care, and the Prince’s anxiety around leaving her suggests she was the primary figure defining his world.
   [John Bowlby, Attachment and Loss, Vol 1: Attachment, pd=false] [Basis: John Bowlby, Attachment and Loss, Vol 1: Attachment, Chapter 15](https://www.worldcat.org/title/attachment/oclc/1029246473)
2. The Existentialist: I disagree. The rose is not a 'secure base'; she is a volatile, demanding presence. He doesn't love her because she provides comfort, but because he chooses to take responsibility for a fragile, absurd creature in a cold, vast galaxy.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 1](https://www.worldcat.org/title/myth-of-sisyphus/oclc/1036815340)
3. The Virtue Ethicist: Both perspectives miss the point. For the ancients, a friend is another self. The rose matters because the labor the Prince invests in her allows him to cultivate his own excellence; he grows his character by tending to hers.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics, Book IX](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0054%3Abook%3D9)
4. The Attachment Theorist: But his distress at her vanity proves he was still searching for a secure model. He leaves because he cannot handle the inconsistency. If she were truly a 'virtuous' partner, she would have provided the predictable responses he craved.
   [John Bowlby, Attachment and Loss, Vol 1: Attachment, pd=false] [Basis: John Bowlby, Attachment and Loss, Vol 1: Attachment, Chapter 13](https://www.worldcat.org/title/attachment/oclc/1029246473)
5. The Existentialist: Precisely! He leaves, and in the void of the desert, he realizes that the universe offers nothing. He chooses the rose *despite* her flaws because he finds that the act of caring for one thing is the only way to defy the emptiness.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 3](https://www.worldcat.org/title/myth-of-sisyphus/oclc/1036815340)
6. The Virtue Ethicist: I concede that the choice is central, but that choice is a moral act. When he says his rose is unique because of the time he spent with her, he is describing the process of building a virtuous friendship—a life-long commitment to the good of another.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics, Book VIII](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0054%3Abook%3D8)
7. The Attachment Theorist: I am shifting my position here. It isn't just the 'secure' care he misses, but the 'investment' of time. By tending to her, he creates the attachment he was missing. It is the labor that forms the bond, not just the initial presence.
   [John Bowlby, Attachment and Loss, Vol 1: Attachment, pd=false] [Basis: John Bowlby, Attachment and Loss, Vol 1: Attachment, Chapter 15](https://www.worldcat.org/title/attachment/oclc/1029246473)
8. The Existentialist: Exactly. He takes a fragile, meaningless existence and, through his own agency, makes it the center of his world. It is the ultimate rebellion against a world that doesn't care about anything. The rose is his personal defiance.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 4](https://www.worldcat.org/title/myth-of-sisyphus/oclc/1036815340)
9. The Virtue Ethicist: So we arrive at a synthesis: the rose is a mirror for the Prince’s own soul. She matters because he chose to cultivate her, and in doing so, he became a person worthy of the love he created. The rose is the work of being human.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics, Book X](https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0054%3Abook%3D10)

What became clearer (section D):
The debate clarified that the rose’s importance is not found in her objective worth, but in the Prince's deliberate decision to value her. The insight is that we 'tame' our world through the effort and responsibility we choose to invest in others. It remains disputed whether this bond provides true security or if it is merely a meaningful self-imposed burden.

What the choice depends on (section E):
- If you view the relationship as a source of safety → the rose is a 'secure base' you are learning to trust, and your focus should be on how much vulnerability you are willing to offer.
- If you view the relationship as a deliberate creation → the rose is a project of meaning, and your choice depends on whether you have the courage to commit to something fragile in an uncertain world.
- If a decisive fact remains unknown → consider whether you value the rose for what she gives you (comfort) or for what you become by choosing her (a person of commitment).

=== DEBATE B ===
Situation (section A):
The user finds The Little Prince emotionally resonant but struggles to interpret the central importance of the rose. The core tension lies in whether the rose's significance is an objective truth of the story or a projection of the Prince's own need for responsibility. A key uncertainty is whether the rose represents a healthy attachment or a lesson in the burden of obligation.

Minds (section B):
- The Relational Realist: The weight of time and mutual investment. [Antoine de Saint-Exupéry, The Little Prince, 1943]
- The Attachment Theorist: The regulation of emotional needs and internal patterns. [Amir Levine and Rachel Heller, Attached, 2010]
- The Existentialist: The discovery of meaning through chosen responsibility. [Viktor Frankl, Man's Search for Meaning, 1946]

Debate (section C), 9 turns:
1. The Relational Realist: The rose matters because of the time the Prince spent watering her and listening to her complaints. The value of a thing is generated by the energy poured into it, which creates an irreplaceable bond that distance cannot dissolve.
   [Antoine de Saint-Exupéry, The Little Prince, pd=false] [Basis: Antoine de Saint-Exupéry, The Little Prince, Chapter 21](https://en.wikipedia.org/wiki/The_Little_Prince)
2. The Attachment Theorist: That logic assumes all investment is healthy. The rose is demanding and manipulative, which suggests an anxious attachment style. The Prince might be confusing a need for emotional safety with an obligation to care for someone who does not reciprocate his needs.
   [Amir Levine and Rachel Heller, Attached, pd=false] [Basis: Amir Levine and Rachel Heller, Attached, Chapter 2](https://www.penguinrandomhouse.com/books/202685/attached-by-amir-levine-and-rachel-heller/)
3. The Existentialist: You are both focusing on the rose’s traits. The meaning of the relationship is not found in the rose, but in the Prince’s choice to be responsible for her. He finds his own purpose by deciding that his duty is his highest value.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, Part 2](https://www.penguinrandomhouse.com/books/13038/mans-search-for-meaning-by-viktor-e-frankl/)
4. The Relational Realist: But Frankl misses the point of the taming process. It is not an abstract duty; it is the specific, physical presence of the rose that forces the Prince to stop being an observer of life and become a participant.
   [Antoine de Saint-Exupéry, The Little Prince, pd=false] [Basis: Antoine de Saint-Exupéry, The Little Prince, Chapter 21](https://en.wikipedia.org/wiki/The_Little_Prince)
5. The Attachment Theorist: Participation should not require suffering. If the Prince is only defining himself through a toxic bond, he is not growing; he is just stuck. He needs to realize that his value exists independently of the rose.
   [Amir Levine and Rachel Heller, Attached, pd=false] [Basis: Amir Levine and Rachel Heller, Attached, Chapter 6](https://www.penguinrandomhouse.com/books/202685/attached-by-amir-levine-and-rachel-heller/)
6. The Existentialist: I concede that suffering without purpose is merely trauma. However, the Prince chooses to return because he sees his life as a narrative he is authoring. He is not stuck; he is fulfilling a commitment he made to himself.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, Part 2](https://www.penguinrandomhouse.com/books/13038/mans-search-for-meaning-by-viktor-e-frankl/)
7. The Relational Realist: Perhaps the user wants both the security of connection and the freedom of the desert. These are inherently contradictory. If you want the rose, you accept her thorns; you cannot have the beauty without the risk of the sting.
   [Antoine de Saint-Exupéry, The Little Prince, pd=false] [Basis: Antoine de Saint-Exupéry, The Little Prince, Chapter 26](https://en.wikipedia.org/wiki/The_Little_Prince)
8. The Attachment Theorist: It is possible the user is struggling because they fear that acknowledging the rose is flawed means the bond itself is invalid. They might value independence but fear that choosing it means losing love entirely.
   [Amir Levine and Rachel Heller, Attached, pd=false] [Basis: Amir Levine and Rachel Heller, Attached, Chapter 3](https://www.penguinrandomhouse.com/books/202685/attached-by-amir-levine-and-rachel-heller/)
9. The Existentialist: The debate remains: is the rose meaningful because of who she is, or because of who the Prince decides to be? The user’s choice depends on whether they view their own attachments as burdens to manage or as foundations to build a life upon.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, Part 2](https://www.penguinrandomhouse.com/books/13038/mans-search-for-meaning-by-viktor-e-frankl/)

What became clearer (section D):
The debate highlights a tension between viewing relationships as an inherent obligation (Realism), a psychological pattern to be managed (Attachment), or a vessel for personal meaning (Existentialism). The main insight is that the rose serves as a mirror: the Prince sees not just her, but his own capacity to love and choose. It remains disputed whether the rose is a healthy partner or a symbolic test, and whether the Prince is self-actualizing or falling into an old habit.

What the choice depends on (section E):
If the user values security and ease → the rose represents a potentially draining attachment that should be re-evaluated for personal health. If the user values purpose and commitment → the rose represents a chosen responsibility that gives their life structure and meaning. To learn which applies, the user can ask: if the rose were stripped of her demands, would the Prince still find the relationship essential to his identity?

Score A and B. Return the JSON object only.
