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
I have $3,000 saved and $2,000 in credit-card debt at 22% interest. Should I pay it off or keep the money for emergencies?

=== DEBATE A ===
Situation (section A):
You are balancing a $3,000 emergency fund against a $2,000 credit card debt carrying a 22% interest rate. You might be weighing the risk of an unexpected expense against the guaranteed loss of paying high interest, leaving you unsure whether to prioritize debt elimination or financial liquidity.

Minds (section B):
- The Pragmatist: Mathematical efficiency and debt elimination [Dave Ramsey, The Total Money Makeover, 2003]
- The Risk Manager: Resilience and avoiding ruin [Nassim Taleb, Antifragile, 2012]
- The Stoic: Internal peace and focus on the present [Marcus Aurelius, Meditations, 167]

Debate (section C), 9 turns:
1. The Pragmatist: You should pay off the debt immediately because 22% interest is a financial emergency that works against you every day. Clearing this balance frees up your income, and if you start today, you could be debt-free in a matter of seconds by transferring the funds.
   [Dave Ramsey, The Total Money Makeover, pd=false] [Basis: Dave Ramsey, The Total Money Makeover, Chapter 1]
2. The Risk Manager: The Pragmatist suggests paying off the debt immediately, but that leaves you fragile. If you empty your savings and an unexpected event occurs, you might be forced to borrow at even higher costs, creating a sequence of fragility that you should avoid at all costs.
   [Nassim Taleb, Antifragile, pd=false] [Basis: Nassim Taleb, Antifragile, Chapter 1]
3. The Stoic: You might feel trapped by this burden, but remember that the weight of the debt is often in the mind. If you are unsettled by the debt, the anxiety itself becomes a tax on your life, perhaps worse than the interest rate you are paying.
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 4]
4. The Pragmatist: The Risk Manager says you are fragile, yet you are already losing money by keeping cash in a low-interest account while paying 22% interest. Every dollar you hold while in debt is a dollar you are essentially paying for the privilege of keeping.
   [Dave Ramsey, The Total Money Makeover, pd=false] [Basis: Dave Ramsey, The Total Money Makeover, Chapter 4]
5. The Risk Manager: The Pragmatist argues that holding cash is a loss, but that ignores the cost of being unable to handle a crisis without new debt. If you keep $1,000 as a cushion, you maintain a buffer against the unknown, which is more valuable than the interest you save by paying the debt in full.
   [Nassim Taleb, Antifragile, pd=false] [Basis: Nassim Taleb, Antifragile, Chapter 3]
6. The Stoic: The Pragmatist mentions that you are paying for the privilege of keeping cash, but you might fear being vulnerable if you lose that safety net. Is it possible that your real concern is not the math, but the comfort of knowing you can handle a sudden shift in fortune?
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 9]
7. The Pragmatist: I drop my position that you should pay it all off, and I take the Risk Manager's point that you need a safety net. I now suggest you pay $1,500 toward the debt today and keep $1,500 in savings, which balances your need for progress with a reasonable buffer.
   [Dave Ramsey, The Total Money Makeover, pd=false] [Basis: Dave Ramsey, The Total Money Makeover, Chapter 6]
8. The Risk Manager: The Pragmatist proposes a $1,500 split, but if an emergency requires $2,000, you are still short. This option carries the cost of potentially needing to use that credit card again, which would likely defeat the purpose of your initial payment and leave you in the same cycle.
   [Nassim Taleb, Antifragile, pd=false] [Basis: Nassim Taleb, Antifragile, Chapter 12]
9. The Stoic: The disagreement remains: does the security of cash outweigh the cost of debt? This depends on whether you value current tranquility or future interest savings more. Have you looked at your budget to see if you can pay the debt down monthly while keeping your savings intact?
   [Marcus Aurelius, Meditations, pd=true] [Basis: Marcus Aurelius, Meditations, Book 2]

What became clearer (section D):
The debate highlights a tension between financial optimization and emotional security. The main insight is that paying off debt is a mathematical gain, but maintaining an emergency fund is a structural protection against volatility. The path forward depends on your tolerance for the risk of a future emergency versus your desire to stop the drain of high-interest payments.

What the choice depends on (section E):
If your primary goal is to minimize long-term interest costs → pay the $2,000 immediately, as the 22% rate acts as a guaranteed loss that compounds over time. If your primary goal is to avoid the risk of new debt during a crisis → pay $1,000 toward the debt and keep $2,000 as a cushion, which preserves your ability to handle immediate shocks. If it remains unclear whether you can manage the debt monthly without relying on the credit card again → check your last three months of bank statements to calculate your actual monthly surplus and determine if a debt-reduction plan is sustainable.

=== DEBATE B ===
Situation (section A):
You have $3,000 in savings and $2,000 in high-interest credit card debt at 22%. You are weighing the mathematical certainty of avoiding interest costs against the psychological and practical security of maintaining a liquid emergency fund.

Minds (section B):
- The Pragmatist: Eliminating financial burdens and waste [Benjamin Franklin, The Way to Wealth, 1758]
- The Risk Manager: Resilience against unpredictable shocks [Nassim Nicholas Taleb, The Black Swan, 2007]
- The Behavioral Economist: The psychological impact of loss and security [Daniel Kahneman, Thinking, Fast and Slow, 2011]

Debate (section C), 9 turns:
1. The Pragmatist: You should pay off the debt immediately, for as it is written, those who go a-borrowing go a-sorrowing, and 22 percent interest is a heavy sorrow that drains your future prosperity.
   [Benjamin Franklin, The Way to Wealth, pd=true] [Basis: Benjamin Franklin, The Way to Wealth, Section 1](https://www.gutenberg.org/files/1476/1476-h/1476-h.htm)
2. The Risk Manager: You forget that debt is a mere number, but survival is a state of being. If you empty your savings, a minor emergency might force you back into debt at even worse terms.
   [Nassim Nicholas Taleb, The Black Swan, pd=false] [Basis: Nassim Nicholas Taleb, The Black Swan, Chapter 16]
3. The Behavioral Economist: Perhaps you might feel that holding cash gives you a sense of control, even if the math argues otherwise, because we often weigh the pain of losing money higher than the gain of saving interest.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 26]
4. The Pragmatist: The Risk Manager suggests that we need buffers, but if you keep cash while paying high interest, you are paying a huge premium for a safety net that is effectively costing you a fortune.
   [Benjamin Franklin, The Way to Wealth, pd=true] [Basis: Benjamin Franklin, The Way to Wealth, Section 1](https://www.gutenberg.org/files/1476/1476-h/1476-h.htm)
5. The Risk Manager: The Pragmatist claims we should focus on the cost of debt, yet if a sudden, large emergency strikes, that feeling of safety evaporates when you have no liquidity to navigate the catastrophe.
   [Nassim Nicholas Taleb, The Black Swan, pd=false] [Basis: Nassim Nicholas Taleb, The Black Swan, Chapter 15]
6. The Behavioral Economist: Maybe you are trapped between wanting to avoid the future debt interest and wanting to avoid the immediate anxiety of being broke, which are two conflicting goals that often drive irrational choices.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 30]
7. The Pragmatist: I drop my claim that you must pay it all off immediately, moved by the Risk Manager’s point about shocks; perhaps you could pay off $1,500 and keep $1,500 in your account.
   [Benjamin Franklin, The Way to Wealth, pd=true] [Basis: Benjamin Franklin, The Way to Wealth, Section 1](https://www.gutenberg.org/files/1476/1476-h/1476-h.htm)
8. The Risk Manager: The Pragmatist now suggests a compromise, but that middle ground is still fragile, for if a $2,000 emergency hits, you are exactly where you started, only with less interest but no buffer.
   [Nassim Nicholas Taleb, The Black Swan, pd=false] [Basis: Nassim Nicholas Taleb, The Black Swan, Chapter 22]
9. The Behavioral Economist: The dispute remains open because it depends on whether you value the mathematical saving more than the peace of mind; have you ever faced an emergency that cost more than your current savings?
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 26]

What became clearer (section D):
The main insight is that financial decisions are rarely purely mathematical; they are attempts to balance debt reduction with protection against catastrophic uncertainty. The disagreement persists regarding whether cash liquidity is a necessary hedge against rare, high-impact events or merely a costly psychological comfort. You might reflect on whether your past emergency experiences justify a high premium for liquidity.

What the choice depends on (section E):
If you are certain that your job and health are secure, paying off the debt becomes more reasonable because the mathematical gain outweighs the risk of an emergency. If you are prone to high-anxiety states or have volatile expenses, keeping the cash becomes more reasonable because it prevents the cognitive load of financial instability. If the frequency and cost of your past emergencies remain unknown, track your actual emergency expenses over the last 12 months to determine a rational buffer size.

Score A and B. Return the JSON object only.
