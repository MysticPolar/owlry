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
The user experiences significant income volatility as a freelancer, leading to stress when balancing unpredictable earnings with fixed expenses. They are struggling to find a budgeting approach that provides security without requiring a stable monthly paycheck. A decisive uncertainty remains: whether this fluctuation is a temporary hurdle during a growth phase or a permanent state of their professional life.

Minds (section B):
- The Stoic: Maintaining internal stability regardless of external circumstances. [Marcus Aurelius, Meditations, 167]
- The Pragmatist: Managing risk to ensure survival through extreme volatility. [Nassim Nicholas Taleb, Antifragile, 2012]
- The Planner: Reducing the impact of cognitive biases on financial projections. [Daniel Kahneman, Thinking, Fast and Slow, 2011]

Debate (section C), 9 turns:
1. The Stoic: The user might be suffering because they view income as an external good they must master. As Marcus Aurelius noted, "The happiness of your life depends upon the quality of your thoughts," so perhaps they should focus on detaching their peace of mind from the fluctuating balance of their accounts.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 5](https://classics.mit.edu/Antoninus/meditations.html)
2. The Pragmatist: The Stoic's detachment ignores the reality of ruin. If the user does not adopt a barbell strategy—keeping extreme safety in low-risk reserves while taking calculated risks elsewhere—they might find that their professional freedom is lost to simple bankruptcy when the empty months persist.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Chapter 1](https://www.worldcat.org/title/antifragile-things-that-gain-from-disorder/oclc/772844697)
3. The Planner: The Pragmatist assumes the user can perfectly assess their own risk, but the user might be falling victim to the planning fallacy. People often underestimate how long an empty period can last because they are overly optimistic about their own agency in generating new work.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 23](https://www.worldcat.org/title/thinking-fast-and-slow/oclc/741634785)
4. The Stoic: The Planner points out a useful limitation in our confidence, yet worrying about future gaps only multiplies the current struggle. Maybe if the user learned to live with less during the good months, they would find that their needs are far fewer than they fear.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 4](https://classics.mit.edu/Antoninus/meditations.html)
5. The Pragmatist: The Stoic suggests living with less, but that is a passive strategy that fails to capitalize on volatility. The user should seek to be antifragile, meaning they gain from the stress of these empty months by using that time to build assets that pay off when the market turns favorable again.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Chapter 3](https://www.worldcat.org/title/antifragile-things-that-gain-from-disorder/oclc/772844697)
6. The Planner: The Pragmatist assumes that effort during downtime leads to future gain, but the user might suffer from an availability bias, where they weigh recent successes too heavily. They might need to look at the statistical median of their yearly income rather than the highs to set a baseline budget.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 13](https://www.worldcat.org/title/thinking-fast-and-slow/oclc/741634785)
7. The Stoic: I concede to the Planner that looking at the statistical median provides a clearer view of reality than mere internal mindset. I adjust my position: one should maintain an internal calm, but use objective external data to define the boundaries of what is considered essential spending.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 9](https://classics.mit.edu/Antoninus/meditations.html)
8. The Pragmatist: The Stoic now talks of essential spending, but this is a trap; if you define your needs too narrowly, you lose the flexibility required to react to real-world shifts. The goal is to keep your costs variable so they drop when income drops, not to fix them to a median that might never manifest.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Chapter 6](https://www.worldcat.org/title/antifragile-things-that-gain-from-disorder/oclc/772844697)
9. The Planner: The Pragmatist argues for total variability, yet the user might desire stability that purely variable living destroys. There is a conflict between the need for security and the need for freedom, and the choice depends on whether the user views their career as a series of bets or a long-term professional identity.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 24](https://www.worldcat.org/title/thinking-fast-and-slow/oclc/741634785)

What became clearer (section D):
The debate highlights a tension between viewing income as a risk to be mitigated through systemic buffers (Pragmatist) and viewing it as a psychological challenge to be met with adjusted expectations (Stoic/Planner). The main insight is that budgeting for a freelancer is less about predicting the future and more about deciding how much variability one can tolerate before it compromises their long-term goals. The disagreement remains over whether the user should prioritize rigid cost-cutting based on statistical averages or cultivate extreme financial agility to exploit the fluctuations themselves.

What the choice depends on (section E):
If the user’s income volatility is a permanent feature of their industry → a strategy of extreme cost variability and high liquidity is more reasonable, as it minimizes the risk of ruin during downturns. If the volatility is a temporary growth phase → setting a budget based on a conservative annual median and ignoring the short-term fluctuations is more reasonable, as it maintains stability for long-term planning. If the decisive fact of whether this is temporary or permanent is unknown → the most proportionate way to learn it is to track the moving average of their income over the past 24 months to see if the volatility is actually narrowing or staying constant.

=== DEBATE B ===
Situation (section A):
The user is struggling with the instability of freelance income, finding it difficult to create a reliable budget when earnings fluctuate significantly month-to-month. The central tension lies between the need for structural security and the reality of an unpredictable cash flow. A key uncertainty is whether the user prioritizes avoiding the anxiety of low-income months or maximizing their long-term growth by reinvesting during high-income months.

Minds (section B):
- The Stoic Planner: Emotional stability through detachment from fortune [Epictetus, Enchiridion, 135]
- The Pragmatic Tactician: Managing volatility through buffer strategies [Nassim Nicholas Taleb, Antifragile, 2012]
- The Value Prioritizer: Allocating resources to meaningful life goals [William B. Irvine, A Guide to the Good Life, 2008]

Debate (section C), 9 turns:
1. The Stoic Planner: You suffer because you treat income as a reliable servant rather than an external event. If you accept that your earnings are not entirely under your control, the anxiety of an empty month loses its power. Focus on your own labor, which is your only truly controllable asset.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, section 1](https://classics.mit.edu/Epictetus/epicench.html)
2. The Pragmatic Tactician: Detachment is fine for the mind, but not for the bank account. You need to become antifragile by ensuring that a bad month does not break your system. Build a buffer that allows you to thrive on volatility rather than just enduring it.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Chapter 1](Source not verified for specific link)
3. The Value Prioritizer: But a buffer is only a means to an end. You could say you want financial freedom, but if you hoard too much, you miss the point of living well now. Decide what brings you genuine tranquility and budget for that, not just for a rainy day.
   [William B. Irvine, A Guide to the Good Life, pd=false] [Basis: William B. Irvine, A Guide to the Good Life, Chapter 10](Source not verified for specific link)
4. The Stoic Planner: I concede that preparing for the future is rational, but don't let it become a new source of obsession. If you focus too much on the fear of an empty month, you are no longer free; you are a slave to your bank balance.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, section 2](https://classics.mit.edu/Epictetus/epicench.html)
5. The Pragmatic Tactician: It is not obsession to have a plan for bad outcomes. If you have skin in the game, you naturally prioritize survival. A simple rule is to always live on your lowest recorded monthly income, treating any surplus as an insurance premium against future dry spells.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Chapter 20](Source not verified for specific link)
6. The Value Prioritizer: I disagree with the rigid survival rule. One could say they fear missing out on life experiences while they are young. Is it better to be safe and miserable, or to take calculated risks that align with your deepest values? The cost of safety is often lost time.
   [William B. Irvine, A Guide to the Good Life, pd=false] [Basis: William B. Irvine, A Guide to the Good Life, Chapter 15](Source not verified for specific link)
7. The Stoic Planner: Wait—perhaps I was too dismissive of the practical need for order. When you align your budget with your values, you are choosing your path. If you accept the instability as a fact of your trade, the anxiety of not knowing the future vanishes because you know how you will react.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, section 5](https://classics.mit.edu/Epictetus/epicench.html)
8. The Pragmatic Tactician: That is a move toward stability! By deciding in advance how to behave during a lean month, you remove the choice from the moment of panic. This is what I mean by having a strategy that accounts for the reality of your situation, not your hopes.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, Chapter 12](Source not verified for specific link)
9. The Value Prioritizer: The disagreement remains: should the user prioritize the security of a large buffer or the immediate fulfillment of life goals? The deciding factor is how much they value present tranquility over the future reduction of risk. I see no objective answer here.
   [William B. Irvine, A Guide to the Good Life, pd=false] [Basis: William B. Irvine, A Guide to the Good Life, Chapter 17](Source not verified for specific link)

What became clearer (section D):
The debate clarified that budgeting is not just a math problem but a choice between emotional resilience and tangible security. While the minds agree on the necessity of preparation, they differ on the weight of present versus future consumption. The core insight is that you can build a system that absorbs uncertainty, provided you are clear about what you are sacrificing to achieve that stability.

What the choice depends on (section E):
If your primary goal is avoiding the stress of uncertainty → adopt the Pragmatic Tactician's approach by basing your lifestyle on your lowest income month to create a natural buffer. If your goal is maximizing life experience → adopt the Value Prioritizer's approach, budgeting for essential security but aggressively investing in meaningful experiences during high-income months. To decide, identify the exact dollar amount of your 'peace of mind' reserve and compare it against your desired life experiences.

Score A and B. Return the JSON object only.
