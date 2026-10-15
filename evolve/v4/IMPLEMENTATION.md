# v4.2 as installed in this repository

The package in this folder is the v4.2 design (README.md, COMPARISON.md), wired into the repository and hardened by two independent multi-agent reviews and a mocked rehearsal of the first run. Nothing has been run against a model. This file says how to run it, what changed from the package as shipped, how it is tested, and what to decide before the first run.

## Run it

Every command runs from the repository root (the worktree):

```bash
deno run --config evolve/deno.json --env-file=.env.local -A evolve/v4/runner/evo4.ts status
```

`evo4` below means that command without `status`. The dispatcher protocol is `roles/dispatcher.md`; the main Claude Code session plays the dispatcher.

| command | what it does |
|---|---|
| `evo4 bootstrap [--lineage L]` | open the baseline experiment for each lineage's v0 champion (refuses a second time without `--force`) |
| `evo4 challenge --lineage L --file F --note "…"` | enter a hand-written challenger (the control). Right after bootstrap it is queued and tested as soon as the baseline closes; a relative `F` is resolved against `evolve/v4/` |
| `evo4 next` | print outstanding jobs (JSON lines) or one status line per lineage; the only command that prints jobs |
| `evo4 ingest [--no-miss]` | validate and cache every output on disk, then advance; also tallies cross-lane verdicts. `--no-miss` after agents failed to return cleanly |
| `evo4 capability [--blind]` | cross-lineage report from both baselines; `--blind` prints 10 cross-lane judge jobs, which the next ingest tallies |
| `evo4 validate --lineage L` | open a Set B validation now (only between iterations) |
| `evo4 session [--lineage L]` | start a new session: the stop limits count from here; a STOPPED lineage resumes |
| `evo4 status`, `evo4 ledger --lineage L`, `evo4 metrics --file F` | read-only; `status` shows the baseline, the last decision and the session counts |
| `evo4 gemini-batch --lineage L --exp ID` | printed by `next` as a background command; runs the Gemini generations one at a time on the free-tier gap |

`EVO4_ROOT=<dir>` points the runner at another data root; the end-to-end tests use it.

## Wiring

`runner/legacy.ts` holds the three functions the package left as TODO. They reuse the schema-2 pieces rather than importing `evolve/runner/evo.ts`, whose command switch runs on import:

- `callGemini` uses the shared client in `supabase/functions/_shared/gemini.ts` with the same forced JSON envelope schema as schema 2, same-model retries on 429 (61 s) and 5xx, and no fallback model. evo4 passes `gemini-3.1-flash-lite`, temperature 0.5, thinking MEDIUM and 16384 tokens.
- `frameWorkerPrompt` is the schema-2 worker framing. A dry run produced a Sonnet worker file byte-identical to round 12's.
- `loadQuestionText` reads `evolve/questions/bank.json`.

Schema 2 (`evolve/runner/evo.ts`, `evolve/roles/*`, `evolve/config.json`) stays in place only as the record of rounds 1 to 12.

## What the reviews found and what was fixed

Two reviews ran, each with several reviewers whose findings were checked by adversarial verifiers. The first confirmed 44 findings and the second 25, many duplicated across reviewers. The second review also rehearsed step 0 end to end on mock agents fed with the round-12 transcripts. Every finding is fixed and has a test, except the critical-check design question under "Decide before the first run".

Blockers, where the loop could not have worked:
- **Every optimizer proposal was rejected.** The original prompt's own protected rules ("Do not … impersonate real thinkers", "Do not end with a question") matched the contradiction patterns. Contradictions are now counted against the champion.
- **Ordinary ratings were rejected.** The "two decimals" check used float equality, so 8.3 failed. Six of the ten round-12 judge cards had such a rating.
- **One bad baseline slot crashed or froze a lineage.** A failed slot is now redrawn alone, up to twice. A slot that still fails is left out with a WARNING, and the gate then expects one pair fewer. If more than half the slots fail, a person is asked.
- **A curly apostrophe counted as a quotation mark.** "let’s" in a turn citing a post-1930 book counted as a quote, so two contractions rejected a challenger.

Wrong decisions or lost data:
- The rebaseline after the third promotion was orphaned, and the next iteration crashed.
- A validation's stage 2 could decide before its new samples were judged. A decided validation could be re-run, logged twice and rotate Set B twice.
- Missing pairs counted as losses in the release gate.
- One lineage's PASS rotated the shared Set B under the other's running validation.
- Two lineages validating at once could exceed the Set B reuse limit.
- A stop limit could overwrite a promotion before the pointer moved.
- Champion cards were double-counted, and per-category deltas went to the wrong questions.
- A config change did not invalidate the baseline. The baseline now carries a fingerprint.
- `challenge` collided with the optimizer job.
- The capability-bound rule used half the documented gap.

Walls:
- Agent file paths named the lineage, the version and the experiment. Agent files now live under opaque hashed names in `inbox/`, or `runner-only/inbox/` for Set B.
- Set B transcripts, cards and verdicts went into the shared `cache/`. They now go to `runner-only/cache/`.
- Each optimizer read both lane profiles. It now reads only its own.

Operations:
- Gemini batches could pile up on the free-tier key. A lock now prevents it, and outputs are written atomically.
- Background Gemini outputs used to send the dispatcher to ingest before it had spawned the other lineage's jobs, which closed them as missing. Gemini outputs no longer trigger "ingest now".
- Agent outputs are now validated against the shipped schemas. Harmless variations are normalised: extra fields, "None", null notes, and JSON inside a fence or after prose. Problems name the property and the allowed values, and the agent gets one repair with the problems appended to its input.
- Agents that never write are closed after two misses. `--no-miss` covers agents cut off by a usage limit.
- Worker answers that are not a debate are recorded as failures instead of being retried away.
- Every output now counts toward the call limit.
- The stop limits now count per session, and `session` resumes a stopped lineage.
- Cross-lane verdicts are validated and tallied at ingest.
- One lineage's error no longer stops the other.
- The optimizer input states the task, the budget and the bans first. Cards are compacted to one line per cell, and the history is capped at ten iterations. The agent is told to read the whole file.
- Each ledger line carries the gate's reason, so the optimizer can tell a critical REJECT from a quality verdict.
- Banned targets are now enforced.
- `bootstrap` and `validate` refuse unsafe use.
- The gate and promotion side effects are idempotent across a crash.

## First live run: bootstrap, 2026-10-15

Option 1 was chosen: the controls are `prompts/castDebate.{sonnet,gemini}.v2-plain.md` (built by `tools/make_plain_controls.ts`), and they have not run yet. Only the two baselines ran. `deno run -A evolve/v4/tools/baseline_summary.ts` prints them.

| | Sonnet v0 | Gemini v0 |
|---|---|---|
| mean of 10 cards | 78.20 | 43.92 |
| range | 73.36 – 83.44 | 33.20 – 53.32 |
| largest gap between two samples of one question | 7.2 | 19.9 |
| basis with a chapter, section or link | 5 | 0 |
| quoted pd=false turns | 2 | 1 |

Calls spent: 10 Sonnet workers, 10 Gemini (one 503, retried), 20 Opus evaluations, and 9 short format repairs. The repairs resumed the same evaluator agents to rewrite one field.

Found on the live run and fixed:
- The rubric brief calls `rubric_fit_notes` "observations" and never says list, so 9 of 10 evaluators wrote a string. A string is now read as one note.
- A pattern seen across the whole debate came with an empty turn list (4 of 10 cards). That is now read as every turn.
- The runner used to delete a rejected output. It now keeps it as `<out>.rejected<N>`, so a fix to the runner's checks can re-read it instead of paying for the call again. The four Gemini cards were recovered this way.

Observations for the next decisions:
- **Sonnet's own champion fails the form checks** (WARNING at baseline). It is the Option 2 question, still open.
- **Gemini's spread is about twice what the gate assumes.** Its pooled per-sample spread over these 5 pairs is about 7 points; the gate's numbers assume 3.11. Sonnet's is about 3. Five pairs is a small sample.
- **24 of the 35 cells are capability-bound** under the rule: Sonnet leads by at least 2 rating points on every question. The Gemini optimizer is told to treat those as model-limited, so it may target only the other 11 or escalate early.

## Tests

```bash
deno run --config evolve/deno.json -A evolve/v4/tests/integration.ts
```

| suite | count | runs |
|---|---|---|
| unit, `tests/run.ts` | 47 | Deno, and `tsx` under Node |
| schemas, `tests/schemas.test.mjs` | 23 | Node with Ajv |
| end to end, `tests/integration.ts` | 37 | Deno: the real CLI as subprocesses, mock agents, a fresh data root per test |
| type checks | clean | `deno check` and `tsc -p evolve/v4/tsconfig.json` |

## Decide before the first run

1. **The critical checks will reject both control challengers, and most like-for-like challengers, on form rather than quality.** Measured on the 88 transcripts of rounds 1 to 12 with `deno run -A evolve/v4/tools/critical_rates.ts`:

   | lane | transcripts with a quotation mark in a pd=false turn | with a chapter, section or link in a basis | chance a 10-transcript challenger like these is rejected as critical |
   |---|---|---|---|
   | Sonnet | 5 of 26 | 5 of 26 | 98% |
   | Gemini (rounds 1–12 prompts) | 11 of 62 | 61 of 62 | 100% |

   The rehearsal on round-12 transcripts reached exactly that. The Sonnet control was rejected at blind 4/10 for 8 basis references and 14 quoted pd=false turns. The Gemini control was rejected at blind 7/10 for 92 basis references. Both round-12 v2 prompts still ask for `[Basis: Author, Book, section](verified URL)`. Gemini v0 has the plain-basis fix; Sonnet v0 does not, and its format line is protected. The checks apply to the challenger only, so a champion that fails them, as Sonnet v0 does, is never held to them. The runner now prints a WARNING when a champion's own baseline fails the limits. Three options:
   - Give both v2 control prompts the v0 basis plumbing, so experiment 1 tests the twelve rounds of content edits.
   - Give Sonnet v0 the Gemini plumbing and per-line quotation check before its baseline.
   - Make the critical check relative to the champion's own rate.
2. **There is no human gate in v4.2.** The gate promotes in code, and a dispatcher run continues until a stop limit. To review each decision, tell the dispatcher to stop after one decision; `status` shows `lastDecision`.
3. **Cost of step 0.** This is bootstrap of both lineages plus both control challengers, with no retest:

   | calls | count |
   |---|---|
   | Sonnet workers | 20 |
   | Gemini Flash-Lite (free tier, background) | 20 |
   | Opus rubric evaluators | 40 |
   | Opus blind judges | 20 |
   | Optimizer (Fable) | 0 |

   A retest adds up to 10 generations, 10 cards and 5 verdicts per lineage. A promotion adds a 10-sample rebaseline, and `capability --blind` adds 10 judges. A leaner first step is the bootstrap alone: 10 Sonnet, 10 Gemini and 20 Opus calls. It yields both baselines, the first capability report and the WARNING lines.
4. **Filesystem walls are by instruction.** A Claude Code subagent cannot be given a filesystem scope. The wall rests on the dispatcher's prompt ("Open no other file"), on opaque paths, and on keeping Set B material under `runner-only/`. A permission deny rule on `evolve/v4/runner-only/**` and `evolve/v4/*/validations/**` in the worktree's Claude settings would enforce it; that is a settings change for you to make.
