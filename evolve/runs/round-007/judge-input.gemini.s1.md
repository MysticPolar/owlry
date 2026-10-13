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
The user experiences a recurring cycle where attempts to discuss their hurt feelings are interpreted by their partner as personal attacks, leading to defensive arguments. This leaves the user feeling unheard and the partner feeling criticized, creating a stalemate where the intent of the conversation is consistently overshadowed by the perceived threat.

Minds (section B):
- The Empathic Communicator: Connecting through needs rather than character judgments [Marshall Rosenberg, Nonviolent Communication, 1999]
- The Conflict Architect: Preventing flooding and defensive responses [John Gottman, The Seven Principles for Making Marriage Work, 1999]
- The Power Structuralist: How the structure of the conversation defines the roles of victim and offender [Michel Foucault, Discipline and Punish, 1975]

Debate (section C), 9 turns:
1. The Empathic Communicator: The user might be unintentionally wrapping their hurt in evaluations about their partner, which makes it sound like a judgment rather than an observation of their own needs.
   [Marshall Rosenberg, Nonviolent Communication, pd=false] [Basis: Marshall Rosenberg, Nonviolent Communication, Chapter 3](https://www.cnvc.org/)
2. The Conflict Architect: The Empathic Communicator assumes the wording is the main culprit, but perhaps the partner is already experiencing physiological flooding, where any mention of conflict is perceived as an assault regardless of the phrasing.
   [John Gottman, The Seven Principles for Making Marriage Work, pd=false] [Basis: John Gottman, The Seven Principles for Making Marriage Work, Chapter 6](https://www.gottman.com/)
3. The Power Structuralist: The Conflict Architect focuses on biology, but the real issue is that the act of bringing up hurt creates a disciplinary framework that mandates an admission of guilt from the other party.
   [Michel Foucault, Discipline and Punish, pd=false] [Basis: Michel Foucault, Discipline and Punish, Part 3](https://monoskop.org/images/4/43/Foucault_Michel_Discipline_and_Punish_1977.pdf)
4. The Empathic Communicator: The Power Structuralist argues the conversation is a trap, yet if the user separates their observation of an event from their own internal experience, they might avoid the binary struggle for power.
   [Marshall Rosenberg, Nonviolent Communication, pd=false] [Basis: Marshall Rosenberg, Nonviolent Communication, Chapter 4](https://www.cnvc.org/)
5. The Conflict Architect: The Empathic Communicator suggests a change in language, but even perfect language fails if the startup of the conversation is not softened, because the partner might be unable to receive input if they feel under siege.
   [John Gottman, The Seven Principles for Making Marriage Work, pd=false] [Basis: John Gottman, The Seven Principles for Making Marriage Work, Chapter 5](https://www.gottman.com/)
6. The Power Structuralist: The Conflict Architect highlights the startup, yet my previous point stands that labeling something as hurt inherently seeks to impose a standard of conduct, which the partner might be resisting as a way to maintain autonomy.
   [Michel Foucault, Discipline and Punish, pd=false] [Basis: Michel Foucault, Discipline and Punish, Part 4](https://monoskop.org/images/4/43/Foucault_Michel_Discipline_and_Punish_1977.pdf)
7. The Empathic Communicator: I will drop my earlier claim that the structure itself is irrelevant, as the Power Structuralist shows how hurt can be used as a moral stick; however, I still believe focusing on unmet needs remains the only path to genuine connection.
   [Marshall Rosenberg, Nonviolent Communication, pd=false] [Basis: Marshall Rosenberg, Nonviolent Communication, Chapter 5](https://www.cnvc.org/)
8. The Conflict Architect: The Empathic Communicator is right to shift, but if the user finds that they want to be understood while also wanting the partner to change, those two things might be creating the very tension that triggers the defensiveness.
   [John Gottman, The Seven Principles for Making Marriage Work, pd=false] [Basis: John Gottman, The Seven Principles for Making Marriage Work, Chapter 8](https://www.gottman.com/)
9. The Power Structuralist: The conflict remains open because the partner might be using their own interpretation of criticism as a defensive wall, which effectively invalidates the user's experience regardless of how that experience is phrased or how softly it is started.
   [Michel Foucault, Discipline and Punish, pd=false] [Basis: Michel Foucault, Discipline and Punish, Part 3](https://monoskop.org/images/4/43/Foucault_Michel_Discipline_and_Punish_1977.pdf)

What became clearer (section D):
The main insight is that the user's attempt to be heard might be inadvertently framed in a way that triggers a power struggle or a physiological defensive response. The debate remains split on whether this is a matter of language, biology, or the inherent power dynamics of the couple's relationship structure. A helpful reflection might be considering if the user's need for validation of their pain is being confused with a need for the partner to admit they were wrong.

What the choice depends on (section E):
If the partner's defensiveness is a physiological response to high-conflict patterns, then using a softened startup becomes the most reasonable approach to lower the temperature. If the partner's defensiveness is a reaction to the perceived moral authority the user claims when they are hurt, then reframing the conversation to focus on collaborative problem-solving rather than victimhood becomes more reasonable. If the decisive fact of whether the partner is willing to engage in a non-blaming framework remains unknown, the user might test this by shifting from sharing hurt to asking for help with a specific, neutral goal.

=== DEBATE B ===
Situation (section A):
You feel unheard when expressing pain because your partner interprets your words as personal attacks. This cycle leads to repetitive arguments, leaving you stuck between needing validation and the fear of triggering a defensive response. The central uncertainty is whether your communication style is the true trigger, or if your partner uses 'criticism' as a shield to avoid confronting their own actions.

Minds (section B):
- The Relational Ethicist: Moving from objectification to true presence [Martin Buber, I and Thou, 1923]
- The Stoic Analyst: Distinguishing external reactions from internal integrity [Epictetus, Enchiridion, 135]
- The Systems Observer: Identifying circular patterns of interaction [Gregory Bateson, Steps to an Ecology of Mind, 1972]

Debate (section C), 9 turns:
1. The Relational Ethicist: The problem might be that you are speaking to your partner as if they are an 'it'—a thing that caused you pain—rather than a 'thou' with whom you share a life. When you speak from that distance, you might be treating their response as data to be managed, which could feel like an indictment to them.
   [Martin Buber, I and Thou, pd=true] [Basis: Martin Buber, I and Thou, Part 1](https://en.wikipedia.org/wiki/I_and_Thou)
2. The Stoic Analyst: If you are focusing on their reaction, you are struggling with something outside your control. You might be suffering because you desire a specific validation they are not giving. Perhaps you could try to express your own hurt as an objective account of events, without attaching your peace of mind to their validation.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 1](https://en.wikipedia.org/wiki/Enchiridion_of_Epictetus)
3. The Systems Observer: The Stoic Analyst suggests you ignore the partner, but that misses the fact that you are stuck in a feedback loop. You define your pain as a request, they define it as criticism, and the system repeats. This pattern is not about either individual, but about the circuit you are both trapped in.
   [Gregory Bateson, Steps to an Ecology of Mind, pd=false] [Basis: Gregory Bateson, Steps to an Ecology of Mind, Pathologies of Epistemology](https://en.wikipedia.org/wiki/Steps_to_an_Ecology_of_Mind)
4. The Relational Ethicist: The Systems Observer ignores that I am arguing for intimacy, not detachment. To move forward, you might try, during a calm moment, to reach for a genuine dialogue where you acknowledge their difficulty in hearing you, instead of just the pain you felt. When you say you want them to stop, maybe you are actually longing for a shared vulnerability.
   [Martin Buber, I and Thou, pd=true] [Basis: Martin Buber, I and Thou, Part 2](https://en.wikipedia.org/wiki/I_and_Thou)
5. The Stoic Analyst: I concede that my previous point might have been too detached. If you seek to be understood, you should examine if you are presenting your pain as a command for them to change. If you might be demanding change, perhaps you are simply setting yourself up for the very frustration you wish to avoid.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 30](https://en.wikipedia.org/wiki/Enchiridion_of_Epictetus)
6. The Systems Observer: To break this, you might try a specific meta-communication step: spend 10 minutes observing the pattern together without discussing the content of the hurt. Just name the cycle. See if your partner can recognize the mechanism without feeling attacked, because they might be as exhausted by the routine as you are.
   [Gregory Bateson, Steps to an Ecology of Mind, pd=false] [Basis: Gregory Bateson, Steps to an Ecology of Mind, Theory of Play and Fantasy](https://en.wikipedia.org/wiki/Steps_to_an_Ecology_of_Mind)
7. The Relational Ethicist: The Systems Observer offers a good clinical path, but I fear it keeps you in the role of observers of a machine. You might try to replace the accusation of hurt with a statement of how you miss the closeness you used to have. Maybe you want safety and closeness, but you are choosing to prioritize the accuracy of your complaints.
   [Martin Buber, I and Thou, pd=true] [Basis: Martin Buber, I and Thou, Part 3](https://en.wikipedia.org/wiki/I_and_Thou)
8. The Stoic Analyst: If you follow the proposal of the Systems Observer and they still react with defensiveness, you will know that their reaction is independent of your method. That realization might finally allow you to stop trying to force them to hear you, which could ironically lead to the peace you want.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 13](https://en.wikipedia.org/wiki/Enchiridion_of_Epictetus)
9. The Systems Observer: The disagreement remains: is the issue your framing, or the rigidity of the loop itself? If the loop is the problem, no amount of careful phrasing will work until the meta-pattern changes. If the loop is not the problem, then your internal choices remain the only lever you have.
   [Gregory Bateson, Steps to an Ecology of Mind, pd=false] [Basis: Gregory Bateson, Steps to an Ecology of Mind, Toward a Theory of Schizophrenia](https://en.wikipedia.org/wiki/Steps_to_an_Ecology_of_Mind)

What became clearer (section D):
The debate highlights a tension between attempting to fix the partner's reaction (Systems Observer), changing your own presentation to be more vulnerable (Relational Ethicist), or accepting their reaction as something you cannot change (Stoic Analyst). It remains disputed whether the partner is trapped in a defensive pattern or simply unwilling to engage with the reality of your hurt.

What the choice depends on (section E):
If your partner is also distressed by the cycle, then meta-communicating about the pattern may work. If your partner uses the criticism label to intentionally deflect accountability, then no amount of rephrasing will resolve the issue. You can test this by changing your language once: if they remain defensive, the issue likely resides in their refusal to acknowledge the behavior, not in your style.

Score A and B. Return the JSON object only.
