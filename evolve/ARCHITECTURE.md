# The self-evolving prompt loop: architecture

What runs, who talks to whom, what is on disk, and the decisions behind it. Written 2026-10-13 after eleven rounds.

## Purpose

Improve one system prompt, the cast-plus-debate prompt (`subject/castDebate.vN.md`), for the Gemini model the free tier serves (`gemini-3.1-flash-lite`), until its mean score on a 100-point matrix is 70 or more on one question from each of five categories. Score first, latency second; latency is recorded but never acted on.

## The agents

| Role | Model and effort | Lifetime | Sees | Returns |
| --- | --- | --- | --- | --- |
| Main session | Claude (this conversation) | the whole run | round reports, git | spawns one master per round, commits between rounds, checks the milestone |
| Master | Claude Opus 5.5, max, general-purpose subagent | one round | `roles/master.md`, `config.json`, the files `evo` writes | runs the playbook, spawns the agents below, reports the summary |
| Worker, Gemini lane | `gemini-3.1-flash-lite`, thinking MEDIUM, temperature 0.9, no fallback model | one call per sample | the prompt version and the question, nothing else | one debate as JSON |
| Worker, Sonnet lane | Claude Sonnet 5.5, medium, Explore subagent | one call per version | the same prompt and question, inside a frame that forbids tools | one debate as JSON |
| Judge | Claude Opus 5.5, high, general-purpose subagent | one call per lane per sample | `roles/judge.md` (the matrix), the question, two debates labelled A and B | a scorecard per debate and a preference |
| Editor | Claude Fable 5.1, xhigh, general-purpose subagent | one call per round | `roles/editor.md`, the base prompt, the scorecards, the lane gap, the goal and trajectory, the length budget, the last three changelog entries | the next prompt version with a list of changes and a changelog line |

Every worker, judge and editor is spawned for one job and is gone when it returns. A master lives for one round. Nothing persists between rounds except files.

Not agents, deliberately: the question selector (a rotation rule), the length limits (code at apply time), the blind A/B assignment and unblinding (code), the aggregation of samples (code), the milestone check (code), the choice of which version to build on (code: the round's winner on the primary lane).

## One round

1. `evo new --pick next` opens `runs/round-R/`: picks the next bank question by category rotation and least use, records the current and previous versions, and assigns which version hides behind label A and B per lane (flipped by round parity, and per sample).
2. Workers. Gemini: `evo gemini --round R --versions P,C` runs three samples of each version, interleaved, one call at a time with a 13 s gap for the free tier's five-per-minute limit, timed, saved as `vN.gemini.sK.json`. Sonnet: `evo worker-prompt` writes the framed prompt, the master spawns the worker in the foreground, times it, saves the reply with `evo save`.
3. Judges. One per Gemini sample and one for Sonnet. `evo judge-input` writes a blind file (matrix, question, debate A, debate B); the master spawns a judge pointed at it; `evo save-judge` unblinds, saves, and on the Gemini lane rebuilds `judge.gemini.json` as the mean over samples with the spread and the per-sample preferences.
4. Editor. `evo editor-input` writes one file: the base prompt (the round's winner), every scorecard with subcriteria, the lane gap (Gemini against Sonnet per criterion), the goal and the round-by-round trajectory, the length budget, the last changelog entries. The master spawns the editor; `evo apply-editor` validates the answer (growth at most 10 percent, absolute ceiling 1900 words, user section untouched), writes `subject/castDebate.v(C+1).md`, appends `CHANGELOG.md`, records the base version.
5. `evo summary` and `evo render` produce the human-readable result and `debates.md`.
6. The main session commits and pushes the round, runs `evo milestone`, and spawns the next master, or stops when the check prints REACHED, a round fails, or the person says stop.

A rewrite round (`evo new --rewrite`) replaces step 4's incremental edit with a from-scratch prompt of at most 950 words; the next round tests it against the long one and the winner rule keeps or discards it.

## The prompts

- `subject/castDebate.v1.md`: the author's prompt, with two agreed plumbing edits (the placeholder became `{{question}}`, the debate became 9 to 12 turns). Everything above the `## User's situation` heading is the system prompt; below it is the user template. Only the system part is ever edited.
- `subject/castDebate.v2.md` to `v11.md`: one per round, each written by the editor. `CHANGELOG.md` has one entry per version: question, scores, latency, base, word count, changes.
- `roles/judge.md`: the 100-point matrix (7 criteria, 35 subcriteria, rating bands, the grounding cap) plus a fixed JSON output. The judge never sees the question's category or label, nor which version is which.
- `roles/editor.md`: how to find the leak, make two to four small changes, keep protected parts, stay within length, write for a small model, build on the winner, and what a rewrite round is.
- `roles/master.md`: the step-by-step playbook with the exact commands.
- `runner/evo.ts` adds, at run time, the envelope line to the user message (the JSON fields), the frame around the Sonnet worker's prompt, the safety-check paragraph for flagged bank questions, and the sections of the editor's input listed above.

## Files

```
evolve/
  config.json            lanes, models, efforts, samples, pacing, milestone, length limits
  questions/bank.json    51 questions in five categories with labels; three flagged safety
  subject/               the prompt versions and CHANGELOG.md
  roles/                 judge.md, editor.md, master.md
  runner/evo.ts          the command-line tool; imports only the production Gemini client
  runs/round-NNN/        everything a round produced: inputs, raw replies, parsed records, judge files, editor output, debates.md
```

## Decisions and why

- The judge compares versions inside a lane, never across models. Sonnet is a ceiling reference only.
- The label is kept from the worker and the judge so nothing anchors the reading of the question.
- Three Gemini samples per version so the spread between samples of one version is visible as the noise floor; a gap smaller than the spread is not evidence.
- The editor builds on the round's winner; a version that lost to its predecessor is discarded.
- Limits that must hold are code, not instructions: length, growth, schema, blinding, aggregation, milestone.

## Known problems after eleven rounds

See the diagnosis in the conversation of 2026-10-13: one question per round makes every comparison noise-dominated; the editor's mechanical rules raise compliance, not quality; the Gemini-to-Sonnet gap has not narrowed across versions, which points at model capacity rather than prompt clarity as the main limit.
