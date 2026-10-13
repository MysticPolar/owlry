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
The user is caught in the tension between seeking a 'calling'—a singular, life-defining purpose—and desiring the stability required to nurture personal relationships. There is an underlying assumption that a calling is something to be discovered rather than built, leading to paralysis when no immediate passion appears.

Minds (section B):
- The Stoic Minimalist: Removing distractions to focus on what is essential. [Lucius Annaeus Seneca, On the Shortness of Life, 49]
- The Experimental Pragmatist: Testing actions through experience rather than waiting for insight. [William James, The Will to Believe, 1896]
- The Relational Thinker: Meaning as a byproduct of participating in human activity. [Hannah Arendt, The Human Condition, 1958]

Debate (section C), 10 turns:
1. The Stoic Minimalist: You suffer because you look for a 'calling' as if it were a hidden treasure. Life is not short if you know how to use it, but you waste time by waiting for an epiphany that never comes.
   [Lucius Annaeus Seneca, On the Shortness of Life, pd=true] [Basis: Seneca, On the Shortness of Life, Chapter 1](https://en.wikisource.org/wiki/On_the_Shortness_of_Life)
2. The Experimental Pragmatist: The Stoic is right about waiting, but wrong about how to start. You cannot think your way into a calling. You must act as if something is meaningful to see if it sustains your interest through actual engagement.
   [William James, The Will to Believe, pd=true] [Basis: William James, The Will to Believe, The Will to Believe](https://www.gutenberg.org/files/26659/26659-h/26659-h.htm)
3. The Relational Thinker: Both of you view this as a personal project. You miss that meaning is never found in isolation. It is something we build with others through labor and shared action in the public world.
   [Hannah Arendt, The Human Condition, pd=false] [Basis: Hannah Arendt, The Human Condition, Chapter II](https://www.worldcat.org/title/human-condition/oclc/1054817105)
4. The Stoic Minimalist: But if you lose yourself in the 'public world' without first mastering your own attention, you become a slave to external demands. You will have stability, but no peace.
   [Lucius Annaeus Seneca, On the Shortness of Life, pd=true] [Basis: Seneca, On the Shortness of Life, Chapter 7](https://en.wikisource.org/wiki/On_the_Shortness_of_Life)
5. The Experimental Pragmatist: Peace is not the goal, progress is. By treating your career as a series of small experiments, you gain data on what you enjoy while keeping your schedule flexible enough to protect your relationships.
   [William James, The Will to Believe, pd=true] [Basis: William James, The Will to Believe, The Sentiment of Rationality](https://www.gutenberg.org/files/26659/26659-h/26659-h.htm)
6. The Relational Thinker: The Pragmatist treats life like a lab. But if you view your time as 'data points,' you turn your potential collaborators into tools. A calling isn't an experiment; it's a commitment to a community.
   [Hannah Arendt, The Human Condition, pd=false] [Basis: Hannah Arendt, The Human Condition, Chapter V](https://www.worldcat.org/title/human-condition/oclc/1054817105)
7. The Stoic Minimalist: Arendt makes a fair point. I concede that my focus on individual stillness can lead to coldness. We need others, but we must decide what to offer them so we aren't just reacting to their noise.
   [Lucius Annaeus Seneca, On the Shortness of Life, pd=true] [Basis: Seneca, On the Shortness of Life, Chapter 15](https://en.wikisource.org/wiki/On_the_Shortness_of_Life)
8. The Experimental Pragmatist: I’ll adjust my stance too. You don't have to be a cold scientist. Use your experiments to find which communities make you feel useful. That is how you bridge the gap between stability and meaning.
   [William James, The Will to Believe, pd=true] [Basis: William James, The Will to Believe, The Will to Believe](https://www.gutenberg.org/files/26659/26659-h/26659-h.htm)
9. The Relational Thinker: If you follow that, stop asking 'what should I do?' and start asking 'who do I want to stand with?' Stability is not about a job description; it’s about the people you hold through your actions.
   [Hannah Arendt, The Human Condition, pd=false] [Basis: Hannah Arendt, The Human Condition, Chapter III](https://www.worldcat.org/title/human-condition/oclc/1054817105)
10. The Stoic Minimalist: We agree then: reject the myth of a pre-existing 'calling' and move forward by choosing who you serve and what you can ignore to keep your life centered.
   [Lucius Annaeus Seneca, On the Shortness of Life, pd=true] [Basis: Seneca, On the Shortness of Life, Chapter 18](https://en.wikisource.org/wiki/On_the_Shortness_of_Life)

What became clearer (section D):
The debate shifted from viewing a 'calling' as an internal mystery to treating it as an active commitment. The main insight is that you are likely torn between two valid desires: the need for individual space and the need for public belonging. It remains disputed whether you should prioritize the 'what' (the work) or the 'who' (the community) first.

What the choice depends on (section E):
If you value autonomy over everything → prioritize the Stoic path of pruning your schedule to ensure your primary commitments are to your own well-being and loved ones. If you value growth through change → prioritize the Pragmatist path of choosing low-risk, high-engagement projects to see what sticks. If you are uncertain of your role → engage in a shared local project to see if action with others provides the meaning you currently lack.

=== DEBATE B ===
Situation (section A):
You are currently paralyzed by the search for a 'calling' while weighing the practical need for security against a desire for meaningful connection. The central tension lies in whether your purpose is something to be discovered as a static identity or constructed through your current actions and commitments.

Minds (section B):
- The Existentialist: The radical freedom to define one's own essence. [Jean-Paul Sartre, Existentialism is a Humanism, 1946]
- The Pragmatist: The practical calculation of utility and well-being. [John Stuart Mill, Utilitarianism, 1861]
- The Stoic: The alignment of individual action with duty and nature. [Marcus Aurelius, Meditations, 161]

Debate (section C), 9 turns:
1. The Existentialist: You are waiting for a 'calling' as if it were a pre-written script. But existence precedes essence. You do not discover a purpose; you create it by the choices you make every day.
   [Jean-Paul Sartre, Existentialism is a Humanism, pd=false] [Basis: Sartre, Existentialism is a Humanism](https://www.marxists.org/reference/archive/sartre/works/exist/sartre.htm)
2. The Pragmatist: That is a high-stakes burden. Before you try to invent your essence, consider that stability is a necessary precursor to happiness. You need a foundation of security to actually enjoy time with those you love.
   [John Stuart Mill, Utilitarianism, pd=true] [Basis: Mill, Utilitarianism, Chapter 2](https://www.utilitarianism.com/mill1.htm)
3. The Stoic: Stability is not found in external circumstances, but in how you perform your role. You are a part of a greater whole; your 'calling' is simply to act well in the situation you are currently in.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Aurelius, Meditations, Book 3](https://classics.mit.edu/Antoninus/meditations.html)
4. The Existentialist: Acting well in a situation is fine, but it risks becoming a passive acceptance of your environment. You must choose your projects, not just endure your duties, or you will never feel authentic.
   [Jean-Paul Sartre, Existentialism is a Humanism, pd=false] [Basis: Sartre, Existentialism is a Humanism](https://www.marxists.org/reference/archive/sartre/works/exist/sartre.htm)
5. The Pragmatist: I disagree that it is passive. If you choose a path that provides stability, you are maximizing your capacity to contribute to others. That is a rational way to judge the value of your choices.
   [John Stuart Mill, Utilitarianism, pd=true] [Basis: Mill, Utilitarianism, Chapter 4](https://www.utilitarianism.com/mill1.htm)
6. The Stoic: But if you focus only on the utility of your choices, you will always be anxious about the outcome. If you focus on the integrity of your actions, you find peace, regardless of how your life looks to others.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Aurelius, Meditations, Book 4](https://classics.mit.edu/Antoninus/meditations.html)
7. The Existentialist: I see the value in that focus, but only if you acknowledge that you are the one deciding what 'integrity' means. I revise my position: integrity is not a standard, it's a commitment you sustain.
   [Jean-Paul Sartre, Existentialism is a Humanism, pd=false] [Basis: Sartre, Existentialism is a Humanism](https://www.marxists.org/reference/archive/sartre/works/exist/sartre.htm)
8. The Pragmatist: That commitment makes sense if it allows for the flourishing of your relationships. Perhaps stability isn't the opposite of a calling; it's the infrastructure that lets you pursue one without crashing.
   [John Stuart Mill, Utilitarianism, pd=true] [Basis: Mill, Utilitarianism, Chapter 2](https://www.utilitarianism.com/mill1.htm)
9. The Stoic: Then we agree: you do not need to wait for a 'calling.' You need only to commit to your current responsibilities and treat your daily actions as the only project that truly belongs to you.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Aurelius, Meditations, Book 5](https://classics.mit.edu/Antoninus/meditations.html)

What became clearer (section D):
The main insight is that your 'calling' is likely not a hidden treasure but a byproduct of how you engage with your current responsibilities. The dispute remains over whether you should prioritize the pursuit of a specific project (Existentialism) or find meaning by fulfilling your duties within a stable life (Stoicism and Pragmatism). You might reflect on whether your anxiety about a calling is actually a fear of committing to one thing at the expense of others.

What the choice depends on (section E):
If your primary goal is to minimize regret for not 'trying,' prioritize small, experimental projects alongside your stable work. If your goal is to minimize anxiety about your future, focus on the immediate duties and relationships in your present environment. If you remain uncertain about what you value, test your assumptions by committing to a low-stakes, short-term project to see if the 'calling' you seek is found in the doing rather than the choosing.

Score A and B. Return the JSON object only.
