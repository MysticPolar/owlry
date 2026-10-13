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
You want a short novel that leaves you hopeful, and you don't like obvious life lessons. That could mean a gentle, warm book, or it could mean a book where hope costs something and nobody explains it. One fact you haven't given decides a lot: whether you can sit through a sad stretch on the way to a hopeful ending. The three minds below are fictional.

Minds (section B):
- The Pattern Reader: How a book's shape and ending produce a feeling without announcing a point. [E. M. Forster, Aspects of the Novel, 1927]
- The Skeptic of Messages: Fiction that holds uncertainty open instead of delivering a verdict you could have gotten from an essay. [Milan Kundera, The Art of the Novel, 1986]
- The Hope Realist: Hope that is not cheerfulness, because it admits things could go badly and still leaves room to act. [Rebecca Solnit, Hope in the Dark, 2004]

Debate (section C), 12 turns:
1. The Pattern Reader: This is mostly a question about last pages. A book's close decides how everything before it is felt, so perhaps your request is really about endings. I'd look first at how a novel's pattern finishes, whether it closes a door or opens one, before looking at anything else.
   [E. M. Forster, Aspects of the Novel, pd=true] [Basis: E. M. Forster, Aspects of the Novel (1927), on pattern and rhythm in fiction; no URL verified, so this is an unverified paraphrase]
2. The Skeptic of Messages: Taking only the lessons part: the Pattern Reader says a book's close decides how everything before it is felt, but a neat closing gesture can itself be a message. The Alchemist ends by confirming what it has been teaching all along. I'd want a novel that stays unsure of its own point.
   [Milan Kundera, The Art of the Novel, pd=false] [Basis: Milan Kundera, The Art of the Novel; no URL verified, so this is an unverified paraphrase of his idea that the novel's spirit is complexity and uncertainty]
3. The Hope Realist: Take the hopeful part alone. Hope is not cheer. It admits things could go badly and still leaves room to act, so in a novel it looks like an ending that stays uncertain but faces forward. You said you'd like to feel hopeful, so maybe you want that and not mere comfort.
   [Rebecca Solnit, Hope in the Dark, pd=false] [Basis: Rebecca Solnit, Hope in the Dark; no URL verified, so this is an unverified paraphrase of her idea that hope lives in uncertainty rather than optimism]
4. The Pattern Reader: The Hope Realist guesses you want hope that admits things could go badly, not mere comfort. I'd offer a rival reading: you might just be tired, and want a book that asks little. If so, shape matters more than stakes, and The Housekeeper and the Professor ends warm with a lighter load of pain.
   [E. M. Forster, Aspects of the Novel, pd=true] [Basis: E. M. Forster, Aspects of the Novel (1927), on pattern and rhythm in fiction; no URL verified, so this is an unverified paraphrase]
5. The Skeptic of Messages: You said you don't enjoy obvious life lessons, so perhaps being told how to live has felt like being talked down to. If so, I'd say the problem is certainty, not ideas. The Summer Book has a grandmother and a child talk about God and dying without settling either.
   [Milan Kundera, The Art of the Novel, pd=false] [Basis: Milan Kundera, The Art of the Novel; no URL verified, so this is an unverified paraphrase]
6. The Hope Realist: The Skeptic of Messages guesses that being told how to live feels like being talked down to. I'd accept that and go further than Solnit here: a lesson probably feels cheap when nothing was risked for it. If so, you'd want hope that costs something, which points toward Foster, where a girl is sent away for a summer.
   [Rebecca Solnit, Hope in the Dark, pd=false] [Basis: Rebecca Solnit, Hope in the Dark; no URL verified, so this is an unverified paraphrase; the extension about cheap lessons is the speaker's own, not Solnit's]
7. The Pattern Reader: I drop my claim that shape matters more than stakes. The Hope Realist's point that a lesson feels cheap when nothing was risked moved me. I now hold something narrower: the risk can be small and domestic, a summer or a meal, as long as the ending opens a door instead of explaining itself.
   [E. M. Forster, Aspects of the Novel, pd=true] [Basis: E. M. Forster, Aspects of the Novel (1927), on pattern and rhythm in fiction; no URL verified, so this is an unverified paraphrase]
8. The Skeptic of Messages: You may want two things at once that can't both be fully had: a book that sends you off warm, and one that never says what it meant. Warmth tends to want a resolved ending, and freedom from a point wants an open one. The Housekeeper and the Professor serves the first, Foster the second.
   [Milan Kundera, The Art of the Novel, pd=false] [Basis: Milan Kundera, The Art of the Novel; no URL verified, so this is an unverified paraphrase]
9. The Hope Realist: One fact you haven't given decides a lot: whether you can sit through a sad stretch. If you can, I favor Foster. If you can't, the Ogawa. And what could be lost differs: the gentler book may cost you the ache that makes hope believable, while Foster may cost you a calm evening.
   [Rebecca Solnit, Hope in the Dark, pd=false] [Basis: Rebecca Solnit, Hope in the Dark; no URL verified, so this is an unverified paraphrase]
10. The Pattern Reader: Then here's a test. Read the first twenty pages of Foster in one sitting, which might take about half an hour. If the ache is there and you still want to continue, keep going. If you want to stop, switch to the Ogawa and don't treat it as a failure.
   [E. M. Forster, Aspects of the Novel, pd=true] [Basis: E. M. Forster, Aspects of the Novel (1927), on pattern and rhythm in fiction; no URL verified, so this is an unverified paraphrase]
11. The Skeptic of Messages: You said you'd like a short novel with no obvious lessons. Twenty pages fits short, but it can't test the lessons part, because a lesson shows up at the end, not the start. The trial tells you whether you can bear the sad middle and nothing about whether the book preaches. For that, check the last page.
   [Milan Kundera, The Art of the Novel, pd=false] [Basis: Milan Kundera, The Art of the Novel; no URL verified, so this is an unverified paraphrase]
12. The Hope Realist: Still open between the Pattern Reader and me is whether a small domestic risk is enough for hope, or whether something real has to be lost. Two things would decide it: how you felt at the end of the last gentle book you finished, which you haven't said, and whether Foster's final page opens or explains.
   [Rebecca Solnit, Hope in the Dark, pd=false] [Basis: Rebecca Solnit, Hope in the Dark; no URL verified, so this is an unverified paraphrase]

What became clearer (section D):
The main insight is that your two wishes might pull against each other: hope tends to want some resolution, and freedom from lessons wants openness. The minds narrowed this to two candidates, Foster, where hope costs something and the ending is open, and The Housekeeper and the Professor, which is warmer with less pain. What remains disputed is whether a small, gentle risk can carry real hope or whether something must be lost for it to feel earned. A possible self-reflection: think of the last book that left you feeling hopeful, and ask whether it hurt along the way.

What the choice depends on (section E):
If you can tolerate a sad stretch and the ending stays open, Foster becomes more reasonable, because its hope costs something and it doesn't explain itself. If you want warmth and a lighter load of pain, The Housekeeper and the Professor, or The Summer Book for a quieter, open-ended read, becomes more reasonable, because the hope comes from care instead of loss. If it's unknown whether you can bear the sad middle, read the first twenty pages of Foster and then glance at the last page of whichever book you choose, to see whether it opens or explains.

=== DEBATE B ===
Situation (section A):
You want a short, thoughtful novel that leaves you feeling hopeful, and you do not enjoy obvious life lessons. That mixes three requests: length, an uplifting effect, and no moralizing. The fact you have not given, and the one that matters most, is what hopeful means to you. It could mean closing the book at ease, or closing it with a door still open.

Minds (section B):
- The Craft Reader: Whether a book teaches through its characters or announces a moral. This mind believes the way a story is built decides whether it preaches. [E. M. Forster, Aspects of the Novel, 1927]
- The Uncertainty Realist: Hope as staying open to what cannot be known, not a promise of a good outcome. This mind distrusts comfort that pretends to certainty. [Rebecca Solnit, Hope in the Dark, 2004]
- The Irony Defender: The novel as a place that doubts easy answers. This mind is wary of any book that tells readers what to conclude or feel. [Milan Kundera, The Art of the Novel, 1986]

Debate (section C), 11 turns:
1. The Craft Reader: Here is my reading: a book feels like a lecture when its people exist to prove something, so hopeful without lessons is mostly a question of how the book is built. Look for characters who can surprise you. A flat character delivers a moral; a rounded one just lives.
   [E. M. Forster, Aspects of the Novel, pd=true] [Basis: E. M. Forster, Aspects of the Novel, flat and round characters (source not verified here; paraphrase only, no URL)]
2. The Uncertainty Realist: The Craft Reader says hopeful is mostly a question of how the book is built, but build does not decide hope. Ishiguro gave Never Let Me Go beautifully rounded people, and it ends bleak. Hope, as I read Solnit, means staying open to what you cannot know. A hopeful book leaves a door ajar and promises nothing.
   [Rebecca Solnit, Hope in the Dark, pd=false] [Basis: Rebecca Solnit, Hope in the Dark (source not verified here; paraphrase only, no URL)]
3. The Irony Defender: I will take the other half of your question, the lessons. The Uncertainty Realist wants a book that leaves a door ajar, but a door can be a sermon too. The Alchemist by Paulo Coelho is all open road and still states its moral on nearly every page. The novel earns its place by doubting answers, as Kundera argues.
   [Milan Kundera, The Art of the Novel, pd=false] [Basis: Milan Kundera, The Art of the Novel (source not verified here; paraphrase only, no URL)]
4. The Craft Reader: The Irony Defender says a novel earns its place by doubting answers, but doubt alone is cheap. Voltaire wrote Candide doubting everything, and I would guess some readers close it clever and no warmer. So here is one step: read Claire Keegan, Small Things Like These, about 116 pages, in a single two-hour evening. Bill Furlong is a rounded man, not a mouthpiece.
   [E. M. Forster, Aspects of the Novel, pd=true] [Basis: E. M. Forster, Aspects of the Novel, flat and round characters (source not verified here; paraphrase only, no URL)]
5. The Uncertainty Realist: The Craft Reader proposes Small Things Like These, and at about 116 pages it fits your word short. But you also wrote hopeful, and it ends with Furlong carrying a girl home and trouble plainly ahead. If hopeful means reassured, that ending might read as dread. If it means a door ajar, it fits well.
   [Rebecca Solnit, Hope in the Dark, pd=false] [Basis: Rebecca Solnit, Hope in the Dark (source not verified here; paraphrase only, no URL)]
6. The Irony Defender: You wrote that you do not enjoy obvious life lessons. Maybe that means you have been handed uplifting books that told you what to feel, and perhaps you felt talked down to. If so, a doubting, ironic book might serve you, because irony treats a reader as an adult.
   [Milan Kundera, The Art of the Novel, pd=false] [Basis: Milan Kundera, The Art of the Novel (source not verified here; paraphrase only, no URL)]
7. The Craft Reader: The Irony Defender guesses you felt talked down to, but here is a rival reading: perhaps you do not mind a lesson, only one announced instead of earned. If so, choose for an embodied moral, not for irony. Marilynne Robinson wrote Gilead as an old pastor writing to his young son, and it never issues a rule.
   [E. M. Forster, Aspects of the Novel, pd=true] [Basis: E. M. Forster, Aspects of the Novel, flat and round characters (source not verified here; paraphrase only, no URL)]
8. The Uncertainty Realist: You wrote that you would like to feel hopeful, so maybe you are after rest more than challenge. A fact you have not given decides this: do you want to close the book at ease, or with a door ajar? At ease favors Kent Haruf, Plainsong, where two old brothers take in a pregnant teenager. A door ajar favors Keegan. You might want full reassurance and no message, but those two pull apart.
   [Rebecca Solnit, Hope in the Dark, pd=false] [Basis: Rebecca Solnit, Hope in the Dark (source not verified here; paraphrase only, no URL)]
9. The Irony Defender: The Uncertainty Realist guesses you are after rest, and I accept that reading with a limit. What could be lost is an evening: if you are tired and pick a book that turns bleak, you might end lower than you began. And if a friend who recommended books expects you to love them, perhaps you would feel pressed to pretend. If tiredness is the concern, take Plainsong; if the friend, ignore their list.
   [Milan Kundera, The Art of the Novel, pd=false] [Basis: Milan Kundera, The Art of the Novel (source not verified here; paraphrase only, no URL)]
10. The Craft Reader: I drop my claim that hope is mostly a question of how the book is built. The Uncertainty Realist moved me by pointing out that it depends first on whether you want to close the book at ease. My narrower claim: build matters once that is known, because rounded characters, not announcements, keep either Keegan or Haruf from becoming a sermon.
   [E. M. Forster, Aspects of the Novel, pd=true] [Basis: E. M. Forster, Aspects of the Novel, flat and round characters (source not verified here; paraphrase only, no URL)]
11. The Uncertainty Realist: I still differ with the Irony Defender on whether a warm, closed ending can count as hope at all. I say it might only soothe, while the Irony Defender might say it can do both. Two things would decide it: how you felt closing the last novel you loved, at ease or unsettled, and whether the last pages of Plainsong read as earned when you get there.
   [Rebecca Solnit, Hope in the Dark, pd=false] [Basis: Rebecca Solnit, Hope in the Dark (source not verified here; paraphrase only, no URL)]

What became clearer (section D):
The main insight is that hopeful and free of lessons are two separate requests. What you mean by hopeful may matter more than the book's craft: closure that leaves you at ease, or an open door that leaves you unsettled. What remains disputed is whether a warm, closed ending can be hopeful without carrying a message, and whether doubt alone can warm a reader. A possible self-reflection: think of the last novel that left you feeling better, and notice whether you closed it with the story resolved or still open. None of the book names here is verified from the texts, so treat them as starting points, not endorsements.

What the choice depends on (section E):
- If you want to close the book at ease, with warmth and rest → Kent Haruf's Plainsong becomes more reasonable, because its ending gathers people together without announcing a moral.
- If you want to close the book with a door ajar, hopeful but not reassured → Claire Keegan's Small Things Like These becomes more reasonable. It is about 116 pages, about two hours, and its ending leaves trouble ahead.
- If you mind only lessons that are announced, not earned → Marilynne Robinson's Gilead becomes more reasonable, because its meaning sits inside one man's letter, not in stated rules.
- If what you mean by hopeful remains unknown → try the first twenty pages of Keegan in one sitting and notice whether the ending you expect feels like relief or dread, then choose between Keegan and Haruf.

Score A and B. Return the JSON object only.
