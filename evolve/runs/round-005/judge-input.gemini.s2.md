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
The user struggles to maintain an exercise routine because their work shifts change weekly, preventing a static schedule. They feel they keep failing at consistency and are seeking a way to build a habit that is robust against a fluctuating calendar. The central tension is between the desire for rigid discipline and the reality of a chaotic environment.

Minds (section B):
- The Habitualist: Building automaticity through cues and triggers. [James Clear, Atomic Habits, 2018]
- The Stoic Practitioner: Focusing on internal control regardless of external circumstances. [Epictetus, Enchiridion, 135]
- The Systems Thinker: Designing processes that survive variability. [Donella Meadows, Thinking in Systems: A Primer, 2008]

Debate (section C), 9 turns:
1. The Habitualist: The user assumes they need a fixed time to exercise, but they should instead build habits around identity-based triggers. If you tie exercise to a specific state, like finishing a shift rather than a clock time, you anchor the habit to the event itself.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 5](https://jamesclear.com/atomic-habits)
2. The Stoic Practitioner: They could say they need a stable environment to succeed, but that is a mistake. Some things are under our control, and some are not. Focusing on the shift schedule, which is external, leads to frustration. Focus only on the intention to move.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 1](http://classics.mit.edu/Epictetus/enchRaid.html)
3. The Systems Thinker: You are both ignoring the feedback loops. A system that breaks with variability is not resilient. The user should define their exercise goal by the total volume of movement over the week rather than the daily performance, allowing the system to absorb shift-induced delays.
   [Donella Meadows, Thinking in Systems: A Primer, pd=false] [Basis: Donella Meadows, Thinking in Systems: A Primer, Chapter 3](https://donellameadows.org/books/thinking-in-systems/)
4. The Habitualist: Meadows is right about the feedback loop, but habit formation requires small, immediate wins. If the user shifts to weekly goals, they lose the dopamine hit of the daily check-in. Perhaps they could use a tiered system: a minimal movement goal for hard shifts.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 15](https://jamesclear.com/atomic-habits)
5. The Stoic Practitioner: Even a tiered system relies on the body cooperating. Epictetus would remind us that the body is external; it can fail or be tired. True success is the judgment to act according to one's values, even when the workout is shortened or abandoned for a day.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 9](http://classics.mit.edu/Epictetus/enchRaid.html)
6. The Systems Thinker: I must challenge the Stoic. Values do not move muscles. If the system for exercise relies on willpower, it will fail when the system is under stress. We need to build in a buffer, a delay mechanism that stores energy, like setting out gear before a shift starts.
   [Donella Meadows, Thinking in Systems: A Primer, pd=false] [Basis: Donella Meadows, Thinking in Systems: A Primer, Chapter 4](https://donellameadows.org/books/thinking-in-systems/)
7. The Habitualist: That buffer is a environment design choice. It is exactly what I mean by reducing friction. The user might feel they have no time, but they have habits of avoidance. They need to make the exercise choice the path of least resistance on any given day.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 6](https://jamesclear.com/atomic-habits)
8. The Stoic Practitioner: I concede that preparing the environment helps, but the real test is when the friction is high. If the user treats the workout as a task, they will always find an excuse. If they treat it as an expression of their character, the schedule becomes irrelevant.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 29](http://classics.mit.edu/Epictetus/enchRaid.html)
9. The Systems Thinker: We are still divided on whether the root cause is the schedule or the psychology. If the user's fatigue level is a variable they haven't measured, the system will continue to oscillate wildly. We need to know if the failure is about the time or the energy recovery.
   [Donella Meadows, Thinking in Systems: A Primer, pd=false] [Basis: Donella Meadows, Thinking in Systems: A Primer, Chapter 2](https://donellameadows.org/books/thinking-in-systems/)

What became clearer (section D):
The debate shifted from finding a 'perfect schedule' to designing a 'resilient system.' We identified that the user may be conflating discipline with rigidity, and that success might depend on measuring recovery rather than just output. What remains disputed is whether the primary obstacle is the external schedule or the user's internal expectation of perfection.

What the choice depends on (section E):
- If the user's primary barrier is actual physical exhaustion → the system needs a 'recovery-first' rule where intensity scales with sleep.
- If the user's primary barrier is the 'all-or-nothing' mindset → the system should focus on 'habit-anchoring' where the trigger is an internal state (e.g., getting home) rather than a clock time.
- If the decisive factor is unknown (energy vs. logistics) → the user should track their energy levels versus their shift start times for two weeks to identify if there is a specific 'dead zone' to design around.

=== DEBATE B ===
Situation (section A):
The user struggles to maintain an exercise routine due to a fluctuating weekly work schedule. They are trapped between the desire for consistent health habits and the practical reality of unpredictable shifts, unsure whether to force a rigid structure or design a more fluid approach.

Minds (section B):
- The Habitualist: Building identity-based systems rather than relying on willpower. [James Clear, Atomic Habits, 2018]
- The Stoic: Focusing on internal agency regardless of external circumstances. [Marcus Aurelius, Meditations, 180]
- The Strategist: Identifying the neurological loops that drive repetitive behavior. [Charles Duhigg, The Power of Habit, 2012]

Debate (section C), 9 turns:
1. The Habitualist: The user is attempting to anchor their health to a clock, but their clock is broken. Instead of trying to find the perfect time, they should focus on habit stacking by linking exercise to a consistent event in their day that happens regardless of their shift.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 5](https://jamesclear.com/atomic-habits)
2. The Stoic: The error is assuming that the external schedule dictates the ability to act. One must detach the purpose of exercise from the convenience of the hour, recognizing that the mind remains capable of choosing movement even when the body feels the strain of changing shifts.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book IV, 3](https://classics.mit.edu/Antoninus/meditations.4.four.html)
3. The Strategist: Both perspectives ignore the neurological cue. The user needs to identify a keystone habit that triggers the exercise routine. If the environment is volatile, the trigger cannot be time-based; it must be a physical context, like walking through the door after a shift, that serves as a non-negotiable prompt.
   [Charles Duhigg, The Power of Habit, pd=false] [Basis: Charles Duhigg, The Power of Habit, Chapter 1](https://charlesduhigg.com/the-power-of-habit/)
4. The Habitualist: The Strategist is right about triggers, but willpower is a finite resource that the Stoic relies on too heavily. By making the exercise so small that it is impossible to say no, the user removes the need for motivation, which is often the first casualty of a rotating shift.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 11](https://jamesclear.com/atomic-habits)
5. The Stoic: If the user relies only on making things small to avoid friction, they remain a passenger to their environment. I would argue that acknowledging the difficulty of the rotating schedule is itself a practice of training the mind to be indifferent to the external chaos.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book VI, 8](https://classics.mit.edu/Antoninus/meditations.6.six.html)
6. The Strategist: The user might want to feel in control, but they also want ease. These two desires clash. If they prioritize control through Stoic discipline, the effort might lead to burnout. If they prioritize ease, they might avoid the deep discomfort of changing their lifestyle to accommodate fitness.
   [Charles Duhigg, The Power of Habit, pd=false] [Basis: Charles Duhigg, The Power of Habit, Chapter 7](https://charlesduhigg.com/the-power-of-habit/)
7. The Habitualist: This user may be assuming that exercise requires a high-intensity block of time. If they shift their definition of success to simply showing up, they can maintain the identity of an active person regardless of whether they have one hour or ten minutes.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 15](https://jamesclear.com/atomic-habits)
8. The Stoic: I agree with the Habitualist on the focus of action over duration. But I suspect the user fears that if they reduce the requirement too much, they are merely deceiving themselves. True discipline requires acknowledging the task is hard and doing it anyway.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book V, 1](https://classics.mit.edu/Antoninus/meditations.5.five.html)
9. The Strategist: We are still debating whether the user's struggle is one of willpower, identity, or system design. The choice depends on whether they are failing because they lack a trigger or because they lack a meaningful reward that makes the exercise worth the effort during a hard shift.
   [Charles Duhigg, The Power of Habit, pd=false] [Basis: Charles Duhigg, The Power of Habit, Chapter 2](https://charlesduhigg.com/the-power-of-habit/)

What became clearer (section D):
The main insight is that the user's inconsistency stems from anchoring exercise to a static variable (time) in a dynamic environment (shifting work). It remains disputed whether they should build a system that minimizes effort or one that reinforces mental discipline. A self-reflection for the user might be to ask if they are actually seeking a workout, or if they are seeking a sense of personal stability that their current job structure denies them.

What the choice depends on (section E):
If the user values behavioral ease above all, they should adopt a trigger-based system where exercise happens immediately after a non-work event. If they value personal growth and resilience, they should treat the irregular schedule as a training ground for Stoic indifference, focusing on the act of exercise as a victory over circumstance. If the primary hurdle remains unclear, they should experiment for two weeks: one week using the smallest possible habit trigger, and one week using a set time regardless of shift, to see which approach reduces their resistance.

Score A and B. Return the JSON object only.
