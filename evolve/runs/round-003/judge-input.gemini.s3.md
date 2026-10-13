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
The user feels lost because they equate a 'calling' with a life purpose, fearing that prioritizing stability and relationships over a grand mission is a form of surrender. The decisive uncertainty lies in whether a 'calling' is an objective truth to be discovered or a narrative construct to be built, and whether their desire for a quiet, connected life is sufficient justification for their choices.

Minds (section B):
- The Existentialist: Creating meaning through radical freedom and choice. [Jean-Paul Sartre, Existentialism is a Humanism, 1946]
- The Simple Liver: Finding clarity through deliberate, minimalist living. [Henry David Thoreau, Walden, 1854]
- The Pragmatic Stoic: Distinguishing between internal agency and external expectations. [Epictetus, Enchiridion, 135]

Debate (section C), 9 turns:
1. The Existentialist: You are paralyzed because you imagine a 'calling' is hidden somewhere like a treasure, waiting for you to find it. In reality, you are the project. You must choose what your life is, rather than waiting for an essence to dictate your path.
   [Jean-Paul Sartre, Existentialism is a Humanism, pd=false] [Basis: Jean-Paul Sartre, Existentialism is a Humanism, Section 1](https://www.marxists.org/reference/archive/sartre/works/exist/sartre.htm)
2. The Simple Liver: Sartre pushes you toward a heavy freedom, but you won't hear your own voice if you keep living as if you need a grand project. I suggest you go to the woods—or your own version of them—and simplify your affairs until you see what you truly need.
   [Henry David Thoreau, Walden, pd=true] [Basis: Henry David Thoreau, Walden, Where I Lived, and What I Lived For](https://www.gutenberg.org/files/205/205-h/205-h.htm#link2HCH0002)
3. The Pragmatic Stoic: Both of you are creating unnecessary agitation. A 'calling' is an external opinion you have adopted. You suffer because you are trying to control your future reputation instead of focusing on what is actually in your power: your current actions and the quality of your relationships.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 1](https://www.gutenberg.org/files/45109/45109-h/45109-h.htm#chap01)
4. The Existentialist: Stoicism risks turning you into a stone. If you treat your life as just a series of external events to be accepted, you ignore the anguish that comes from realizing that your choices have no blueprint. You must feel that weight, for it is the proof of your freedom.
   [Jean-Paul Sartre, Existentialism is a Humanism, pd=false] [Basis: Jean-Paul Sartre, Existentialism is a Humanism, Section 1](https://www.marxists.org/reference/archive/sartre/works/exist/sartre.htm)
5. The Simple Liver: Anguish is just a symptom of a cluttered mind. If you simplify your daily habits and focus on the immediate, tangible needs of those you love, the 'weight' Sartre speaks of dissipates. Freedom isn't found in constant choosing, but in the deliberate repetition of a life well-examined.
   [Henry David Thoreau, Walden, pd=true] [Basis: Henry David Thoreau, Walden, Conclusion](https://www.gutenberg.org/files/205/205-h/205-h.htm#link2HCH0018)
6. The Pragmatic Stoic: I concede that my focus on endurance can sound cold, but Thoreau is right about simplicity. If you stop chasing the phantom of a 'calling'—which is just a story others told you to value—you are free to do your duty. If your duty is to your loved ones, that is enough.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 30](https://www.gutenberg.org/files/45109/45109-h/45109-h.htm#chap30)
7. The Existentialist: I am shifting my stance. Perhaps you don't need a grand 'calling' to be authentic. If you choose to prioritize stability and love with full awareness that you are creating that value yourself, you have already moved past the paralysis of waiting for a sign.
   [Jean-Paul Sartre, Existentialism is a Humanism, pd=false] [Basis: Jean-Paul Sartre, Existentialism is a Humanism, Section 3](https://www.marxists.org/reference/archive/sartre/works/exist/sartre.htm)
8. The Simple Liver: Exactly. You aren't 'settling'; you are curating. If you choose to invest in your relationships, you are building a life that is deep, not wide. That isn't a lack of a calling; it is a life of intention.
   [Henry David Thoreau, Walden, pd=true] [Basis: Henry David Thoreau, Walden, Where I Lived, and What I Lived For](https://www.gutenberg.org/files/205/205-h/205-h.htm#link2HCH0002)
9. The Pragmatic Stoic: The conflict is settled: your 'calling' is whatever you choose to accept responsibility for. Whether that is a career or a family, the meaning is determined by how well you perform your chosen duties, not by how much your choice impresses the world.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 1](https://www.gutenberg.org/files/45109/45109-h/45109-h.htm#chap01)

What became clearer (section D):
The debate shifted from viewing a 'calling' as an external discovery to seeing it as an internal commitment. The insight is that 'stability' and 'connection' are not fallbacks; they are valid, active choices. What remains disputed is whether one needs to feel the existential weight of this choice to remain authentic, or if simple, duty-bound action is sufficient.

What the choice depends on (section E):
If your desire for stability is driven by fear of failure, then exploring new risks is necessary to distinguish between preference and avoidance. If your desire for stability is a conscious preference for depth over breadth, then you should treat your current commitments as your deliberate project and stop looking for a 'calling' that exists outside of them. To learn which is true, test your values by intentionally making one small, uncomfortable change to your routine; if you feel relief, it is growth; if you feel panic, it is likely an avoidance of a deeper dissatisfaction.

=== DEBATE B ===
Situation (section A):
The user is caught between the search for a singular, purposeful 'calling' and the desire for practical stability and time for loved ones. They are struggling with the assumption that a meaningful life requires a pre-existing passion to discover, rather than a structure to build. The central tension is whether to prioritize finding a perfect fit or managing their current resources toward a balanced existence.

Minds (section B):
- The Stoic: Living in accordance with nature by focusing only on what is within one's control. [Epictetus, The Enchiridion, 135]
- The Pragmatist: Building rare and valuable skills that grant career leverage and autonomy. [Cal Newport, So Good They Can't Ignore You, 2012]
- The Essentialist: The disciplined pursuit of less to maximize contribution to what truly matters. [Greg McKeown, Essentialism: The Disciplined Pursuit of Less, 2014]

Debate (section C), 9 turns:
1. The Stoic: You are distressed because you seek a calling as if it were a lost object. Epictetus instructs that we must distinguish between what is ours and what is not. Your profession is external; your commitment to your values and your loved ones is entirely within your own power.
   [Epictetus, The Enchiridion, pd=true] [Basis: Epictetus, The Enchiridion, section 1](http://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0236%3Atext%3Denc%3Achapter%3D1)
2. The Pragmatist: Stoicism is fine for internal peace, but it doesn't help you pay the bills. I would argue that your focus on finding a calling is the problem. Newport suggests that passion is a byproduct of being good at something rare, not a prerequisite for starting.
   [Cal Newport, So Good They Can't Ignore You, pd=false] [Basis: Cal Newport, So Good They Can't Ignore You, Chapter 3](Source not verified for chapter)
3. The Essentialist: Both of you ignore the cost of your advice. Trying to become 'so good' at everything or accepting everything as an internal struggle drains your limited time. McKeown argues that you must choose the 'vital few' and eliminate the trivial many, otherwise, you have no time for the people you love.
   [Greg McKeown, Essentialism: The Disciplined Pursuit of Less, pd=false] [Basis: Greg McKeown, Essentialism, Chapter 2](Source not verified for chapter)
4. The Stoic: To the Pragmatist: if your career capital requires sacrificing the people you love, is it worth the gain? Epictetus would say that 'some things are up to us, and some things are not.' You cannot control if a career pays off, but you can control your integrity.
   [Epictetus, The Enchiridion, pd=true] [Basis: Epictetus, The Enchiridion, section 1](http://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0236%3Atext%3Denc%3Achapter%3D1)
5. The Pragmatist: I agree with the Stoic on control, but you misunderstand career capital. It is not about working harder, but about working on valuable skills that give you the leverage to set your own hours. That is how you eventually buy back your time for loved ones.
   [Cal Newport, So Good They Can't Ignore You, pd=false] [Basis: Cal Newport, So Good They Can't Ignore You, Chapter 8](Source not verified for chapter)
6. The Essentialist: That assumes you have an infinite runway to build that capital. You are still adding things to your plate. If you are not intentional, you will end up with a high-status life that is miserable. You need to trade the 'good' for the 'best' to protect your time.
   [Greg McKeown, Essentialism: The Disciplined Pursuit of Less, pd=false] [Basis: Greg McKeown, Essentialism, Chapter 4](Source not verified for chapter)
7. The Stoic: The Essentialist is right that we must choose, but we must choose based on our character. If your job does not allow for kindness or justice, it is not a 'good' or 'best'—it is simply a burden. Your choices should depend on what keeps your character intact.
   [Epictetus, The Enchiridion, pd=true] [Basis: Epictetus, The Enchiridion, section 5](http://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0236%3Atext%3Denc%3Achapter%3D5)
8. The Pragmatist: I concede that character is the baseline. But we must stop romanticizing 'calling.' Most successful people didn't start with one; they built a life that offered them the control to develop one. Stop looking for a calling and start building a craft.
   [Cal Newport, So Good They Can't Ignore You, pd=false] [Basis: Cal Newport, So Good They Can't Ignore You, Chapter 10](Source not verified for chapter)
9. The Essentialist: Building a craft is a 'vital' activity, but only if it serves your ultimate 'why.' If you are building a craft just to keep busy, you are still drifting. The clarity that moves you forward is not finding a calling; it is deciding what you are willing to trade away.
   [Greg McKeown, Essentialism: The Disciplined Pursuit of Less, pd=false] [Basis: Greg McKeown, Essentialism, Chapter 6](Source not verified for chapter)

What became clearer (section D):
The debate shifted from viewing a 'calling' as a magical discovery toward seeing it as a byproduct of deliberate action and trade-offs. The main insight is that stability and time for loved ones are not things you stumble into, but things you protect through the rejection of non-essential demands and the cultivation of mastery. What remains disputed is the extent to which one can pursue excellence (the Pragmatist's path) while simultaneously protecting time (the Essentialist's path) without one eventually crushing the other.

What the choice depends on (section E):
- If your priority is absolute psychological stability → Focus on the Stoic approach: accept the uncertainty of your career and focus entirely on being present with your loved ones, as your character is the only thing truly under your control.
- If your priority is long-term professional agency → Focus on the Pragmatist approach: pick a skill-heavy path and commit to deliberate practice, knowing that autonomy over your time will come only as a reward for being exceptionally good at what you do.
- If your priority is immediate protection of your current relationships → Focus on the Essentialist approach: perform a rigorous audit of your obligations and cut everything that does not directly contribute to your core values, accepting that this will likely limit your professional speed.

Score A and B. Return the JSON object only.
