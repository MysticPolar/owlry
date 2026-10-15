# v4.2 as installed in this repository

The package in this folder is the v4.2 design (README.md, COMPARISON.md) wired into the repository and hardened by two independent multi-agent reviews. Nothing has been run against a model yet. This file says how to run it, what changed from the package as shipped, how it is tested, and what to decide before the first run.

## Run it

Every command runs from the repository root (the worktree):

```bash
deno run --config evolve/deno.json --env-file=.env.local -A evolve/v4/runner/evo4.ts status
```

`evo4` below means that command without `status`. The dispatcher protocol is `roles/dispatcher.md`; the main Claude Code session plays the dispatcher.

| command | what it does |
|---|---|
| `evo4 bootstrap [--lineage L]` | open the baseline experiment for each lineage's v0 champion (refuses a second time without `--force`) |
| `evo4 next` | print outstanding jobs (JSON lines) or one status line per lineage; the only command that prints jobs |
| `evo4 ingest` | validate and cache every output on disk, then advance; prints `INVALID …` lines and the state, never jobs |
| `evo4 challenge --lineage L --file F --note "…"` | enter a hand-written challenger in place of this iteration's optimizer job (the control experiment) |
| `evo4 capability [--blind]` | cross-lineage report from both baselines; `--blind` prints 10 cross-lane judge jobs, a later run tallies them |
| `evo4 validate --lineage L` | open a Set B validation now (only between iterations) |
| `evo4 session [--lineage L]` | start a new session: the stop limits count from here; a STOPPED lineage resumes |
| `evo4 status`, `evo4 ledger --lineage L`, `evo4 metrics --file F` | read-only |
| `evo4 gemini-batch --lineage L --exp ID` | printed by `next` as a background command; runs the Gemini generations one at a time on the free-tier gap |

`EVO4_ROOT=<dir>` points the runner at another data root; the integration tests use it.

## Wiring (README section 12, step 1)

`runner/legacy.ts` holds the three functions the package left as TODO, reusing the schema-2 pieces rather than importing `evolve/runner/evo.ts` (whose command switch runs on import):

- `callGemini`: the shared client in `supabase/functions/_shared/gemini.ts`, the same forced JSON envelope schema as schema 2, same-model retries on 429 (61 s) and 5xx, no fallback model. evo4 passes the lane's model, temperature 0.5, thinking MEDIUM, 16384 tokens.
- `frameWorkerPrompt`: the schema-2 worker framing. A dry run produced a Sonnet worker file byte-identical to round 12's `worker-prompt.q1.v1.sonnet.md`.
- `loadQuestionText`: `evolve/questions/bank.json`.

Schema 2 (`evolve/runner/evo.ts`, `evolve/roles/*`, `evolve/config.json`) stays in place only as the record of rounds 1 to 12.

## What was fixed on install

The first review (four reviewers, each finding adversarially verified) confirmed 44 findings, many duplicated across dimensions; together with my own reading they come to the defects below. All are fixed and each has a test.

Blockers, where the loop could not have worked at all:
- **Every optimizer proposal was rejected.** The contradiction check scanned the whole candidate, and the original prompt's own protected rules ("Do not … impersonate real thinkers", "Do not end with a question") matched its patterns. It now counts matches against the champion.
- **Ordinary ratings were rejected.** The "two decimals" check used float equality, so 8.3 (830.0000000000001) failed; 6 of the 10 round-12 judge cards had such a rating. It is now tolerant.
- **A baseline with one bad slot crashed or froze the lineage.** A missing card crashed every `next`; a missing transcript made every later comparison an incomplete KEEP. A failed slot is now redrawn once on its own (fresh salted draw, fresh file names); a slot that fails twice is listed as missing and skipped.

Wrong decisions or lost data:
- After the third promotion, the rebaseline was orphaned by the validation and the next iteration crashed. The next iteration now rebaselines whenever `baseline.json` belongs to an older version.
- A validation's stage 2 could decide before its new samples were judged; `ingest` could re-run a decided validation, logging it twice and rotating Set B twice.
- One lineage's PASS rotated the shared Set B under the other lineage's running validation. Each validation now keeps the questions it opened with.
- Missing pairs counted as losses in the release gate, so an incomplete panel could FAIL and roll back. Missing pairs now make it INCONCLUSIVE.
- A stop limit crossed by a promoting iteration overwrote PROMOTED before the pointer moved. Stops now apply only at the iteration boundary.
- The champion's cards were counted twice when the rebaseline ran in the same experiment, and per-category deltas mapped cards to the wrong questions.
- A config change (evaluator, judge, model, effort, temperature, envelope, rubric map, Set A) did not invalidate the baseline, because `baseline.json` names its cache entries directly. The baseline now carries a fingerprint, and a mismatch redraws it.
- `evo4 challenge` left the already-printed optimizer job open, and its output then crashed every ingest.
- The capability-bound rule used half the documented per-question gap.

Walls:
- Agent file paths named the lineage, the version and the experiment (`…/sonnet/experiments/exp-004/jobs/rubric.v5.q2.s1.md`). Worker, evaluator and judge files now live under opaque hashed names in `inbox/`, or in `runner-only/inbox/` for Set B.
- Each optimizer received both lane profiles, including the other worker's description. It now receives its own only.

Operations:
- `next` printed the Gemini batch command again while a batch was running, so batches could pile up on the free-tier key. A lock file now makes `next` print `WAIT gemini-batch running`, and outputs are written atomically.
- Outputs on disk but not yet ingested were printed as jobs again. `next` now prints `WAIT … run ingest`, and `ingest` never prints jobs.
- A malformed or wrong-shaped agent output could crash ingest for both lineages, and a bad card could poison the cache. Outputs are now validated against the shipped JSON schemas (Ajv). Problems are appended to the job's input for one repair. A second failure closes the job as missing, or closes the iteration as KEEP for the optimizer.
- An agent that never wrote its output was re-issued forever. Two misses now close the job.
- Worker answers that are not JSON or not a debate are recorded as failures (README 11 #15) instead of being retried away. They are never scored.
- Invalid outputs did not count toward the 600-call limit. Every output read now counts.
- The stop limits counted the whole history, so a STOPPED lineage could never resume. They now count the current session, and `evo4 session` starts a new one.
- `capability --blind` verdicts were never read. They are now tallied into the report.
- Set B `uses` counted only PASSes and the refresh limit was never read. Every decided validation now counts, and at 3 uses the next validation waits for a person (`NEEDS_HUMAN`).
- One lineage's error stopped the other. Each lineage now runs isolated and prints `<lineage>: ERROR …`.
- Other changes: `bootstrap` refuses to reset a lineage without `--force`. `validate` refuses mid-experiment. The gate and promotion side effects are idempotent across a crash. A basis that only disclaims ("section not verified, no link provided") no longer counts as a fabricated chapter. An ablation iteration rejects a non-ABLATE proposal. The manual challenger no longer counts toward an escalation streak. Experiment ids can no longer collide. Rubric cell names are normalised from the rubric map, so a shortened name does not cost a card.

## Tests

```bash
deno run --config evolve/deno.json -A evolve/v4/tests/integration.ts
```

| suite | count | runs |
|---|---|---|
| unit, `tests/run.ts` | 45 | Deno, and `tsx` under Node |
| schemas, `tests/schemas.test.mjs` | 23 | Node with Ajv |
| end to end, `tests/integration.ts` | 27 | Deno: the real CLI as subprocesses, mock agents, one fresh data root per test |
| type checks | clean | `deno check` and `tsc -p evolve/v4/tsconfig.json` |

The end-to-end tests cover bootstrap of both lineages through the Gemini batch, the control challenge to PROMOTE and rebaseline, RETEST to KEEP, ESCALATE with a ban, no_change and escalate actions, the repair path, incomplete panels, critical rejections, Gemini failures, validation PASS, FAIL with rollback, INCONCLUSIVE to PASS and incomplete to EXPERIMENTAL, the Set B canary, stop and resume, ablation, opaque paths, crash-safe stops, fingerprint redraws and lineage isolation.

## Decide before the first run

1. **The critical checks will reject most challengers, including both control challengers.** Measured on the 88 past transcripts of rounds 1 to 12 with `deno run -A evolve/v4/tools/critical_rates.ts`:

   | lane | transcripts with a pd=false quotation mark | with a chapter, section or link in a basis | chance a 10-transcript challenger like these is rejected as critical |
   |---|---|---|---|
   | Sonnet | 5 of 26 | 5 of 26 | about 98% |
   | Gemini (rounds 1–12 prompts) | 15 of 62 | 61 of 62 | about 100% |

   Both round-12 v2 prompts still say `[Basis: Author, Book, section](verified URL)`. The Gemini v0 champion has the plumbing fix. So the Gemini control (v2 vs v0) will be decided by the basis format, not by the twelve rounds of content edits. The Sonnet v0 champion has the same format line, and that line is protected. Its transcripts put quotation marks in about one pd=false turn in two, so nearly any Sonnet challenger fails the "at most one such turn in ten transcripts" rule unless it adds the per-line quotation check. The optimizer brief does not mention these thresholds. Options: give the v2 control prompts the v0 basis plumbing so the control tests the content edits; give Sonnet v0 the Gemini plumbing and per-line check before its baseline; or make the critical check relative to the champion's own rate.
2. **There is no human gate in v4.2.** The gate promotes in code. A dispatcher run continues until a stop limit. To review each decision, run the dispatcher for one decision at a time.
3. **Cost of step 0** (bootstrap both lineages, then both control challenges, no retest):

   | calls | count |
   |---|---|
   | Sonnet workers | 20 |
   | Gemini Flash-Lite (free tier, background) | 20 |
   | Opus rubric evaluators | 40 |
   | Opus blind judges | 20 |
   | Optimizer (Fable) | 0 |

   A retest adds up to 10 generations, 10 cards and 5 verdicts per lineage. A promotion adds a 10-sample rebaseline. `capability --blind` adds 10 judges. A leaner first step is the bootstrap alone: 10 Sonnet, 10 Gemini and 20 Opus calls, which yields both baselines and the first capability report.
4. **Filesystem walls are by instruction.** A Claude Code subagent cannot be given a filesystem scope. The wall around `runner-only/` and `validations/` rests on the dispatcher's one-line prompt and the opaque paths, and the canary test checks the runner's side.
