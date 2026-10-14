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
You are balancing the desire for financial security against the high cost of credit card debt. You are unsure whether your $3,000 in savings functions better as an emergency shield or as a source of capital to extinguish a debt growing at 22% interest.

Minds (section B):
- The Tactician: Efficiency and eliminating high-cost vulnerabilities. [Sun Tzu, The Art of War, -500]
- The Risk Realist: Systemic fragility and survival in extreme events. [Nassim Taleb, The Black Swan, 2007]
- The Cognitive Architect: Psychological framing and loss aversion. [Daniel Kahneman, Thinking, Fast and Slow, 2011]

Debate (section C), 11 turns:
1. The Tactician: The wise leader strikes at the enemy where they are most exposed. If you hold cash while paying 22 percent interest, you are losing the war of attrition to your own balance sheet; you should pay the debt immediately.
   [Sun Tzu, The Art of War, pd=true] [Basis: Sun Tzu, The Art of War, Weak Points and Strong](https://suntzusaid.com/book/6)
2. The Risk Realist: The Tactician assumes that the market will remain stable, but you might be ignoring the fat tails of life, where an emergency requires cash that your credit card might not provide if your limit is suddenly slashed.
   [Nassim Taleb, The Black Swan, pd=false] [Basis: Nassim Taleb, The Black Swan, The Scandal of Prediction](https://www.fooledbyrandomness.com/Black-Swan-excerpt.pdf)
3. The Cognitive Architect: You might feel a strong pull toward keeping the cash because of loss aversion, where the pain of losing your safety net seems larger than the joy of the interest you save, even if the math suggests otherwise.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Prospect Theory](https://www.princeton.edu/~kahneman/docs/Publications/prospect_theory.pdf)
4. The Tactician: The Risk Realist claims that credit might be restricted during a crisis, but holding onto debt is a guaranteed loss that compounds monthly, making you weaker every day you do not act.
   [Sun Tzu, The Art of War, pd=true] [Basis: Sun Tzu, The Art of War, Waging War](https://suntzusaid.com/book/2)
5. The Risk Realist: The Tactician argues that debt is a guaranteed loss, yet they ignore that you might suffer more if an unexpected event forces you to liquidate assets at a loss or borrow at higher rates later.
   [Nassim Taleb, The Black Swan, pd=false] [Basis: Nassim Taleb, The Black Swan, How to Look for Bird Poop](https://www.fooledbyrandomness.com/Black-Swan-excerpt.pdf)
6. The Cognitive Architect: The Tactician insists that paying the debt is the only rational path, but you could experience regret if you pay off the debt and then immediately face an emergency, leading to a focus on the outcome rather than the decision process.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Regret](https://www.princeton.edu/~kahneman/docs/Publications/prospect_theory.pdf)
7. The Tactician: To reach a compromise, you could pay $1,500 of the debt today, which leaves $1,500 in your reserve for the immediate future while reducing your high-interest burden significantly within one week.
   [Sun Tzu, The Art of War, pd=true] [Basis: Sun Tzu, The Art of War, Maneuvering](https://suntzusaid.com/book/7)
8. The Risk Realist: If you follow the proposed step of paying $1,500, you still face a cost: you reduce your liquidity during a time of uncertainty, and you remain tethered to the high-interest liability that you might struggle to clear if a black swan event occurs.
   [Nassim Taleb, The Black Swan, pd=false] [Basis: Nassim Taleb, The Black Swan, The Black Swan Problem](https://www.fooledbyrandomness.com/Black-Swan-excerpt.pdf)
9. The Cognitive Architect: I drop my earlier claim that you should just keep the cash because the Risk Realist made a point about the ongoing weight of debt; perhaps the mental clarity of being debt-free outweighs the temporary fear of having a smaller cash reserve.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Framing](https://www.princeton.edu/~kahneman/docs/Publications/prospect_theory.pdf)
10. The Tactician: You must recognize that if a $2,500 emergency happens after you pay the debt, you will have no cash; I argue that you should only clear the debt if you have a secondary source of credit that is not the card you are paying off.
   [Sun Tzu, The Art of War, pd=true] [Basis: Sun Tzu, The Art of War, The Nine Situations](https://suntzusaid.com/book/11)
11. The Risk Realist: We still disagree on whether the certainty of interest costs is worse than the uncertainty of an emergency, and this depends entirely on the volatility of your income and your access to credit when you actually need it.
   [Nassim Taleb, The Black Swan, pd=false] [Basis: Nassim Taleb, The Black Swan, Prediction and Fragility](https://www.fooledbyrandomness.com/Black-Swan-excerpt.pdf)

What became clearer (section D):
The debate highlights a tension between immediate mathematical efficiency and protection against unforeseen volatility. While there is no consensus, the minds clarify that the decision rests on whether you prioritize eliminating a known, high-interest drain or securing a cash buffer against unpredictable, high-impact risks.

What the choice depends on (section E):
If your income is stable and you have low risk of sudden unemployment → paying off the debt is more reasonable, because the 22% interest is a certain, compounding loss. If your income is volatile and you have no other access to emergency credit → keeping more cash becomes more reasonable, because you are trading interest costs for essential survival insurance. To decide, check your credit card's terms to see if your limit would be reduced if you paid off the balance, which would reveal if that debt is actually a reliable safety net.

=== DEBATE B ===
Situation (section A):
The user is evaluating whether to use their $3,000 savings to eliminate $2,000 in high-interest (22%) credit card debt or to retain the cash as an emergency buffer. The tension exists between the mathematical certainty of saving on interest and the psychological and practical need for liquidity in the face of uncertainty. The decisive uncertainty is whether the user's income is stable enough to survive a minor shock without a full cash cushion.

Minds (section B):
- The Debt Eraser: Eliminating financial liabilities to build wealth [Dave Ramsey, The Total Money Makeover, 2003]
- The Antifragile Strategist: Surviving volatility and maintaining optionality [Nassim Taleb, Antifragile, 2012]
- The Stoic Advisor: Cultivating internal peace and managing resource anxiety [Seneca, Letters from a Stoic, 65]

Debate (section C), 12 turns:
1. The Debt Eraser: You might consider that carrying debt at 22 percent interest is essentially a financial emergency that eats away at your future potential.
   [Dave Ramsey, The Total Money Makeover, pd=false] [Basis: Dave Ramsey, The Total Money Makeover, Chapter 3]
2. The Antifragile Strategist: That view might be too focused on simple math. If you clear all your savings, you become fragile to any sudden shock.
   [Nassim Taleb, Antifragile, pd=false] [Basis: Nassim Taleb, Antifragile, Chapter 12]
3. The Stoic Advisor: Perhaps the tension you feel is not just about numbers but about the anxiety that money often hides.
   [Seneca, Letters from a Stoic, pd=true] [Basis: Seneca, Letters from a Stoic, Letter 2]
4. The Debt Eraser: The Strategist suggests being fragile is worse than debt, but at 22 percent interest, you are paying a huge premium for that safety net.
   [Dave Ramsey, The Total Money Makeover, pd=false] [Basis: Dave Ramsey, The Total Money Makeover, Chapter 4]
5. The Antifragile Strategist: The Debt Eraser assumes the math is all that matters, but if you lose your income while debt-free, you might be forced to borrow at even worse rates.
   [Nassim Taleb, Antifragile, pd=false] [Basis: Nassim Taleb, Antifragile, Chapter 18]
6. The Stoic Advisor: The Debt Eraser believes the debt is the primary emergency, but you might be putting off the question of whether you value security over freedom.
   [Seneca, Letters from a Stoic, pd=true] [Basis: Seneca, Letters from a Stoic, Letter 17]
7. The Debt Eraser: I drop that you must pay immediately. The Strategist's point that you might need cash for a real emergency moves me. I now suggest keeping 1000 dollars and paying 2000 dollars.
   [Dave Ramsey, The Total Money Makeover, pd=false] [Basis: Dave Ramsey, The Total Money Makeover, Chapter 5]
8. The Antifragile Strategist: The Debt Eraser now suggests keeping 1000 dollars, but if an emergency costs more than that, you will be back in the same trap.
   [Nassim Taleb, Antifragile, pd=false] [Basis: Nassim Taleb, Antifragile, Chapter 20]
9. The Stoic Advisor: The Strategist warns about traps, but you might want both debt reduction and security at once, which is impossible. Which matters more to you?
   [Seneca, Letters from a Stoic, pd=true] [Basis: Seneca, Letters from a Stoic, Letter 7]
10. The Debt Eraser: Paying 2000 dollars covers the debt but leaves only 1000 dollars in savings, which is less than a month of expenses. The cost is high liquidity risk.
   [Dave Ramsey, The Total Money Makeover, pd=false] [Basis: Dave Ramsey, The Total Money Makeover, Chapter 6]
11. The Antifragile Strategist: The dispute remains: does the security of keeping more cash exceed the cost of interest?
   [Nassim Taleb, Antifragile, pd=false] [Basis: Nassim Taleb, Antifragile, Chapter 21]
12. The Stoic Advisor: The deciding factor is your income stability. If you have stable employment, paying the debt is wiser; if not, keep the cash.
   [Seneca, Letters from a Stoic, pd=true] [Basis: Seneca, Letters from a Stoic, Letter 9]

What became clearer (section D):
The main insight is that debt represents both a financial cost and a psychological burden, while savings act as a buffer against volatility. The debate remains open regarding the optimal balance between these two, as the 'right' choice depends on the user's tolerance for risk and the stability of their income. A possible self-reflection is to examine whether the desire to keep $3,000 stems from a genuine risk-mitigation strategy or a fear-based need for a safety net.

What the choice depends on (section E):
If your income is highly stable and predictable → Pay off the $2,000 debt immediately, because the 22% interest is a guaranteed loss that outweighs the utility of a larger liquid cushion. If your income is volatile or your job security is low → Keep the $3,000 for now, because maintaining liquidity provides an insurance policy against the much higher costs of potential future borrowing. If you are unsure about your income stability → Calculate your essential monthly expenses to see how long $1,000 vs $3,000 would sustain you in an emergency, which will help determine your comfort zone for debt reduction.

Score A and B. Return the JSON object only.
