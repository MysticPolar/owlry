# The self-evolving prompt loop

A loop that improves one system prompt, the cast-plus-debate prompt, one test question at a time.

**The goal.** The prompt is for the Gemini model the free tier serves, `gemini-3.1-flash-lite`. The first milestone is a score of 70 or more on the 100-point matrix on that lane. The milestone and the round-by-round score go to the editor every round, so it knows how far the prompt is from the target and whether the last change helped.

**Length.** The system prompt has a hard ceiling in words (`prompt.maxWords` in `config.json`) and a per-round growth limit. Both are enforced in code when a version is applied, not by an agent, and the editor sees the remaining budget every round. At the ceiling, every addition must be paid for by a cut.

**Running the whole bank.** One round per question, in rotation, each round improving the prompt from the last. State is on disk, so a fresh master is spawned for every round and the main session loops: open the round, run it, commit, next. A round that fails stops the run at that round, and the run resumes from there.

**Samples.** The Gemini lane runs three samples per version each round, each judged on its own, and the lane's score is the mean. The spread between samples of the same version is the noise floor, shown to the editor, so a difference between versions smaller than the spread is not treated as evidence. Sonnet runs one sample.

## Who does what

| Role | What it is | Lives where |
| --- | --- | --- |
| You | Give one test question per round. Read the summary. | chat |
| Master | Runs the round, step by step, and logs everything. Opus 5.5. | `roles/master.md` |
| Worker, Gemini lane | Answers the question with the current prompt. Gemini Flash, thinking MEDIUM. Timed. | `runner/evo.ts gemini` |
| Worker, Sonnet lane | Same, on Claude Sonnet at medium. Timed. The ceiling: what the prompt produces on a stronger model. | spawned by the master |
| Judge | Scores each debate on the 100-point matrix, blind to which version it came from. Opus 5.5. | `roles/judge.md` |
| Editor | Reads the scorecards and writes the next prompt version. Fable. | `roles/editor.md` |

Every worker, judge and editor is spawned for one job and is gone when it returns. Only the master persists, and it keeps nothing that is not in a file.

## Where things are

```
evolve/
  config.json               models, efforts, turn range, latency rule
  subject/castDebate.v1.md  the prompt, one file per version; v1 is yours unchanged
  subject/CHANGELOG.md      one entry per version: scores, latency, what changed
  roles/master.md           the master's step-by-step playbook
  roles/judge.md            the judge's prompt (your matrix)
  roles/editor.md           the editor's prompt
  runner/evo.ts             the command-line tool the master uses
  questions/bank.json       the question bank: five categories, a label per question, a few flagged for safety
  runs/round-001/           everything from round 1: question, answers, scorecards, editor output
```

## The question bank

`questions/bank.json` holds the test questions, each with a category, a short label, and the text. Only the text reaches a worker; the judge sees neither the category nor the label, so nothing anchors its reading of what the question is about. The label lives in the round record, the changelog and the summary.

Selection is a rule, not a model: `evo new --pick next` rotates Health, Wealth, Love, Purpose, Wonder and takes the least-used question in that category, so every question gets its turn and a rerun makes the same choice. `--pick weakest` chooses the category with the lowest recent primary-lane score. `evo bank` lists usage and the next pick.

Three questions are flagged `safety`. For those the judge adds a separate yes-or-no on whether the minds recognised possible danger or exploitation, outside the 100-point score.

To add questions, append to the category in `bank.json` with a new id. Never reuse or renumber an id, because the usage count is read from the round records by id.

## What one round produces

In `runs/round-R/`:

- `question.txt`, `round.json`: the question, the versions run, which version hid behind label A and B.
- `v<N>.gemini.json`, `v<N>.sonnet.json`: each worker's answer, model settings, and latency in milliseconds.
- `judge.gemini.json`, `judge.sonnet.json`: scores per version, unblinded.
- `editor.json`: the next version's changes and rationale.
- `editor-input.md`, `judge-input.*.md`, `*.raw.txt`: the exact text each agent saw and returned.

And in `subject/`: `castDebate.v<N+1>.md` plus a new changelog entry.

## How to read a round

Run, from the repository root:

```
deno run --config evolve/deno.json --env-file=.env.local -A evolve/runner/evo.ts summary --round 1
```

Score first, latency second, per lane and per version. The Gemini lane is the primary one: it is the model the prompt is for, and only its scores decide whether a version is better. The judge compares versions inside a lane, never across models.

The Sonnet lane exists for one diagnostic: the lane gap. The editor sees each criterion's points on Gemini next to Sonnet, the ceiling. Both low means the prompt lacks the instruction. Sonnet high and Gemini low means the instruction is there but Gemini cannot follow it as written, so the editor simplifies it rather than adding rules. The Sonnet lane's latency includes Claude Code overhead, so compare it only with itself across rounds. A Fable lane at max effort ran in round 2 and was removed afterwards: ten minutes per debate for a reference signal Sonnet gives in under a minute.

## Setup, once

- `.env.local` in this folder's repository root with `GEMINI_API_KEY=...`. Never commit it.
- Deno 2 installed. No other install needed; the Gemini client is the production one.
- Node packages installed (`npm install`) only if you run the repository's other scripts.

## What is deliberately not here yet

No automatic promotion to production, no auditor for fabricated books or quotes, no second judge, no pruner, no batch of 30 questions. Each can be added when the simple loop shows the need.
