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
The user is struggling to maintain a consistent exercise habit due to an unpredictable, rotating work schedule. The central tension is whether to attempt to force a rigid structure onto a chaotic life or to build a system that thrives on that very volatility. The decisive uncertainty is whether the user values the comfort of a predictable routine more than the resilience of an adaptive, opportunistic approach.

Minds (section B):
- The Habitualist: Building identity through small, consistent actions. [James Clear, Atomic Habits, 2018]
- The Existentialist: Finding meaning in the act itself despite external absurdity. [Albert Camus, The Myth of Sisyphus, 1942]
- The Strategist: Creating systems that benefit from randomness. [Nassim Nicholas Taleb, Antifragile, 2012]

Debate (section C), 9 turns:
1. The Habitualist: The problem is that you are relying on motivation tied to a specific time, which your schedule makes impossible. You must attach your workout to a different trigger, like the moment you walk through your front door after a shift, regardless of the hour.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 4](https://jamesclear.com/atomic-habits)
2. The Existentialist: But a trigger implies a mechanical life. You are pushing your rock up the hill each week only to watch it roll back down when the shift changes. You feel defeated because you are trying to force a logic onto an inherently absurd schedule that does not care about your routine.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 1](https://www.marxists.org/reference/subject/philosophy/works/fr/camus.htm)
3. The Strategist: Both of you are chasing a fragility trap. A fixed schedule is fragile because it shatters at the first sign of a shift change. You should instead seek optionality, where you have the flexibility to exercise hard when you have the energy and do very little when you do not.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Chapter 1](https://www.fooledbyrandomness.com/antifragile.htm)
4. The Habitualist: Optionality can easily become an excuse for doing nothing. To be consistent, you need to follow a rule like never miss twice, which keeps the momentum going even if the session is short or happens at an odd hour.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 15](https://jamesclear.com/atomic-habits)
5. The Existentialist: It is possible you fear the lack of structure because it makes you feel like you lack control. But realizing that the schedule is indifferent to your fitness allows you to stop judging yourself for missing a day and simply start again, finding joy in the movement itself.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 4](https://www.marxists.org/reference/subject/philosophy/works/fr/camus.htm)
6. The Strategist: I agree with the need to persist, but the goal is not a flat, consistent line. It is about volatility. Use your shifts to dictate your intensity. On an easy shift day, train hard. On a brutal shift day, do nothing. You gain fitness from the recovery after the high stress.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Chapter 18](https://www.fooledbyrandomness.com/antifragile.htm)
7. The Habitualist: My concern with that approach is the loss of identity. If your exercise is always tied to high stress, you stop seeing yourself as someone who exercises and start seeing yourself as someone who reacts to their work. You need a daily micro-habit to keep the identity alive.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 2](https://jamesclear.com/atomic-habits)
8. The Existentialist: I see the point. My previous stance was too focused on acceptance. If the user wants an identity, they must build it through the conscious choice to act even when the circumstances are not ideal, proving their freedom against the schedule.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 3](https://www.marxists.org/reference/subject/philosophy/works/fr/camus.htm)
9. The Strategist: We remain divided. The Habitualist wants a predictable micro-habit to define a self, while I maintain that defining yourself by a rigid output in a volatile environment is a recipe for failure. The user must decide if they value the comfort of a steady habit or the resilience of a system that accepts their reality.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Chapter 6](https://www.fooledbyrandomness.com/antifragile.htm)

What became clearer (section D):
The main insight is that the user's struggle stems from an attempt to reconcile a rigid definition of a routine with a non-linear life. While the Habitualist insists on small, reliable anchors and the Strategist advocates for adaptive intensity, the Existentialist highlights that the frustration itself is a reaction to the loss of perceived control. The dispute remains open between whether consistency should be defined as a steady, daily habit or as a long-term pattern of adaptive effort.

What the choice depends on (section E):
If the user prioritizes steady habit formation for mental comfort, they should adopt tiny, non-negotiable triggers that exist outside of shift times. If they prioritize overall fitness and mental resilience, they should shift to an opportunistic, high-intensity model that aligns with their energy levels rather than a clock. To learn which is better, the user should track their recovery time for two weeks on both a fixed-habit method and an opportunistic method.

=== DEBATE B ===
Situation (section A):
The user is attempting to maintain an exercise habit despite a weekly changing work schedule, leading to a cycle of starting and giving up. They are struggling to reconcile a desire for consistency with the reality of their unpredictable hours. A central uncertainty exists regarding whether their failure is a result of an inflexible system design or a reliance on external circumstances to dictate their internal discipline.

Minds (section B):
- The Habit Architect: Structural environmental cues and habit stacking [James Clear, Atomic Habits, 2018]
- The Flow Strategist: Intrinsic motivation and matching challenge to capacity [Mihaly Csikszentmihalyi, Flow, 1990]
- The Stoic Sage: Distinguishing between external events and internal agency [Epictetus, Enchiridion, 135]

Debate (section C), 12 turns:
1. The Habit Architect: The user assumes a routine requires a fixed clock time. Instead, they should build a system based on environmental triggers that exist regardless of the shift, such as linking movement to the act of removing their work uniform.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 5](https://jamesclear.com/atomic-habits)
2. The Flow Strategist: Triggers are mechanical and neglect the user's variable energy levels. If a shift is grueling, a rigid trigger will cause burnout. It is better to match the exercise intensity to their current capacity on any given day.
   [Mihaly Csikszentmihalyi, Flow, pd=false] [Basis: Mihaly Csikszentmihalyi, Flow, Chapter 4](https://www.harpercollins.com/products/flow-mihaly-csikszentmihalyi)
3. The Stoic Sage: Both of you focus on external conditions. Whether a shift is morning or night is an external event that falls outside of our control. The user's choice to move their body remains an internal act of character.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 1](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Epictetus/Enchiridion*.html)
4. The Habit Architect: While internal character is vital, willpower is a limited resource. By using cues, the user offloads the decision to exercise, effectively removing the need for constant mental effort as they navigate their shifting schedule.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 4](https://jamesclear.com/atomic-habits)
5. The Flow Strategist: I disagree. If the user relies on external cues, they may exercise when their energy is too low to find flow, leading to resentment rather than engagement. Flexibility is the highest form of mastery.
   [Mihaly Csikszentmihalyi, Flow, pd=false] [Basis: Mihaly Csikszentmihalyi, Flow, Chapter 3](https://www.harpercollins.com/products/flow-mihaly-csikszentmihalyi)
6. The Stoic Sage: The danger here is that if the user allows their mood to dictate the terms, they will eventually opt for comfort. Some things are not optional if one is to remain free from the tyranny of their own desires.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 2](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Epictetus/Enchiridion*.html)
7. The Habit Architect: Then the user could create two distinct routines—a high-energy plan and a low-energy fallback—so they maintain the habit regardless of the shift type, without needing to negotiate their feelings every time.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 15](https://jamesclear.com/atomic-habits)
8. The Flow Strategist: That is a better compromise. It treats the chaotic schedule as an opportunity to experiment with different types of movement, keeping the experience novel and intrinsically rewarding.
   [Mihaly Csikszentmihalyi, Flow, pd=false] [Basis: Mihaly Csikszentmihalyi, Flow, Chapter 5](https://www.harpercollins.com/products/flow-mihaly-csikszentmihalyi)
9. The Stoic Sage: I concede that structure helps, yet I maintain the core issue is the user's frustration with their schedule. A consistent practice is a duty they owe themselves, regardless of when they perform it.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 30](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Epictetus/Enchiridion*.html)
10. The Habit Architect: We are debating whether they need a fixed time or a fixed trigger. The user clearly fears that if it is not fixed, it is not a habit, which causes them to abandon everything when the schedule shifts.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 10](https://jamesclear.com/atomic-habits)
11. The Flow Strategist: And I suspect they believe that if they do not exercise at a specific, idealized intensity, they have failed entirely, which creates a false binary that guarantees their eventual departure from the habit.
   [Mihaly Csikszentmihalyi, Flow, pd=false] [Basis: Mihaly Csikszentmihalyi, Flow, Chapter 9](https://www.harpercollins.com/products/flow-mihaly-csikszentmihalyi)
12. The Stoic Sage: The disagreement remains: is the struggle a logistical failure of scheduling, or a failure to accept their life as it is? The missing piece is how they respond to themselves during the days they inevitably miss.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 12](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Epictetus/Enchiridion*.html)

What became clearer (section D):
The debate highlights that the user is likely caught between two conflicting desires: a need for the psychological security of a rigid schedule and a need for the flexibility to handle their actual workload. The main insight is that they can decouple exercise from time by using environmental triggers, while also adjusting intensity to match their available energy. A remaining dispute concerns whether they are failing due to a lack of logistical systems or a lack of discipline in accepting the reality of their unpredictable life.

What the choice depends on (section E):
If the user finds that they abandon exercise specifically because they miss their 'ideal' time slot, then implementing a 'minimum viable' routine that triggers off a specific daily event becomes more reasonable. If they find they abandon exercise because they feel exhausted and frustrated by the lack of structure, then adopting a flexible, energy-matched approach is more reasonable. If it is unknown whether they are too hard on themselves for missed sessions, they should track their self-talk after a missed day to determine if their barrier is primarily psychological or logistical.

Score A and B. Return the JSON object only.
