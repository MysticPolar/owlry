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
I don’t know what I want to do with my life. I want stability and time for people I love, but nothing feels like a calling. Where do I start?

=== DEBATE A ===
Situation (section A):
You don't know what to do with your life. You want stability and time for the people you love, but no work feels like a calling, and you're asking where to start. What you've reported is two fairly clear wants (security and time for people) and one absence (no calling). It isn't clear whether that absence means you lack interests, or whether you've assumed a calling has to show up before you commit to anything. It's also unclear whether stability and time for people are fixed requirements or partly a response to pressure or fear. Much of what to do depends on that.

Minds (section B):
- The Experimenter: Identity is learned by trying things, not by introspection, so the first step is small and cheap tests. [Herminia Ibarra, Working Identity, 2003]
- The Craftsman: Passion usually follows getting good at something valued, so the question is what to get good at, not what to feel. [Cal Newport, So Good They Can't Ignore You, 2012]
- The Life-Wide Realist: Happiness comes from outward interests and affection, so a job should serve a full life, not be its whole point. [Bertrand Russell, The Conquest of Happiness, 1930]

Debate (section C), 10 turns:
1. The Experimenter: Start by dropping the search for a calling. Nobody finds themselves by thinking harder. Pick three small, cheap tests this month: shadow someone, take a short class, do a weekend project. See what you want more of. You can't reason your way to a wish you haven't felt yet.
   [Herminia Ibarra, Working Identity, pd=false] Basis: Ibarra, Working Identity, on testing possible selves through action (source not verified; no link provided)
2. The Craftsman: Testing sounds comfortable, but it can become endless sampling. Julia Child didn't feel a calling for cooking at first. She took classes in her late thirties and kept getting better. I'd say the user needs a field where skill can build up, because stability comes from being rare and good.
   [Cal Newport, So Good They Can't Ignore You, pd=false] Basis: Newport, So Good They Can't Ignore You, on career capital and skill before passion (source not verified; no link provided)
3. The Life-Wide Realist: You're both treating work as the center of this. The user said stability and time for loved ones. If that's what they want, a decent, steady job that leaves evenings free may already be a good answer. Not every life needs a vocation to be a good one.
   [Bertrand Russell, The Conquest of Happiness, pd=true] Basis: Russell, The Conquest of Happiness (1930), on zest, affection and outward interests (paraphrase only; source not verified; no link provided)
4. The Experimenter: That's fair, but notice the word 'already'. If they feel adrift, a decent job may be a place to hide, not a choice. Here is a reading to test: the missing calling may bother them because they fear settling means giving up. If so, a cheap experiment tells them more than a steady job would.
   [Herminia Ibarra, Working Identity, pd=false] Basis: Ibarra, Working Identity, on experimenting rather than committing early (source not verified; no link provided)
5. The Life-Wide Realist: Or the reverse. Maybe they don't feel adrift at all, and a culture that says everyone needs a calling is making them feel they should. Steve Jobs told Stanford graduates in 2005 to love their work. That is easy to say once you're already Steve Jobs. Your test could add pressure, not relief.
   [Bertrand Russell, The Conquest of Happiness, pd=true] Basis: Russell, The Conquest of Happiness (1930), on anxiety and comparison (paraphrase only; the Jobs example is my illustration, not Russell's; source not verified; no link provided)
6. The Craftsman: Jobs is my case too. Newport argues his early path was more about electronics and earning than burning purpose, and the passion grew with mastery. But I'll concede something to Russell. If stability and free evenings are fixed, then I shouldn't push a field. I should ask which steady jobs reward getting good.
   [Cal Newport, So Good They Can't Ignore You, pd=false] Basis: Newport, So Good They Can't Ignore You, on the passion hypothesis and Steve Jobs (source not verified; no link provided)
7. The Life-Wide Realist: Careful, though. Mastery can eat the evenings. Plenty of people chase being excellent until the time for loved ones is gone. That would be a bad trade for this user, since time with people is half of what they said. My guess is that many ambitious jobs quietly cost this.
   [Bertrand Russell, The Conquest of Happiness, pd=true] Basis: Russell, The Conquest of Happiness (1930), on balance between work and affection (paraphrase only; source not verified; no link provided)
8. The Experimenter: So the experiments need rules. I'm changing my position: no open-ended trying. Each test must fit inside the user's evenings and leave their income alone. Vera Wang left a steady magazine job for fashion design at about forty, but she had years of related experience. Small, bounded tests are the safe version of that.
   [Herminia Ibarra, Working Identity, pd=false] Basis: Ibarra, Working Identity, on small bounded experiments; the Vera Wang example is mine, not Ibarra's (source not verified; no link provided)
9. The Craftsman: Good, and mine becomes narrower too. I'd say test only things where improvement is visible within a few months, because that is what separates a real fit from a passing mood. If nothing shows progress or interest by then, drop it and try another. That keeps the testing from drifting.
   [Cal Newport, So Good They Can't Ignore You, pd=false] Basis: Newport, So Good They Can't Ignore You, on deliberate practice and feedback (source not verified; no link provided)
10. The Life-Wide Realist: I still disagree on one point. You two assume something will turn up. It may not, and that could be fine. What settles this is whether, after a few bounded tries, anything pulls at them. If something does, follow it within their limits. If nothing does, the steady life with loved ones is a real answer, not a failure.
   [Bertrand Russell, The Conquest of Happiness, pd=true] Basis: Russell, The Conquest of Happiness (1930), on interests and a full life (paraphrase only; source not verified; no link provided)

What became clearer (section D):
The main insight is that the question 'what is my calling?' may be the wrong place to start. The debate moved toward small, bounded tests that fit inside stability and time with loved ones, each judged by whether interest or visible progress shows up. Still disputed: whether skill-building ambition would cost the time they say they want, and whether a steady, ordinary life is a complete answer or a way of avoiding the question. A possible self-reflection is whether the lack of a calling feels like a missing piece or like pressure from outside. That is a reading to test, not a conclusion about them. The sources for the three books were not verified, so no links are given.

What the choice depends on (section E):
If stability and free time are fixed requirements, then pick bounded, low-cost tests (a class, a shadowing day, a side project) and a steady job that leaves evenings free, because that protects what you already value while you learn. If a test shows real interest or visible progress within a few months, then building skill in that area becomes more reasonable, as long as it doesn't take over the time for people you love. If nothing pulls after several tries, a steady, ordinary job with a full life outside work is a reasonable answer in itself. If it's unknown whether the fixed requirements are really fixed or partly fear, a proportionate way to learn is to notice which kinds of work you'd still do with no pay and no audience, and to try one small test of that this month.

=== DEBATE B ===
Situation (section A):
You do not know what to do with your life. You want stability and time for people you love, but no kind of work feels like a calling. You have reported only those wants and that feeling. The decisive unknown is whether this is a shortage of information (you have not tried enough to know) or a settled preference for a life centered outside work. Your money, obligations and the people who depend on your income are also unknown.

Minds (section B):
- The Experimenter: You learn what fits by trying things, not by introspecting. [Herminia Ibarra, Working Identity: Unconventional Strategies for Reinventing Your Career, 2003]
- The Craftsman: Stability and satisfaction come from becoming skilled and useful, not from finding a passion first. [Cal Newport, So Good They Can't Ignore You, 2012]
- The Simplifier: The real price of any arrangement is the life you spend to pay for it, and time for people is the thing to protect. [Henry David Thoreau, Walden, 1854]

Debate (section C), 10 turns:
1. The Experimenter: I read this as a data shortage, not a character flaw. This person has one narrow sample of life and is trying to deduce the whole answer by thinking harder. Ibarra found career changers learned who they were by trying things and then reflecting, rarely the other way round. So the first job is gathering evidence, not producing an answer.
   [Herminia Ibarra, Working Identity: Unconventional Strategies for Reinventing Your Career, pd=false] Basis: Herminia Ibarra, Working Identity (source not verified online; idea paraphrased, no section cited)
2. The Simplifier: You are skipping what they already said. Stability and time for loved ones is a real answer, just not a job title. Thoreau spent two years at Walden Pond starting in 1845 and found that a little paid work covered his needs. Maybe the question is how little of their life this way of living should cost.
   [Henry David Thoreau, Walden, pd=true] Basis: Henry David Thoreau, Walden (source not verified online; idea paraphrased, no section cited)
3. The Craftsman: Nothing feels like a calling? That is the normal state, not a symptom. Newport treats follow your passion as a shaky hypothesis. As he reads it, Steve Jobs told Stanford graduates in 2005 to love their work, yet Apple began as a practical money-making venture. Love for work usually grows after you get good and gain some control.
   [Cal Newport, So Good They Can't Ignore You, pd=false] Basis: Cal Newport, So Good They Can't Ignore You (source not verified online; idea paraphrased, no section cited)
4. The Simplifier: I distrust the phrase what to do with my life. It treats a whole lifetime as one decision, which is how people freeze. Thoreau thought many people drift into quiet desperation by never questioning the plan they inherited. Shrink it: what does the next two years need to contain? That is answerable, even if the lifetime is not.
   [Henry David Thoreau, Walden, pd=true] Basis: Henry David Thoreau, Walden (source not verified online; idea paraphrased, no section cited)
5. The Experimenter: Fine, shrink it, then start cheaply. This month: talk to someone in a job that looks steady, shadow a workday or do a small project, take a short course. Judge each by how the days feel, not by whether it is a calling. Ibarra says reflection alone replays the old self; doing creates new options.
   [Herminia Ibarra, Working Identity: Unconventional Strategies for Reinventing Your Career, pd=false] Basis: Herminia Ibarra, Working Identity (source not verified online; idea paraphrased, no section cited)
6. The Craftsman: Three tests, three shrugs. If what this person wants is relief from the fear of choosing wrong, sampling feeds that fear, because no sample ever announces itself as the answer. I would go further than Newport here: endless sampling can become a way of never choosing. Stay in one field for a year and get useful. Skill is what buys control over your hours.
   [Cal Newport, So Good They Can't Ignore You, pd=false] Basis: Cal Newport, So Good They Can't Ignore You (source not verified online; idea paraphrased, no section cited)
7. The Simplifier: Look at the two things they named. Steady pay and free evenings pull apart: the ladder that makes income steady often eats hours, while a cheap life frees hours but loosens income. Craftsman, your path serves stability; mine serves time. If what they fear is being a burden, they will pick yours, so what do their people actually need?
   [Henry David Thoreau, Walden, pd=true] Basis: Henry David Thoreau, Walden (source not verified online; idea paraphrased, no section cited)
8. The Experimenter: Craftsman, you moved me on one point. Sampling aimed at finding a calling will fail, because the target never shows up. So I change my claim: test against criteria this person already gave us, namely predictable hours, steady pay and tolerable work. Run my small tests as filters, then stay in one field for a year.
   [Herminia Ibarra, Working Identity: Unconventional Strategies for Reinventing Your Career, pd=false] Basis: Herminia Ibarra, Working Identity (source not verified online; idea paraphrased, no section cited)
9. The Craftsman: Simplifier, your Walden case proves less than you think. Thoreau was single, and critics note he walked into Concord often to eat and visit family. Cheap living works when nobody depends on your income. If loved ones need money, a low-cost life might cost you time with them anyway.
   [Cal Newport, So Good They Can't Ignore You, pd=false] Basis: Cal Newport, So Good They Can't Ignore You (source not verified online; idea paraphrased, no section cited)
10. The Simplifier: Fair, and it narrows my claim: frugality buys time only if it does not shift the cost onto someone else. So the settling condition is the fixed cost of the people they love. If a stable role gives predictable hours and covers those costs, stay and deepen the skill. If it takes their evenings, cut expenses before changing fields.
   [Henry David Thoreau, Walden, pd=true] Basis: Henry David Thoreau, Walden (source not verified online; idea paraphrased, no section cited)

What became clearer (section D):
The main insight is that you may have a usable answer already: stability and time for people are criteria, even though they are not a calling. That turns the question from who should I become into what the next stretch of life has to contain. Still disputed: whether to sample widely first (the Experimenter), commit to one field and build skill (the Craftsman), or lower costs to protect time (the Simplifier). A possible self-reflection is which of your two wants, steady income or free time, you would give up first if you had to, and whether fear of choosing wrong is part of why nothing feels like a calling. These are possibilities to test, not conclusions about you.

What the choice depends on (section E):
If you have people who rely on your income, or you value predictability above all, then choosing a reasonably stable field and building skill for about a year becomes more reasonable, because skill earns both pay and leverage over your hours.
If your fixed costs are low and nobody depends on your income, then lowering expenses and choosing work for its hours becomes more reasonable, because time is then the scarcer resource.
If you have not tried enough to know what tolerable work looks like, then run a few cheap tests this month (a conversation with someone in a steady job, a short project, a short course) and judge each by predictable hours, steady pay and how the days feel.
If the unknown is whether a stable role will leave you evenings, learn it by asking people already in that role about their typical week before committing.

Score A and B. Return the JSON object only.
