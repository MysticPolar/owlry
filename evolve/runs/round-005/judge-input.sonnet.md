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
My shifts change every week, and I keep giving up on exercise. How can I build a routine that doesn’t depend on having the same schedule?

=== DEBATE A ===
Situation (section A):
The user works rotating shifts, so their free time changes every week, and they keep abandoning exercise. They want a routine that does not rely on a fixed schedule. One tentative reframing: this may be two problems, how a plan attaches to a moving clock and what happens after it breaks. The decisive unknown is whether the roster is posted ahead of time or changes at short notice, and the user has not said which.

Minds (section B):
- The Habit Rule-Keeper: Repetition wears a groove, so the answer is a firm rule that removes daily decisions (a fictional voice). [William James, The Principles of Psychology, 1890]
- The Tiny-Step Designer: Behavior survives when it is small, anchored to something already happening, and easy on a bad day (a fictional voice). [BJ Fogg, Tiny Habits, 2020]
- The Limits Realist: Control over time is partly an illusion, so a plan should expect disruption and make returning easy (a fictional voice). [Oliver Burkeman, Four Thousand Weeks, 2021]

Debate (section C), 11 turns:
1. The Habit Rule-Keeper: Start with the reading I would defend: the shifts are not the enemy, the weekly renegotiation is. A habit is a groove worn by repeating the same act in the same circumstance, and a rotating roster never lets one wear in. Fix the repetition rule and the roster matters far less.
   [William James, The Principles of Psychology, pd=true] [Basis: William James, The Principles of Psychology, on habit; chapter and URL not verified in this session]
2. The Tiny-Step Designer: Repetition of what, though? I suspect the giving up starts earlier, with the size of the plan. A forty-minute workout needs a good day, and changing shifts can hand out plenty of bad ones. I do two push-ups after using the bathroom, and that grew on its own. Habits that last are small enough to do tired.
   [BJ Fogg, Tiny Habits, pd=false] [Basis: BJ Fogg, Tiny Habits, on starting tiny and anchoring; chapter and URL not verified in this session]
3. The Limits Realist: Smaller helps, but you both still chase control. Take the story of Jerry Seinfeld marking an X on a calendar daily, which may be embellished: one blank square then feels like the whole project collapsing. Giving up often follows a broken streak, not a hard workout. The skill that matters is returning after a miss.
   [Oliver Burkeman, Four Thousand Weeks, pd=false] [Basis: Oliver Burkeman, Four Thousand Weeks, on the control illusion and accepting limits; chapter and URL not verified in this session]
4. The Habit Rule-Keeper: Now the clock question alone. Pin the act to an event rather than an hour: the first thing after a shift ends, or the first thing after waking, whatever time that is. The event arrives every cycle even when the hour drifts. And I hold my rule: no exceptions until the groove is deep.
   [William James, The Principles of Psychology, pd=true] [Basis: William James, The Principles of Psychology, on habit; chapter and URL not verified in this session]
5. The Tiny-Step Designer: No exceptions is what a rotating week will break first. Here is a possibility, not a fact: the user may be measuring every week against a picture of the proper routine, same time, same days, so each shifted week reads as failure. If so, the plan is not the problem. The yardstick is.
   [BJ Fogg, Tiny Habits, pd=false] [Basis: BJ Fogg, Tiny Habits, on shaping behavior rather than blaming the person; chapter and URL not verified in this session]
6. The Limits Realist: I accept that reading, and it points to a trade. The user may want the no-decision ease of a fixed routine and also the freedom to rest when a shift flattens them. Both cannot be fully had. An anchor serves the first, a permitted skip serves the second. So count the week, not the day.
   [Oliver Burkeman, Four Thousand Weeks, pd=false] [Basis: Oliver Burkeman, Four Thousand Weeks, on accepting finite capacity; chapter and URL not verified in this session]
7. The Habit Rule-Keeper: That moves me. If those two wants are real, the anchor serves ease and a floor serves rest: on a flattened day, one minute counts. I said no exceptions, but a skip planned in advance is the rule, not an exception. What changed my mind: quitting kills a groove, skipping does not.
   [William James, The Principles of Psychology, pd=true] [Basis: William James, The Principles of Psychology, on habit; chapter and URL not verified in this session]
8. The Tiny-Step Designer: Everything here hinges on a fact the user has not given: whether the roster is posted ahead. If it comes out a week early, I favor booking a named slot for the full session, with the tiny version as backup. If shifts can change with a day of notice, I favor the tiny anchor alone, because an unpredictable slot gets lost.
   [BJ Fogg, Tiny Habits, pd=false] [Basis: BJ Fogg, Tiny Habits, on anchors and scaling behavior down; chapter and URL not verified in this session]
9. The Limits Realist: Even a posted roster lies. Shifts get covered, children get sick. The Royal Canadian Air Force published its 5BX plan in 1961: eleven minutes a day, no equipment, written for people who could not count on a gym. That is the right scale of ambition for a rotating week, and it says nothing about slots at all.
   [Oliver Burkeman, Four Thousand Weeks, pd=false] [Basis: Oliver Burkeman, Four Thousand Weeks, on planning under limits; the 5BX example is my own addition, not from the book; chapter and URL not verified in this session]
10. The Habit Rule-Keeper: A weekly count is where good intentions go to die. Three sessions a week sounds flexible, and by Thursday it is a debt, paid in a Sunday panic or not paid at all, I would guess. A daily anchor with a one-minute floor never accumulates debt. Note the 5BX itself ran daily.
   [William James, The Principles of Psychology, pd=true] [Basis: William James, The Principles of Psychology, on habit; chapter and URL not verified in this session]
11. The Tiny-Step Designer: Then here is what stays open. James wants a daily anchor with a one-minute floor; Burkeman wants the week as the unit. The deciding fact is how a miss tends to go for the user: if a skipped day is usually followed by a return, the weekly count is enough; if a skip tends to snowball into quitting, the daily floor earns its place.
   [BJ Fogg, Tiny Habits, pd=false] [Basis: BJ Fogg, Tiny Habits, on anchors and tiny starts; chapter and URL not verified in this session]

What became clearer (section D):
The main insight is that two separate problems were tangled together: attaching exercise to a moving clock, which the debate handled by anchoring to events like waking or the end of a shift, and surviving a miss, which turned out to matter more than the schedule itself. The minds moved toward a small, planned minimum version that counts on bad days. What remains disputed is whether the daily anchor or the weekly count should be the main rule. A possible self-reflection, offered as a possibility rather than a conclusion: what does a missed session usually lead to afterward, a quick return or a long stop, and which standard of a proper routine is being used to judge it?

What the choice depends on (section E):
If the roster is posted ahead of time, a named slot each week for the full session, plus a tiny backup version, becomes more reasonable, because the slot can be protected before the week starts. If shifts change on short notice, a tiny anchor tied to an event such as waking or the end of a shift becomes more reasonable, because it does not need a predictable hour. If a skipped day usually leads to a quick return, counting sessions across the week is likely enough, because misses carry little risk. If a skipped day tends to snowball into quitting, a daily anchor with a one-minute floor becomes more reasonable, because it keeps the chain from breaking entirely. The first fact, how predictable the roster is, can be learned from the last few weeks of schedules. The second, how misses tend to go, can be learned by noting what happened after the last few skipped sessions.

=== DEBATE B ===
Situation (section A):
The user works shifts that change every week and keeps abandoning exercise, and they want a routine that does not rely on a fixed schedule. They have not said how far ahead they learn their shifts, what kind of exercise they tried, or what the stopping point usually looked like. The decisive unknown is how early the schedule is known, plus whether past quits followed one missed day or weeks of fatigue. The three minds below are fictional.

Minds (section B):
- The Time Realist: Plans built on control of time fail, so the routine should expect a messy week and still work. [Oliver Burkeman, Four Thousand Weeks, 2021]
- The Cue Designer: Behavior follows obvious cues and small steps, so the design matters more than motivation. [James Clear, Atomic Habits, 2018]
- The Habit Drillmaster: A new habit needs a strong start and few exceptions, or early lapses undo the work. [William James, The Principles of Psychology, 1890]

Debate (section C), 12 turns:
1. The Time Realist: Start with the odd fit. Shifts change weekly, yet the usual plan assumes the same week every time. Benjamin Franklin admitted a fixed daily order was the virtue he mastered least, because running a print shop meant other people set his hours. My reading: the plan keeps breaking, and giving up is just what that breakage gets called.
   [Oliver Burkeman, Four Thousand Weeks, pd=false] Basis: Oliver Burkeman, Four Thousand Weeks (on the limits of controlling time); source not verified, no link provided. The Franklin example is a general reference, not attributed to Burkeman.
2. The Cue Designer: Taking only the why. Behavior needs a trigger it can see, and a clock time that moves each week is a trigger that keeps vanishing. Nothing dramatic happens; the workout simply never gets cued, and a habit with no cue gets filed under good intentions. That is a design flaw, not a character one.
   [James Clear, Atomic Habits, pd=false] Basis: James Clear, Atomic Habits (on cues and making habits obvious); source not verified, no link provided.
3. The Habit Drillmaster: Only the how. Choose one thing that never moves and keep it without exception until it takes root. William James argued a new habit needs a strong start, and that each early lapse undoes many repetitions. Flexible plans sound wise and let every tired day talk its way out.
   [William James, The Principles of Psychology, pd=true] Basis: William James, The Principles of Psychology (1890), chapter on habit; paraphrased, source not verified, no link provided.
4. The Time Realist: The story told about Jerry Seinfeld and his calendar chain is your best case, and it works because writing a joke takes minutes. A flat no-exceptions rule on a full workout, after a night shift that flipped the sleep, costs rest. If protecting sleep is the real worry, the rule should shrink to a walk.
   [Oliver Burkeman, Four Thousand Weeks, pd=false] Basis: Oliver Burkeman, Four Thousand Weeks (on accepting limits and tradeoffs); source not verified, no link provided. The extension to sleep and shift work is the mind own thinking.
5. The Habit Drillmaster: That lands. I was treating exercise as one size, and a ninety-minute session after a flipped night is not the same thing as ten minutes. I am narrowing my rule: the no-exception part applies only to a small floor, and the full workout floats. Sleep is what moved me.
   [William James, The Principles of Psychology, pd=true] Basis: William James, The Principles of Psychology (1890), chapter on habit; paraphrased, source not verified, no link provided. The narrowing to a small floor is the mind own revision.
6. The Cue Designer: A floor still needs something to hang from. Shifts change, but people still wake, eat, and leave for work, so the ten minutes can follow one of those, like right after locking the front door. The British cycling team under Dave Brailsford chased small gains over big overhauls. Small and attached beats small and floating.
   [James Clear, Atomic Habits, pd=false] Basis: James Clear, Atomic Habits (habit stacking and small gains); source not verified, no link provided.
7. The Time Realist: One possibility to test. They wrote that they keep giving up, which might mean each lapse reads to them as proof about themselves, not about the plan. If that is happening, the design has to make a missed day harmless. If instead quitting follows injury or exhaustion, this reading fails.
   [Oliver Burkeman, Four Thousand Weeks, pd=false] Basis: Oliver Burkeman, Four Thousand Weeks (on perfectionism and limits); source not verified, no link provided.
8. The Habit Drillmaster: I reject that reading, because nothing they wrote mentions blaming themselves; people drop oversized plans with no verdict on their character. My rival: the opening plan was too big, so the first bad week ended it. What follows is that the first month of the floor deserves the strictest guarding.
   [William James, The Principles of Psychology, pd=true] Basis: William James, The Principles of Psychology (1890), chapter on habit; paraphrased, source not verified, no link provided.
9. The Cue Designer: Another possibility. They asked for a routine that does not depend on the same schedule, which might mean they want it automatic, with no daily deciding. But they also work shifts that move, which means following them. Both cannot be fully had: a cue-attached floor serves the automatic wish, and a weekly look at the roster serves the flexible one.
   [James Clear, Atomic Habits, pd=false] Basis: James Clear, Atomic Habits (on cues, environment, and habit stacking); source not verified, no link provided.
10. The Time Realist: I offer a rival reading: not automatic, but forgiving, meaning they can miss a week and restart without ceremony. If so, a short Sunday planning slot is not a cost to hide, it is the routine itself. Cues help the floor; the bigger session needs a person choosing a slot.
   [Oliver Burkeman, Four Thousand Weeks, pd=false] Basis: Oliver Burkeman, Four Thousand Weeks (on deliberate choices among limited hours); source not verified, no link provided.
11. The Habit Drillmaster: Here is the missing fact: how early they learn the next shifts. If the roster is posted a week ahead, I would write the floor into actual slots, because a decided slot beats a hoped-for one. If shifts change the same day, slots collapse and I would switch to the cue-attached floor.
   [William James, The Principles of Psychology, pd=true] Basis: William James, The Principles of Psychology (1890), chapter on habit; paraphrased, source not verified, no link provided. The conditional on roster timing is the mind own thinking.
12. The Cue Designer: Our open fight is whether the floor is a hard rule or a cue with room to miss. I favor missing once but never twice; the other view calls that a leak. A fact not given decides it: if past stops began with one skipped day snowballing, strictness wins; if they came from weeks of piling fatigue, permission wins.
   [James Clear, Atomic Habits, pd=false] Basis: James Clear, Atomic Habits (never miss twice); source not verified, no link provided.

What became clearer (section D):
The main insight is that a clock-based plan is a poor fit for a changing roster, so the routine may need a small floor attached to events that still happen (waking, leaving work) with a larger session placed week by week. Still disputed: whether that floor should be a strict no-exception rule or a cue that allows one miss, and whether the wish is for automatic or merely forgiving. A possible self-reflection: when past attempts ended, did they end after a single skipped day, after a long run of tiredness, or because the plan was too big to begin with? Sources were not verified in this run, and the attributions are paraphrased.

What the choice depends on (section E):
If the roster is known about a week ahead: a short weekly planning slot that places the floor and one larger session becomes more reasonable, because decided slots are easier to keep than hoped-for ones.
If shifts change on the same day: a small floor tied to an event that always happens (leaving work, waking up) becomes more reasonable, because no slot survives the changes.
If past stops began with one skipped day turning into weeks: a stricter floor with few exceptions becomes more reasonable, because early lapses are what did the damage.
If past stops came from accumulating fatigue or poor sleep: a lighter floor, such as a walk, with permission to miss once becomes more reasonable, because rest is what is being protected.
If these facts stay unknown: try a ten-minute floor for two or three weeks of rosters, note when it breaks, and let that record show which case applies.

Score A and B. Return the JSON object only.
