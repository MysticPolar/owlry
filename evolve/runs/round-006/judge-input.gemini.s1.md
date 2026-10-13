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
I freelance, so some months are great and others are almost empty. How do I budget when I don’t know what I’ll earn?

=== DEBATE A ===
Situation (section A):
The user is a freelancer dealing with unpredictable income, which makes standard budgeting difficult. They face a tension between the need for financial security during lean months and the desire to maximize earnings during productive ones, struggling to find a sustainable rhythm without a steady paycheck.

Minds (section B):
- The Resilience Advocate: Building systems to survive and thrive on volatility [Nassim Nicholas Taleb, Antifragile, 2012]
- The Stoic Minimalist: Detachment from material fluctuation and lifestyle stability [Lucius Annaeus Seneca, Letters from a Stoic, 1917]
- The Behavioral Architect: Designing choice environments to bypass human cognitive bias [Richard Thaler, Nudge, 2008]

Debate (section C), 10 turns:
1. The Resilience Advocate: You are treating income volatility like a defect to be smoothed away, but it is actually a core feature of your work. Instead of trying to force a corporate salary structure onto your life, you should focus on limiting your downside risk during bad months while keeping your upside potential open.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Part 1](https://www.penguinrandomhouse.com/books/106684/antifragile-by-nassim-nicholas-taleb/)
2. The Stoic Minimalist: The Advocate ignores the anxiety that such volatility brings to the mind. If you simplify your requirements and live well below your means, you will find that the fluctuations in your income no longer dictate the quality of your existence, for you have already prepared for the lean times.
   [Lucius Annaeus Seneca, Letters from a Stoic, pd=true] [Basis: Lucius Annaeus Seneca, Letters from a Stoic, Letter 18](https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_18)
3. The Behavioral Architect: The Minimalist relies on willpower, which is a fragile resource, but you should use mental accounting to create a buffer. By treating your freelance earnings like a flow into a private reservoir, you can pay yourself a fixed salary regardless of what actually comes in that month.
   [Richard Thaler, Nudge, pd=false] [Basis: Richard Thaler, Nudge, Chapter 5](https://www.penguinrandomhouse.com/books/201297/nudge-by-richard-h-thaler-and-cass-r-sunstein/)
4. The Resilience Advocate: The Architect offers a defensive wall, but that buffer is a static solution to a dynamic problem. If you hoard too much in a low-interest reservoir, you are losing the ability to reinvest that capital into opportunities that only appear during the high-income months.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Part 4](https://www.penguinrandomhouse.com/books/106684/antifragile-by-nassim-nicholas-taleb/)
5. The Stoic Minimalist: The Architect suggests we can automate our peace, but if you need a buffer to stop your heart from racing, your lifestyle is already too fragile. You might consider that the fear of a bad month comes from assuming that your current spending level is the only way to live.
   [Lucius Annaeus Seneca, Letters from a Stoic, pd=true] [Basis: Lucius Annaeus Seneca, Letters from a Stoic, Letter 2](https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_2)
6. The Behavioral Architect: The Minimalist assumes you can simply choose to be less anxious, but human nature is notoriously bad at predicting its own resilience. An automated system acts as a nudge to yourself, ensuring you do not consume your gains when times are flush and regret it later.
   [Richard Thaler, Nudge, pd=false] [Basis: Richard Thaler, Nudge, Chapter 1](https://www.penguinrandomhouse.com/books/201297/nudge-by-richard-h-thaler-and-cass-r-sunstein/)
7. The Resilience Advocate: I will concede that the Architect’s systems can prevent catastrophic failure during a drought. However, I drop the claim that you should leave all your surplus unallocated; you should use a barbell strategy, keeping a large portion safe while using a smaller portion for aggressive growth.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Part 3](https://www.penguinrandomhouse.com/books/106684/antifragile-by-nassim-nicholas-taleb/)
8. The Stoic Minimalist: The Architect argues for systems to manage money, and the Advocate for systems to manage risk, but they both ignore the cost of constant calculation. If you are always tracking every penny for a barbell or a reservoir, you might be losing the time that the freelance life is meant to protect.
   [Lucius Annaeus Seneca, Letters from a Stoic, pd=true] [Basis: Lucius Annaeus Seneca, Letters from a Stoic, Letter 1](https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_1)
9. The Behavioral Architect: The Minimalist notes the burden of tracking, but the goal is set-and-forget automation. If you believe you are fearful, you may want the cushion that the Architect provides; if you are ambitious, you may want the barbell that the Advocate suggests, but both require an initial setup.
   [Richard Thaler, Nudge, pd=false] [Basis: Richard Thaler, Nudge, Chapter 3](https://www.penguinrandomhouse.com/books/201297/nudge-by-richard-h-thaler-and-cass-r-sunstein/)
10. The Resilience Advocate: The dispute remains open: does the freelancer want peace of mind or maximum exposure to the upside? If they are truly fearful of the empty month, the Architect wins. If they believe their volatility is a path to gain, the barbell is the only logical path forward.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Part 7](https://www.penguinrandomhouse.com/books/106684/antifragile-by-nassim-nicholas-taleb/)

What became clearer (section D):
The debate highlights a core tension: whether to treat income variability as a risk to be neutralized via automated buffers or as an opportunity to be harnessed through strategic allocation. The main insight is that your choice depends on whether your primary goal is the prevention of anxiety or the cultivation of long-term upside. What remains disputed is the extent to which self-discipline can replace structural systems, with the Minimalist favoring internal character and the others favoring external architecture.

What the choice depends on (section E):
If your primary goal is peace of mind during lean periods, a fixed-salary reservoir (The Behavioral Architect) is most reasonable because it eliminates the need for constant, stressful decisions. If your goal is to capitalize on high-income months for growth, the barbell strategy (The Resilience Advocate) is more reasonable, as it keeps you agile. If you are uncertain of your true priority, track your reaction to a recent bad month: if you felt panic, prioritize the buffer; if you felt bored or eager for the next project, prioritize the barbell.

=== DEBATE B ===
Situation (section A):
The user is struggling to maintain a consistent budget due to the inherent volatility of freelance income. They are caught between the need for financial stability and the unpredictable nature of their work, creating anxiety around how to plan for the future.

Minds (section B):
- The Stoic Practitioner: Separating external outcomes from internal control [Epictetus, Enchiridion, 135]
- The Risk Analyst: Managing volatility through probability and buffers [Nassim Nicholas Taleb, Antifragile, 2012]
- The Behavioral Pragmatist: Aligning habits with psychological constraints [Daniel Kahneman, Thinking, Fast and Slow, 2011]

Debate (section C), 9 turns:
1. The Stoic Practitioner: You suffer because you insist that your income must be predictable, but it is not. You have control over your spending, not your earnings. Focus entirely on reducing your fixed costs until they match your leanest months.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, section 1](https://standardebooks.org/ebooks/epictetus/enchiridion/elizabeth-carter/text/single-page)
2. The Risk Analyst: That is too passive. You should view your income as a variable with high tails. Instead of cutting everything to the bone, you need a buffer. In an uncertain environment, you must build redundancy so that a bad month does not become a systemic collapse.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Chapter 1](https://www.worldcat.org/title/818465063)
3. The Behavioral Pragmatist: The user suggests they worry about the future, but they might just be experiencing the pain of loss aversion. When money is tight, we over-focus on the loss of security rather than the actual utility of the current cash flow.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 26](https://www.worldcat.org/title/773539828)
4. The Stoic Practitioner: If the user is attached to an ideal of steady income, they will always be disappointed. Epictetus would say that if you seek to avoid the pain of empty months by obsessing over probabilities, you are still letting external events dictate your peace of mind.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, section 8](https://standardebooks.org/ebooks/epictetus/enchiridion/elizabeth-carter/text/single-page)
5. The Risk Analyst: Peace of mind is not a strategy. The user needs to realize that they are taking on too much fragility. If they lived on last month's income instead of this month's, they would create the safety margin needed to treat the volatility as an asset rather than a threat.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Chapter 15](https://www.worldcat.org/title/818465063)
6. The Behavioral Pragmatist: While that buffer is smart, the user's fear might be irrational. Kahneman would point out that we often overestimate the likelihood of a total disaster. They might be choosing between two things: total current freedom and total future security, and they want both.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 13](https://www.worldcat.org/title/773539828)
7. The Stoic Practitioner: I concede that a buffer provides a physical safety net, but it does not fix the mind. Whether you have money in the bank or not, the only true safety is in knowing that your happiness does not depend on the balance.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, section 14](https://standardebooks.org/ebooks/epictetus/enchiridion/elizabeth-carter/text/single-page)
8. The Risk Analyst: I was wrong to ignore the psychological state. However, if the user does not have a tangible, mechanical system to handle the money, the mind will always be under stress. A rule-based system turns the internal struggle into a simple administrative task.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Chapter 20](https://www.worldcat.org/title/818465063)
9. The Behavioral Pragmatist: Ultimately, the disagreement remains between the pursuit of detachment and the pursuit of mechanical security. What would settle this is knowing whether the user's anxiety comes from real financial risk or from a misperception of their own resilience.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 30](https://www.worldcat.org/title/773539828)

What became clearer (section D):
The debate highlights a tension between the internal work of accepting uncertainty and the external work of building financial systems to withstand it. It remains disputed whether the user needs to change their mindset to stop fearing the volatility or change their banking habits to stop feeling the impact of it. A possible self-reflection is to ask whether one values the peace of having no financial expectations more than the potential gain of higher, albeit irregular, earnings.

What the choice depends on (section E):
If the user has significant savings but still feels panicked during slow months → the choice depends on shifting the mindset to accept randomness, as the financial risk is already mitigated. If the user lives month-to-month without a buffer → the choice depends on implementing mechanical systems, like living on last month's income, to create a structural floor for their budget. If the root of the anxiety is unknown → track spending against income for three months to distinguish between genuine financial danger and the psychological discomfort of variability.

Score A and B. Return the JSON object only.
