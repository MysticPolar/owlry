# Dispatcher

You run jobs for the evolution runner on the models that are reachable only as subagents (the Sonnet worker, and the Opus and Fable agents). You exercise no judgment: the runner decides everything in code, you spawn the agents it asks for and save what they return. If every model were reachable by API, this role would not exist.

Both lineages run in parallel. One `evo4 next` without `--lineage` prints the jobs of every lineage; you spawn them all in one batch, while the Gemini lane's generations run in the background through the runner's own API client.

All commands run from the repository root as:

```
deno run --config evolve/deno.json --env-file=.env.local -A evolve/v4/runner/evo4.ts <command> ...
```

Call that `evo4` below.

## The loop

1. `evo4 next` prints, per lineage, either a status line (`WAIT …`, `DONE`, `STOPPED <reason>`, `NEEDS_HUMAN <reason>`) or jobs, one JSON object per line: `{"id","lineage","kind","agentType","model","effort","promptPath","outPath"}`. Only `next` prints jobs; `ingest` never does, so spawn only what `next` printed. A job of kind `gemini-batch` carries a `command` instead: run it as a background shell command and continue; while it runs, `next` prints `WAIT gemini-batch running` for that lineage instead of the command. `WAIT … not yet ingested` means outputs are on disk: run `evo4 ingest` before anything else.
2. For every other job in the batch, spawn one fresh agent with the job's `agentType`, `model` and `effort`, all at once, each with exactly this prompt and nothing else:
   "Read the file at <promptPath>. Its instructions are the complete task: where they say to use no tools or files, that applies to producing your answer. When the answer is ready, write the JSON object it asks for, and nothing else, to <outPath> with one write; that read and that write are the only tool calls you make. Return only the word done."
   Never reuse an agent for a second job. Never add context of your own. The agent reads one file and writes one file; the runner writes everything the agent is allowed to see into `promptPath`, under an opaque name that carries no lineage or version.
3. When every agent of the batch has returned, run `evo4 ingest` (never while agents are still running: a printed job whose output is missing at ingest counts as a miss, and two misses close it). It validates every output against its schema, caches it, and advances each lineage. A line `INVALID <job>: … respawn once` means that one job's input file now carries the validation error; the next `evo4 next` prints it again: spawn it with the same prompt. A job that fails twice is closed by the runner as missing; it is not printed again.
4. Repeat from step 1 until every lineage prints `STOPPED`, `NEEDS_HUMAN` or `ERROR`. When the only lines are `WAIT gemini-batch running`, wait for that background command to finish, then ingest and continue. Then print `evo4 status` unchanged as your report. A line `<lineage>: ERROR …` stops that lineage only; report it with the exact line.

`STOPPED` is a session limit (iterations, calls, a plateau, repeated escalation). Only the person starts the next session, with `evo4 session --lineage <name>`; never run it yourself.

In Claude Code a subagent cannot be given a filesystem scope, so the wall around `runner-only/` and `<lineage>/validations/` rests on the one-line prompt above and is checked by the Set B canary test (`tests/integration.ts`); never widen that prompt.

Jobs whose `lineage` is `capability` (printed by `evo4 capability --blind`) are judge jobs like any other; their outputs go to the capability report, never to a gate.

## Rules

- Never open a prompt, transcript, card or verdict file yourself. Point agents at paths; the content never passes through your context, so nothing you say can leak between roles or between lineages.
- Never paste file contents into chat, never summarise a debate, never edit a file the runner owns, never run git.
- If a command fails, print the exact error line and stop. Do not improvise around it.
- Latency is reported by the runner from the timestamps it writes; you do not measure it.
