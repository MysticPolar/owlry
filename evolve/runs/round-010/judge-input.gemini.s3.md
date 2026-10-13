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
You are sleeping eight hours but waking up exhausted, which creates a gap between your expectation of rest and your actual experience of energy. It is unclear whether your exhaustion stems from physiological sleep architecture, behavioral habits, or psychological factors. You are currently weighing whether to adjust your routine or consult a professional.

Minds (section B):
- The Bio-Mechanic: Sleep architecture and physiological function [Matthew Walker, Why We Sleep, 2017]
- The Habit Strategist: Environment and behavioral consistency [James Clear, Atomic Habits, 2018]
- The Existential Skeptic: Subjective interpretation of physical states [William James, The Principles of Psychology, 1890]

Debate (section C), 10 turns:
1. The Bio-Mechanic: You might be getting eight hours in bed, but if your sleep architecture is fragmented, you are not actually getting eight hours of restorative rest. Perhaps your circadian rhythm is fighting against your schedule, preventing deep sleep cycles that you need to feel refreshed.
   [Matthew Walker, Why We Sleep, pd=false] [Basis: Matthew Walker, Why We Sleep, Chapter 2]
2. The Habit Strategist: I would suggest that your evening environment could be the culprit. If you scroll through your phone right before bed, your brain might be primed for stimulation instead of sleep, which would make your eight hours less effective than they appear.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 15]
3. The Existential Skeptic: It is possible that you are simply experiencing a state of mind where the label of exhaustion has become a habit in itself. You may feel that you are tired because you expect to be, rather than because your physiology is failing to recover during the night.
   [William James, The Principles of Psychology, pd=false] [Basis: William James, The Principles of Psychology, Chapter 20]
4. The Bio-Mechanic: The Existential Skeptic argues that feeling exhausted is just a habit of mind, but that ignores the biological reality of sleep apnea or other sleep disorders. If your oxygen levels drop during the night, you might feel exhausted no matter how much you mentally convince yourself you should be rested.
   [Matthew Walker, Why We Sleep, pd=false] [Basis: Matthew Walker, Why We Sleep, Chapter 12]
5. The Habit Strategist: The Bio-Mechanic claims that biological failures are the primary issue, yet small, consistent habit changes often solve these problems before medical intervention is required. If you adjust your light exposure by dimming lamps one hour before bed, you might fix the issue without needing to seek a doctor.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 15]
6. The Existential Skeptic: The Habit Strategist suggests that simple environmental changes like dimming lights are the solution, but perhaps you actually desire a change in your daily purpose that would resolve your fatigue. If you lack interest in your daily tasks, you might interpret a normal physical state as profound exhaustion.
   [William James, The Principles of Psychology, pd=false] [Basis: William James, The Principles of Psychology, Chapter 10]
7. The Bio-Mechanic: I drop my earlier claim that only architecture matters, because I concede to The Habit Strategist that consistency in your routine is a vital foundation for that architecture. However, I still maintain that if this exhaustion persists, you must see a doctor to rule out physical sleep pathology first.
   [Matthew Walker, Why We Sleep, pd=false] [Basis: Matthew Walker, Why We Sleep, Chapter 12]
8. The Habit Strategist: To start, I suggest you track your sleep quality for exactly 7 days, noting your screen usage and caffeine intake, to see if a pattern emerges. This provides data before you commit to the time and cost of a clinical sleep study or medical appointment.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 1]
9. The Bio-Mechanic: Tracking your habits for 7 days helps identify lifestyle interference, but it does not account for the biological cost of potential undiagnosed sleep apnea. If you follow this tracking plan, you might lose valuable time if a medical issue is actually the root cause of your exhaustion.
   [Matthew Walker, Why We Sleep, pd=false] [Basis: Matthew Walker, Why We Sleep, Chapter 12]
10. The Existential Skeptic: We still disagree on whether this exhaustion is a physiological deficit or a psychological manifestation. Does your exhaustion persist even on days when you feel entirely satisfied with your work or personal life, or is it tied to the times when you feel bored or unfulfilled?
   [William James, The Principles of Psychology, pd=true] [Basis: William James, The Principles of Psychology, Chapter 20]

What became clearer (section D):
The discussion clarified that your exhaustion could be a genuine biological symptom, a consequence of poor habits, or a reflection of your subjective state. A significant disagreement remains regarding whether you should prioritize self-tracking or immediate medical consultation. A useful self-reflection involves noticing if your fatigue fluctuates based on your daily engagement or remains constant regardless of your mood.

What the choice depends on (section E):
- If you experience heavy snoring, gasping, or morning headaches → medical consultation becomes more reasonable, because these are indicators of sleep pathology that habit changes cannot fix.
- If your exhaustion varies significantly with your daily schedule or screen usage → habit adjustment becomes more reasonable, because you can likely isolate the environmental cause yourself.
- If you are unsure about the nature of your exhaustion → maintain a 7-day sleep log documenting both your physical symptoms and your daily emotional satisfaction to distinguish between lifestyle factors and potential underlying health concerns.

=== DEBATE B ===
Situation (section A):
The user reports sleeping eight hours nightly but waking up exhausted, leading to uncertainty about whether this is a lifestyle issue or a medical condition. The central tension lies in whether to pursue immediate behavioral changes or seek clinical evaluation.

Minds (section B):
- The Data Optimizer: Maximizing efficiency through measurement and systematic tracking. [James Clear, Atomic Habits, 2018]
- The Evolutionary Biologist: Alignment with natural biological rhythms and environmental mismatch. [Daniel Lieberman, The Story of the Human Body, 2013]
- The Stoic Observer: Focusing on what is within personal control versus external physical reality. [Marcus Aurelius, Meditations, 180]

Debate (section C), 9 turns:
1. The Data Optimizer: Before you visit a doctor, you might try tracking your sleep latency and quality metrics for two weeks. If you aren't measuring your output, you are just guessing at the root cause.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 1]
2. The Evolutionary Biologist: You could be suffering from a mismatch between your modern lifestyle and your biological design. Maybe your exhaustion stems from artificial light exposure rather than a deficit in total sleep duration.
   [Daniel Lieberman, The Story of the Human Body, pd=false] [Basis: Daniel Lieberman, The Story of the Human Body, Part 4]
3. The Stoic Observer: It is not the sleep itself that troubles you, but your judgment about it. If you accept that your body is a vessel subject to decay, you might find peace even while tired.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 4]
4. The Data Optimizer: The Stoic Observer suggests that you accept your exhaustion, but that ignores the potential for optimization. You could change your environment to force a better sleep outcome through small, iterative adjustments.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 2]
5. The Evolutionary Biologist: The Data Optimizer says you should track metrics, but measuring a broken system rarely fixes the underlying evolutionary mismatch. If your circadian rhythm is disrupted by blue light, a logbook will not save you.
   [Daniel Lieberman, The Story of the Human Body, pd=false] [Basis: Daniel Lieberman, The Story of the Human Body, Part 4]
6. The Stoic Observer: The Evolutionary Biologist claims your exhaustion is a mismatch, yet if that is the case, then seeing a physician is an act of rational agency. One must distinguish between what is in our control and what belongs to the physician.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 2]
7. The Data Optimizer: I drop my earlier claim that you should just track metrics. Perhaps I was too focused on the process and missed the urgency of a potential medical issue that prevents system performance.
   [James Clear, Atomic Habits, pd=false] [Basis: James Clear, Atomic Habits, Chapter 1]
8. The Evolutionary Biologist: You might be dealing with sleep apnea, which is a structural issue. If you struggle to wake up refreshed despite eight hours, it could be that your body is not getting enough oxygen at night.
   [Daniel Lieberman, The Story of the Human Body, pd=false] [Basis: Daniel Lieberman, The Story of the Human Body, Part 5]
9. The Stoic Observer: Whether this is a biological failure or a simple lack of discipline remains an open question. The decision to see a doctor rests on whether you have exhausted your own reasonable efforts to improve your rest.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 5]

What became clearer (section D):
The debate highlights a tension between self-optimization (tracking habits), environmental alignment (biological needs), and the acceptance of physical limits (Stoic perspective). The main insight is that exhaustion may result from either environmental mismatch or structural health issues, both of which require distinct approaches. The primary dispute remains whether the user should prioritize immediate medical screening or systematic self-experimentation first.

What the choice depends on (section E):
- If the exhaustion is accompanied by snoring or gasping, medical evaluation is the reasonable priority because structural issues like apnea require clinical intervention.
- If the exhaustion persists despite perfect circadian hygiene (dark, cool room, no screens), then medical testing becomes the necessary next step.
- If a decisive fact remains unknown—such as whether you have tried consistent sleep hygiene for 30 days—the proportionate step is to implement those hygiene changes for one month before seeking a clinical diagnosis.

Score A and B. Return the JSON object only.
