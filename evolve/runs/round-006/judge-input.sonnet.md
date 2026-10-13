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
The user freelances, and income swings between great months and almost empty ones. They want a way to budget without knowing what they will earn. The decisive unknown is whether even their emptiest month covers fixed bills such as rent, insurance, and loans. Their goals and constraints are not given. The sources were not checked online here, so every basis is unverified and the ideas are paraphrased. The three minds below are fictional.

Minds (section B):
- The Slack Keeper: Thin cash drains attention, so a plan must leave breathing room before it asks for discipline. [Sendhil Mullainathan and Eldar Shafir, Scarcity: Why Having Too Little Means So Much, 2013]
- The Cash-Flow Sorter: Rules that act automatically when money arrives beat good intentions, and each payment should be divided before it can be spent. [Mike Michalowicz, Profit First, 2014]
- The Uncertainty Realist: Unknowable income should not be treated as a measurable average, so plans must be built on defensible floors and judgment. [Frank H. Knight, Risk, Uncertainty and Profit, 1921]

Debate (section C), 10 turns:
1. The Slack Keeper: Here is my reading: the hard part is not the spreadsheet, it is the empty month. When money runs short, worry about rent takes over the mind and crowds out planning, so a budget that works only when someone is calm fails exactly when it is needed. Slack, not precision, is the real asset.
   [Sendhil Mullainathan and Eldar Shafir, Scarcity: Why Having Too Little Means So Much, pd=false] [Basis: Mullainathan and Shafir, Scarcity, the bandwidth and slack ideas; source not verified, no link]
2. The Cash-Flow Sorter: The Slack Keeper says the real problem is the empty month and the worry it brings. I say the how is mechanical. Every payment is split on arrival by fixed percentages into taxes, bills, profit, and a pay account, and the owner pays themselves a steady wage on a set date. Rules beat willpower.
   [Mike Michalowicz, Profit First, pd=false] [Basis: Michalowicz, Profit First, the account-allocation system; source not verified, no link]
3. The Uncertainty Realist: The Cash-Flow Sorter says percentages on arrival solve it. They assume the stream resembles its past. Knight separated risk, which can be counted from repeated cases, from uncertainty, which cannot. Spring 2020 shows it: freelancers whose events were cancelled had years of records that predicted nothing. Plan around the worst plausible stretch, not an average.
   [Frank H. Knight, Risk, Uncertainty and Profit, pd=true] [Basis: Knight, Risk, Uncertainty and Profit, the risk versus uncertainty distinction; source not verified, no link]
4. The Slack Keeper: I accept the floor idea, but a floor on paper pays no rent. Sugarcane farmers in India, paid once a year, scored worse on thinking tests before harvest than after, which suggests thin cash itself drains the mind. The user said some months are almost empty, so maybe those months feel like a threat, and if so a buffer buys calm, not only cash.
   [Sendhil Mullainathan and Eldar Shafir, Scarcity: Why Having Too Little Means So Much, pd=false] [Basis: Mullainathan and Shafir, Scarcity, the sugarcane farmer study and slack; source not verified, no link]
5. The Cash-Flow Sorter: The Slack Keeper reads the empty months as a threat that a buffer would calm. I reject that, because a buffer takes a year to build and a rule takes a day. A rival reading: the user said some months are great, so perhaps spending rises to match them, and if so splitting each payment fixes the whiplash faster than saving.
   [Mike Michalowicz, Profit First, pd=false] [Basis: Michalowicz, Profit First, paying yourself a fixed wage and small-plate habits; source not verified, no link]
6. The Uncertainty Realist: Both readings might be true, and that is the cost. The user may want to spend freely in the great months and also feel safe in the empty ones, and they cannot fully have both. A high pay line serves the first. A low floor with a thick buffer serves the second. A JPMorgan Chase Institute study of bank data found household income swinging widely month to month, so this tension is common.
   [Frank H. Knight, Risk, Uncertainty and Profit, pd=true] [Basis: Knight, Risk, Uncertainty and Profit, uncertainty and the limits of averaging; source not verified, no link]
7. The Cash-Flow Sorter: I drop my claim that fixed percentages on every payment are enough. The Uncertainty Realist's point that a few good months say little about the next ones moved me. I now hold something narrower: set a low fixed wage first, and use the percentages only on what arrives above it.
   [Mike Michalowicz, Profit First, pd=false] [Basis: Michalowicz, Profit First, owner's pay and allocation percentages; source not verified, no link]
8. The Slack Keeper: The Cash-Flow Sorter now sets a low wage first and splits the surplus. That depends on a fact the user has not given: whether even the emptiest month covers fixed bills like rent, insurance, and loans. If it does, wage first works and a small buffer will do. If it does not, the first job is cutting fixed costs or building buffer, and percentages should wait.
   [Sendhil Mullainathan and Eldar Shafir, Scarcity: Why Having Too Little Means So Much, pd=false] [Basis: Mullainathan and Shafir, Scarcity, slack as protection against shortfall; source not verified, no link]
9. The Uncertainty Realist: The Slack Keeper puts buffer ahead of percentages when the worst month falls short. I add what could be lost. With no cushion, a person might take a bad client or underprice out of fear, which costs the freedom to say no, perhaps the point of freelancing. If that is the real concern, buffer comes before any steady wage. I go further than Knight here.
   [Frank H. Knight, Risk, Uncertainty and Profit, pd=true] [Basis: Knight, Risk, Uncertainty and Profit, bearing uncertainty and judgment; the extension is my own; source not verified, no link]
10. The Cash-Flow Sorter: The Uncertainty Realist wants buffer before any steady wage, even when bills are covered. I still say pay the wage first and let the buffer grow from the surplus, because a wage trains a person to live below the good months. Maybe the longest empty stretch decides it: if lean runs last two or three months, I lose; if they are single months, I keep my order.
   [Mike Michalowicz, Profit First, pd=false] [Basis: Michalowicz, Profit First, pay yourself first and the surplus accounts; source not verified, no link]

What became clearer (section D):
The main insight is that the question is really two problems: how to divide money that arrives unevenly, and how to live with not knowing how much will arrive. A low fixed wage with percentages on the surplus handles the first, and a buffer sized to the worst plausible stretch handles the second. What stays disputed is the order: wage first with the buffer growing from surplus, or buffer first even when bills are covered. One possible self-reflection: how much of the dread is about the empty months themselves, and how much is about spending that rises in the great months? This is a possibility, not a conclusion about the user.

What the choice depends on (section E):
If the emptiest month still covers fixed bills, a low fixed wage with percentages on the surplus becomes more reasonable, because the floor is safe and the buffer can grow gradually. If the emptiest month falls short of fixed bills, cutting fixed costs and building a buffer becomes more reasonable first, because no percentage rule can create money that is not there. If the main worry is losing the freedom to refuse bad clients, a buffer before a steady wage looks stronger, because desperation is what that loss would feel like. If the longest empty stretch is unknown, a proportionate way to learn it is to list income by month for the past one to two years, note the longest run below fixed bills, and note whether the lean months follow a seasonal pattern.

=== DEBATE B ===
Situation (section A):
The user freelances and says some months are great while others are almost empty, and they want to budget without knowing what they will earn. The tension is between planning around a typical income and protecting against the worst stretch. The decisive unknown, which the user has not given, is how low the emptiest months go, how long they last in a row, and whether fixed bills fit under them.

Minds (section B):
- The Income Smoother: Spending should follow what you can sustainably earn over a long stretch, not what happened to arrive this month. [Milton Friedman, A Theory of the Consumption Function, 1957]
- The Barbell Builder: Protect against the worst realistic stretch and keep the freedom to say no, so one bad run cannot break you. [Nassim Nicholas Taleb, Antifragile, 2012]
- The Reserve Keeper: Build a habit that moves money out of reach before it can be spent, so the plan does not depend on forecasting or willpower. [George S. Clason, The Richest Man in Babylon, 1926]

Debate (section C), 11 turns:
1. The Income Smoother: The user is treating each month as its own paycheck, and that is what makes the empty ones feel like emergencies. I read this as a measuring problem before a budgeting problem. What you can safely spend is set by what you earn over a long stretch, not by the deposit that landed this month.
   [Milton Friedman, A Theory of the Consumption Function, pd=false] [Basis: Milton Friedman, A Theory of the Consumption Function, the permanent income idea (paraphrased from the book's well-known argument; source link not verified)]
2. The Barbell Builder: Measuring over a long stretch is the trap, because an average hides the bad stretch that actually breaks you. When live events shut down in 2020, stagehands and touring musicians went months near zero, and no yearly average paid their rent. Set the baseline by a realistic worst month and treat everything above it as a bonus.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, the barbell strategy and fragility (paraphrased; source link not verified)]
3. The Reserve Keeper: You are both arguing about the number and skipping the habit, and the great months are where this is won. Move a fixed share of every deposit into a separate account before spending anything, then draw a steady amount from it. I would go further than the book and save a bigger share when money is plentiful, since that is when it is painless.
   [George S. Clason, The Richest Man in Babylon, pd=true] [Basis: George S. Clason, The Richest Man in Babylon, the idea of paying yourself first (paraphrased; source link not verified)]
4. The Income Smoother: The 2020 shutdown is a fair hit, because my average would have overstated what a stagehand could safely spend. I change my position: draw from the lower end of recent months, not the mean, and treat the rest as a top-up. I keep one point, though. A baseline set by the single worst month would starve a perfectly healthy year.
   [Milton Friedman, A Theory of the Consumption Function, pd=false] [Basis: Milton Friedman, A Theory of the Consumption Function, the permanent income idea (paraphrased; source link not verified)]
5. The Barbell Builder: The user wrote that some months are almost empty. That may mean the empty months, more than the uncertainty itself, are what weigh on them. My guess is that worry like that pushes people to accept any client. If so, what matters is a cushion that lets them turn a bad job down. That is my own extension of the book.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, optionality (paraphrased; source link not verified)]
6. The Reserve Keeper: I would not assume it is the empty months. They also wrote that they do not know what they will earn, which may mean deciding everything again each month. They may want to spend freely when money is high and feel safe when it is thin, and they cannot fully have both. A fixed draw buys the calm. Spending the surplus buys the freedom.
   [George S. Clason, The Richest Man in Babylon, pd=true] [Basis: George S. Clason, The Richest Man in Babylon, the idea of paying yourself first (paraphrased; source link not verified)]
7. The Income Smoother: All of this turns on a fact the user has not given: do their fixed bills fit under their lowest months, and how many empty months come in a row? If the bills fit, I favour a steady draw with a small buffer. If they do not, the barbell wins, because no smoothing helps when the floor sits below the rent. Cutting fixed costs comes first.
   [Milton Friedman, A Theory of the Consumption Function, pd=false] [Basis: Milton Friedman, A Theory of the Consumption Function, the permanent income idea (paraphrased; source link not verified)]
8. The Barbell Builder: Notice what is lost if the floor sits under the rent: bargaining power, not just money. After the 2008 crash, work dried up for many architects, and my guess is that some took any project at any fee. If anyone depends on the user, they are exposed too. If that is the real concern, the buffer size in months matters more than any savings percentage.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, fragility and optionality (paraphrased; the 2008 example is my own illustration, not the author's; source link not verified)]
9. The Reserve Keeper: The user wrote that some months are great. That may mean the great months feel like permission to spend, which would make the empty ones hurt more. If so, the fix is not a smarter forecast but moving the money before it is visible. Smoother, your lower-end draw still lets a spender spend the surplus.
   [George S. Clason, The Richest Man in Babylon, pd=true] [Basis: George S. Clason, The Richest Man in Babylon, the idea of paying yourself first (paraphrased; source link not verified)]
10. The Income Smoother: I would not make that the default reading. Great months can be slow catch-up, when late invoices finally land and get spent on bills already overdue. The 2023 Hollywood writers strike showed how a long gap hits even steady earners. So check payment timing first. If timing is the cause, a buffer of one invoice cycle does more than a savings share.
   [Milton Friedman, A Theory of the Consumption Function, pd=false] [Basis: Milton Friedman, A Theory of the Consumption Function, income smoothing over time (paraphrased; the strike example is my own illustration, not the author's; source link not verified)]
11. The Barbell Builder: We still disagree on the baseline. Smoother wants the lower end of recent months, and I want the worst realistic month. The user own history would decide it: how low the emptiest months went, how many came in a row, and whether the bills fit underneath. A short, shallow dip favours Smoother. A long, deep one favours me.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile, the barbell strategy (paraphrased; source link not verified)]

What became clearer (section D):
The main insight is that the question splits in two: which number to live on, and what to do with the money in good months. The minds moved toward a baseline below the average, drawn from a separate reserve. They still dispute how low that baseline should sit, and whether the real danger is the empty months, the late payments, or the pull to spend in good months. One possible self-reflection: when a month is empty, does it feel more like a money problem or a decision problem, and does that change which rule would help?

What the choice depends on (section E):
- If the fixed bills fit under the lowest months and the dips are short, a steady draw from the lower end of recent months, with a small buffer, becomes more reasonable. The shortfall is then modest and smoothing covers it.
- If the fixed bills sit above the lowest months, or empty stretches run long, a baseline set by the worst realistic month and a buffer counted in months of fixed costs becomes more reasonable. Cutting fixed costs comes first, because smoothing cannot fill a gap that deep.
- If late payments explain many of the empty months, a buffer of roughly one invoice cycle is the better first step.
- If the user tends to spend whatever a good month brings, moving a fixed share into a separate account before spending becomes more reasonable.
- The decisive unknown is the user's own record. A proportionate way to learn it is to list the last twelve months of income against fixed bills, noting the lowest month and the longest low run.

Score A and B. Return the JSON object only.
