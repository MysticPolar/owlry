# The self-evolving prompt loop

A loop that improves one system prompt, the cast-plus-debate prompt, one test question at a time.

## Who does what

| Role | What it is | Lives where |
| --- | --- | --- |
| You | Give one test question per round. Read the summary. | chat |
| Master | Runs the round, step by step, and logs everything. Opus 5.5. | `roles/master.md` |
| Worker, Gemini lane | Answers the question with the current prompt. Gemini Flash, thinking MEDIUM. Timed. | `runner/evo.ts gemini` |
| Worker, Sonnet lane | Same, on Claude Sonnet. Timed. Reported next to Gemini. | spawned by the master |
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
  runs/round-001/           everything from round 1: question, answers, scorecards, editor output
```

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

Score first, latency second, per lane and per version. The Gemini lane is the primary one. The Sonnet lane's latency includes Claude Code overhead, so compare it only with itself across rounds.

## Setup, once

- `.env.local` in this folder's repository root with `GEMINI_API_KEY=...`. Never commit it.
- Deno 2 installed. No other install needed; the Gemini client is the production one.
- Node packages installed (`npm install`) only if you run the repository's other scripts.

## What is deliberately not here yet

No automatic promotion to production, no auditor for fabricated books or quotes, no second judge, no pruner, no batch of 30 questions. Each can be added when the simple loop shows the need.
