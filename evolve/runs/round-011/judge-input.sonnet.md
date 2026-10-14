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
You have $3,000 saved and $2,000 on a credit card at 22%, and you are weighing paying the card off against keeping cash for emergencies. What you reported is the two amounts and the rate. Still unknown are how large and how likely your surprise expenses are, how steady your income is, and how fast you could rebuild savings. Perhaps the real question is how much cash is enough rather than either-or, and the three minds below are fictional voices arguing from their books.

Minds (section B):
- The Debt Eliminator: Stop paying 22% interest and regain freedom of choice, while keeping a small starter cushion. [Dave Ramsey, The Total Money Makeover, 2003]
- The Margin-of-Safety Keeper: Leave room for error, because cash on hand is what keeps one bad surprise from becoming a spiral. [Morgan Housel, The Psychology of Money, 2020]
- The Bandwidth Watcher: Protect slack in both money and attention, since a tight squeeze can crowd out clear thinking. [Sendhil Mullainathan and Eldar Shafir, Scarcity: Why Having Too Little Means So Much, 2013]

Debate (section C), 12 turns:
1. The Bandwidth Watcher: I read this as a fight over slack, not arithmetic. Both piles are real: $3,000 gives you room to absorb a shock, and $2,000 at 22% quietly takes room away every month. Either choice might leave you one surprise from trouble, so the contest is which squeeze you can better survive.
   [Sendhil Mullainathan and Eldar Shafir, Scarcity: Why Having Too Little Means So Much, pd=false] [Basis: Sendhil Mullainathan and Eldar Shafir, Scarcity: Why Having Too Little Means So Much; source not verified, no link available]
2. The Debt Eliminator: Take only the payoff side. 22% on $2,000 is about $440 a year, roughly $37 a month, and no savings account pays close to that, so payoff is a sure return. I recall my book's author lost a real-estate business in the late 1980s when banks called his loans; debt takes choices away.
   [Dave Ramsey, The Total Money Makeover, pd=false] [Basis: Dave Ramsey, The Total Money Makeover; source not verified, no link available]
3. The Margin-of-Safety Keeper: The Debt Eliminator calls payoff a sure return, but a sure return is worthless if you need the cash next week. I will defend only the keeping side. I recall that in the 2018 to 2019 US government shutdown, federal workers with thin savings missed paychecks for weeks, and many borrowed or skipped bills.
   [Morgan Housel, The Psychology of Money, pd=false] [Basis: Morgan Housel, The Psychology of Money; source not verified, no link available]
4. The Debt Eliminator: The Margin-of-Safety Keeper says a sure return is worthless if you need the cash next week, yet that treats every emergency as huge. My guess is most surprises cost a few hundred dollars. So here is one step: pay the full $2,000 this week, keep $1,000 untouched, and rebuild it over the next three months.
   [Dave Ramsey, The Total Money Makeover, pd=false] [Basis: Dave Ramsey, The Total Money Makeover; source not verified, no link available]
5. The Margin-of-Safety Keeper: Checking that step against your numbers. You have $3,000, so $1,000 stays. You owe $2,000, so that is cleared. The 22% stops costing roughly $37 a month. For emergencies, $1,000 covers one repair, not two. The cost: if a $1,800 bill lands in month two, you are back on the card at 22%.
   [Morgan Housel, The Psychology of Money, pd=false] [Basis: Morgan Housel, The Psychology of Money; source not verified, no link available]
6. The Bandwidth Watcher: You said you want to keep money for emergencies, so maybe the $3,000 is what lets you sleep. Scarcity research found Indian sugarcane farmers scored worse on reasoning tests before harvest, when money was tight, than after. A thin cushion might crowd your mind the same way, perhaps more than a visible debt would.
   [Sendhil Mullainathan and Eldar Shafir, Scarcity: Why Having Too Little Means So Much, pd=false] [Basis: Sendhil Mullainathan and Eldar Shafir, Scarcity: Why Having Too Little Means So Much; source not verified, no link available]
7. The Debt Eliminator: The Bandwidth Watcher guesses the $3,000 is what lets you sleep; I offer a rival reading. You mentioned the 22% rate, so perhaps that number nags you more. If so, you may want two things at once, full safety and no interest, and $3,000 cannot give both: keeping it all serves safety, paying it all serves interest.
   [Dave Ramsey, The Total Money Makeover, pd=false] [Basis: Dave Ramsey, The Total Money Makeover; source not verified, no link available]
8. The Margin-of-Safety Keeper: The Debt Eliminator suggests perhaps the 22% nags you more, and I accept the sting but not the cure. The strongest rival to paying now is waiting: keep all $3,000 for a while and pay the card slowly, at about $37 a month in interest. That price buys time to see what coming bills look like.
   [Morgan Housel, The Psychology of Money, pd=false] [Basis: Morgan Housel, The Psychology of Money; source not verified, no link available]
9. The Bandwidth Watcher: Then everything turns on something you have already lived. In the past year, has a surprise bill hit you, and what covered it? If it was the card or a loan, I would favor keeping more cash. If paychecks covered it without touching savings, the Debt Eliminator's payoff looks stronger.
   [Sendhil Mullainathan and Eldar Shafir, Scarcity: Why Having Too Little Means So Much, pd=false] [Basis: Sendhil Mullainathan and Eldar Shafir, Scarcity: Why Having Too Little Means So Much; source not verified, no link available]
10. The Margin-of-Safety Keeper: What you could lose by paying everything is your cushion, and by keeping everything about $440 a year. I wonder if you might actually fear being forced back onto the card at 22% when something breaks. Is that the real concern? If so, it favors a cushion larger than $1,000 and a slower payoff.
   [Morgan Housel, The Psychology of Money, pd=false] [Basis: Morgan Housel, The Psychology of Money; source not verified, no link available]
11. The Debt Eliminator: I said to pay the full $2,000 this week, and I drop that. The Margin-of-Safety Keeper's point that a $1,000 cushion is gone after two repairs moved me. I now hold a narrower claim: pay the card down only as far as leaves enough cash for one ordinary surprise, and clear the rest from income.
   [Dave Ramsey, The Total Money Makeover, pd=false] [Basis: Dave Ramsey, The Total Money Makeover; source not verified, no link available]
12. The Bandwidth Watcher: We still differ on how big one ordinary surprise is: the Debt Eliminator treats a few hundred dollars as typical, while the Margin-of-Safety Keeper worries about a bill near $1,800. Two details you have not given would decide it: the size of the last bill that caught you off guard, and how quickly your income could refill a cushion.
   [Sendhil Mullainathan and Eldar Shafir, Scarcity: Why Having Too Little Means So Much, pd=false] [Basis: Sendhil Mullainathan and Eldar Shafir, Scarcity: Why Having Too Little Means So Much; source not verified, no link available]

What became clearer (section D):
The main insight is that this may not be a pure either-or: the debt is a certain cost of roughly $37 a month, while an emergency is an uncertain but possibly larger cost, so the real question is how much cash counts as enough. The minds moved toward paying down the card while keeping a cushion, but they still dispute how large that cushion should be. A possible self-reflection is to recall the last unplanned expense you faced and notice how it was paid and how it felt afterward.

What the choice depends on (section E):
If your last surprise bills were a few hundred dollars and your paychecks covered them, paying most or all of the card becomes more reasonable, because 22% on $2,000 is about $440 a year and a small cushion might be enough. If a recent surprise went on a card or loan, or your income is irregular, keeping more cash becomes more reasonable, because one bill could push you back into 22% borrowing. If you do not yet know which describes you, a proportionate way to learn is to list the unplanned expenses of the past twelve months and how each was paid, then check how many of them a $1,000 cushion would have covered.

=== DEBATE B ===
Situation (section A):
You have $3,000 saved and $2,000 on a credit card at 22 percent interest. You are asking whether to pay the card off or keep the cash for emergencies. The card costs about $440 a year, while the cash protects against costs nobody can forecast. The decisive unknown is how steady your income is and what one month of your essential costs adds up to; you have not said. A tentative reframing: the choice may not be all or nothing, because part of the cash could go to the card and part could stay.

Minds (section B):
- The Ruin Watcher: A fictional mind focused on surviving rare bad events and keeping options open, rather than optimizing for the average month. [Nassim Nicholas Taleb, Antifragile, 2012]
- The Debt Eliminator: A fictional mind focused on stopping a certain, ongoing cost and getting out of debt, with only a small starter buffer kept back. [Dave Ramsey, The Total Money Makeover, 2003]
- The Behavior Realist: A fictional mind focused on how people actually act under stress, and on leaving enough room for error that a plan survives real life. [Morgan Housel, The Psychology of Money, 2020]

Debate (section C), 12 turns:
1. The Ruin Watcher: I read this as two different risks rather than a savings contest. The card is a known leak: 22 percent of $2,000 is about $440 a year. An emergency is an unknown with a price nobody can quote ahead of time. Arithmetic handles the first risk well and the second badly, so do not let the neat number decide.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile; source not verified, so no link or section given]
2. The Debt Eliminator: Ruin Watcher said not to let the neat number decide, but that leaves out a cost: $2,000 at 22 percent is about $37 every month, buying nothing. Paying the card off is a guaranteed 22 percent return, better than any savings account I know of. Debt also shrinks your choices for as long as it stays.
   [Dave Ramsey, The Total Money Makeover, pd=false] [Basis: Dave Ramsey, The Total Money Makeover; source not verified, so no link or section given]
3. The Behavior Realist: Debt Eliminator calls payoff a guaranteed 22 percent return, but a return locked inside a paid-off card cannot be spent on the day the car dies. In April 2020, U.S. unemployment jumped to 14.7 percent within two months, and nobody had a date circled in advance. Cash is room for error, and its worth shows only once it is gone.
   [Morgan Housel, The Psychology of Money, pd=false] [Basis: Morgan Housel, The Psychology of Money; source not verified, so no link or section given]
4. The Debt Eliminator: Behavior Realist says cash is room for error, but you wrote that you have $3,000 saved and $2,000 owed, so your real room is closer to $1,000 while the card keeps charging. Maybe the full $3,000 feels like protection to you, yet perhaps part of that comfort is borrowed at 22 percent.
   [Dave Ramsey, The Total Money Makeover, pd=false] [Basis: Dave Ramsey, The Total Money Makeover; source not verified, so no link or section given]
5. The Behavior Realist: Debt Eliminator said your real room is closer to $1,000, but perhaps the $3,000 feels less like protection and more like the ability to absorb a bad month. If so, netting fails: the card asks for a small minimum, while a surprise asks for a lump sum. About 37 percent of U.S. adults in the 2022 Federal Reserve survey could not cover a $400 expense with cash.
   [Morgan Housel, The Psychology of Money, pd=false] [Basis: Morgan Housel, The Psychology of Money; source not verified, so no link or section given]
6. The Ruin Watcher: Both minds keep trading numbers, but you might want two things at once: to stop the 22 percent charge completely, which favors paying the full $2,000, and to keep every dollar of the $3,000 within reach, which favors holding it. You cannot fully have both. Which matters more to you?
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile; source not verified, so no link or section given]
7. The Debt Eliminator: Ruin Watcher says you cannot fully have both, so here is the closest fit: pay $2,000 to the card today and keep the remaining $1,000 as a starter fund. The numbers line up neatly, since $3,000 minus $2,000 leaves the small buffer I favor before attacking debt, and the 22 percent charge ends.
   [Dave Ramsey, The Total Money Makeover, pd=false] [Basis: Dave Ramsey, The Total Money Makeover; source not verified, so no link or section given]
8. The Behavior Realist: Checking that step against what you gave: the $3,000 saved falls to $1,000. The $2,000 debt is cleared entirely. The 22 percent charge stops, saving about $440 a year. One cost: $1,000 is thin against a gap like the 35-day federal shutdown of 2018 to 2019, when paychecks stopped for about 800,000 federal workers.
   [Morgan Housel, The Psychology of Money, pd=false] [Basis: Morgan Housel, The Psychology of Money; source not verified, so no link or section given]
9. The Ruin Watcher: You asked whether to keep the money for emergencies, so perhaps what you fear is a surprise bill landing right after the balance drops to $1,000. Is that the real concern? If it is, the size of the buffer matters more than the payoff date, and the shutdown example argues for leaving more than $1,000.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile; source not verified, so no link or section given]
10. The Behavior Realist: If that is the fear, Ruin Watcher, it is worth weighing, but its weight depends on something only you can report. Looking back at your last surprise expense, if you had one, did you cover it from savings or put it on the card? Savings and a steady paycheck favor paying off the $2,000; the card favors keeping more cash.
   [Morgan Housel, The Psychology of Money, pd=false] [Basis: Morgan Housel, The Psychology of Money; source not verified, so no link or section given]
11. The Debt Eliminator: I said to pay $2,000 to the card today, and I drop that as a flat rule. The point from Behavior Realist that a surprise asks for a lump sum at once changed my position. I now hold a narrower claim: pay the full $2,000 only if your pay is steady and past surprises came from savings; otherwise pay $1,000 and keep $2,000.
   [Dave Ramsey, The Total Money Makeover, pd=false] [Basis: Dave Ramsey, The Total Money Makeover; source not verified, so no link or section given]
12. The Ruin Watcher: One disagreement is still open: Debt Eliminator holds that a steady paycheck makes $1,000 enough, while I hold that steady pay does not shrink a lump-sum bill. A fact you have not given would decide it: what one month of your essential costs adds up to. If rent, food, and insurance run above $1,000, my side gains weight; if below, the Debt Eliminator side does.
   [Nassim Nicholas Taleb, Antifragile, pd=false] [Basis: Nassim Nicholas Taleb, Antifragile; source not verified, so no link or section given]

What became clearer (section D):
The main insight is that the two costs have different shapes. The card charges a certain, small amount every month (about $37), while an emergency is uncertain but arrives as one lump sum. That is why netting $3,000 against $2,000 can mislead. What remains disputed is how large a buffer is enough once the card is paid down: $1,000 if pay is steady, or closer to a full month of essentials. A possible self-reflection: how did your last surprise expense actually get paid, and how many weeks of your essential costs would $1,000 cover?

What the choice depends on (section E):
If your pay is steady, your last surprise expense came out of savings, and $1,000 covers about a month of essentials, then paying the full $2,000 becomes more reasonable, because it ends roughly $440 a year in interest and still leaves a working buffer.
If your pay is irregular, one month of essentials costs more than $1,000, or your last surprise went on the card, then paying part (for example $1,000) and keeping $2,000 becomes more reasonable, because a lump-sum bill landing on a 22 percent card would undo much of the savings from paying off.
If you do not yet know which case you are in, a proportionate way to learn it is to spend one sitting adding up a typical month of essential costs and listing the surprise expenses of the past year and how each was paid.

Score A and B. Return the JSON object only.
