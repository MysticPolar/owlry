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
My shifts change every week, and I keep giving up on exercise. How can I build a routine that doesn’t depend on having the same schedule?

=== DEBATE A ===
Situation (section A):
The user struggles to maintain an exercise routine due to a fluctuating weekly work schedule, viewing their unpredictability as a barrier to consistency. The core tension is between the desire for a rigid, reliable system and the reality of a life that lacks a fixed temporal anchor.

Minds (section B):
- The Habitualist: Systems and identity-based habits [James Clear, Atomic Habits, 2018]
- The Existentialist: Finding meaning in the struggle [Albert Camus, The Myth of Sisyphus, 1942]
- The Minimalist: Reducing friction to ensure action [Leo Babauta, The Power of Less, 2008]

Debate (section C), 9 turns:
1. The Habitualist: You are failing because you equate a routine with a specific time of day. Instead of scheduling exercise, you need to anchor your habit to a behavior that happens regardless of your shift, such as walking immediately after you hang up your uniform.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 5](https://jamesclear.com/atomic-habits)
2. The Existentialist: The schedule is not the problem; the demand for predictability is. You view your shifts as an obstacle to a life you should be leading, but perhaps the act of moving your body is just a rebellion against the absurdity of your shifting work hours.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 4](https://www.marxists.org/reference/subject/philosophy/works/fr/camus.htm)
3. The Minimalist: You are both overcomplicating it. The user likely wants to move, but the mental load of planning around a changing week kills the motivation. Strip the routine down to something so small it is impossible to skip, even on a long shift.
   [Leo Babauta, The Power of Less, pd=false] [Basis: Leo Babauta, The Power of Less, Part 1](https://zenhabits.net/books/)
4. The Habitualist: I agree with simplifying, but it requires a system. If you identify as someone who never misses a workout, you define the workout by its completion, not its timing. Habit stacking ensures that the trigger is internal to your day, not external to your shift.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 11](https://jamesclear.com/atomic-habits)
5. The Existentialist: But that identity is fragile. What if the shift makes the workout feel meaningless? You might be using the routine to seek order in a chaotic life, and when the chaos wins, you feel defeated. Accept that the struggle itself is the point.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 5](https://www.marxists.org/reference/subject/philosophy/works/fr/camus.htm)
6. The Minimalist: If you view it as a struggle, you will quit. Make it effortless. If you have only ten minutes, do ten minutes. By focusing on the essential, you remove the excuse that your shifting schedule prevented a full session.
   [Leo Babauta, The Power of Less, pd=false] [Basis: Leo Babauta, The Power of Less, Part 2](https://zenhabits.net/books/)
7. The Habitualist: The user may fear that doing less is a sign of giving up. Yet, the habit is not about the intensity of the workout but the consistency of the presence. You can scale the intensity to your energy levels while keeping the system intact.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 15](https://jamesclear.com/atomic-habits)
8. The Existentialist: Perhaps they fear that if they do not succeed, their work controls them. I see a desire for control over their time. But you must embrace the uncertainty; a routine that is too rigid will break under the pressure of a changing, shifting reality.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 3](https://www.marxists.org/reference/subject/philosophy/works/fr/camus.htm)
9. The Minimalist: This disagreement boils down to whether you prioritize the identity of the athlete or the reality of the worker. I argue that if you focus on the smallest possible action that you can perform regardless of your shift, you win, because you are no longer fighting your own life.
   [Leo Babauta, The Power of Less, pd=false] [Basis: Leo Babauta, The Power of Less, Part 3](https://zenhabits.net/books/)

What became clearer (section D):
The main insight is that the user's struggle stems from an attempt to impose a fixed structure on a fluid life, leading to a binary experience of success or failure. It remains disputed whether the user should define themselves by their habits (The Habitualist) or by their acceptance of the chaotic reality (The Existentialist). A helpful self-reflection would be to ask if the goal is actual fitness or the sense of control that a fixed schedule provides.

What the choice depends on (section E):
If you value identity and long-term trajectory more than daily perfection → adopt the Habitualist approach of anchoring actions to existing cues, as this builds resilience. If you find the pressure of maintaining a system causes more anxiety than the exercise itself → adopt the Minimalist approach of radical simplicity, focusing on the smallest possible action. If the uncertainty of your schedule feels like a personal failure → investigate whether you are seeking a routine to prove you are in control of your life, which may suggest that reframing the struggle as a choice, rather than a chore, is the most meaningful path forward.

=== DEBATE B ===
Situation (section A):
The user struggles to maintain an exercise routine due to a fluctuating work schedule. The central tension is between the desire for consistency and the reality of a life that lacks it, leaving the user feeling like they need a rigid plan where none can exist.

Minds (section B):
- The Habit Architect: Behavioral consistency through small cues. [James Clear, Atomic Habits, 2018]
- The Existentialist: Personal freedom and authentic choice. [Jean-Paul Sartre, Existentialism Is a Humanism, 1946]
- The Stoic Practitioner: Focusing only on what is controllable. [Epictetus, Enchiridion, 125]

Debate (section C), 9 turns:
1. The Habit Architect: Consistency fails here because you are trying to attach exercise to a clock. Instead, anchor your workouts to specific events like waking up or finishing a shift, regardless of the time, to build a reliable habit loop.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 5]
2. The Existentialist: The user says they want a routine, but perhaps they are using their changing schedule as a project to define themselves as someone who cannot commit. They must realize that their freedom allows them to choose their identity anew every single day.
   [Jean-Paul Sartre, Existentialism Is a Humanism, pd=false] [Basis: Jean-Paul Sartre, Existentialism Is a Humanism, Section 1]
3. The Stoic Practitioner: "Some things are in our control and others not." Your schedule is the latter; your effort is the former. Do not tie your worth to a perfect record; tie it to the act of exercising whenever the opportunity arrives.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 1](http://classics.mit.edu/Epictetus/epicench.html)
4. The Habit Architect: I agree with the Stoic, but the difficulty is implementation. If you do not have an environment that triggers the behavior, you will always default to rest. You need to prepare your gym gear before your shift even starts.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 6]
5. The Existentialist: Preparing gear is a fine tactic, but it ignores the anxiety of choice. The user could say they need a week to decide how to be an athlete, but they are already choosing by not exercising. The goal is to act in a way that creates the athlete.
   [Jean-Paul Sartre, Existentialism Is a Humanism, pd=false] [Basis: Jean-Paul Sartre, Existentialism Is a Humanism, Section 2]
6. The Stoic Practitioner: The Architect assumes you want a system; the Existentialist assumes you want an identity. But if you simply want health, why does it matter if you exercise at 5 AM or 5 PM? Stop judging the irregularity as a failure.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 5](http://classics.mit.edu/Epictetus/epicench.html)
7. The Habit Architect: It matters because without a system, the friction of decision-making drains your willpower. You are trying to use your limited energy to decide when to work out, rather than making the when automatic.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 8]
8. The Existentialist: But what if the user wants both the security of a routine and the spontaneity of their current job? They cannot have both fully. A choice for a rigid schedule is a choice to limit their flexibility, which might actually be a source of their unhappiness.
   [Jean-Paul Sartre, Existentialism Is a Humanism, pd=false] [Basis: Jean-Paul Sartre, Existentialism Is a Humanism, Section 3]
9. The Stoic Practitioner: What is lost if you abandon the idea of a weekly schedule? You lose the comfort of knowing what happens when. If that loss is the primary fear, the routine is just a security blanket against the uncertainty of life.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 12](http://classics.mit.edu/Epictetus/epicench.html)

What became clearer (section D):
The debate shifted from finding a 'perfect' schedule to recognizing that the user’s discomfort stems from a conflict between wanting predictability and living in flux. We remain divided on whether a system or a change in perspective is the priority, though it appears that letting go of the ideal of a fixed weekly routine is necessary for progress.

What the choice depends on (section E):
If the primary barrier is decision fatigue, build a habit trigger tied to an event rather than a time. If the barrier is a fear of losing control, reframe the situation as choosing your identity daily regardless of the hour. To determine which applies, track whether you actually lack the time to exercise or if you lack the motivation when you are not on a rigid schedule.

Score A and B. Return the JSON object only.
