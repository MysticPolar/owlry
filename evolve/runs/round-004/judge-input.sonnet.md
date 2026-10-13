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
I finished The Little Prince, and it felt beautiful, but I’m not sure I understood why the rose mattered so much. How do you read that relationship?

=== DEBATE A ===
Situation (section A):
You finished The Little Prince, found it beautiful, and are unsure why the prince's rose matters so much to him. You ask how to read their relationship. You have not said what puzzles you. It could be that the rose seems vain and difficult, or that she seems ordinary beside a garden of identical roses, or that the prince leaves her. Which of these it is changes which reading helps most.

Minds (section B):
- The Projection Skeptic: Whether the rose matters because of what she is, or because of what a lonely mind adds to her. [Stendhal, On Love (De l'amour), 1822]
- The Attentive Seer: Whether love means seeing a particular person accurately, past our own flattering fantasies. [Iris Murdoch, The Sovereignty of Good, 1970]
- The Practitioner of Love: Whether love is something you do, through care, responsibility and effort, rather than something you feel or find. [Erich Fromm, The Art of Loving, 1956]

Debate (section C), 10 turns:
1. The Projection Skeptic: My claim: the rose isn't special, the prince's loneliness is. Alone on a tiny planet with nobody to compare her to, he decorates her with every perfection. Dante barely spoke to Beatrice and built a cathedral of verse on her. The rose matters because he made her matter.
   [Stendhal, On Love (De l'amour), pd=true] [Basis: Stendhal, On Love (De l'amour), on crystallization; source not verified online, so no link given]
2. The Attentive Seer: Then you've skipped the flower on the page. She coughs to make him feel guilty, hides her fear of tigers, apologizes too late. That's no blank screen, that's a specific, awkward person. The rose mattered because the book teaches us to look at her accurately, and love is that patient looking, past flattering fantasy.
   [Iris Murdoch, The Sovereignty of Good, pd=false] [Basis: Iris Murdoch, The Sovereignty of Good, on love as attention to a particular reality; source not verified online, so no link given]
3. The Practitioner of Love: Now the second half of the question, how to read the relationship. I read it as an apprenticeship. At first he wants to be loved and flees at the first quarrel. Only later does he learn that love is a practice of care and responsibility, something you do. Sadly, he learns it by leaving.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Erich Fromm, The Art of Loving, on love as care, responsibility, respect and knowledge; source not verified online, so no link given]
4. The Projection Skeptic: Responsibility is lovely, but care can be poured onto anything. A branch left in the Salzburg salt mine, as my source tells it, came out glittering months later; the glitter belonged to the mine, not the twig. And this reader may want the rose to deserve all that devotion. She doesn't have to.
   [Stendhal, On Love (De l'amour), pd=true] [Basis: Stendhal, On Love (De l'amour), the Salzburg branch image; source not verified online, so no link given]
5. The Attentive Seer: A rival reading of this reader: perhaps the worry isn't whether she deserves it, but whether she's replaceable, with five thousand like her in the garden. Your branch also had no history; the prince saw her vanity and came back anyway. I concede this much: your point about fantasy moved me. His first view of her as a flawless beauty was exactly that, and real attention began when it cracked. If replaceability is the worry, the garden scene is the one to reread.
   [Iris Murdoch, The Sovereignty of Good, pd=false] [Basis: Iris Murdoch, The Sovereignty of Good, on fantasy as an obstacle to just attention; source not verified online, so no link given]
6. The Practitioner of Love: Here is a fact we lack: did this reader find the rose hard to like, or the prince hard to forgive? If the rose grated, my reading wins, because care makes love, not merit. If she seemed lovable, the seeing reading explains more, and I admit effort alone can't say why he'd pick her over the garden.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Erich Fromm, The Art of Loving, on love as an activity rather than a reward for merit; source not verified online, so no link given]
7. The Projection Skeptic: I'll narrow my claim: imagination starts the attachment but can't explain why he returns after seeing her faults. Still, this reader may want two things at once. One is a rose irreplaceable in herself, which the seeing reading serves. The other is a love anyone could build by caring, which the effort reading serves. Both in full isn't on offer.
   [Stendhal, On Love (De l'amour), pd=true] [Basis: Stendhal, On Love (De l'amour), on imagination and attachment; source not verified online, so no link given]
8. The Practitioner of Love: I accept that reading, with a twist: the two clash less than they seem. She is irreplaceable because he spent his hours on her, not because she outranks other roses. But a reader who wants uniqueness without any history will find the book withholding. I'd call that demand the real cost.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Erich Fromm, The Art of Loving, on care and responsibility as the basis of attachment; source not verified online, so no link given]
9. The Projection Skeptic: Effort proves little; people pour hours into bad bets too. And there's a simpler option: do less. Saint-Exupery wrote this in New York exile, apart from Consuelo, whom many readers see in the rose. A man missing a difficult wife may just be forgiving her on paper. Then she mattered as an apology, not a doctrine.
   [Stendhal, On Love (De l'amour), pd=true] [Basis: Stendhal, On Love (De l'amour), on absence and the imagination; source not verified online, so no link given]
10. The Attentive Seer: Your apology reading still leaves the quarrel between me and Fromm's heir untouched. I say the rose was there to be seen; he says she was made by labor. Sunk cost doesn't settle that. What decides it is the reader, not the book: whether their strongest attachments feel found or built.
   [Iris Murdoch, The Sovereignty of Good, pd=false] [Basis: Iris Murdoch, The Sovereignty of Good, on love as discovering the real; source not verified online, so no link given]

What became clearer (section D):
The clearest insight is that the rose mattered through three things working together: the prince's imagination first lit her up, his attention then showed her faults and his return anyway, and his daily care made her his. What stays disputed is whether love finds a person who was already there or makes one through effort. The minds also disagree about whether the author was simply forgiving a real, difficult partner. One possible self-reflection: when you think of something you love, does it feel discovered or built, and do you want it to be irreplaceable in itself or because of what you gave it? None of this assumes you hold either view.

What the choice depends on (section E):
If the rose seemed hard to like to you, the effort reading becomes more reasonable, because it says her value comes from his care and not her merit. If she seemed lovable in her own right, the seeing reading fits better, because it says the book trains us to notice a particular person. If you found the ending painful because he leaves, the apprenticeship reading helps, because it treats leaving as the cost of learning. If you can't tell yet, reread the fox and garden chapters and notice whether you are moved more by her particularity or by the time he spent on her.

=== DEBATE B ===
Situation (section A):
The reader finished The Little Prince, found it beautiful, and is unsure why the rose matters so much to the prince. What they've reported is a feeling (beauty) and a gap (not seeing why this one flower carries the story). The decisive uncertainty is whether she matters because of the care he gave her, because of who she is, or because of what the relationship shows about loving well. The three minds below are fictional.

Minds (section B):
- The Close Reader: What the story itself does: how it builds the rose's importance through the fox, the garden of look-alikes, and the ending. [Antoine de Saint-Exupéry, The Little Prince, 1943]
- The Friendship Examiner: Whether the rose is worth loving and whether the bond is mutual, rather than just a habit of attachment. [Aristotle, Nicomachean Ethics, -340]
- The Skeptic of Possessive Love: Whether love is a feeling or a practice, and what the prince failed to do. [Erich Fromm, The Art of Loving, 1956]

Debate (section C), 10 turns:
1. The Close Reader: Start with how unimpressive she is. The rose is vain, fishes for compliments, and fibs about her thorns. Then the story shows the prince a garden of five thousand identical roses. My reading: the book picks a flawed, replaceable flower on purpose, to claim that mattering is made by tending, not found in the object.
   [Antoine de Saint-Exupéry, The Little Prince, pd=false] [Basis: Antoine de Saint-Exupéry, The Little Prince; source not verified online]
2. The Friendship Examiner: Hours spent explain his attachment, not her worth. Aristotle's view is that real friendship wishes the other well for her own sake, and she must wish it back. We don't befriend wine, however much we pour into it, because wine returns nothing. Early on, the rose takes water and gives demands.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics; source not verified online]
3. The Skeptic of Possessive Love: Then read the relationship as a failure of knowing. Fromm saw love as care, responsibility, respect and knowledge, all practiced. The prince cares and feels responsible, but he judged her by her words instead of her deeds, and left. That's less a romance than a young person who loved before he knew how.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Erich Fromm, The Art of Loving; source not verified online]
4. The Close Reader: The wine test is fair, but the rose isn't wine. Real case: Odysseus turns down a goddess's offer of deathless life to sail home to a mortal wife, Penelope. Her sameness is the point; she is his. I'll concede this much: the prince's love still needed some answer from her.
   [Antoine de Saint-Exupéry, The Little Prince, pd=false] [Basis: Antoine de Saint-Exupéry, The Little Prince; source not verified online]
5. The Friendship Examiner: The farewell scene moves me. I said she gives only demands, but at the end she admits she was silly, tells him to be happy, and drops her fuss over the glass dome. That's goodwill for his sake. So I withdraw part of my charge: reciprocity existed, just late and hidden until he was leaving.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics; source not verified online]
6. The Skeptic of Possessive Love: Maybe the reader felt the beauty and wants a rule from it: love anything long enough and it becomes precious. If so, my reading disappoints, because the book also shows the cost. He leaves her alone with four thorns against the world. Is what stirred them a rule, or the ache of love done badly?
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Erich Fromm, The Art of Loving; source not verified online]
7. The Close Reader: Ache is closer. Real case: Saint-Exupéry's wife Consuelo is widely reported as the model for the rose, and their marriage was stormy, with long separations. If the rose is partly an apology, the prince's leaving reads less like a lesson in maturity and more like regret. Your diagnosis of immaturity sounds like a verdict the author never gave himself.
   [Antoine de Saint-Exupéry, The Little Prince, pd=false] [Basis: Antoine de Saint-Exupéry, The Little Prince; source not verified online]
8. The Friendship Examiner: Here's a split I suspect in this reader, and it's a guess: they want a clean reason the rose matters, and they want the beauty left intact. Explain her fully, with time spent and mutual goodwill, and some mystery drains out. Keep the mystery and you lose the reason. Analysis serves the first; the Close Reader's quiet serves the second.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics; source not verified online]
9. The Skeptic of Possessive Love: I'd go further than Fromm here. Compare The Velveteen Rabbit, where a worn toy becomes real simply by being loved and nobody has to leave. The prince's love requires leaving, so the beauty may come from duty left unfinished. The narrator's closing worry about whether a sheep ate the flower shows care outlasting any answer.
   [Erich Fromm, The Art of Loving, pd=false] [Basis: Erich Fromm, The Art of Loving; source not verified online]
10. The Friendship Examiner: Then here's what settles it, and I'll accept either result. Imagine the rose never apologized. If she'd still break a reader's heart, care alone makes her matter and the Close Reader wins. If she'd matter less, mutual goodwill carries the weight and the friendship view holds. That reaction decides it.
   [Aristotle, Nicomachean Ethics, pd=true] [Basis: Aristotle, Nicomachean Ethics; source not verified online]

What became clearer (section D):
The main insight is that the book makes the rose ordinary on purpose, so her importance has to come from somewhere other than her qualities: the care and time the prince gave her. Still disputed is whether that care alone is enough (the Close Reader), whether her late goodwill is what completes the bond (the Friendship Examiner), and whether the prince's leaving is a failure of love or an honest picture of it (the Skeptic). A possible self-reflection: was the beauty in the idea that anything tended becomes precious, or in the rose's apology and the cost of leaving her?

What the choice depends on (section E):
If the rose still seems precious to you even with her apology removed, the care-and-time reading (the rose matters because she is yours) becomes more reasonable, because it needs nothing from her. If she would matter less without the apology, the mutual-goodwill reading becomes more reasonable, because the bond depends on her answering his care. If what moved you most was the prince leaving her, the love-as-practice reading becomes more reasonable, because it treats the departure as the book's real subject. The unknown is how much of the story is about the author's own marriage; a proportionate way to learn it is to read a short biography note on Saint-Exupéry and Consuelo, then reread the rose chapters and see whether the reading shifts.

Score A and B. Return the JSON object only.
