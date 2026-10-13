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
I don’t know what I want to do with my life. I want stability and time for people I love, but nothing feels like a calling. Where do I start?

=== DEBATE A ===
Situation (section A):
The user is caught between the pressure to find a singular 'calling' and the practical need for stability and connection with loved ones. They struggle with the assumption that a meaningful life requires a pre-existing destination, rather than an active process of construction.

Minds (section B):
- The Existentialist: The freedom to define one's own purpose. [Jean-Paul Sartre, Existentialism is a Humanism, 1946]
- The Virtue Ethicist: The cultivation of character through consistent action. [Aristotle, Nicomachean Ethics, -350]
- The Pragmatist: The necessity of action to resolve uncertainty. [William James, The Will to Believe, 1896]

Debate (section C), 9 turns:
1. The Existentialist: You are looking for a 'calling' as if it were a hidden treasure waiting to be discovered. You are free, and that is terrifying, but it means you don't 'have' a nature. You must invent your purpose through your choices.
   [Jean-Paul Sartre, Existentialism is a Humanism, pd=false] [Basis: Jean-Paul Sartre, Existentialism is a Humanism](https://www.marxists.org/reference/archive/sartre/works/exist/sartre.htm)
2. The Virtue Ethicist: Inventing from a void is exhausting. I suggest focusing on the excellence of your daily activity. Happiness isn't a feeling of having found a calling; it is the activity of the soul in accordance with virtue. Stability follows from excellence.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics, Book I](https://classics.mit.edu/Aristotle/nicomachaen.1.i.html)
3. The Pragmatist: You both assume we can think our way into this. But some truths are only accessible through action. If you wait for the 'calling' to appear before you move, you will wait forever. Try something, and watch how your life responds.
   [William James, The Will to Believe, pd=true] [Basis: William James, The Will to Believe, section IV](https://www.gutenberg.org/files/26659/26659-h/26659-h.htm)
4. The Existentialist: Pragmatism is fine, but it risks turning life into a series of aimless experiments. If you treat life as a trial, you avoid the responsibility of commitment. You must choose, even without a guarantee that it is the 'right' path.
   [Jean-Paul Sartre, Existentialism is a Humanism, pd=false] [Basis: Jean-Paul Sartre, Existentialism is a Humanism](https://www.marxists.org/reference/archive/sartre/works/exist/sartre.htm)
5. The Virtue Ethicist: I agree with the need for commitment, but not as an invention. It is a refinement. We are what we repeatedly do. Excellence is not an act, but a habit. Your focus on people you love is a great place to start building that character.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics, Book II](https://classics.mit.edu/Aristotle/nicomachaen.2.ii.html)
6. The Pragmatist: I’ll concede that 'aimless' is a danger. But the user isn't paralyzed by a lack of virtue; they are paralyzed by the fear that one choice precludes all others. You can be a 'good person' in many different jobs. The 'calling' is the feedback loop.
   [William James, The Will to Believe, pd=true] [Basis: William James, The Will to Believe, section IX](https://www.gutenberg.org/files/26659/26659-h/26659-h.htm)
7. The Existentialist: That is the trap. You think there is a 'correct' feedback loop out there. There isn't. The user's anxiety comes from looking for a sign from the world. Once they accept that the world sends no signs, they can stop waiting and start deciding.
   [Jean-Paul Sartre, Existentialism is a Humanism, pd=false] [Basis: Jean-Paul Sartre, Existentialism is a Humanism](https://www.marxists.org/reference/archive/sartre/works/exist/sartre.htm)
8. The Virtue Ethicist: Wait—perhaps I was too abstract. If the user prioritizes people they love, that isn't just a side project. That is the material for their virtue. They don't need a career 'calling' to live well; they need to exercise their human capacities effectively.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics, Book I](https://classics.mit.edu/Aristotle/nicomachaen.1.i.html)
9. The Pragmatist: Exactly. The condition that settles this is whether the user needs a 'calling' to feel they have permission to act. If they realize they can just start, the 'calling' becomes a retrospective story they tell, not a prerequisite for starting.
   [William James, The Will to Believe, pd=true] [Basis: William James, The Will to Believe, section VI](https://www.gutenberg.org/files/26659/26659-h/26659-h.htm)

What became clearer (section D):
The main insight is that a 'calling' is likely a narrative constructed after the fact, rather than a hidden truth. What remains disputed is whether the path should be built through radical, groundless choice or through the steady cultivation of daily habits.

What the choice depends on (section E):
- If the user feels stuck because they fear making the 'wrong' choice → prioritize the Pragmatist's approach: take the smallest, most reversible action possible to gather data.
- If the user feels empty despite having stability → prioritize the Existentialist's approach: acknowledge that they are responsible for creating meaning, and stop searching for an external sign.
- If the user is overwhelmed by the complexity of 'life' → prioritize the Virtue Ethicist's approach: identify the daily habits that support their stated value of 'time for loved ones' and treat those habits as the primary goal.

=== DEBATE B ===
Situation (section A):
The user is caught in a paralysis of expectation, feeling that their desire for stability and time with loved ones conflicts with a missing sense of 'calling.' The central tension is whether this sense of purpose is a hidden treasure to be discovered or a structure that must be built through daily engagement and choice.

Minds (section B):
- The Habit-Builder: Building identity through consistent, small actions rather than grand pursuits. [William James, Talks to Teachers on Psychology; and to Students on Some of Life's Ideals, 1899]
- The Freedom-Architect: The burden of radical responsibility and the necessity of creating one's own essence. [Jean-Paul Sartre, Existentialism Is a Humanism, 1946]
- The Duty-Stoic: Acting according to nature and maintaining virtue within the present moment. [Marcus Aurelius, Meditations, 180]

Debate (section C), 9 turns:
1. The Habit-Builder: You are waiting for a lightning bolt of inspiration that may never strike. As James noted, it is not our nature to wait for perfect clarity; instead, we form our lives by the 'habits' we cultivate. Start by performing the tasks that sustain your desired lifestyle, and the purpose will follow the practice.
   [William James, Talks to Teachers on Psychology; and to Students on Some of Life's Ideals, pd=true] [Basis: William James, Talks to Teachers on Psychology, Chapter 8]
2. The Freedom-Architect: That is comfortable advice, but it risks bad faith. By suggesting you just 'fall into a habit,' you are avoiding the terrifying truth that you are entirely free. A 'calling' is not a discovery; it is a choice you make and validate through your actions. Stop asking what you want; start deciding what you are.
   [Jean-Paul Sartre, Existentialism Is a Humanism, pd=false] [Basis: Jean-Paul Sartre, Existentialism Is a Humanism, Section on Responsibility]
3. The Duty-Stoic: Why must you choose between discovery and creation? Your duty is to act well in the role you currently inhabit, regardless of whether it feels like a 'calling.' As I wrote, 'at every hour devote yourself with diligence to perform the work in hand.' If you perform your tasks well, the rest is nature's business.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 2]
4. The Habit-Builder: Sartre, your 'radical responsibility' creates the very anxiety that paralyzes this person. When we treat every moment as a blank slate, we become exhausted. Habits are not a trap; they are the 'enormous flywheel of society,' providing the stability this person craves so they can actually enjoy time with loved ones.
   [William James, Talks to Teachers on Psychology; and to Students on Some of Life's Ideals, pd=true] [Basis: William James, Talks to Teachers on Psychology, Chapter 8]
5. The Freedom-Architect: And you, Aurelius, speak of 'duty' as if it is an external command. That is a way to hide from the fact that you are the sole author of your life. If this person wants stability, they must choose to make stability their project, not accept it as a pre-ordained role.
   [Jean-Paul Sartre, Existentialism Is a Humanism, pd=false] [Basis: Jean-Paul Sartre, Existentialism Is a Humanism, Section on Choice]
6. The Duty-Stoic: I do not see duty as external, but as alignment with the whole. If your goal is to have time for your loved ones, then duty to them is your 'calling.' The error is in imagining that a 'calling' must be a professional identity, rather than an act of service to the common good.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 3]
7. The Habit-Builder: I concede that my focus on routine can become empty if it lacks an ideal. But the user is suffering because they think they lack a 'calling,' when they actually just lack a routine that protects their values. If you automate the professional, you liberate the personal.
   [William James, Talks to Teachers on Psychology; and to Students on Some of Life's Ideals, pd=true] [Basis: William James, Talks to Teachers on Psychology, Chapter 10]
8. The Freedom-Architect: I will change my stance slightly. If this person chooses a stable, low-stress path specifically to spend time with their family, that is a valid, powerful choice. The 'calling' is the choice itself, not the work. They are not 'lacking'; they are simply failing to own their decision.
   [Jean-Paul Sartre, Existentialism Is a Humanism, pd=false] [Basis: Jean-Paul Sartre, Existentialism Is a Humanism, Section on Commitment]
9. The Duty-Stoic: Agreed. When you realize that the 'calling' is simply the intention to act virtuously in your current station, the pressure to find a 'perfect' path vanishes. Peace is found in the performance of the role, not in the title of the role itself.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 4]

What became clearer (section D):
The search for a 'calling' is revealed to be a potential distraction from the actual values the user holds: stability and connection. The debate suggests that these values can be achieved through disciplined habits and the active choice to value one's current roles, rather than waiting for an external sense of destiny.

What the choice depends on (section E):
- If the user prioritizes mental clarity and reducing anxiety → choose the path of Habit-Building to create a predictable structure that protects personal time.
- If the user prioritizes self-authorship → choose the path of Freedom-Architecting, viewing any chosen role as a deliberate, meaningful commitment.
- If the user feels overwhelmed by the weight of the decision → identify the smallest possible action that supports their loved ones and execute it consistently for one month to see if 'meaning' emerges through that practice.

Score A and B. Return the JSON object only.
