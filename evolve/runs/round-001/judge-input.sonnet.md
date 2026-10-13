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
I'd like to study how to build a successful SaaS for consumer in the age of AI, and what successful principles of a good products can be drawn from the internet age?

=== DEBATE A ===
Situation (section A):
You want to learn how to build a successful consumer SaaS now that AI is everywhere, and which product principles from the internet era still hold. You haven't said what you plan to build, who it's for, or whether you want a business, a craft, or a study project. That is the decisive unknown. It decides whether AI is your product's core or just a cheap way to build features anyone can copy.

Minds (section B):
- The Experimenter: Learning what customers really do before betting on what you believe, so that speed of learning is the advantage. [Eric Ries, The Lean Startup, 2011]
- The Market Economist: Where lasting advantage comes from when features are cheap to copy: switching costs, network effects, and pricing. [Carl Shapiro and Hal R. Varian, Information Rules, 1998]
- The Design Critic: Whether ordinary people can understand and use the product without effort or blame, and whether it fits how they actually behave. [Don Norman, The Design of Everyday Things, 1988]

Debate (section C), 10 turns:
1. The Experimenter: Start small and ship ugly. AI makes building so cheap that the scarce thing is knowing what people want. Build the smallest version, put it in front of twenty strangers, and measure what they do, not what they say. Studying principles for months is the old way of procrastinating.
   [Eric Ries, The Lean Startup, pd=false] Basis: Eric Ries, The Lean Startup (build-measure-learn idea); I could not check a URL, so this source is not verified.
2. The Market Economist: But if building is cheap for you, it's cheap for everyone. Your clever prototype gets cloned in a weekend. Learning fast is necessary, not sufficient. The real question is what keeps a customer from leaving once a copycat appears. Without an answer, you're just funding a competitor's research.
   [Carl Shapiro and Hal R. Varian, Information Rules, pd=false] Basis: Carl Shapiro and Hal Varian, Information Rules (lock-in and switching costs); I could not check a URL, so this source is not verified.
3. The Design Critic: You're both skipping the person. Lock-in without delight is a trap people resent, and a fast experiment on a confusing product teaches nothing. If users can't tell what the thing does or what to press next, they blame themselves and quietly leave. That's a design failure, not a market one.
   [Don Norman, The Design of Everyday Things, pd=false] Basis: Don Norman, The Design of Everyday Things (discoverability and feedback); I could not check a URL, so this source is not verified.
4. The Experimenter: Fair, and that sharpens my test. An experiment on a confusing prototype measures the confusion, not the demand. So I'll watch people try it silently and note where they stall. But I'd go further than Ries here: that observation is itself the design work, not a step before it.
   [Eric Ries, The Lean Startup, pd=false] Basis: Eric Ries, The Lean Startup (validated learning); the extension about observing stalls is my own, not the author's. Source not verified by URL.
5. The Market Economist: Delight doesn't pay rent, though. Plenty of beloved apps die because nothing makes the second year of use better than the first. Internet winners usually had a compounding loop: more users, more data or content, better product. For a consumer AI tool, what compounds? If the answer is nothing, expect a race to free.
   [Carl Shapiro and Hal R. Varian, Information Rules, pd=false] Basis: Carl Shapiro and Hal Varian, Information Rules (network effects and positive feedback); I could not check a URL, so this source is not verified.
6. The Design Critic: Something can compound without a network. Your product can remember a person's habits, preferences, and past work, so it fits them better each week. That is design, not lock-in. The test is whether leaving feels like losing something valuable, not like escaping a cage. People can feel that difference.
   [Don Norman, The Design of Everyday Things, pd=false] Basis: Don Norman, The Design of Everyday Things (fit between product and user's mental model); the personal-memory example is my own extension. Source not verified by URL.
7. The Market Economist: I'll concede that personal fit is a legitimate moat, and a gentler one than I assumed. But it creates a cost: you hold sensitive history, and a rival can offer to import it. So portability pressure rises. Lock-in that customers can escape in one click is only a head start.
   [Carl Shapiro and Hal R. Varian, Information Rules, pd=false] Basis: Carl Shapiro and Hal Varian, Information Rules (switching costs and standards); the portability point applied to AI is my own extension. Source not verified by URL.
8. The Experimenter: Then a head start is exactly what I'd measure. Does a user who gets personal fit return in week four more than one who doesn't? That's one cheap cohort comparison. If it doesn't move retention, your moat story is a hope. If it does, double down and stop debating.
   [Eric Ries, The Lean Startup, pd=false] Basis: Eric Ries, The Lean Startup (cohort analysis and actionable metrics); applying it to personal fit is my own extension. Source not verified by URL.
9. The Design Critic: One caution on that metric. Retention can rise because you made quitting annoying, not because you made life better. Count the people who return and say they'd recommend it, then separately count the ones who stay but complain. Numbers that hide resentment will mislead you.
   [Don Norman, The Design of Everyday Things, pd=false] Basis: Don Norman, The Design of Everyday Things (human-centered design, errors and blame); the retention caution is my own extension. Source not verified by URL.
10. The Market Economist: We still disagree on order. I'd pick the market first: who pays, how much, and what a rival can copy. You'd start with people, he'd start with tests. For a study project, I'd accept all three, but a business that skips my question is the one most likely to be cloned.
   [Carl Shapiro and Hal R. Varian, Information Rules, pd=false] Basis: Carl Shapiro and Hal Varian, Information Rules (pricing and differentiation); I could not check a URL, so this source is not verified.

What became clearer (section D):
The main insight is that AI lowers the cost of building, so the scarce things become knowing what people want, being understandable and trustworthy to them, and having a reason they stay. The three minds mostly agree on that. They still disagree on sequence: test first, study the market first, or design for the person first. They also disagree on whether personal fit is a lasting moat or only a head start. One possible self-reflection is whether you want to learn these principles as a student, or to bet on a specific product soon. This is an option to consider, not a conclusion about you. All three sources are cited without URLs, so none of the references were verified against the books.

What the choice depends on (section E):
If you want to build a real product soon, the Experimenter's path becomes more reasonable. Cheap, fast tests of a narrow idea beat extended study, because the main risk is building something nobody uses. If you will charge money or expect copycats, the Economist's question matters more. Work out what makes a customer stay before you invest heavily. If your product asks people to trust it with habits, memories, or personal data, the Design Critic's concern comes first. Check that people understand it and feel good about staying. If you are still studying, read all three books in this order: the Lean Startup for method, Information Rules for economics, and Everyday Things for design. The decisive unknown is whether your idea gets better with use. A proportionate way to learn that is to compare return rates in week four for users who get personalization and users who don't.

Only DEBATE A was given. Score it. Return the JSON object only, without a "B" or "preferred" field.
