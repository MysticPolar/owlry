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
Every time I bring up something that hurt me, my partner says I’m criticizing them. How can we talk without having the same argument?

=== DEBATE A ===
Situation (section A):
The user experiences a recurring cycle where their attempts to communicate hurt are deflected by their partner's perception of criticism. The central tension lies in whether this is a linguistic failure or a deeper emotional reaction to perceived shame, making it difficult to reach a resolution without triggering defensiveness.

Minds (section B):
- The Systems Thinker: Patterns of interaction and communication styles [Virginia Satir, Peoplemaking, 1972]
- The Vulnerability Analyst: The role of shame and defense mechanisms [Brené Brown, Daring Greatly, 2012]
- The Rational Negotiator: Separating interpersonal dynamics from problem-solving [Roger Fisher and William Ury, Getting to Yes, 1981]

Debate (section C), 9 turns:
1. The Systems Thinker: The user might be trapped in a circular communication pattern where every attempt to address pain is met with defensive labeling. These cycles persist because both parties have learned to interpret the other's moves as fixed threats rather than invitations to clarify needs.
   [Virginia Satir, Peoplemaking, pd=false] [Basis: Virginia Satir, Peoplemaking, Chapter 4](https://www.goodreads.com/book/show/157297.Peoplemaking)
2. The Vulnerability Analyst: The partner perhaps fears that acknowledging the hurt would require them to sit with intense shame. By calling the user critical, they successfully shift the focus from their own potential failing to the user's alleged tone, protecting their fragile self-image.
   [Brené Brown, Daring Greatly, pd=false] [Basis: Brené Brown, Daring Greatly, Chapter 3](https://www.goodreads.com/book/show/13588356-daring-greatly)
3. The Rational Negotiator: The user and their partner are conflating the person with the problem. They need to stop focusing on who is being critical and instead identify the underlying interests, such as a need for safety or acknowledgement, that both parties currently lack.
   [Roger Fisher and William Ury, Getting to Yes, pd=false] [Basis: Roger Fisher and William Ury, Getting to Yes, Chapter 2](https://www.goodreads.com/book/show/313601.Getting_to_Yes)
4. The Systems Thinker: The Rational Negotiator assumes there is space for logic, but if the partner perceives a threat to their identity, they cannot hear logic. The user might need to change the meta-communication, talking about how they talk rather than about the hurt itself.
   [Virginia Satir, Peoplemaking, pd=false] [Basis: Virginia Satir, Peoplemaking, Chapter 7](https://www.goodreads.com/book/show/157297.Peoplemaking)
5. The Vulnerability Analyst: The Systems Thinker is right that meta-communication matters, but if the partner refuses to own their shame, any new method will eventually be labeled as more criticism. The user might feel they are walking on eggshells, which only reinforces the distance.
   [Brené Brown, Daring Greatly, pd=false] [Basis: Brené Brown, Daring Greatly, Chapter 5](https://www.goodreads.com/book/show/13588356-daring-greatly)
6. The Rational Negotiator: The Vulnerability Analyst assumes the partner is acting from a fixed state of shame, but I suggest that interest-based negotiation can work even with defensive partners. If the user presents their need as a mutual goal to improve the relationship, the criticism label loses its power.
   [Roger Fisher and William Ury, Getting to Yes, pd=false] [Basis: Roger Fisher and William Ury, Getting to Yes, Chapter 4](https://www.goodreads.com/book/show/313601.Getting_to_Yes)
7. The Systems Thinker: The Rational Negotiator suggests that focusing on mutual goals works, but if the user continues to use accusatory language, the partner will surely retreat. The user may need to stop using the word you entirely and describe their internal experience instead.
   [Virginia Satir, Peoplemaking, pd=false] [Basis: Virginia Satir, Peoplemaking, Chapter 10](https://www.goodreads.com/book/show/157297.Peoplemaking)
8. The Vulnerability Analyst: I concede that changing language helps, but I drop my earlier claim that only the partner's shame is the issue. The Systems Thinker is correct that the user’s own reaction to being ignored might be fueling the cycle, even if the intent is just to be heard.
   [Brené Brown, Daring Greatly, pd=false] [Basis: Brené Brown, Daring Greatly, Chapter 7](https://www.goodreads.com/book/show/13588356-daring-greatly)
9. The Rational Negotiator: The user wants both to be heard and to avoid conflict, which are often incompatible in a heat-of-the-moment argument. The choice depends on whether they are willing to pause the discussion until both are in a state where interest-based negotiation is even possible.
   [Roger Fisher and William Ury, Getting to Yes, pd=false] [Basis: Roger Fisher and William Ury, Getting to Yes, Chapter 5](https://www.goodreads.com/book/show/313601.Getting_to_Yes)

What became clearer (section D):
The debate clarified that the recurring conflict is not just about the specific hurt, but about the defensive armor both partners wear. The main insight is that the label of criticism serves as a shield for the partner, which can only be bypassed if the user changes the format of the conversation or waits until the emotional temperature drops. It remains disputed whether the partner's defense is an impenetrable trait or a reaction that can be de-escalated through specific, neutral negotiation techniques.

What the choice depends on (section E):
If the partner's response is driven primarily by deep-seated shame, then direct negotiation about the topic will likely fail, and the user must prioritize creating a safe space for vulnerability before addressing the hurt. If the conflict is simply a habit of poor communication, then switching to neutral, interest-based language will make progress easier. If it is unknown whether the partner is willing to change their defensive stance, the user might test this by pausing a difficult conversation and inviting a collaborative check-in at a later, neutral time.

=== DEBATE B ===
Situation (section A):
The user is trapped in a repetitive communication cycle where expressing hurt is consistently met with the partner's defensive perception of criticism. A central uncertainty is whether the partner is incapable of hearing vulnerability or if the communication structure itself inherently triggers a combative response.

Minds (section B):
- The Interpreter: The quality of human encounter and presence. [Martin Buber, I and Thou, 1923]
- The Negotiator: Separating the people from the problem. [William Ury, Getting to Yes, 1981]
- The Historian of Self: How discourse shapes our sense of identity. [Michel Foucault, The Care of the Self, 1984]

Debate (section C), 9 turns:
1. The Interpreter: You might be treating your partner as an object to be corrected, and they may be hearing you not as a person, but as a force trying to diminish them.
   [Martin Buber, I and Thou, pd=true] [Basis: Martin Buber, I and Thou, Part I](https://www.gutenberg.org)
2. The Negotiator: The Interpreter is right that the dynamic is stuck, but the issue is a failure to separate the person from the problem, as your partner clearly confuses your experience with an attack.
   [William Ury, Getting to Yes, pd=false] [Basis: William Ury, Getting to Yes, Chapter 2](https://www.williamury.com)
3. The Historian of Self: Perhaps your partner feels that their internal sovereignty is under threat, and your feedback might be perceived as an attempt to force them into a narrative they have not chosen for themselves.
   [Michel Foucault, The Care of the Self, pd=false] [Basis: Michel Foucault, The Care of the Self, Part I](https://www.foucault.info)
4. The Interpreter: Maybe you could try to leave behind the goal of resolution and simply dwell in the moment of hurt with them, creating a true I-Thou meeting where neither party seeks to win.
   [Martin Buber, I and Thou, pd=true] [Basis: Martin Buber, I and Thou, Part I](https://www.gutenberg.org)
5. The Negotiator: I disagree with The Interpreter about abandoning goals, as you need to reframe the conversation around shared interests rather than competing positions, which creates a joint project instead of a battle.
   [William Ury, Getting to Yes, pd=false] [Basis: William Ury, Getting to Yes, Chapter 3](https://www.williamury.com)
6. The Historian of Self: I change my position: you might need to recognize that your language is a site of power, and your desire for understanding could be read as a demand for their submission.
   [Michel Foucault, The Care of the Self, pd=false] [Basis: Michel Foucault, The Care of the Self, Part II](https://www.foucault.info)
7. The Interpreter: If you acknowledge that your need for validation might be clouding your capacity to listen, you could ask them what happens to them internally when you start these difficult conversations.
   [Martin Buber, I and Thou, pd=true] [Basis: Martin Buber, I and Thou, Part I](https://www.gutenberg.org)
8. The Negotiator: Take this one specific step: for 10 minutes, try to describe your hurt without naming any action they took, focusing solely on your internal state to see if the defensive reaction vanishes.
   [William Ury, Getting to Yes, pd=false] [Basis: William Ury, Getting to Yes, Chapter 4](https://www.williamury.com)
9. The Historian of Self: If the defensive reaction persists despite changing your phrasing, it suggests that the struggle is not about your specific words, but a deep-seated resistance to being defined by another.
   [Michel Foucault, The Care of the Self, pd=false] [Basis: Michel Foucault, The Care of the Self, Part III](https://www.foucault.info)

What became clearer (section D):
The debate highlights a tension between seeking emotional validation and the partner's perceived need for autonomy. While the Negotiator suggests a tactical shift in language, the Interpreter and Historian point toward deeper existential patterns that may be resistant to simple phrasing changes. The fundamental disagreement remains whether the partner is reacting to the specific content of the complaints or to the very act of being addressed.

What the choice depends on (section E):
If the partner's defensive reaction is based on a literal interpretation of your words, using neutral, interest-based language may resolve the conflict. If the reaction is a response to the inherent power dynamic of being 'called out,' no change in wording will suffice until the underlying power struggle is addressed. To learn which is true, try the 10-minute exercise of non-accusatory expression; if they remain defensive, the issue is likely systemic, not linguistic.

Score A and B. Return the JSON object only.
