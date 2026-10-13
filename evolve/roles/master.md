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

`--pick next` rotates through the five categories and takes the least-used question in the category. Add `--rewrite` only when the main session tells you this is a rewrite round; the editor then writes a short prompt from scratch instead of editing. `--pick weakest` takes the category with the lowest recent score instead; `--id <bank id>` takes a specific question. The bank's category and label are for the record only. They are never shown to a worker or a judge.

It prints the question's label, the round number R, the current version, the previous version if any, and the versions to run. Round 1 runs one version. Later rounds run two: previous and current, so the judge can compare them.

**2. Run the workers.** For every version V listed, run every lane in `config.json` → `lanes`.

- The `api` lane (gemini): one command for all versions, `evo gemini --round R --versions <V1>,<V2>`, started as a background shell command so it runs while you do the next lane. It runs the samples one after another with the free-tier gap, times each call and saves the files itself. Never run two Gemini commands at the same time: the free tier allows five requests a minute. Never pass `--model`; the configured model is the target.
- Each `subagent` lane (sonnet), one version at a time, in the foreground: `evo worker-prompt --round R --version V --lane <lane>` prints a path. Note the time with `evo now`. Spawn an agent in the foreground with that lane's `agentType`, `model` and `effort` from `config.json`, whose prompt is: "Read the file at <path> and do exactly what it says. Return only the JSON object." Do not add anything else to that prompt. When it returns, note the time again, write its reply verbatim to `<round folder>/v<V>.<lane>.raw.txt`, then:
  `evo save --round R --version V --lane <lane> --latency-ms <end minus start> --file <that raw file>`.
  Foreground, because a background agent's completion notice goes to the main session, not to you, and you would wait for a reply that never arrives. The Gemini command keeps running in the background meanwhile, so nothing is lost.
- Then wait for the Gemini command to finish before judging.
  If `save` rejects the answer, spawn the worker once more. If it fails twice, record the failure in the round folder as `v<V>.<lane>.failed.txt` and continue without that lane.

**3. Judge, per lane, per sample.** The gemini lane runs several samples per version (`samples` in `config.json`); the other lanes run one. For each lane that has a saved answer for every version, and for each sample k of that lane (just once, without `--sample`, on a single-sample lane):

```
evo judge-input --round R --lane <lane> --sample k
```

It prints a path. Spawn an agent with the `judge` settings from `config.json`, whose prompt is: "Read the file at <path> and do exactly what it says. Return only the JSON object." Spawn all judges of a round in one go, in the foreground, so every reply comes straight back to you. Write each reply verbatim to `<round folder>/judge.<lane>[.sk].raw.txt`, then:

```
evo save-judge --round R --lane <lane> --sample k --file <that raw file>
```

The judge never learns which version is which. The tool unblinds when it saves, and on a sampled lane it rebuilds the lane's mean score from the samples saved so far.

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
