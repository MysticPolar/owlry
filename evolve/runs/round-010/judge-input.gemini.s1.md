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
You sleep eight hours nightly but still experience persistent exhaustion upon waking. You are unsure whether this is a physiological issue requiring medical intervention or a result of lifestyle habits you might adjust.

Minds (section B):
- The Biological Architect: Optimizing physical systems through evidence-based sleep hygiene [Matthew Walker, Why We Sleep, 2017]
- The Stoic Observer: Discerning what is within your control versus what you must accept [Marcus Aurelius, Meditations, 161]
- The Meaning Seeker: Uncovering the psychological source of subjective fatigue [Viktor Frankl, Man's Search for Meaning, 1946]

Debate (section C), 10 turns:
1. The Biological Architect: Your exhaustion suggests that your sleep is fragmented or lacking in the specific stages required for restoration. If you are consistently tired, you might need to evaluate your environment or the consistency of your wake times to ensure you are actually achieving deep restorative rest.
   [Matthew Walker, Why We Sleep, pd=false] Basis: Matthew Walker, Why We Sleep, Chapter 12
2. The Stoic Observer: Perhaps this fatigue is merely a temporary trial you are experiencing, as it is written that "the mind is unconquerable" when it decides to remain indifferent to its own condition. You should consider if your distress about being tired is more damaging than the tiredness itself.
   [Marcus Aurelius, Meditations, pd=true] Basis: Marcus Aurelius, Meditations, Book 8.48
3. The Meaning Seeker: I disagree with the Stoic Observer because you might be ignoring that exhaustion often serves as a signal that your current path lacks an underlying sense of purpose. If you feel empty, you might be experiencing a loss of meaning which manifests physically as a lack of drive.
   [Viktor Frankl, Man's Search for Meaning, pd=false] Basis: Viktor Frankl, Man's Search for Meaning, Part II
4. The Biological Architect: The Stoic Observer is wrong to suggest that you should just be indifferent to exhaustion because physiological sleep deprivation acts on your brain chemistry regardless of your mental resolve. You might have an undiagnosed condition like sleep apnea that prevents oxygenation no matter your attitude.
   [Matthew Walker, Why We Sleep, pd=false] Basis: Matthew Walker, Why We Sleep, Chapter 15
5. The Meaning Seeker: The Biological Architect is too focused on the machine, forgetting that if you perceive your days as meaningless, your body might reflect that lethargy as a protective barrier. You might find that your exhaustion changes if you engage with a task that demands your focus.
   [Viktor Frankl, Man's Search for Meaning, pd=false] Basis: Viktor Frankl, Man's Search for Meaning, Part II
6. The Stoic Observer: The Meaning Seeker suggests that you are suffering from a lack of purpose, but you may simply be overcomplicating a physical reality. Is it possible that you are chasing a state of perfect energy that does not exist, and what you fear is simply the discomfort of reality?
   [Marcus Aurelius, Meditations, pd=true] Basis: Marcus Aurelius, Meditations, Book 4.3
7. The Biological Architect: I propose you try a specific experiment for 14 days: record your sleep latency and wake-up time, and remove all caffeine after 12 PM. If you still wake up exhausted, you should see a doctor to rule out clinical apnea, which is a known physical cost.
   [Matthew Walker, Why We Sleep, pd=false] Basis: Matthew Walker, Why We Sleep, Chapter 16
8. The Meaning Seeker: Regarding that 14-day experiment, you might find it difficult to track your sleep if you feel trapped by your routine. The cost of this experiment is that you might become hyper-focused on your data, which could increase the very stress that keeps you from feeling truly rested.
   [Viktor Frankl, Man's Search for Meaning, pd=false] Basis: Viktor Frankl, Man's Search for Meaning, Part II
9. The Stoic Observer: I drop my initial stance that you should just be indifferent to this state, because the Meaning Seeker points out that ignoring your body when it clearly struggles might be irrational. You must use your reason to decide if your exhaustion is a matter of nature or a sign of neglect.
   [Marcus Aurelius, Meditations, pd=true] Basis: Marcus Aurelius, Meditations, Book 5.1
10. The Biological Architect: We remain divided on whether you need a doctor or a change in outlook. What would decide this is whether you snore or feel gasping sensations at night, which are facts you have not provided and would immediately suggest a medical necessity over a mental reframing.
   [Matthew Walker, Why We Sleep, pd=false] Basis: Matthew Walker, Why We Sleep, Chapter 15

What became clearer (section D):
The debate highlights a tension between viewing exhaustion as a biological malfunction, a psychological symptom of aimlessness, or a standard discomfort to be managed through rational perspective. While all agree that the state of your rest is significant, there is no consensus on whether the priority should be medical investigation or existential adjustment.

What the choice depends on (section E):
If you experience physical symptoms like snoring or gasping, a medical check-up is the most reasonable step to address potential apnea. If you find your exhaustion correlates strictly with days you feel aimless, testing a new, meaningful engagement might be more effective. If you remain unsure, tracking your sleep quality against your daily activities for two weeks provides the objective data necessary to determine if a physician is required.

=== DEBATE B ===
Situation (section A):
The user is sleeping eight hours a night but continues to wake up feeling exhausted. They are unsure whether this is a lifestyle issue they can address through personal changes or a medical condition requiring professional intervention. The central uncertainty is whether the exhaustion stems from physiological sleep quality or external factors.

Minds (section B):
- The Biological Realist: Physical mechanics and physiological health [Matthew Walker, Why We Sleep, 2017]
- The Stoic Observer: Alignment with natural order and self-discipline [Marcus Aurelius, Meditations, 180]
- The Systems Thinker: Feedback loops and environmental interaction [Donella Meadows, Thinking in Systems, 2008]

Debate (section C), 9 turns:
1. The Biological Realist: You might assume that eight hours is sufficient, but sleep duration is only half the battle. If you wake up exhausted, perhaps your sleep architecture is fragmented, preventing deep recovery cycles which are essential for health.
   [Matthew Walker, Why We Sleep, pd=false] [Basis: Matthew Walker, Why We Sleep, Chapter 1]
2. The Stoic Observer: Perhaps you worry too much about the quantity of your rest, which might itself be the source of your fatigue. A calm mind often finds that even brief periods of nature-aligned rest suffice, provided one is not agitated by constant desire for perfection.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 5]
3. The Systems Thinker: The Biological Realist suggests you need better sleep cycles, yet you could be caught in a feedback loop where stress during the day degrades your sleep quality, which then creates more stress. You should examine the entire system of your day, not just the eight hours in bed.
   [Donella Meadows, Thinking in Systems, pd=false] [Basis: Donella Meadows, Thinking in Systems, Chapter 2]
4. The Biological Realist: The Stoic Observer claims that worry about rest might be the source of fatigue, but this ignores the possibility of sleep apnea. If you struggle with breathing at night, no amount of mental calmness will fix your physical oxygen deprivation.
   [Matthew Walker, Why We Sleep, pd=false] [Basis: Matthew Walker, Why We Sleep, Chapter 14]
5. The Stoic Observer: I agree with The Biological Realist that medical conditions matter; however, if you have not first observed your own habits for 14 days, you might be rushing to blame the body rather than your own erratic actions. Test your routine before seeking a physician.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 6]
6. The Systems Thinker: The Stoic Observer proposes a 14-day observation, yet this assumes your environment remains static. If you work in a high-pressure system, waiting two weeks to monitor yourself might be a delay that exacerbates the very burnout you hope to avoid.
   [Donella Meadows, Thinking in Systems, pd=false] [Basis: Donella Meadows, Thinking in Systems, Chapter 4]
7. The Biological Realist: I drop my earlier focus on simply managing cycles to focus on the medical urgency. Since The Systems Thinker notes that external pressures might be severe, you should seek professional screening immediately to rule out clinical disorders before adjusting your lifestyle.
   [Matthew Walker, Why We Sleep, pd=false] [Basis: Matthew Walker, Why We Sleep, Chapter 15]
8. The Stoic Observer: If you follow the advice of The Biological Realist to seek a physician, ensure you still maintain a disciplined mind. Do not let the anticipation of a diagnosis become a distraction from the duties that define your life.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 2]
9. The Systems Thinker: Whether you change your habits or visit a doctor remains an open question. It depends on whether your exhaustion is a symptom of a broken internal component or a byproduct of an overwhelming system you inhabit, which only data from a sleep study could clarify.
   [Donella Meadows, Thinking in Systems, pd=false] [Basis: Donella Meadows, Thinking in Systems, Chapter 6]

What became clearer (section D):
The debate highlights the tension between personal habits and potential clinical issues. While lifestyle changes might help, there is a risk that ignoring physiological red flags, such as sleep apnea, could delay recovery. The main disagreement persists between whether you should first commit to a period of rigorous self-observation or prioritize medical testing immediately.

What the choice depends on (section E):
If you experience physical symptoms like snoring or gasping for air → medical testing is the urgent priority as it addresses immediate safety. If your energy levels fluctuate specifically with work intensity or stress → system-level lifestyle changes may yield more sustainable results. If you remain unsure of your nocturnal breathing → keep a sleep journal for one week and present it to a healthcare provider to determine if a sleep study is necessary.

Score A and B. Return the JSON object only.
