# The self-evolving prompt loop (schema 2)

Two prompts evolve side by side, one per model: the `gemini` lineage for the free-tier Gemini model (`gemini-3.1-flash-lite`) and the `sonnet` lineage for Claude Sonnet 5.5. Each round draws five fresh questions, one per category, runs each lineage's previous and current prompt version on all five, judges every pair blind, and lets each lineage's editor write the next version from the five-question evidence.

**The goals.** Sonnet lineage: 90 or more on every question of a round, by prompt adaptation alone. Gemini lineage: 70 or more on every question, with the recorded caveat that this model's estimated ceiling under this judge is about 60. The judge's standard is unchanged from the owner's matrix; only its mechanics were fixed so the top band is reachable when earned.

## Who does what

| Role | What it is | Lives where |
| --- | --- | --- |
| Main session | Spawns one master per round, commits between rounds, checks the milestones, decides when a round is a held-out round | chat |
| Master | Runs one round step by step and logs everything. Opus 5.5, one per round. | `roles/master.md` |
| Worker, Gemini lineage | Answers each question with the lineage's prompt. Flash-Lite, thinking MEDIUM, two samples per question, paced for the free tier. | `runner/evo.ts gemini` |
| Worker, Sonnet lineage | Answers each question with the Sonnet lineage's prompt. One sample. | spawned by the master |
| Judge | Scores each pair of debates on the 100-point matrix, blind to which version is which, side by side. Opus 5.5. | `roles/judge.v2.md` |
| Editor, per lineage | Reads the five-question scorecards and writes the lineage's next version. Fable. | `roles/editor.gemini.md`, `roles/editor.sonnet.md` |

Every worker, judge and editor is spawned for one job and is gone when it returns. Nothing persists between rounds except files.

## Why five fresh questions

Comparing two versions on different questions measures the questions, not the prompt: one question moved Sonnet's score by 10 points with the same prompt. So both versions run on the same five questions within a round, paired. The five change every round, drawn least-used first, so the editor cannot tune to any one of them and the prompt has to stay general across Health, Wealth, Love, Purpose and Wonder. Five questions the editor never sees are held out; every fifth round the current versions are scored on them alone, as the progress line.

## Decisions

- A version is kept if it wins more paired comparisons than it loses across the five questions. A losing version is discarded and the editor builds on the winner.
- Length is enforced in code: an absolute ceiling of 1900 words and 10 percent growth per round.
- The judge compares versions inside a lineage only. There is no cross-model comparison.
- Latency is recorded and never acted on.

## Where things are

```
evolve/
  config.json               lanes, lineages, panel size, held-out ids, judge and editor settings, length limits
  questions/bank.json       51 questions in five categories with labels; three flagged safety
  subject/castDebate.gemini.vN.md, CHANGELOG.gemini.md   the Gemini lineage (v1 = the single-lineage loop's v11)
  subject/castDebate.sonnet.vN.md, CHANGELOG.sonnet.md   the Sonnet lineage (v1 = the original prompt)
  subject/castDebate.v1..v11.md, CHANGELOG.md            the single-lineage history, rounds 1 to 11
  roles/judge.v2.md         the judge (the matrix, mechanics fixed); judge.md is the earlier version
  roles/editor.gemini.md, editor.sonnet.md, editor.md    the editor briefs; editor.md is the earlier single brief
  roles/master.md           the master's playbook
  runner/evo.ts             the command-line tool
  runs/round-NNN/           everything a round produced
```

## Reading a round

```
deno run --config evolve/deno.json --env-file=.env.local -A evolve/runner/evo.ts summary --round 12
```

Per lineage: a table of the five questions against the versions, the means, the minimum question, the paired wins, and what the editor changed. `debates.md` in the round folder has every debate with its score. `status` prints each lineage's round means and held-out scores; `milestone` says REACHED or not.

## Setup, once

- `.env.local` in the repository root with `GEMINI_API_KEY=...`. Never commit it.
- Deno 2 installed. The Gemini client is the production one.
