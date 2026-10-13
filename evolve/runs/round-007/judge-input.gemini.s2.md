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
Every time I bring up something that hurt me, my partner says I’m criticizing them. How can we talk without having the same argument?

=== DEBATE A ===
Situation (section A):
You feel caught in a repetitive cycle where sharing your pain is received as an attack, leading to defensiveness and conflict. The core tension lies in whether your partner is misinterpreting your intent due to their own triggers, or if your method of delivery inadvertently signals blame.

Minds (section B):
- The Relational Analyst: The quality of the connection between two people. [Martin Buber, I and Thou, 1923]
- The Systems Theorist: The structural feedback loops that maintain repetitive behaviors. [Peter Senge, The Fifth Discipline, 1990]
- The Behavioral Observer: Cognitive biases and the ways our brains misinterpret signals. [Daniel Kahneman, Thinking, Fast and Slow, 2011]

Debate (section C), 10 turns:
1. The Relational Analyst: When you bring up pain as a criticism, you are treating the other as an object to be corrected rather than a partner to be met. Buber suggests that true relation happens only when you approach another in a direct, unmediated way. Perhaps you might be approaching them with a list of grievances that creates an I-It dynamic instead of an I-Thou encounter.
   [Martin Buber, I and Thou, pd=true] [Basis: Martin Buber, I and Thou, Part One](https://archive.org/details/ithou0000bube/page/n5/mode/2up)
2. The Systems Theorist: The Analyst focuses on the spirit, but the issue is a reinforcing feedback loop. You and your partner are trapped in a structural trap where each interaction triggers the same defensive response. Senge notes that once a system is locked in this way, individual intent matters less than the circular process you have created together.
   [Peter Senge, The Fifth Discipline, pd=false] [Basis: Peter Senge, The Fifth Discipline, Chapter 4](https://www.worldcat.org/title/fifth-discipline-the-art-practice-of-the-learning-organization/oclc/22113337)
3. The Behavioral Observer: The loop Senge describes persists because of how the brain processes information through framing effects. When you mention your pain, your partner likely experiences a sudden activation of System 1, which labels your words as an attack before they can analyze the content. You might be assuming they understand your emotional vulnerability, but they are just reacting to the perceived threat.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 34](https://www.worldcat.org/title/thinking-fast-and-slow/oclc/741639089)
4. The Relational Analyst: The Systems Theorist claims that individual intent matters less than the process, but I disagree. Without the primary intent to encounter the other, the system remains cold. If you approach them by speaking only of your own experience instead of their shortcomings, you might restore the I-Thou connection that breaks the defensive barrier.
   [Martin Buber, I and Thou, pd=true] [Basis: Martin Buber, I and Thou, Part One](https://archive.org/details/ithou0000bube/page/n5/mode/2up)
5. The Systems Theorist: The Analyst argues that intent can break the barrier, but changing intent within a rigid structure is like trying to change a steering wheel that is already locked. You have to change the structure of your conversation. If you keep using the same setting and tone, you will trigger the same response regardless of your internal goodwill.
   [Peter Senge, The Fifth Discipline, pd=false] [Basis: Peter Senge, The Fifth Discipline, Chapter 6](https://www.worldcat.org/title/fifth-discipline-the-art-practice-of-the-learning-organization/oclc/22113337)
6. The Behavioral Observer: The Systems Theorist is right about structure, but consider the loss of nuance. You may want both to feel heard and to resolve the underlying hurt, but these goals often clash because your brain cannot process the hurt while it is in defensive mode. By labeling your pain as criticism, your partner serves their need for safety at the expense of your need for connection.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 10](https://www.worldcat.org/title/thinking-fast-and-slow/oclc/741639089)
7. The Relational Analyst: I will drop my initial claim that intent alone is sufficient, as the Behavioral Observer shows that the brain has physical limitations. To move forward, I suggest a specific experiment: agree to a 10-minute conversation where you only describe your own feelings using I-statements, and they are forbidden from responding with a defense for 10 minutes.
   [Martin Buber, I and Thou, pd=true] [Basis: Martin Buber, I and Thou, Part Two](https://archive.org/details/ithou0000bube/page/n5/mode/2up)
8. The Behavioral Observer: Testing the Analyst's experiment against your reality, this might work if you prime your partner first. If you say, I need to share something that hurt me, but I am not asking you to change or defend yourself right now, you might bypass their System 1 threat detection and allow them to actually listen.
   [Daniel Kahneman, Thinking, Fast and Slow, pd=false] [Basis: Daniel Kahneman, Thinking, Fast and Slow, Chapter 4](https://www.worldcat.org/title/thinking-fast-and-slow/oclc/741639089)
9. The Systems Theorist: The Behavioral Observer provides the necessary structural shift. If you consistently use that framing, you are changing the rules of the loop. I concede that the Analyst's emphasis on I-statements, when combined with a predefined structural boundary, creates a new pattern that can replace the old, destructive cycle.
   [Peter Senge, The Fifth Discipline, pd=false] [Basis: Peter Senge, The Fifth Discipline, Chapter 15](https://www.worldcat.org/title/fifth-discipline-the-art-practice-of-the-learning-organization/oclc/22113337)
10. The Relational Analyst: We remain divided on whether this is about the soul of the relationship or the mechanics of the interaction. You might find that the ultimate goal is not to fix the conversation, but to acknowledge that you are both frightened and that the loss of your mutual trust is what truly hurts more than the specific disagreement.
   [Martin Buber, I and Thou, pd=true] [Basis: Martin Buber, I and Thou, Part Three](https://archive.org/details/ithou0000bube/page/n5/mode/2up)

What became clearer (section D):
The debate shifted from viewing your partner's defensiveness as a personal attack to seeing it as a predictable response to a flawed conversation structure. We discovered that your goal of being heard and your partner's need for safety are currently in conflict, requiring a new protocol—like a pre-agreed container for the talk—to prevent the automatic defensive cycle. The main disagreement remains whether this is a spiritual crisis of connection or a manageable system error.

What the choice depends on (section E):
If your partner is fundamentally willing to listen when they feel safe → use the 10-minute framing experiment to bypass their threat response. If your partner is unable to regulate their defensive reactions even when primed → consider that the issue might be a structural incompatibility in communication styles, and seek a neutral third party to reset the pattern. If you are unsure which is true → try one conversation with the explicit framing mentioned, and observe if their response changes from defensive to curious.

=== DEBATE B ===
Situation (section A):
The user struggles to express hurt without triggering a defensive reaction from their partner, who perceives the expression as criticism. The central tension is whether this cycle stems from a failure in communication technique or a deeper clash between the user's need for vulnerability and the partner's need for self-protection. A decisive uncertainty is whether the partner's response is an attempt to avoid shame or a genuine misunderstanding of the user's intent.

Minds (section B):
- The Communicator: The distinction between observation and evaluation. [Marshall Rosenberg, Nonviolent Communication, 1999]
- The Stoic: Focusing only on what is within one's control. [Epictetus, Enchiridion, 135]
- The Social Architect: Maintaining face and avoiding social friction. [Erving Goffman, The Presentation of Self in Everyday Life, 1959]

Debate (section C), 9 turns:
1. The Communicator: The user might be unintentionally blending their observations with evaluations. When they say something that hurt them, the partner perhaps hears a judgment about their character rather than a neutral report of an action, making the defensive response almost inevitable.
   [Marshall Rosenberg, Nonviolent Communication, pd=false] [Basis: Marshall Rosenberg, Nonviolent Communication, Chapter 3](https://www.cnvc.org/)
2. The Stoic: The Communicator assumes the partner is responsible for the user's peace of mind. As Epictetus wrote, "Some things are up to us and some things are not up to us." If the user expects the partner to react calmly, they have placed their tranquility in the partner's hands.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 1](https://standardebooks.org/ebooks/epictetus/enchiridion/elizabeth-carter/text)
3. The Social Architect: The Stoic misses the point of social interaction. The partner is likely attempting to maintain their face, which is the positive social value they claim for themselves. When the user voices hurt, they inadvertently damage that face, forcing the partner to defend it to survive the interaction.
   [Erving Goffman, The Presentation of Self in Everyday Life, pd=false] [Basis: Erving Goffman, The Presentation of Self in Everyday Life, Chapter 1](https://monoskop.org/images/1/19/Goffman_Erving_The_Presentation_of_Self_in_Everyday_Life.pdf)
4. The Communicator: The Social Architect makes a good point about face, but we can preserve it by emphasizing needs over fault. If the user shares what they need rather than describing the partner's failure, they might bypass the defense mechanism entirely.
   [Marshall Rosenberg, Nonviolent Communication, pd=false] [Basis: Marshall Rosenberg, Nonviolent Communication, Chapter 4](https://www.cnvc.org/)
5. The Stoic: The Communicator suggests that if the user changes their words, the partner will change their reaction. That is a false hope. Even with the perfect words, the partner might still feel criticized because their own internal state is theirs, not the user's.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 5](https://standardebooks.org/ebooks/epictetus/enchiridion/elizabeth-carter/text)
6. The Social Architect: The Stoic argues for detachment, but the user likely wants connection, not just indifference. If the user acknowledges the partner's discomfort as a form of face-saving, they could invite the partner to collaborate on maintaining a shared front rather than attacking them directly.
   [Erving Goffman, The Presentation of Self in Everyday Life, pd=false] [Basis: Erving Goffman, The Presentation of Self in Everyday Life, Chapter 2](https://monoskop.org/images/1/19/Goffman_Erving_The_Presentation_of_Self_in_Everyday_Life.pdf)
7. The Communicator: I drop the claim that technique alone solves this. The Stoic is right that we cannot control the partner, but we can offer a clearer observation that leaves less room for them to interpret it as a personal indictment of their worth.
   [Marshall Rosenberg, Nonviolent Communication, pd=false] [Basis: Marshall Rosenberg, Nonviolent Communication, Chapter 6](https://www.cnvc.org/)
8. The Stoic: The Communicator now concedes that control is limited. My concern remains that the user might be suffering because they demand the partner act differently. If the user accepts that the partner is currently defensive, they might find their own peace without needing to win the argument.
   [Epictetus, Enchiridion, pd=true] [Basis: Epictetus, Enchiridion, Section 8](https://standardebooks.org/ebooks/epictetus/enchiridion/elizabeth-carter/text)
9. The Social Architect: The disagreement remains: is the issue a failure of technical communication or an unavoidable clash of egos? This depends on whether the partner actually desires to resolve the issue or if the conflict is their way of protecting their social standing within the relationship.
   [Erving Goffman, The Presentation of Self in Everyday Life, pd=false] [Basis: Erving Goffman, The Presentation of Self in Everyday Life, Chapter 7](https://monoskop.org/images/1/19/Goffman_Erving_The_Presentation_of_Self_in_Everyday_Life.pdf)

What became clearer (section D):
The debate shifted from blaming communication style to recognizing the partner's need to protect their identity. It remains disputed whether the user can change the dynamic through careful speech or must simply accept the partner's current level of defensiveness. A potential self-reflection is to ask if the user is seeking understanding or trying to force the partner to admit fault.

What the choice depends on (section E):
If the partner's defensiveness is a fragile protection of their self-image, focusing on validating their intent before sharing the hurt might lower the barrier. If the partner's reaction is a refusal to engage in vulnerability, then changing the user's communication style will likely remain ineffective, and the choice becomes whether to accept this limitation or address the structural lack of safety. To learn which is true, the user might test a small, neutral observation and observe if the partner responds with curiosity or continued dismissal.

Score A and B. Return the JSON object only.
