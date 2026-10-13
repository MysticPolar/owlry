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
The user achieved a long-term goal of a promotion but feels a lack of fulfillment afterward. The central tension is between the value of the achievement itself versus the process of daily engagement, leaving the user to wonder if their dissatisfaction stems from the nature of the work or their own expectations.

Minds (section B):
- The Absurdist: The void created by reaching a goal that lacks intrinsic meaning. [Albert Camus, The Myth of Sisyphus, 1942]
- The Flow Theorist: The quality of engagement and the match between skill and challenge. [Mihaly Csikszentmihalyi, Flow: The Psychology of Optimal Experience, 1990]
- The Epicurean: The difference between natural, necessary desires and empty pursuits. [Epicurus, Letter to Menoeceus, -300]

Debate (section C), 12 turns:
1. The Absurdist: You might feel unsatisfied because the goal was merely a distraction from the silent void. Albert Camus suggests in The Myth of Sisyphus that humans build structures like promotions to avoid facing the absurdity of their existence, and reaching the peak just reveals there is no further mountain to climb.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 1](https://www.marxists.org/reference/subject/philosophy/works/fr/camus.htm)
2. The Flow Theorist: Perhaps you are missing the engagement, not the meaning. If you now feel bored or disconnected, it might be because the promotion shifted your tasks away from those that allow you to lose yourself in the process, as Mihaly Csikszentmihalyi describes in Flow when discussing the balance of challenge and skill.
   [Mihaly Csikszentmihalyi, Flow: The Psychology of Optimal Experience, pd=false] [Basis: Mihaly Csikszentmihalyi, Flow: The Psychology of Optimal Experience, Chapter 4](https://www.worldcat.org/title/flow-the-psychology-of-optimal-experience/oclc/21412856)
3. The Epicurean: The Absurdist claims the goal is a distraction, but it is more likely you desire things that are not necessary or natural. As Epicurus writes in his Letter to Menoeceus, "we require pleasure only when we do not feel pain from the absence of pleasure; and when we do not feel pain, we no longer require pleasure."
   [Epicurus, Letter to Menoeceus, pd=true] [Basis: Epicurus, Letter to Menoeceus, Section 131](https://www.epicurus.net/en/menoeceus.html)
4. The Absurdist: The Flow Theorist suggests the issue is about losing oneself in a task, but this ignores that any task eventually leads to the same repetitive cycle. Even if you find a new challenge, you might find yourself eventually back in this same state of dissatisfaction once that task is completed.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 1](https://www.marxists.org/reference/subject/philosophy/works/fr/camus.htm)
5. The Flow Theorist: The Absurdist argues that every task leads to a cycle, but they overlook that the quality of the journey matters more than the destination. You might want to assess whether your new role requires you to use your skills, as satisfaction comes from the constant refinement of ability.
   [Mihaly Csikszentmihalyi, Flow: The Psychology of Optimal Experience, pd=false] [Basis: Mihaly Csikszentmihalyi, Flow: The Psychology of Optimal Experience, Chapter 3](https://www.worldcat.org/title/flow-the-psychology-of-optimal-experience/oclc/21412856)
6. The Epicurean: The Flow Theorist assumes that skill refinement leads to satisfaction, but this might just be trading one restless desire for another. If you think you need more engagement to be happy, you might be creating new, unnecessary anxieties that prevent the very tranquility you could have by simply desiring less.
   [Epicurus, Letter to Menoeceus, pd=true] [Basis: Epicurus, Letter to Menoeceus, Section 128](https://www.epicurus.net/en/menoeceus.html)
7. The Absurdist: If the Epicurean is right that you could find peace by wanting less, you might lose the only thing keeping you tethered to the world. Perhaps what you fear losing is not the status of the promotion, but the feeling of purpose that striving provided, even if that purpose was an illusion.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 1](https://www.marxists.org/reference/subject/philosophy/works/fr/camus.htm)
8. The Flow Theorist: I will accept that purpose might be hard to define, but you can act now. Try tracking your workday for 5 days. Note every hour where you felt truly absorbed in a task versus checking the clock. If you find few such hours, your dissatisfaction might simply be a lack of engagement.
   [Mihaly Csikszentmihalyi, Flow: The Psychology of Optimal Experience, pd=false] [Basis: Mihaly Csikszentmihalyi, Flow: The Psychology of Optimal Experience, Chapter 4](https://www.worldcat.org/title/flow-the-psychology-of-optimal-experience/oclc/21412856)
9. The Epicurean: The Flow Theorist proposes tracking hours, but this might only deepen your obsession with measuring your worth. If you are constantly monitoring your own satisfaction, you might be preventing the state of ataraxia, or mental repose, which requires letting go of such self-conscious analysis.
   [Epicurus, Letter to Menoeceus, pd=true] [Basis: Epicurus, Letter to Menoeceus, Section 132](https://www.epicurus.net/en/menoeceus.html)
10. The Absurdist: I drop my claim that the promotion is merely a useless distraction after hearing the Epicurean point about tranquility. I now hold that the goal might be valid if it allows you to confront your reality without needing to hide behind the promise of some future, final satisfaction.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 4](https://www.marxists.org/reference/subject/philosophy/works/fr/camus.htm)
11. The Flow Theorist: The distinction remains between finding meaning in the work versus finding it in the status. If you can use this role to focus on tasks that challenge you, the promotion itself might become secondary, serving as a platform for activity rather than an end in itself.
   [Mihaly Csikszentmihalyi, Flow: The Psychology of Optimal Experience, pd=false] [Basis: Mihaly Csikszentmihalyi, Flow: The Psychology of Optimal Experience, Chapter 5](https://www.worldcat.org/title/flow-the-psychology-of-optimal-experience/oclc/21412856)
12. The Epicurean: We remain divided on whether your dissatisfaction comes from the nature of the work or from the habit of chasing goals. What would decide this is whether you feel more at peace when you are busy and productive or when you are doing nothing at all, a detail you have not yet provided.
   [Epicurus, Letter to Menoeceus, pd=true] [Basis: Epicurus, Letter to Menoeceus, Section 129](https://www.epicurus.net/en/menoeceus.html)

What became clearer (section D):
The debate suggests that the lack of satisfaction might not be about the promotion itself, but about whether the user derived their identity from the act of chasing it. The main dispute remains whether true fulfillment is found in active, challenging engagement or in the capacity to find peace without external markers of success.

What the choice depends on (section E):
If you find that you feel most content when you are deeply absorbed in a task, then seeking out complex challenges in your new role becomes a reasonable way to move forward. If you realize that your anxiety persists even during leisure, then reconsidering your reliance on external milestones for self-worth is likely necessary. To learn which applies, observe whether your dissatisfaction disappears when you are fully engaged in a hobby or a personal project unrelated to your job.

=== DEBATE B ===
Situation (section A):
You achieved a long-term goal of a promotion, yet you feel unsatisfied rather than fulfilled. The central tension is whether this dissatisfaction stems from the natural adaptation to new circumstances, a lack of deep purpose, or the social dynamics of your new peer group. The decisive uncertainty is whether your discontent arises from an internal mismatch of values or an external recalibration of status.

Minds (section B):
- The Mis-Predictor: Emotional adaptation [Dan Gilbert, Stumbling on Happiness, 2006]
- The Meaning Seeker: Purpose and responsibility [Viktor Frankl, Man's Search for Meaning, 1946]
- The Social Comparer: Relative standing [Leon Festinger, A Theory of Social Comparison Processes, 1954]

Debate (section C), 9 turns:
1. The Mis-Predictor: You might have anticipated that this promotion would create a permanent shift in your happiness, but you are likely experiencing the habituation of a new state where the initial thrill fades as the reality of the new role settles in.
   [Dan Gilbert, Stumbling on Happiness, pd=false] [Basis: Dan Gilbert, Stumbling on Happiness, Chapter 6](https://www.goodreads.com/book/show/22557.Stumbling_on_Happiness)
2. The Meaning Seeker: The Mis-Predictor assumes the goal was only to feel happy, yet you might be struggling because the promotion offers status without providing a deeper sense of why your daily contributions matter to the world beyond your office.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, Part II](https://www.goodreads.com/book/show/4069.Man_s_Search_for_Meaning)
3. The Social Comparer: The Meaning Seeker ignores that you likely evaluate your success by looking at your peers; you might feel unsatisfied because your new status places you in a group where you are no longer the one who stands out.
   [Leon Festinger, A Theory of Social Comparison Processes, pd=false] [Basis: Leon Festinger, A Theory of Social Comparison Processes, Section 1](https://www.goodreads.com/book/show/244342.A_Theory_of_Social_Comparison_Processes)
4. The Mis-Predictor: The Social Comparer argues that status is the primary driver, but perhaps you simply underestimated how much the daily tedium of the new role would detract from the joy you expected to feel once you arrived at your destination.
   [Dan Gilbert, Stumbling on Happiness, pd=false] [Basis: Dan Gilbert, Stumbling on Happiness, Chapter 7](https://www.goodreads.com/book/show/22557.Stumbling_on_Happiness)
5. The Meaning Seeker: You might be overlooking that if you do not find a task that demands your unique participation, even a high-status role will feel empty because it does not engage the part of you that wants to be useful.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, Part II](https://www.goodreads.com/book/show/4069.Man_s_Search_for_Meaning)
6. The Social Comparer: The Meaning Seeker suggests that internal utility is the answer, but you could be suffering because you are comparing yourself to an idealized version of your peers rather than focusing on the reality of the work itself.
   [Leon Festinger, A Theory of Social Comparison Processes, pd=false] [Basis: Leon Festinger, A Theory of Social Comparison Processes, Section 2](https://www.goodreads.com/book/show/244342.A_Theory_of_Social_Comparison_Processes)
7. The Mis-Predictor: I drop the claim that you just wanted the arrival; The Meaning Seeker is right that you might need a connection to something larger, even if that connection is merely a way to stabilize your emotional output after the promotion.
   [Dan Gilbert, Stumbling on Happiness, pd=false] [Basis: Dan Gilbert, Stumbling on Happiness, Chapter 8](https://www.goodreads.com/book/show/22557.Stumbling_on_Happiness)
8. The Social Comparer: The Mis-Predictor concedes too much to purpose, because if you do not acknowledge that you are measuring your worth against the success of your colleagues, you will continue to feel like you are missing something regardless of the meaning you find.
   [Leon Festinger, A Theory of Social Comparison Processes, pd=false] [Basis: Leon Festinger, A Theory of Social Comparison Processes, Section 3](https://www.goodreads.com/book/show/244342.A_Theory_of_Social_Comparison_Processes)
9. The Meaning Seeker: You might test this by spending one week documenting which specific tasks make you feel that you are contributing something beyond your job description, which could help you see if your current dissatisfaction is a crisis of purpose or status.
   [Viktor Frankl, Man's Search for Meaning, pd=false] [Basis: Viktor Frankl, Man's Search for Meaning, Part II](https://www.goodreads.com/book/show/4069.Man_s_Search_for_Meaning)

What became clearer (section D):
The discussion clarified that your dissatisfaction may be a byproduct of either a natural emotional reset, a search for deeper purpose, or a change in your social reference group. The main dispute remains whether your happiness depends on internal meaning or relative external standing.

What the choice depends on (section E):
If you feel drained by the work itself, your challenge might be a lack of purpose, suggesting you should seek projects that align with your personal values. If you feel fine with the work but troubled by your status, your challenge might be social comparison, suggesting you should limit your focus to your own progress rather than your peers. If you remain unsure, tracking your daily tasks for one week could reveal if your dissatisfaction is tied to the content of your work or your environment.

Score A and B. Return the JSON object only.
