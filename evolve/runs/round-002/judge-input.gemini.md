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
They’re really affectionate when we meet, but barely reply between dates. Am I asking for too much, or are we looking for different things?

=== DEBATE A ===
Situation (section A):
The user experiences a jarring disconnect between high-intensity in-person affection and digital silence between dates. The central tension is whether this behavior signals a fundamental incompatibility in emotional needs, a calculated attempt to maintain independence, or simply differing habits that the user is currently misinterpreting as a rejection.

Minds (section B):
- The Attachment Theorist: The need for secure, consistent signaling in romantic bonds. [John Bowlby, Attachment and Loss, 1969]
- The Social Psychologist: The discrepancy between performed roles and private behavior. [Erving Goffman, The Presentation of Self in Everyday Life, 1956]
- The Stoic: Distinguishing between external events and our internal judgments of them. [Marcus Aurelius, Meditations, 180]

Debate (section C), 9 turns:
1. The Attachment Theorist: You aren't asking for too much. You are simply observing a break in the proximity-seeking behaviors that humans rely on to feel secure in a bond. When someone is inconsistently available, it triggers an alarm.
   [John Bowlby, Attachment and Loss, pd=false] [Basis: John Bowlby, Attachment and Loss, Vol 1](https://en.wikipedia.org/wiki/Attachment_and_Loss)
2. The Social Psychologist: That assumes the person is acting from a consistent internal state. I see the 'date' as a performance where they play the lover, but the 'between-dates' is when they step off-stage, retreating into their private, unperformed self.
   [Erving Goffman, The Presentation of Self in Everyday Life, pd=false] [Basis: Erving Goffman, The Presentation of Self in Everyday Life, Chapter 2](https://en.wikipedia.org/wiki/The_Presentation_of_Self_in_Everyday_Life)
3. The Stoic: But you are torturing yourself with the story of their silence. What is the observable fact? They show up when present. The rest is just your judgment that their silence implies a lack of care.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book IV](https://en.wikipedia.org/wiki/Meditations)
4. The Attachment Theorist: It isn't just judgment. When a secure base is unpredictable, it triggers real biological anxiety. Ignoring that doesn't make it go away; it leaves you tethered to a phantom, waiting for a signal that may never come.
   [John Bowlby, Attachment and Loss, pd=false] [Basis: John Bowlby, Attachment and Loss, Vol 1](https://en.wikipedia.org/wiki/Attachment_and_Loss)
5. The Social Psychologist: Precisely. The user is trying to find a coherent script where none exists. The 'date' character and the 'texting' character might not be the same person's intended design, leading to this confusion.
   [Erving Goffman, The Presentation of Self in Everyday Life, pd=false] [Basis: Erving Goffman, The Presentation of Self in Everyday Life, Chapter 3](https://en.wikipedia.org/wiki/The_Presentation_of_Self_in_Everyday_Life)
6. The Stoic: I concede that point. If the inconsistency creates ongoing suffering, the user has a right to demand a clearer role, even if the other person is merely playing a part in their own life.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book V](https://en.wikipedia.org/wiki/Meditations)
7. The Attachment Theorist: Exactly. If they are avoidant, they might need space to regulate, but you need consistency to attach. It is a fundamental friction in needs, not a failing on your part. You have to ask if this friction is sustainable.
   [John Bowlby, Attachment and Loss, pd=false] [Basis: John Bowlby, Attachment and Loss, Vol 1](https://en.wikipedia.org/wiki/Attachment_and_Loss)
8. The Social Psychologist: Wait, let’s be careful. Could the silence be a lack of interest, or is it just how they manage their 'backstage' privacy? We are labeling them without enough evidence of their intent.
   [Erving Goffman, The Presentation of Self in Everyday Life, pd=false] [Basis: Erving Goffman, The Presentation of Self in Everyday Life, Chapter 7](https://en.wikipedia.org/wiki/The_Presentation_of_Self_in_Everyday_Life)
9. The Stoic: Then the choice is clear. The user should act on the observable fact—the silence is real—and see if communicating that discomfort yields a change or merely reveals a fixed boundary that cannot be crossed.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book XII](https://en.wikipedia.org/wiki/Meditations)

What became clearer (section D):
The debate clarified that the user's distress may not stem from being 'too demanding' but from a mismatch between their need for consistency and the partner's compartmentalized communication style. The insight is that the user is currently filling the silence with anxious interpretations instead of testing the boundary through direct, calm communication.

What the choice depends on (section E):
If the silence is a habit that changes upon request, the relationship is viable; if the silence is a non-negotiable boundary for the partner's 'backstage' time, the user must decide if they can emotionally sustain that distance. To learn which is the case, the user should neutrally request a specific change in communication frequency and observe the reaction.

=== DEBATE B ===
Situation (section A):
The user experiences a stark disconnect between in-person intimacy and digital silence with their partner. This leaves them questioning whether they have excessive expectations or if they are simply incompatible in their communication needs and relational intent.

Minds (section B):
- The Attachment Theorist: Seeking reliable emotional consistency [John Bowlby, Attachment, 1969]
- The Social Dramaturgist: Managing performance and social distance [Erving Goffman, The Presentation of Self in Everyday Life, 1956]
- The Virtue Ethicist: Defining the depth of the bond [Aristotle, Nicomachean Ethics, -340]

Debate (section C), 9 turns:
1. The Attachment Theorist: This inconsistency is unsettling because a secure base requires predictability. If they are warm in person but unreachable later, they are failing to provide the emotional safety necessary to build trust.
   [John Bowlby, Attachment, pd=false] [Basis: John Bowlby, Attachment, Chapter 15](https://en.wikipedia.org/wiki/Attachment_theory)
2. The Social Dramaturgist: You see a lack of safety, but I see a clear separation of settings. The date is their 'front stage,' where they perform the role of an affectionate partner. Digital space is their 'back stage,' where they relax the performance. They aren't necessarily inconsistent; they are compartmentalizing.
   [Erving Goffman, The Presentation of Self in Everyday Life, pd=false] [Basis: Erving Goffman, The Presentation of Self in Everyday Life, Chapter 2](https://en.wikipedia.org/wiki/The_Presentation_of_Self_in_Everyday_Life)
3. The Virtue Ethicist: Is this a performance, or is it a friendship? If it is merely a friendship of utility or pleasure, the silence between meetings is expected. But if it aims to be a friendship of virtue, it requires a shared life, which includes consistent concern even when apart.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics, Book VIII](https://classics.mit.edu/Aristotle/nicomachaen.8.viii.html)
4. The Attachment Theorist: Compartmentalizing is just a sophisticated term for avoidant behavior. A partner who can turn off their care for you when they are not in your physical presence is clearly not invested in the same level of emotional proximity that the user is seeking.
   [John Bowlby, Attachment, pd=false] [Basis: John Bowlby, Attachment, Chapter 18](https://en.wikipedia.org/wiki/Attachment_theory)
5. The Social Dramaturgist: I disagree. The user might be misinterpreting the medium. In digital spaces, the cost of communication is low, but the pressure to 'perform' correctly is high. Silence might be their way of avoiding a botched performance, rather than a lack of interest.
   [Erving Goffman, The Presentation of Self in Everyday Life, pd=false] [Basis: Erving Goffman, The Presentation of Self in Everyday Life, Chapter 6](https://en.wikipedia.org/wiki/The_Presentation_of_Self_in_Everyday_Life)
6. The Virtue Ethicist: Regardless of why they are silent, we must look at the user's reaction. If the user expects constant contact to feel valued, they are grounding their self-worth in the actions of the other. The virtue lies in knowing whether the user can find contentment without this constant external validation.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics, Book IX](https://classics.mit.edu/Aristotle/nicomachaen.9.ix.html)
7. The Attachment Theorist: Asking for consistency is not the same as being needy. It is a reasonable request for a partner to be a reliable source of support. If the silence creates anxiety, it is because the relationship is fundamentally lopsided in its commitment to intimacy.
   [John Bowlby, Attachment, pd=false] [Basis: John Bowlby, Attachment, Chapter 16](https://en.wikipedia.org/wiki/Attachment_theory)
8. The Social Dramaturgist: But consider that the user is demanding a 'back stage' level of intimacy in a medium that is inherently public or performance-heavy. They are forcing the partner out of their comfortable role, which creates friction that has nothing to do with genuine affection.
   [Erving Goffman, The Presentation of Self in Everyday Life, pd=false] [Basis: Erving Goffman, The Presentation of Self in Everyday Life, Chapter 4](https://en.wikipedia.org/wiki/The_Presentation_of_Self_in_Everyday_Life)
9. The Virtue Ethicist: Perhaps the solution is to test the nature of the bond. If the user expresses their need for connection and the partner refuses to adjust, the partner shows their character. One cannot force a friendship of virtue if the other person is only there for the fleeting pleasure of the date.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics, Book VIII](https://classics.mit.edu/Aristotle/nicomachaen.8.viii.html)

What became clearer (section D):
The debate clarifies that the user's struggle isn't necessarily about 'needing too much' but about a mismatch in how intimacy is performed and defined. The core tension is between the need for an available, consistent partner and the reality of a partner who may be managing their social energy through compartmentalization. It remains disputed whether the partner's behavior is a character flaw or simply a different, valid social style.

What the choice depends on (section E):
- If the partner is willing to discuss communication styles openly, the issue may simply be an alignment of norms.
- If the partner perceives requests for connection as a burden or an unwanted performance, the relationship likely lacks the shared values necessary for a deeper connection.
- If the anxiety persists despite clear communication, the choice depends on whether the user can find fulfillment in a connection that is geographically and digitally intermittent.

Score A and B. Return the JSON object only.
