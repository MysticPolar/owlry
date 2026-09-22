# Testing the council in Claude Code (no API key)

Every production model call becomes one Claude Code subagent call. Nothing touches the Claude API directly;
the run is covered by your Claude Code plan.

## Setup (once, ~2 minutes)

```bash
deno run --allow-read --allow-write --allow-env scripts/build_agents.ts
```

This generates, from the production prompts in `supabase/functions/council/prompts.ts`:

- `.claude/agents/council-caster.md` (sonnet) · `council-screen.md` (haiku) · `council-forge.md` (sonnet) ·
  `council-mind.md` (sonnet) · `council-summarizer.md` (haiku)
- `.claude/commands/council.md` — the `/council` orchestration

Re-run it whenever you edit `prompts.ts`. To change default models:
`COUNCIL_MODEL_MIND_ALIAS=opus COUNCIL_MODEL_FAST_ALIAS=haiku deno run ... scripts/build_agents.ts`.

## Run

Open Claude Code in the repo root and type:

```
/council "How does an AI consumer product achieve product-market fit? And how should I do go-to-market for it?" --category career --situation "Solo founder, pre-launch, 400 on a waitlist, no paid channel"
```

Optional: `--turns 6`, `--mind opus`, `--fast sonnet`.

Claude Code casts, screens, forges any missing card into `council/minds/<slug>.json` (cached for later runs),
runs the turns one subagent at a time, summarizes, and writes `council/runs/<date>-<slug>.md`.

Budget: 13–15 subagent calls, roughly 8–20 minutes per question depending on the model. Subagent wall
times are not production latency (production is ≈ 2.5 s per turn); use them only to compare runs.

## Scoring a run

For each run file, mark the cast `apt / cute / wrong` and note: number of `shift`/`concede` moves, whether
the split in the summary is real, and whether the books are the ones you would want opened. Ten runs across
the six categories is enough to tell whether the cast prompt needs work.

## Manual mode (what this repo's example run used)

`scripts/turn.ts` renders each turn's exact task message from a `council/runs/state.json` and parses replies
back into it, so the orchestrator (you or Claude Code) never retypes prompts:

```bash
deno run -A scripts/turn.ts next            # prints the next mind's full input
deno run -A scripts/turn.ts add reply.txt   # records the mind's reply + POSITION tail
```

See `council/runs/20260922-pmf-gtm-ai-consumer.md` for a complete run produced this way.

## Seeing results

- Harness runs: `deno run --allow-read --allow-write scripts/view_runs.ts`, then open `council/runs/index.html`.
- Deployed function: open `test/council.html` in a browser (or `npx serve test`), paste the project URL and anon
  key, sign in with a test user (Supabase Dashboard → Authentication → Users → Add user, with a password),
  ask. The page streams the cast card, bubbles, summary and a timing panel (council card, first words, per-turn
  generation time, summary, total) — real production latency. Every session also lands in `council_sessions`,
  `council_turns` (with `usage` and `latency_ms`) and `council_summaries`, readable in the Table Editor.
