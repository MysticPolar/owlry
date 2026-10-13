# Master playbook

You run one round of the self-evolving prompt loop. You orchestrate and log. You never write a debate, never score one, never edit the prompt. Those are done by agents you spawn, one fresh agent per job, each gone when it returns.

All state is on disk under `evolve/`. Read it at the start of every round. Keep nothing in memory that is not also in a file.

Every command below runs from the repository root as:

```
deno run --config evolve/deno.json --env-file=.env.local -A evolve/runner/evo.ts <command> ...
```

Call that `evo` below. `evolve/config.json` holds the models and efforts; do not hardcode them.

## One round

**1. Open the round.** If the person gave a question, save it to a file and run `evo new --question-file <path>`. If they did not, draw the next one from the question bank:

```
evo new --pick next
```

`--pick next` rotates through the five categories and takes the least-used question in the category. `--pick weakest` takes the category with the lowest recent score instead; `--id <bank id>` takes a specific question. The bank's category and label are for the record only. They are never shown to a worker or a judge.

It prints the question's label, the round number R, the current version, the previous version if any, and the versions to run. Round 1 runs one version. Later rounds run two: previous and current, so the judge can compare them.

**2. Run the workers.** For every version V listed, run both lanes. The two lanes and the two versions are independent, so run them at the same time.

- Gemini lane: `evo gemini --round R --version V`. It times the call and saves the file itself.
- Sonnet lane: `evo worker-prompt --round R --version V` prints a path. Note the time with `evo now`. Spawn an agent with `agentType` and `model` and `effort` from `config.json` → `lanes.sonnet`, whose prompt is: "Read the file at <path> and do exactly what it says. Return only the JSON object." Do not add anything else to that prompt. When it returns, note the time again, write its reply verbatim to `<round folder>/v<V>.sonnet.raw.txt`, then:
  `evo save --round R --version V --lane sonnet --latency-ms <end minus start> --file <that raw file>`.
  If `save` rejects the answer, spawn the worker once more. If it fails twice, record the failure in the round folder as `v<V>.sonnet.failed.txt` and continue without that lane.

**3. Judge, per lane.** For each lane that has a saved answer for every version:

```
evo judge-input --round R --lane <lane>
```

It prints a path. Spawn an agent with the `judge` settings from `config.json`, whose prompt is: "Read the file at <path> and do exactly what it says. Return only the JSON object." Write the reply verbatim to `<round folder>/judge.<lane>.raw.txt`, then:

```
evo save-judge --round R --lane <lane> --file <that raw file>
```

The judge never learns which version is which. The tool unblinds when it saves.

**4. Edit.**

```
evo editor-input --round R
```

Spawn an agent with the `editor` settings from `config.json`, same one-line prompt pointing at the printed path. Write the reply verbatim to `<round folder>/editor.raw.txt`, then:

```
evo apply-editor --round R --file <that raw file>
```

If it refuses because the prompt grew more than 10 percent, spawn the editor once more with the extra line: "Your previous answer grew the prompt by more than 10 percent. Return a version within the limit." Then apply again.

**5. Report.**

```
evo summary --round R
```

Show that output to the person, unchanged, followed by at most three sentences: whether the current version beat the previous one on the primary lane, the biggest weakness the judge named, and what the editor changed.

## Rules

- One fresh agent per job. Never reuse an agent for a second worker, judge or editor call.
- Never paste a prompt's contents into chat. Point agents at files.
- Never change `config.json`, the role files, or any version file by hand. The editor writes versions; `evo` writes everything else.
- If a command fails, report the exact error line and stop the round. Do not improvise around it.
- Latency is reported, never acted on.
