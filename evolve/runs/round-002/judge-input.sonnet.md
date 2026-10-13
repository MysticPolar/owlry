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
They’re really affectionate when we meet, but barely reply between dates. Am I asking for too much, or are we looking for different things?

=== DEBATE A ===
Situation (section A):
The user sees warmth in person but little contact between dates, and they are asking two things: whether they want too much, and whether the two of them want different things. What they have reported is a pattern: affectionate in person, quiet in between. What they have not reported, and what decides most of this, is why the other person goes quiet, and whether that person has ever been told that contact between dates matters. Every other reading of the silence is an interpretation.

Minds (section B):
- The Pattern Reader: Closeness needs differ between people, and repeated behavior shows how someone handles connection. [Amir Levine and Rachel Heller, Attached, 2010]
- The Practice Critic: Love is something people do and learn, so the useful question is what each person is willing to do, not whether they fit. [Erich Fromm, The Art of Loving, 1956]
- The Crystallization Skeptic: Gaps get filled with hope or dread, so conclusions should rest on what has been observed. [Stendhal, On Love (De l'amour), 1822]

Debate (section C), 10 turns:
1. The Pattern Reader: No, wanting some contact between dates isn't too much. It's an ordinary need. Affectionate in person and silent apart is a recognizable pattern: some people feel closeness only when someone is in front of them. That's a guess about style, not about caring, but it suggests a real mismatch in how the two of you stay connected.
   [Amir Levine and Rachel Heller, Attached, pd=false] [Basis: Levine and Heller, Attached, general framework of attachment styles in adult relationships; source not verified, no link provided]
2. The Crystallization Skeptic: You're already filling a blank. All we know is warm meetings and quiet gaps. Stendhal wrote his whole theory of love while pining for Métilde Dembowski, who kept him at a distance, and he decorated her silence with his own hopes. The user may be doing the same, with hope or with dread.
   [Stendhal, On Love (De l'amour), pd=true] [Basis: Stendhal, On Love (De l'amour), the theory of crystallization; source not verified, no link provided]
3. The Practice Critic: You're both treating this as a test of compatibility, as if the answer is waiting to be detected. I'd say love is a practice, and practices can be asked for. Wanting a midweek message isn't a verdict on the other person. It's a request, and the way they answer it will tell you more than any theory.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Fromm, The Art of Loving, love as an art requiring active effort; source not verified, no link provided]
4. The Pattern Reader: Fair point: texts measure texting, not feeling. Kafka wrote Felice Bauer hundreds of letters, then recoiled when they were actually together, so the reverse of this pattern exists too. I'll narrow my claim. The silence doesn't prove low interest. But the user's need for contact is real whatever the reason for the quiet.
   [Amir Levine and Rachel Heller, Attached, pd=false] [Basis: Levine and Heller, Attached, differing comfort with closeness and distance; source not verified, no link provided]
5. The Crystallization Skeptic: Then test a reading of the user, not of the other person. If what they want is to feel chosen on ordinary days, then each silence reads as being forgotten. That story may hurt more than the silence does. The question is whether they'd be fine with sparse contact if they trusted the affection, or whether they need the contact itself.
   [Stendhal, On Love (De l'amour), pd=true] [Basis: Stendhal, On Love (De l'amour), imagination shaping perceptions of the beloved; source not verified, no link provided]
6. The Practice Critic: If what they want is to be chosen, then waiting to be guessed fails. The other person can't give what they haven't been shown is wanted. I'd go further than Fromm here: staying quiet while keeping score is a quiet way of withdrawing too. Naming the want is part of giving, not a demand.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Fromm, The Art of Loving, love as giving and care; the extension about keeping score is my own; source not verified, no link provided]
7. The Crystallization Skeptic: Make the case for doing nothing, though. Two or three more dates, no ask, just watching. If the pattern shifts unprompted, you learn something no request could show. If it doesn't, you've lost little. A big talk on thin evidence tests the relationship before it has had a chance to show what it is.
   [Stendhal, On Love (De l'amour), pd=true] [Basis: Stendhal, On Love (De l'amour), caution about early certainty and imagined perfection; source not verified, no link provided]
8. The Pattern Reader: Waiting isn't neutral for someone who feels the gap. In my reading, anxious waiting tends to leak out as testing: a pointed text, a cooler reply, a sulk. That's a guess about this user, not a fact. And it muddies your experiment, because you're no longer watching the other person's real pattern.
   [Amir Levine and Rachel Heller, Attached, pd=false] [Basis: Levine and Heller, Attached, protest behavior in anxious attachment; source not verified, no link provided]
9. The Practice Critic: You've moved me. I came in wanting a direct talk about what they want. But the Skeptic is right that a heavy conversation on thin evidence is a poor test. So I'll shrink it to one small, specific ask, something like a short midweek message, and watch what happens. Sartre and Beauvoir named their different wants openly, and that is what made the mismatch workable.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Fromm, The Art of Loving, active care and responsibility; the Sartre and Beauvoir example is my own application; source not verified, no link provided]
10. The Crystallization Skeptic: Agreed on the small ask, with one condition. Whether the user is asking too much or the two want different things depends on one observation: after a plain request, does the pattern shift within a few weeks, or does the other person say this isn't what they offer? A shift means habit. A refusal means different wants.
   [Stendhal, On Love (De l'amour), pd=true] [Basis: Stendhal, On Love (De l'amour), distinguishing imagination from observed reality; source not verified, no link provided]

What became clearer (section D):
The main insight is that the two questions the user asked can be separated by something observable. Wanting some contact between dates is an ordinary need. Whether it clashes with this person depends on how they respond once the want is stated plainly and specifically, which hasn't been tested yet. What remains disputed is how long to wait first: the Skeptic favors watching for a few more dates, while the Pattern Reader worries that waiting while anxious distorts the picture. A possible self-reflection is whether the silence itself bothers the user, or the story they tell themselves about what it means. All of this is a set of readings to test, not a conclusion about what the user wants or what the other person feels. The books are cited from memory and none of the sources were verified in this session.

What the choice depends on (section E):
If, after a small, specific request such as a short midweek message, the other person adjusts within a few weeks, then the silence was probably habit, and the user's want is reasonable and workable. If the other person says plainly that they don't do contact between dates, or nothing changes, then the two probably want different things, and the user can decide whether they can live with that. If the user finds that even occasional gaps feel unbearable whatever the other person does, that is a separate fact about their own needs, and it deserves attention whether or not this relationship continues. If the user can't yet tell which of these applies, a proportionate way to find out is one clear, low-pressure ask and a few weeks of watching what follows.

=== DEBATE B ===
Situation (section A):
You describe a dating situation where the other person is warm and affectionate in person but sends few replies between meetings. You're unsure whether wanting more contact is excessive or whether you simply want different things. What you've reported is the pattern itself. The decisive unknowns are how long this has gone on, what you two have said about pace and expectations, how they respond when you raise it, and whether their texting is sparse with everyone or only with you. A reframing to test: the question may be less about whether your ask is too much and more about whether your needs fit together and whether you can find that out without guessing.

Minds (section B):
- The Attachment Mapper: People differ in how much closeness and contact they need to feel secure, and a mismatch in those needs can look like a character flaw. [Amir Levine and Rachel Heller, Attached, 2010]
- The Pattern Counter: Small, repeated moments of reaching toward someone, and how they are met, say more than any single feeling or conversation. [John Gottman, The Relationship Cure, 2001]
- The Self-Anchored Lover: Love is a skill and a practice that includes honest self-knowledge, effort and respect for the other person, not only a feeling of being sufficiently attended to. [Erich Fromm, The Art of Loving, 1956]

Debate (section C), 11 turns:
1. The Attachment Mapper: I'd start with fit, not fault. Some people feel secure with constant contact, others feel close in person and need space in between. Neither is broken. Affectionate dates and quiet gaps could be one person's normal. The risk is that you read the silence as meaning and they never intended any.
   [Amir Levine and Rachel Heller, Attached, pd=false] [Basis: Amir Levine and Rachel Heller, Attached, general framework of attachment styles in adult relationships; source not verified, so no link or section is given]
2. The Pattern Counter: Careful, though. 'It's just their style' can excuse a lot. I'd ask what happens when you do reach out. A slow reply is one thing. A reply that meets you warmly is another. A message that gets no answer at all is a different pattern again.
   [John Gottman, The Relationship Cure, pd=false] [Basis: John Gottman, The Relationship Cure, idea of bids for connection and how they are received; source not verified, so no link or section is given]
3. The Self-Anchored Lover: Both of you are scoring them. Nobody has asked what you actually want. Is it daily texts, or the sense that you're on their mind? Those are different needs, and one can be met without the other. Until you can name it, 'too much' has no meaning.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Erich Fromm, The Art of Loving, love as an active practice requiring self-knowledge; source not verified, so no link or section is given]
4. The Attachment Mapper: Fair, and that sharpens my point. If what you need is felt presence, a fit can be built in other ways: one good-morning message, a fixed call, a plan made before the date ends. If you need frequent contact itself, that's a harder mismatch. I'd want to know which one it is.
   [Amir Levine and Rachel Heller, Attached, pd=false] [Basis: Amir Levine and Rachel Heller, Attached, discussion of differing needs for closeness; source not verified, so no link or section is given]
5. The Pattern Counter: I'd push back on 'build a fit' as the first move. Count first. If you send three messages and get one back, and the in-person warmth never mentions the gap, that's information. If they answer within a day when you ask something real, that's different information. Don't theorize before you've tallied.
   [John Gottman, The Relationship Cure, pd=false] [Basis: John Gottman, The Relationship Cure, attending to patterns in small interactions over time; source not verified, so no link or section is given]
6. The Self-Anchored Lover: Counting has a trap. A tally can turn a date into an audit, and the person being audited tends to pull back. I'd go further than Fromm here and say that a person who keeps score is already half out of the relationship. Name the need once, plainly, then watch what they do with it.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Erich Fromm, The Art of Loving, giving and care versus a transactional stance; the extension about scorekeeping is this speaker's own; source not verified, so no link or section is given]
7. The Pattern Counter: Partly conceded. Counting as surveillance does damage. But I'd say counting for one or two weeks, quietly, in order to have an honest conversation isn't scorekeeping. It's the difference between saying 'you never reply' and saying 'I've noticed days of quiet and I'd like to talk about it.'
   [John Gottman, The Relationship Cure, pd=false] [Basis: John Gottman, The Relationship Cure, noticing and responding to bids; the framing of a short quiet tally is this speaker's own; source not verified, so no link or section is given]
8. The Attachment Mapper: And the conversation matters more than the data. Someone who goes quiet and then says 'I get overwhelmed by constant texting, can we find something between us' is showing you flexibility. Someone who gets defensive at the first mention is showing you something too, though one bad reaction doesn't settle it.
   [Amir Levine and Rachel Heller, Attached, pd=false] [Basis: Amir Levine and Rachel Heller, Attached, how partners respond to stated needs; source not verified, so no link or section is given]
9. The Self-Anchored Lover: Here's the alternative nobody has argued for: wait. Early dating is a poor place to demand a rhythm. If the dates are warm and you're otherwise content, perhaps the right amount of ask is none for a few more weeks. The cost is some uncertainty, and you should ask yourself whether you can carry that without resentment.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Erich Fromm, The Art of Loving, patience and discipline as part of loving; the application to waiting in early dating is this speaker's own; source not verified, so no link or section is given]
10. The Pattern Counter: Waiting is reasonable if it's chosen. It's weaker if it's avoidance dressed up as patience. My test is whether the quiet is making you anxious enough that you're checking your phone more than you're enjoying the dates. If so, the waiting is already costing you something.
   [John Gottman, The Relationship Cure, pd=false] [Basis: John Gottman, The Relationship Cure, emotional connection and its everyday maintenance; the anxiety test is this speaker's own; source not verified, so no link or section is given]
11. The Attachment Mapper: So we agree on less than it looks like. We agree you can't judge 'too much' without knowing what you need, and that a stated need is more useful than a silent test. We still disagree about timing: speak soon, or give it a few weeks first. That depends on how much the gaps unsettle you.
   [Amir Levine and Rachel Heller, Attached, pd=false] [Basis: Amir Levine and Rachel Heller, Attached, matching needs and communicating them early; source not verified, so no link or section is given]

What became clearer (section D):
The main shift is from 'am I asking too much?' to 'what exactly do I need, and how does this person respond when I say it?' The debate also separated three things that often get blurred: a difference in contact style, a pattern of unanswered reaching out, and your own tolerance for uncertainty. Still disputed: whether to raise it now or let the pattern show itself over a few more weeks, and how much careful observation helps before it turns into scorekeeping. One thing you might reflect on: if the texting stayed exactly as it is, which part of it would you actually miss, the frequency or the feeling of being thought about?

What the choice depends on (section E):
If the quiet is mostly a matter of style (they reply warmly and within a reasonable time when you ask something, and they are open when you mention it), then a middle rhythm is a reasonable thing to ask for, because the underlying interest looks real and the gap is about habit. If your messages are often left unanswered, or raising the topic gets defensiveness or dismissal, then you may be looking for different things, and staying would mean accepting that arrangement as it is. If you can't yet tell which of these applies, a proportionate way to find out is to name one specific preference once (for example, a short check-in on non-date days or a plan made before you part) and see over the next few weeks whether they take it up, adjust it, or ignore it. If the waiting itself is making you anxious or resentful, that is a reason to ask sooner. If you feel settled with the current pace, there's less urgency.

Score A and B. Return the JSON object only.
