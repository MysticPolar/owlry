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
I’d like a short, thoughtful novel that leaves me feeling hopeful, but I don’t enjoy obvious life lessons. What might suit me?

=== DEBATE A ===
Situation (section A):
You are seeking a concise, hopeful novel that avoids didacticism, though you might fear that any story aiming for hope inevitably collapses into an explicit, moralizing lesson. The central tension lies in whether art can sustain a hopeful tone without imposing a prescriptive view on the reader.

Minds (section B):
- The Aesthete: Prioritizing aesthetic beauty over moral utility. [Oscar Wilde, The Picture of Dorian Gray, 1890]
- The Absurdist: Facing the void without false comfort. [Albert Camus, The Stranger, 1942]
- The Connectionist: Finding hope through complex human relationships. [E.M. Forster, Howards End, 1910]

Debate (section C), 9 turns:
1. The Aesthete: Maybe you worry that a book with a message is a book that fails as art, as it is quite useless in the sense that all art is simply a reflection of itself, not a moral guide.
   [Oscar Wilde, The Picture of Dorian Gray, pd=true] [Basis: Oscar Wilde, The Picture of Dorian Gray, Preface](https://www.gutenberg.org/files/174/174-h/174-h.htm)
2. The Absurdist: I disagree with the Aesthete because if the world is fundamentally indifferent, then a book that offers hope without a clear message might just be a book that ignores the reality of the struggle.
   [Albert Camus, The Stranger, pd=false] [Basis: Albert Camus, The Stranger, Part 2](https://www.camus-society.com/the-stranger.html)
3. The Connectionist: The Absurdist might be right about the struggle, but perhaps the hope you want comes from the attempt to connect disparate lives, as we must only connect the prose and the passion.
   [E.M. Forster, Howards End, pd=true] [Basis: E.M. Forster, Howards End, Chapter 22](https://www.gutenberg.org/files/2744/2744-h/2744-h.htm)
4. The Aesthete: The Connectionist relies too much on social friction, whereas I would argue that beauty alone provides the relief you might be looking for, provided the prose is exquisite and untainted by moralizing.
   [Oscar Wilde, The Picture of Dorian Gray, pd=true] [Basis: Oscar Wilde, The Picture of Dorian Gray, Chapter 11](https://www.gutenberg.org/files/174/174-h/174-h.htm)
5. The Absurdist: The Aesthete forgets that beauty might be a cruel distraction if the novel does not acknowledge the reality of our condition, as if perhaps we are all condemned to experience the absurdity of existence alone.
   [Albert Camus, The Stranger, pd=false] [Basis: Albert Camus, The Stranger, Part 2](https://www.camus-society.com/the-stranger.html)
6. The Connectionist: The Absurdist claims we are condemned to freedom, yet I wonder if you might find hope in the small, accidental overlaps of our separate lives, which are never lessons but lived experiences that develop into a deeper integrity.
   [E.M. Forster, Howards End, pd=true] [Basis: E.M. Forster, Howards End, Chapter 44](https://www.gutenberg.org/files/2744/2744-h/2744-h.htm)
7. The Aesthete: If you want to test this, perhaps you could read the first chapter of Henry James's Daisy Miller to see if his focus on delicate observation over resolution satisfies your need for art that remains purely itself.
   [Henry James, Daisy Miller, pd=true] [Basis: Henry James, Daisy Miller, Chapter 1](https://www.gutenberg.org/files/208/208-h/208-h.htm)
8. The Absurdist: The Aesthete proposes Daisy Miller, but if that book is merely about the observation of social manners, it might lack the punch required to make you feel anything at all, let alone genuine hope.
   [Albert Camus, The Stranger, pd=false] [Basis: Albert Camus, The Stranger, Part 1](https://www.camus-society.com/the-stranger.html)
9. The Connectionist: The Absurdist is right that manners alone are empty, but the hope might lie in the space between the observation and the tragedy, which is exactly what one needs to evaluate for oneself in the text.
   [E.M. Forster, Howards End, pd=true] [Basis: E.M. Forster, Howards End, Chapter 39](https://www.gutenberg.org/files/2744/2744-h/2744-h.htm)

What became clearer (section D):
The discussion clarified that your search for hope without moralizing is essentially a search for art that trusts the reader to find meaning in ambiguity. The debate remains open on whether hope requires a narrative foundation or if it can emerge purely from the aesthetic experience of well-crafted prose. A reflection on whether you prefer the comfort of human connection or the clarity of isolated observation might serve you well.

What the choice depends on (section E):
If you value the feeling of being part of a larger, interconnected web of humanity, novels centered on complex relationships like Howards End become more reasonable. If you find more hope in the purity of art and detached observation, the works of Henry James are more suitable. If your indecision persists, reading the first two chapters of a short classic like Daisy Miller will reveal whether you prefer a character-driven or an atmosphere-driven experience.

=== DEBATE B ===
Situation (section A):
The user is looking for a short, thoughtful novel that provides a sense of hope without relying on didactic moralizing or overt life lessons. The tension lies in the gap between wanting an uplifting experience and avoiding the manipulative structures of conventional inspirational literature.

Minds (section B):
- The Aesthete: The quality of the immediate experience and the intensity of beauty. [Walter Pater, The Renaissance, 1873]
- The Structuralist: The internal life of characters and the way narrative rhythm shapes meaning. [E.M. Forster, Aspects of the Novel, 1927]
- The Absurdist: Finding resilience and meaning in a world that offers no inherent guarantees. [Albert Camus, The Myth of Sisyphus, 1942]

Debate (section C), 9 turns:
1. The Aesthete: Hope should be a flame that burns with a hard, gem-like flame, not a moral instruction. You might find what you seek by prioritizing the aesthetic pleasure of the prose over the message, as the goal of life is to burn always with this hard, gem-like flame, and to maintain this ecstasy.
   [Walter Pater, The Renaissance, pd=true] [Basis: Walter Pater, The Renaissance, Conclusion](https://www.gutenberg.org/files/2398/2398-h/2398-h.htm)
2. The Structuralist: The Aesthete claims that beauty is enough, yet you might find that hope requires a character who feels real enough to suffer. You need a narrative where the rhythm of human life, not just its surface, unfolds, because people are only really alive in flashes.
   [E.M. Forster, Aspects of the Novel, pd=true] [Basis: E.M. Forster, Aspects of the Novel, People](https://www.gutenberg.org/ebooks/47101)
3. The Absurdist: The Structuralist suggests that character depth creates hope, but perhaps you might want the opposite, a story where the struggle against a silent universe provides a victory. You must imagine that the struggle itself toward the heights is enough to fill a man's heart.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 4]
4. The Aesthete: The Absurdist argues that struggle produces hope, but I worry this view ignores the shimmer of the work itself. If you focus only on the fight, you miss the color of the world; you could seek a narrative that captures the quickness of a passing impression.
   [Walter Pater, The Renaissance, pd=true] [Basis: Walter Pater, The Renaissance, Conclusion](https://www.gutenberg.org/files/2398/2398-h/2398-h.htm)
5. The Structuralist: The Aesthete claims we should look for passing impressions, yet that might leave the reader feeling untethered. You might try reading a story like The Old Man and the Sea in one sitting to see if the tension between the man and the sea provides the weight you need.
   [E.M. Forster, Aspects of the Novel, pd=true] [Basis: E.M. Forster, Aspects of the Novel, Plot](https://www.gutenberg.org/ebooks/47101)
6. The Absurdist: The Structuralist suggests testing the weight of a narrative, but perhaps you might be seeking comfort rather than the truth of the human condition. You might want to ask if the hope you crave is something earned through persistence or merely a pleasant distraction.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 1]
7. The Aesthete: The Absurdist worries about comfort, but maybe you only want a book that respects your intelligence by showing rather than telling. I would suggest you spend exactly ninety minutes reading a short, crystalline story to see if the beauty of its form alone creates a sense of possibility.
   [Walter Pater, The Renaissance, pd=true] [Basis: Walter Pater, The Renaissance, Preface](https://www.gutenberg.org/files/2398/2398-h/2398-h.htm)
8. The Structuralist: I drop my earlier claim that characters must be round to provide hope, as the Absurdist point about the struggle has merit. You might find that a flat character in a tight, well-paced plot better serves your desire to avoid moralizing, because a simple rhythm often reveals more than a complex one.
   [E.M. Forster, Aspects of the Novel, pd=true] [Basis: E.M. Forster, Aspects of the Novel, People](https://www.gutenberg.org/ebooks/47101)
9. The Absurdist: We remain divided on whether hope is an illusion or a victory, as the Structuralist now favors the plot over the person. What would decide this is whether you prefer a book that leaves you with a feeling of lingering beauty or a feeling of quiet, stubborn resolution.
   [Albert Camus, The Myth of Sisyphus, pd=false] [Basis: Albert Camus, The Myth of Sisyphus, Chapter 4]

What became clearer (section D):
The debate highlights a trade-off between prioritizing aesthetic beauty, character depth, or the stoic persistence of the protagonist. A central dispute remains: whether hope should feel like a shimmer of beauty or a victory over adversity.

What the choice depends on (section E):
If you prioritize a mood of lingering beauty → seek lyrical, shorter works where the atmosphere is the primary vehicle for hope. If you prioritize internal resolve → seek narratives where characters encounter and overcome the limits of their situation through action. If the source of your need remains unknown → test your preference by reading one short, impressionistic story versus one tale of survival and note which leaves you more satisfied.

Score A and B. Return the JSON object only.
