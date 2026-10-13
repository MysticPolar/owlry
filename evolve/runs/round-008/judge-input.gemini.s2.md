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
I got the promotion I worked toward for years. Nothing is really wrong, but I don’t feel satisfied. How do I figure out what’s missing?

=== DEBATE A ===
Situation (section A):
The user has achieved a long-term goal of a promotion, yet experiences a lack of fulfillment. The central tension lies in whether this feeling results from the pursuit of status, a disconnect between the role and personal values, or the realization that the goal itself was an empty placeholder for deeper meaning.

Minds (section B):
- The Hedonic Skeptic: Distinguishing necessary desires from empty, unfulfilling ones. [Epicurus, Letter to Menoeceus, -300]
- The Meaning Seeker: The necessity of transcending success to find personal purpose. [Viktor Frankl, Man's Search for Meaning, 1946]
- The Social Critic: Identifying whether success was sought for genuine utility or social validation. [Thorstein Veblen, The Theory of the Leisure Class, 1899]

Debate (section C), 9 turns:
1. The Hedonic Skeptic: Perhaps you might have been pursuing an empty desire rather than a necessary one. If you worked toward this goal expecting it to provide lasting pleasure, you might have been mistaken, as some things we crave are not grounded in actual need.
   [Epicurus, Letter to Menoeceus, pd=true] [Basis: Epicurus, Letter to Menoeceus, 127-130](https://www.epicurus.net/en/menoeceus.html)
2. The Meaning Seeker: I would argue that success is not the source of satisfaction, but merely a state of being. You might be feeling a void because you have reached a destination without having established the meaningful connections that define your life beyond your professional label.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, Part I](https://www.penguinrandomhouse.com/books/80404/mans-search-for-meaning-by-viktor-e-frankl/)
3. The Social Critic: It is likely that you were seeking what is termed pecuniary emulation. You might have mistaken the status granted by this promotion for the personal utility it was supposed to provide, realizing now that the prestige is merely a performance for others.
   [Thorstein Veblen, The Theory of the Leisure Class, pd=true] [Basis: Thorstein Veblen, The Theory of the Leisure Class, Chapter 2](https://www.gutenberg.org/ebooks/833)
4. The Hedonic Skeptic: The Social Critic suggests that the problem is merely social performance, but even if the status is performative, it may still provide the stability necessary to pursue simpler pleasures. The issue perhaps is that you are overvaluing the outcome and ignoring the quality of your daily existence.
   [Epicurus, Letter to Menoeceus, pd=true] [Basis: Epicurus, Letter to Menoeceus, 131-132](https://www.epicurus.net/en/menoeceus.html)
5. The Meaning Seeker: The Hedonic Skeptic claims we should focus on the quality of daily existence, but comfort is insufficient. You might be suffering because you have ignored your responsibility to contribute something to the world that exists outside of your own emotional state.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, Part II](https://www.penguinrandomhouse.com/books/80404/mans-search-for-meaning-by-viktor-e-frankl/)
6. The Social Critic: The Meaning Seeker suggests contribution is the remedy, yet even that is often filtered through social prestige. You might want to ask if the work you are doing is inherently productive or if it is merely a way to maintain an appearance of success in your industry.
   [Thorstein Veblen, The Theory of the Leisure Class, pd=true] [Basis: Thorstein Veblen, The Theory of the Leisure Class, Chapter 4](https://www.gutenberg.org/ebooks/833)
7. The Hedonic Skeptic: I drop my earlier claim that status is irrelevant. I concede to the Social Critic that social position has value. Perhaps the error is not the promotion itself, but the anxiety you might feel about losing it, which prevents you from enjoying the position you now hold.
   [Epicurus, Letter to Menoeceus, pd=true] [Basis: Epicurus, Letter to Menoeceus, 132](https://www.epicurus.net/en/menoeceus.html)
8. The Meaning Seeker: To test your current state, I propose you spend exactly 48 hours observing your tasks; identify which ones you would still perform if the promotion and title were stripped away. This might reveal if you are pursuing purpose or just prestige.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, Part II](https://www.penguinrandomhouse.com/books/80404/mans-search-for-meaning-by-viktor-e-frankl/)
9. The Social Critic: If you follow the suggestion of the Meaning Seeker and find you hate the tasks, then your satisfaction was indeed tied to social standing. If you enjoy the tasks, then you are a victim of the unnecessary friction created by the bureaucratic nature of your new status.
   [Thorstein Veblen, The Theory of the Leisure Class, pd=true] [Basis: Thorstein Veblen, The Theory of the Leisure Class, Chapter 13](https://www.gutenberg.org/ebooks/833)

What became clearer (section D):
The debate clarified that dissatisfaction might be a signal that the promotion provided social validation rather than intrinsic purpose or tranquility. The main dispute remains whether the remedy lies in finding meaning through contribution or in detaching one's happiness from the status the promotion provides. A self-reflection might involve questioning whether you value the work itself or the image that comes with the title.

What the choice depends on (section E):
If you find joy in the specific daily activities of the role, your dissatisfaction stems from status anxiety; focus on detaching your self-worth from the position. If you find the work itself meaningless, your dissatisfaction is a lack of purpose; investigate what contribution or connection you might be sacrificing. If it is unclear which it is, use the 48-hour observation of tasks to see which activities elicit a genuine sense of engagement.

=== DEBATE B ===
Situation (section A):
The user has achieved a long-term career goal but experiences a lingering sense of dissatisfaction. The central tension lies between the value placed on the achievement and the reality of the current, less-than-fulfilling experience. A key uncertainty is whether the dissatisfaction stems from the nature of the work itself or from a misalignment between the user's internal values and their external milestones.

Minds (section B):
- The Stoic: Internal character over external achievement [Marcus Aurelius, Meditations, 180]
- The Existentialist: Individual agency and self-definition [Jean-Paul Sartre, Existentialism is a Humanism, 1946]
- The Psychologist: The mechanics of happiness and adaptation [Daniel Kahneman, Thinking, Fast and Slow, 2011]

Debate (section C), 9 turns:
1. The Stoic: Perhaps your dissatisfaction arises because you anchored your sense of worth to an external promotion. Marcus Aurelius reminds us that if we seek the good in things outside ourselves, we might find ourselves enslaved to them rather than finding tranquility in our own rational choices.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 4](https://classics.mit.edu/Antoninus/meditations.html)
2. The Existentialist: Disputing the Stoic, the issue might not be the external goal, but the fact that you now find yourself in a state of freedom where you must choose your next project. Sartre suggests that existence precedes essence, meaning you are the one who must define what this new role signifies for your future.
   [Jean-Paul Sartre, Existentialism is a Humanism, pd=false] [Basis: Jean-Paul Sartre, Existentialism is a Humanism, Section 1](https://www.marxists.org/reference/archive/sartre/works/exist/sartre.htm)
3. The Psychologist: The Existentialist and Stoic overlook the focusing illusion. Kahneman notes that when we think about a change, we focus on the change itself rather than the background of our lives, which perhaps leaves us surprised when our daily mood does not improve as much as we expected.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 27](https://us.macmillan.com/books/9780374533557)
4. The Stoic: The Psychologist suggests the problem is the expectation of change, but perhaps if you had focused on internal excellence during those years of work, the promotion might not have been viewed as the sole arbiter of your happiness.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 2](https://classics.mit.edu/Antoninus/meditations.html)
5. The Existentialist: That view denies the anxiety you might feel in a new role where you could be required to redefine yourself entirely. If you refuse to accept the labels of your position, you might discover that you are merely projecting a need for purpose onto a title that never promised it.
   [Jean-Paul Sartre, Existentialism is a Humanism, pd=false] [Basis: Jean-Paul Sartre, Existentialism is a Humanism, Section 3](https://www.marxists.org/reference/archive/sartre/works/exist/sartre.htm)
6. The Psychologist: Maybe the user should track their daily mood for 7 days to see if the dissatisfaction occurs during specific tasks or if it is a general baseline. This data could reveal if it is the work content itself or the absence of the goal that is the real source of the struggle.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 34](https://us.macmillan.com/books/9780374533557)
7. The Stoic: I propose you look at one task in your current role that aligns with your own principles. If you can perform that task well, you might find that the work itself, rather than the promotion, provides the only meaningful return you can count on.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 3](https://classics.mit.edu/Antoninus/meditations.html)
8. The Existentialist: If you try that task and find no resonance, the choice might not be to endure but to leave. You are not defined by the effort you have already expended, and you might choose to act in a way that creates a new essence for yourself entirely outside of this path.
   [Jean-Paul Sartre, Existentialism is a Humanism, pd=false] [Basis: Jean-Paul Sartre, Existentialism is a Humanism, Section 4](https://www.marxists.org/reference/archive/sartre/works/exist/sartre.htm)
9. The Psychologist: The loss here might be the simple, clear goal you once had, which provided a stable structure for your time. If you lack a clear objective now, you might be suffering from the absence of a future-focused projection that previously occupied your thoughts and energy.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 28](https://us.macmillan.com/books/9780374533557)

What became clearer (section D):
The discussion clarified that the user's dissatisfaction might stem from a loss of structure, a misaligned expectation, or a failure to define their own meaning within the new role. Disagreement remains regarding whether the user should find meaning within the current role through internal values or define a new path entirely. A helpful self-reflection involves asking whether the feeling of emptiness is tied to the work content or the disappearance of the goal-chasing process.

What the choice depends on (section E):
If the dissatisfaction is tied to the daily work tasks, focusing on internal excellence or changing the role might be most effective. If the dissatisfaction is tied to the lack of a clear, long-term goal, creating a new, personally defined project becomes more reasonable. To learn which condition holds, track your mood during specific work activities for one week to identify whether the emptiness is localized to specific duties or pervasive throughout your time.

Score A and B. Return the JSON object only.
