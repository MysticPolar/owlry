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
What's reported: this person is warm and affectionate in person and nearly silent between dates, and the user has started to doubt their own expectations. What's unknown: how long this has gone on, what either of them has said about what they want, whether the silence is how this person is with everyone or something about this connection, and whether the user has ever put the wish for contact into words. The two explanations on offer, 'I'm asking too much' or 'we want different things', leave out a third: nothing has been defined yet, and silence is what undefined space sounds like. The decisive uncertainty is whether the between-date absence is a settled style or a measure of interest; the pattern alone can't say, which is part of why it stings. (What follows is a fictional debate among three invented voices, each leaning on one real book; sources could not be checked live in this session, so references are paraphrases without links.)

Minds (section B):
- The Attachment Reader: Whether this person can be consistently responsive, because the user's unease between dates is information about fit, not evidence of neediness. [Amir Levine and Rachel Heller, Attached, 2010]
- The Impression Reader: What each behavior actually communicates, and the danger of reading the absence of a performance as if it were a message. [Erving Goffman, The Presentation of Self in Everyday Life, 1956]
- The Desire Defender: Protecting whatever is alive here: whether the space between dates is part of the charge, and what closing it might cost. [Esther Perel, Mating in Captivity, 2006]

Debate (section C), 11 turns:
1. The Attachment Reader: Straight answer: wanting a reply between dates isn't too much; it's the floor, and needing it isn't neediness. Warm in the room, gone on the phone is the pattern that hooks people hardest. My analogy, not the book's: Skinner's pigeons pecked most when rewards came on no schedule. The affection is the exception. The silence is the rule, and the rule is the data.
   [Amir Levine and Rachel Heller, Attached, pd=false] Basis: Amir Levine and Rachel Heller, Attached (source not verified in this session; no link)
2. The Impression Reader: Data from an empty stage? In the room there's an audience, and the warmth is an expression given: deliberate, aimed, real enough. Between dates there's no performance at all. Silence from someone offstage isn't a message; it's an intermission. The hotel staff Goffman watched in the Shetlands charmed the dining room and dropped the act in the kitchen. Neither room was the real them.
   [Erving Goffman, The Presentation of Self in Everyday Life, pd=false] Basis: Erving Goffman, The Presentation of Self in Everyday Life (source not verified in this session; no link)
3. The Desire Defender: Or the silence is the oxygen. Love wants closeness; desire wants a little distance, some not-knowing, a person who is still somewhat other. What if the gap between dates is part of why the dates are electric? Before anyone fixes this, I'd ask whether 'barely replies' is the thing making this person interesting, and whether more texting would make them less so.
   [Esther Perel, Mating in Captivity, pd=false] Basis: Esther Perel, Mating in Captivity (source not verified in this session; no link)
4. The Attachment Reader: Perel's couples chose each other first and then smothered the spark. These two haven't chosen anything yet, so you're prescribing air before anyone's lit a fire. The long-distance couples in Jiang and Hancock's study felt closer than same-city couples, but through more intimate talk across the distance, not less contact. Chosen distance, filled with words. This is unchosen distance, filled with nothing.
   [Amir Levine and Rachel Heller, Attached, pd=false] Basis: Amir Levine and Rachel Heller, Attached (source not verified in this session; no link)
5. The Desire Defender: 'Chosen' is the word that gets me, and I'll give ground. Perel's distance lives inside a bond that already exists; unchosen distance is just absence. So I'll trade 'leave the gap alone' for 'find out whether the gap is chosen.' But not by asking for volume. More texts is a thermostat setting, not a desire, and I doubt it's what they're missing.
   [Esther Perel, Mating in Captivity, pd=false] Basis: Esther Perel, Mating in Captivity (source not verified in this session; no link)
6. The Impression Reader: Then what are they missing? A reading: not texts but proof they aren't being played. If that's the need, counting replies can't meet it, because silence can be a costume as easily as an intermission. The wait-a-few-days rule in Swingers was indifference performed on purpose. From the outside, a costume and an intermission look identical. What's missing is a shared definition of what this is.
   [Erving Goffman, The Presentation of Self in Everyday Life, pd=false] Basis: Erving Goffman, The Presentation of Self in Everyday Life (source not verified in this session; no link)
7. The Attachment Reader: You've moved me on volume. The need isn't more messages; it's knowing where they stand, so the days between stop being a waiting room. Ainsworth's Baltimore one-year-olds showed it: the clingiest weren't the ones with cold mothers but with unpredictable ones. Predictability, not frequency. But a 'what are we' summit is a bigger ask than they need. One stated want is a smaller, cleaner test.
   [Amir Levine and Rachel Heller, Attached, pd=false] Basis: Amir Levine and Rachel Heller, Attached (source not verified in this session; no link)
8. The Desire Defender: Test what, though? Whether they'll comply? Here's the reading I'd put to you: if what they fear is being the needy one, 'am I asking too much' is doing a job. It keeps them auditing instead of speaking, and reply-counting feeds that. And on 'different things': I'd watch what this person initiates, not what they do once prompted. My hunch, not Perel's.
   [Esther Perel, Mating in Captivity, pd=false] Basis: Esther Perel, Mating in Captivity (source not verified in this session; no link)
9. The Impression Reader: Here's where I revise. Before anyone asks, silence is offstage and unreadable. But once they've said 'I'd like to hear from you between dates,' silence stops being given off and becomes given. It's a line in the play, and I'd read it as you would. What moved me: a request turns absence into an answer. So does a week of compliance that fades.
   [Erving Goffman, The Presentation of Self in Everyday Life, pd=false] Basis: Erving Goffman, The Presentation of Self in Everyday Life (source not verified in this session; no link)
10. The Attachment Reader: Initiative tells you they want the dates. It doesn't tell you whether they want the in-between, and the in-between is the complaint. On 'different things': the answer isn't in the texts, it's in whether they can say what they want when asked plainly. Someone who can name it, even 'I like this casual,' gives them a decision. Someone who goes vague gives them the pattern again.
   [Amir Levine and Rachel Heller, Attached, pd=false] Basis: Amir Levine and Rachel Heller, Attached (source not verified in this session; no link)
11. The Desire Defender: What settles it: one plain sentence, no audit attached: 'I like this, and I'd like to hear from you between dates.' The tell is a rhythm, not volume, and whether it outlasts a week. A rhythm that holds means the gap was style, and chosen distance is theirs to enjoy. Nothing, or a fade, answers the second question, and the first was never the real one.
   [Esther Perel, Mating in Captivity, pd=false] Basis: Esther Perel, Mating in Captivity (source not verified in this session; no link)

What became clearer (section D):
Main insight: 'Am I asking too much?' has no answer in the abstract, only an answer from this person, and the question may be doing quiet work, standing in for the riskier act of asking them. What the user seems to need is not volume but predictability: a rhythm that stops the days between dates from feeling like a waiting room. Until a wish has been said out loud, the silence is unreadable; once it has, the response, including continued silence or effort that fades, becomes an answer. Still disputed: whether to learn what this person wants by asking a plain question or by watching what they initiate, and whether chosen distance, if that is what it turns out to be, is something the user would enjoy or merely endure. A possible self-reflection, offered as a possibility rather than a finding: whether a fear of being 'the needy one' has kept the user auditing instead of speaking, and whether what they want here is reassurance, a defined relationship, or this particular person as they are.

What the choice depends on (section E):
- If the silence is this person's style with everyone, and a plain request produces a modest, predictable rhythm that holds → staying and enjoying the space becomes more reasonable, because the need was for predictability rather than volume, and distance that is chosen and reliable can be part of what makes meeting good.
- If a plain request produces vagueness, a week of effort that fades, or no change → stepping back, or letting go of the hope that this becomes more, becomes more reasonable, because a stated want that goes unmet after being heard is the clearest signal available that they want different things.
- If what the user wants turns out to be a defined relationship rather than more messages → the conversation worth having is about what this is, not about texting, because fixing the symptom would leave the real question open.
- The decisive unknown, style or interest, cannot be read from the pattern alone. A proportionate way to learn it: one low-drama sentence stating the wish, said in person where this person is at their most responsive, then watching the next two or three weeks rather than the next two or three hours.

=== DEBATE B ===
Situation (section A):
Face to face, they're warm and affectionate; in the days between, replies are thin or absent, and the two readings on the table are 'my bar is too high' and 'we want different things.' Several things aren't known yet and matter a lot: whether 'barely reply' means slow-but-present or mostly ignoring, how many dates in this is, whether anything specific has ever been needed in those gaps, and—most of all—whether anyone has said out loud what they'd like between dates. What follows is a fictional debate between three invented voices, each leaning on one real book.

Minds (section B):
- The Attachment Reader: Whether wanting responsiveness between dates is a legitimate need, and whether this person is reliably there when turned to—not just warm when already together. [John Bowlby, A Secure Base, 1988]
- The Desire Keeper: Not mistaking constant contact for closeness; the space that keeps attraction alive, and whether the standard being applied was ever agreed to. [Esther Perel, Mating in Captivity, 2006]
- The Pattern Spotter: The dance between two people rather than the character of either; what has actually been asked for, and what can be changed on one's own side. [Harriet Lerner, The Dance of Intimacy, 1989]

Debate (section C), 12 turns:
1. The Attachment Reader: Let's not start by shrinking the ask. Wanting someone reachable between dates isn't neediness. Bowlby wrote mostly about children and parents, so I'm extending him—but he insisted that turning to a trusted person runs through the whole lifespan and isn't a defect. The question isn't whether too much is being asked. It's whether this person is reliably there, and the evidence is split.
   [John Bowlby, A Secure Base, pd=false] Basis: John Bowlby, A Secure Base (1988). Not verified by browsing in this session; no link.
2. The Desire Keeper: Split? I'd call it a good sign. Warm in the room, quiet outside it—that's someone not trying to live inside the other person's phone. Perel's argument is that desire needs air; closeness without separateness goes flat. Maybe the dates are good precisely because nobody is drip-feeding the relationship through texts all week.
   [Esther Perel, Mating in Captivity, pd=false] Basis: Esther Perel, Mating in Captivity (2006). Not verified by browsing in this session; no link.
3. The Pattern Spotter: You're both describing someone else's inner life from the outside, which is the one thing none of us can see. Lerner would look at the step, not the dancer. When one person reaches and the other steps back, the reaching tends to grow, and so does the stepping back. Before anyone rules on motives, I want to know what the reaching looks like.
   [Harriet Lerner, The Dance of Intimacy, pd=false] Basis: Harriet Lerner, The Dance of Intimacy (1989). Not verified by browsing in this session; no link.
4. The Attachment Reader: By your own logic, if distance feeds desire, the gaps should carry some heat—a sign the fire's still lit. Silence isn't air; it's absence. Bowlby's secure base is about availability: someone you can reach when you need them, not someone delightful only when you're already together. Dates are the easy part. The in-between is where availability gets tested.
   [John Bowlby, A Secure Base, pd=false] Basis: John Bowlby, A Secure Base (1988). Not verified by browsing in this session; no link.
5. The Desire Keeper: 'Tested' is carrying a lot. Has anything been needed between dates, or just wanted? An unanswered text when someone's sick or stranded is an availability failure. An unanswered 'thinking of you' on a Tuesday is a style nobody negotiated. Perel's complaint is that we've reduced intimacy to constant talk; a person who is physically present and verbally sparse isn't necessarily short on intimacy—just on words.
   [Esther Perel, Mating in Captivity, pd=false] Basis: Esther Perel, Mating in Captivity (2006). Not verified by browsing in this session; no link.
6. The Pattern Spotter: That's the useful distinction, and it cuts the other way too: 'barely replies' measures them, but the standard is unspoken. Lerner's pursuer keeps moving toward the other person; I'd add that the request often stays vague, because a clear ask risks a clear no. Has anyone said, out loud, 'I'd like to hear from you between dates'? If not, nobody has been refused yet.
   [Harriet Lerner, The Dance of Intimacy, pd=false] Basis: Harriet Lerner, The Dance of Intimacy (1989). Not verified by browsing in this session; no link.
7. The Attachment Reader: Granted: a need nobody voiced can't have been refused. But I resist turning this into a communication-skills problem. For Bowlby, our sense of whether someone is available gets built from what they do, not what they declare—and the gap has already been teaching that lesson. One clear ask; the response, or its absence, is information. What I won't accept is 'want less' as the answer.
   [John Bowlby, A Secure Base, pd=false] Basis: John Bowlby, A Secure Base (1988). Not verified by browsing in this session; no link.
8. The Desire Keeper: I never said want less. I said want the right thing. Perel's line runs between love, which wants closeness, and desire, which wants a little otherness. I'd push past Perel here: a steady stream of messages can make someone feel known and surveilled at once. So ask—but notice whether the want is contact or reassurance. Contact can be scheduled. Reassurance is bottomless.
   [Esther Perel, Mating in Captivity, pd=false] Basis: Esther Perel, Mating in Captivity (2006). Not verified by browsing in this session; no link.
9. The Pattern Spotter: Fair—I was treating this as a skills problem, and it may be a fit problem. But the test is the same either way. Say it once, specifically—'a short reply within a day would mean a lot'—then stop pursuing. Not as a tactic. Lerner's change happens in your own steps: state the real request, don't raise the volume, watch what they do with the space.
   [Harriet Lerner, The Dance of Intimacy, pd=false] Basis: Harriet Lerner, The Dance of Intimacy (1989). Not verified by browsing in this session; no link.
10. The Attachment Reader: Here our frameworks split on what 'watch' means. If they adjust, that's a different default—workable. If nothing changes while the in-person warmth stays as warm, that's my worry. Bowlby's test isn't how lovely someone is; it's whether they're there when you turn to them. Affection that costs nothing, availability they won't spend—that looks less like a texting style than a different thing being wanted.
   [John Bowlby, A Secure Base, pd=false] Basis: John Bowlby, A Secure Base (1988). Not verified by browsing in this session; no link.
11. The Desire Keeper: I'll concede that case. Someone lavish in the room and absent from the week, who doesn't budge when asked plainly, is at least showing how much of a week they're willing to share. That isn't the kind of distance Perel defends; it's just distance. But there's a third outcome you skipped: they adjust, and the dates get a little less electric. Then the question changes.
   [Esther Perel, Mating in Captivity, pd=false] Basis: Esther Perel, Mating in Captivity (2006). Not verified by browsing in this session; no link.
12. The Pattern Spotter: Which nobody can answer in advance. The point was never to decode them from the silence. One clear request, a calm pause, and three possible answers—each saying more than another month of reading tea leaves. If saying it out loud feels impossible, that's worth a look. For Lerner, the anxiety around taking a clear position is ours to manage, not evidence about the other person.
   [Harriet Lerner, The Dance of Intimacy, pd=false] Basis: Harriet Lerner, The Dance of Intimacy (1989). Not verified by browsing in this session; no link.

What became clearer (section D):
The main thing that came into focus: the two questions aren't rivals, and neither can be answered from the silence. 'Am I asking for too much?' has no answer until the ask has been made in plain words, and 'are we looking for different things?' is answered less by decoding texts than by what they do once they know what you'd like. The minds converged on one small, specific request followed by a genuine pause, then split on how to read the result. The Attachment Reader treats a non-response, with the in-person warmth unchanged, as a real signal of mismatch; the Desire Keeper holds that some space is healthy and that the hunger for replies may be about reassurance rather than contact; the Pattern Spotter thinks the difficulty of asking at all is the part worth examining. One possible self-reflection, offered as a possibility rather than a verdict: whether the wish for messages between dates is mostly about sharing your week, or mostly about knowing you're still wanted—both legitimate, but they call for different remedies.

What the choice depends on (section E):
- If 'barely reply' means slow but present—plans get confirmed, they show up, they're warm—and nothing specific has been said about what you'd like → one clear, specific ask becomes the reasonable next step, because nothing has actually been refused yet and the gap may be a default rather than a decision.
- If you've asked plainly, nothing changed, and the in-person affection stayed exactly as warm → reading this as a mismatch in what each of you wants becomes more reasonable, because warmth that never extends into availability is itself an answer about how much of a shared week is on offer.
- If they adjust and the between-date contact grows → the question shifts to whether the dates still feel alive; the Desire Keeper's caution applies, since some of the spark may have depended on the space.
- If the hardest part is saying the ask at all → that is worth examining on its own, because an unspoken standard can't be met or refused, and fear of a clear no may be doing the deciding.
- The decisive unknown is what they would say they want. The proportionate way to learn it is not more decoding but one request, stated once, and a couple of weeks of watching what they do rather than counting texts.

Score A and B. Return the JSON object only.
