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
I sleep around eight hours but still wake up exhausted. Is there something I should change, or should I get checked?

=== DEBATE A ===
Situation (section A):
You report sleeping eight hours nightly but still experience persistent exhaustion upon waking. The central tension lies between treating this as a physiological malfunction requiring medical intervention or as an environmental or existential issue rooted in your habits and daily purpose.

Minds (section B):
- The Biological Reductionist: Physical mechanisms and physiological states [William James, The Principles of Psychology, 1890]
- The Systems Architect: Optimization of environment and routines [James Clear, Atomic Habits, 2018]
- The Existential Skeptic: The psychological load of purpose and meaning [Viktor Frankl, Man's Search for Meaning, 1946]

Debate (section C), 10 turns:
1. The Biological Reductionist: You might be focused on the quantity of sleep, but the quality of your physiological state decides how restorative that time actually is, perhaps due to internal conditions that are not apparent while you are awake.
   [William James, The Principles of Psychology, pd=true] [Basis: William James, The Principles of Psychology, Chapter 2](https://psychclassics.yorku.ca/James/Principles/)
2. The Systems Architect: You could be ignoring environmental cues that keep your system in a state of alertness even when you are supposedly resting, so maybe small adjustments to your evening routine would change the quality of your sleep.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 16](https://jamesclear.com/atomic-habits)
3. The Existential Skeptic: You might feel exhausted because your daily activities lack a sense of purpose, which drains your internal batteries regardless of how long you spend in bed, if your mind carries a heavy burden of aimlessness.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, Part 1](https://www.penguinrandomhouse.com/books/296766/mans-search-for-meaning-by-viktor-e-frankl/)
4. The Biological Reductionist: You suggest environment and purpose matter, but if your biological clock is fundamentally misaligned, no amount of habit optimization will fix the underlying exhaustion that defines your waking experience.
   [William James, The Principles of Psychology, pd=true] [Basis: William James, The Principles of Psychology, Chapter 4](https://psychclassics.yorku.ca/James/Principles/)
5. The Systems Architect: You claim biology is the only hurdle, but if you do not track your evening light exposure and temperature for 7 days, you are guessing about variables you can easily control.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 15](https://jamesclear.com/atomic-habits)
6. The Existential Skeptic: You think tracking habits will help, but if your work feels empty, you might just be optimizing the path toward deeper burnout, as your exhaustion might stem from a lack of meaning rather than light levels.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, Part 2](https://www.penguinrandomhouse.com/books/296766/mans-search-for-meaning-by-viktor-e-frankl/)
7. The Systems Architect: I drop my earlier claim that habit optimization is sufficient, as the Existential Skeptic points out that motivation matters; maybe you should track both your environment and your stress levels for a week to see if you can identify a pattern.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 3](https://jamesclear.com/atomic-habits)
8. The Biological Reductionist: You both focus on psychology, but if you do not see a doctor to rule out sleep apnea or other physical disruptions, you might ignore a mechanical failure that no amount of purpose can overcome.
   [William James, The Principles of Psychology, pd=true] [Basis: William James, The Principles of Psychology, Chapter 1](https://psychclassics.yorku.ca/James/Principles/)
9. The Existential Skeptic: You propose a doctor, but if you treat your body purely like a machine to be repaired, you might miss the chance to address the meaninglessness that could be causing your fatigue, if your life feels like it lacks an anchor.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, Part 2](https://www.penguinrandomhouse.com/books/296766/mans-search-for-meaning-by-viktor-e-frankl/)
10. The Biological Reductionist: You disagree about the necessity of a doctor, but the dispute remains open: does the exhaustion come from a physical break that requires clinical attention, or a life out of balance that requires a revaluation of your purpose?
   [William James, The Principles of Psychology, pd=true] [Basis: William James, The Principles of Psychology, Chapter 2](https://psychclassics.yorku.ca/James/Principles/)

What became clearer (section D):
The debate highlights a division between treating your exhaustion as a biological symptom or a psychological consequence. It remains disputed whether clinical testing or existential re-evaluation should take precedence, leaving you to decide if your fatigue feels like a physical glitch or a lack of engagement with your daily life.

What the choice depends on (section E):
If you experience physical symptoms like snoring or gasping, a medical check becomes the priority to rule out apnea. If your sleep quality is physically high but your morning dread is tied to a specific project or role, re-evaluating your goals might be more effective than a doctor visit. To distinguish these, keep a log for one week noting both your physical rest and your sense of purpose during the day.

=== DEBATE B ===
Situation (section A):
The user experiences adequate sleep duration but suffers from persistent morning exhaustion, raising the question of whether this is a lifestyle issue or a medical concern. The central tension lies between treating the problem as a biological failure requiring clinical intervention versus a behavioral misalignment.

Minds (section B):
- The Biological Reductionist: The architecture of sleep stages and restorative processes [Matthew Walker, Why We Sleep, 2017]
- The Stoic Observer: Mental alignment and the habitual nature of perception [Marcus Aurelius, Meditations, 161]
- The Systemic Analyst: Environmental cues and cumulative behavioral adjustments [James Clear, Atomic Habits, 2018]

Debate (section C), 9 turns:
1. The Biological Reductionist: You might be sleeping eight hours, but sleep is not a single block of time. If your sleep architecture lacks sufficient deep or REM stages due to fragmented breathing or timing, the duration is irrelevant to your recovery.
   [Matthew Walker, Why We Sleep, pd=false] [Basis: Matthew Walker, Why We Sleep, Chapter 2](https://www.goodreads.com/book/show/34466963)
2. The Stoic Observer: Perhaps your fatigue is not of the body but of the mind. As it is written, "The soul becomes dyed with the color of its thoughts," and if your mind is restless or burdened when you lie down, your sleep will not bring the clarity you seek.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 5](https://www.gutenberg.org/files/2680/2680-h/2680-h.htm)
3. The Systemic Analyst: I suspect your environment might be the culprit. You could be failing to optimize your surroundings, such as temperature or light exposure, which shapes your sleep efficiency far more than simple willpower or mental state.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 6](https://www.goodreads.com/book/show/40121378)
4. The Biological Reductionist: The Systemic Analyst thinks environmental tweaks are enough, but if your breathing is being obstructed by physiological issues like apnea, no amount of room temperature adjustment will restore the oxygen your brain needs to feel refreshed.
   [Matthew Walker, Why We Sleep, pd=false] [Basis: Matthew Walker, Why We Sleep, Chapter 13](https://www.goodreads.com/book/show/34466963)
5. The Systemic Analyst: The Biological Reductionist claims breathing is the only issue, but you might gain better rest by establishing a strict 30 minute wind-down routine that removes screens and cues of stress, which often precedes physical disruption.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 15](https://www.goodreads.com/book/show/40121378)
6. The Stoic Observer: The Systemic Analyst assumes that a ritual will fix the soul, yet if you are internally wrestling with the day ahead, you carry those weights into your slumber regardless of your evening routine.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 4](https://www.gutenberg.org/files/2680/2680-h/2680-h.htm)
7. The Biological Reductionist: My claim that environment is the culprit was too narrow. If your physical health is impaired by systemic issues, you might seek a clinical assessment immediately to rule out sleep disorders before blaming your habits.
   [Matthew Walker, Why We Sleep, pd=false] [Basis: Matthew Walker, Why We Sleep, Chapter 13](https://www.goodreads.com/book/show/34466963)
8. The Systemic Analyst: The Biological Reductionist suggests a medical checkup, which is wise, but you might also lose precious rest if you view sleep as a chore to be mastered rather than a natural extension of a calm life.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 1](https://www.goodreads.com/book/show/40121378)
9. The Stoic Observer: We remain divided on whether your exhaustion is a defect of the body or a reflection of your inner state. Whether a doctor can confirm your health or you must align your mind to peace, the decision rests on whether you value internal clarity over mere physical duration.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 2](https://www.gutenberg.org/files/2680/2680-h/2680-h.htm)

What became clearer (section D):
The debate highlights a tension between viewing exhaustion as a physiological pathology requiring medical verification versus a psychological or environmental habit requiring behavioral change. What remains disputed is whether the root cause is purely physical or rooted in the mental state of the user. A useful self-reflection would be to observe if the exhaustion is accompanied by physical symptoms like snoring or if it is linked to specific periods of high mental stress.

What the choice depends on (section E):
If you experience physical symptoms like gasping, snoring, or morning headaches, a clinical sleep study is the most reasonable next step to rule out apnea. If your sleep is physically quiet but your mind is racing, reframing your evening routine to prioritize mental decompression for 14 days may be more effective. If you are unsure, keeping a sleep log for two weeks to track both your physical sensations and your evening mental state will provide the data necessary to distinguish between these two paths.

Score A and B. Return the JSON object only.
