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
The user experiences feast-and-famine cycles common to freelancing and seeks a reliable way to budget. The central tension lies between treating current earnings as a baseline for future stability or as a temporary windfall that requires aggressive hoarding. It remains unclear whether the user's income volatility is an inherent industry feature or a sign that their client acquisition strategy needs adjustment.

Minds (section B):
- The Stoic: The internal relationship with material needs [Seneca, Letters from a Stoic, 65]
- The Risk Analyst: Building robustness against extreme outcomes [Nassim Taleb, Antifragile, 2012]
- The Planner: Correcting for cognitive biases in forecasting [Daniel Kahneman, Thinking, Fast and Slow, 2011]

Debate (section C), 9 turns:
1. The Stoic: True wealth is not measured by the abundance of your income but by how little you require. As Seneca wrote, "the man who has enough is rich." When your income fluctuates, you must anchor your life to the lower bound of your earnings, treating surplus as a phantom that does not belong to you.
   [Seneca, Letters from a Stoic, pd=true] [Basis: Seneca, Letters from a Stoic, Letter 2]
2. The Risk Analyst: That approach ignores the reality of tail risk. If you only plan for the lower bound, you are fragile to sudden shocks. Instead of just minimizing needs, you should use a barbell strategy, keeping most resources in high-safety liquid assets while leaving a small portion for high-upside opportunities that could stabilize your income long-term.
   [Nassim Taleb, Antifragile, pd=false] [Basis: Nassim Taleb, Antifragile, Chapter 1]
3. The Planner: Both of you assume the user can accurately identify that lower bound. Most people suffer from the planning fallacy, where they underestimate the likelihood of worst-case scenarios and assume their recent successes will persist. You are likely basing your budget on an optimistic view that ignores the reality of your data.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 23]
4. The Stoic: The Planner is right that we are poor at forecasting, but that is precisely why we must practice voluntary poverty. By living as if the famine has already arrived, you ensure that external volatility loses its power to disrupt your tranquility or your survival.
   [Seneca, Letters from a Stoic, pd=true] [Basis: Seneca, Letters from a Stoic, Letter 18]
5. The Risk Analyst: Practicing poverty is a psychological trick, not a financial system. If you want to survive, you need redundancy, not just minimalism. You should create multiple income streams that are not correlated with your main client, ensuring that one bad month does not lead to total failure.
   [Nassim Taleb, Antifragile, pd=false] [Basis: Nassim Taleb, Antifragile, Chapter 19]
6. The Planner: You talk about redundancy, but building new streams requires time you do not have when you are busy. We should focus on base rates. Look at the last three years of your income, find the lowest 10th percentile month, and build your entire life around that figure, regardless of how much you earn in good months.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 15]
7. The Stoic: I concede that my focus on detachment might overlook the practical necessity of base rates. Perhaps the discipline I suggest is the best tool to enforce the Planner's requirement. If you treat the 10th percentile as your only real income, you achieve the Stoic ideal of needing less.
   [Seneca, Letters from a Stoic, pd=true] [Basis: Seneca, Letters from a Stoic, Letter 2]
8. The Risk Analyst: Even with a base rate, you still have the problem of thin-tailed thinking. If you only look at the past three years, you might miss a structural shift in the market. The Planner assumes the future will look like the past, but in freelance work, the past is often a poor guide to the next crisis.
   [Nassim Taleb, Antifragile, pd=false] [Basis: Nassim Taleb, Antifragile, Chapter 12]
9. The Planner: We remain divided. I argue we must use historical base rates to anchor expectations, while the Analyst warns that current systems are prone to unpredictable shifts. What decides this is a fact you have not shared: are your past income fluctuations caused by client churn or by your own inconsistent work cycles?
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 22]

What became clearer (section D):
The discussion shifted from viewing budgeting as a simple math problem to seeing it as a strategy for managing human error and environmental uncertainty. The disagreement between the Planner's focus on past base rates and the Risk Analyst's warning about structural, unpredictable change remains open. A helpful self-reflection is to determine whether your budget feels tight because of reality or because of the anxiety induced by not knowing the true pattern of your income.

What the choice depends on (section E):
If your income volatility stems from client churn → prioritize the Risk Analyst's advice by aggressively diversifying your client base. If your volatility comes from inconsistent personal work cycles → prioritize the Planner's advice by enforcing a rigid, data-backed baseline budget. To learn which is true, perform a simple audit of your past year: categorize every month as 'full workload' or 'empty workload' and see if the 'empty' months correlate with a lack of outreach activity or external market factors.

=== DEBATE B ===
Situation (section A):
The user is a freelancer facing income volatility and wants to know how to budget effectively to manage the uncertainty of earnings. The central tension is between building a massive financial buffer, smoothing consumption through planning, or minimizing expenses to become less dependent on high earnings.

Minds (section B):
- The Antifragile: Robustness against uncertainty [Nassim Nicholas Taleb, The Black Swan, 2007]
- The Prudent Planner: Maximizing long-term stability [John Stuart Mill, Utilitarianism, 1861]
- The Stoic Minimalist: Internal freedom from external shifts [Seneca, Letters from a Stoic, 65]

Debate (section C), 9 turns:
1. The Antifragile: You treat these lean months as a surprise, but in a world of high variance, they are expected events. You should stop forecasting the next paycheck and instead build a massive liquidity buffer, something far beyond the standard three months of expenses.
   [Nassim Nicholas Taleb, The Black Swan, pd=false] [Basis: Nassim Nicholas Taleb, The Black Swan, Chapter 13]
2. The Prudent Planner: The Antifragile suggests a massive buffer, yet one must consider that the greatest happiness of the greatest number depends on our ability to plan for predictable needs. By smoothing consumption, you prevent the misery of sudden deprivation, which outweighs the benefit of keeping liquidity for rare events.
   [John Stuart Mill, Utilitarianism, pd=true] [Basis: John Stuart Mill, Utilitarianism, Chapter 2](https://www.gutenberg.org/files/1122/1122-h/1122-h.htm)
3. The Stoic Minimalist: The Planner forgets that wealth consists not in having great possessions, but in having few wants. If you struggle with the uncertainty, perhaps it is because you have tied your baseline of comfort to your best months rather than your worst. Lower your needs, and the feast-or-famine cycle loses its power over you.
   [Seneca, Letters from a Stoic, pd=true] [Basis: Seneca, Letters from a Stoic, Letter 2](https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_2)
4. The Antifragile: I must dispute the Stoic; reducing wants does not make you robust against a market crash. You might be ignoring that you may want to grow your business, which requires capital. A buffer is not about attachment; it is about optionality, allowing you to survive long enough to capitalize on the next opportunity.
   [Nassim Nicholas Taleb, The Black Swan, pd=false] [Basis: Nassim Nicholas Taleb, The Black Swan, Chapter 13]
5. The Prudent Planner: While the Antifragile values optionality, they might underestimate the psychological toll of uncertainty. If you feel that you need both a growing business and a sense of security, you are chasing two things that often conflict; a fixed salary for part of your time might serve your need for stability better than any buffer.
   [John Stuart Mill, Utilitarianism, pd=true] [Basis: John Stuart Mill, Utilitarianism, Chapter 4](https://www.gutenberg.org/files/1122/1122-h/1122-h.htm)
6. The Stoic Minimalist: Responding to the Planner, I would counter that seeking a fixed salary to avoid discomfort is just trading one form of anxiety for another. He who fears will never be master of his own life. By accepting the volatility as the price of your independence, you gain the clarity to decide which months are truly lean and which are simply quiet.
   [Seneca, Letters from a Stoic, pd=true] [Basis: Seneca, Letters from a Stoic, Letter 14](https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_14)
7. The Antifragile: The Stoic has moved me; I concede that the obsession with buffers can turn into a different kind of trap. I now hold that your buffer should only be as large as what is needed to prevent you from making desperate, low-quality decisions during an empty month, rather than hoarding for the sake of it.
   [Nassim Nicholas Taleb, The Black Swan, pd=false] [Basis: Nassim Nicholas Taleb, The Black Swan, Chapter 13]
8. The Prudent Planner: I disagree with the Antifragile that hoarding is irrelevant. If you assume that the user fears losing their lifestyle, then a buffer is the only thing standing between them and the ruin they fear. We cannot ignore that they might need a predictable baseline to function, even if they value their freedom.
   [John Stuart Mill, Utilitarianism, pd=true] [Basis: John Stuart Mill, Utilitarianism, Chapter 2](https://www.gutenberg.org/files/1122/1122-h/1122-h.htm)
9. The Stoic Minimalist: My disagreement with the Planner remains: focus on the fear itself. If you are terrified of the empty months, you are not really free, no matter how much money you have in the bank. The real question is whether you can find a way of living that makes a low-income month feel like a rest rather than a crisis.
   [Seneca, Letters from a Stoic, pd=true] [Basis: Seneca, Letters from a Stoic, Letter 18](https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_18)

What became clearer (section D):
The debate highlights that budgeting is not just a mathematical exercise but a way to manage the fear of instability and the desire for freedom. The main insight is that the method you choose depends on whether you view your income fluctuation as a risk to be hedged or a condition of your independence. A remaining disagreement is whether saving money actually alleviates the fear of future instability or simply masks it.

What the choice depends on (section E):
If you fear the loss of your current lifestyle during low-income months, prioritize aggressive saving and consumption smoothing. If you value independence and business growth over current lifestyle stability, prioritize maintaining a lean cost of living and a modest, liquid buffer. If you remain unsure of your tolerance for financial risk, experiment with paying yourself a fixed monthly salary from your business account to create artificial stability.

Score A and B. Return the JSON object only.
