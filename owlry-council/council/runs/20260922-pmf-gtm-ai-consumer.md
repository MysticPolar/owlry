# Council run — 2026-09-22 10:07 UTC

Harness: Claude Code subagents (cast/forge/minds on Sonnet, screen/summary on Haiku). No API key used.

**Question:** How does an AI consumer product achieve product-market fit? And how should I do go-to-market for it?

**Situation:** Solo founder, pre-launch, about 400 people on a waitlist, no paid channel yet.

**Category:** career · **Kind:** strategy

**Tension:** Engineer growth with systematic experiments, or win a few users' love by hand?

## Council

- **Sean Ellis** (living) — Coined 'growth hacking' and the 40%-disappointed survey that tests real product-market fit. · lens: Whether users would be very disappointed to lose the product · Hacking Growth
- **Clayton Christensen** (1952–2020) — Built Jobs-to-Be-Done theory: products win by being hired for a genuine job. · lens: What real job the product is actually hired to do · Competing Against Luck
- **Paul Graham** (living) — Wrote 'Do Things That Don't Scale,' the playbook for a startup's first users. · lens: Whether a handful of users truly love the product · Do Things That Don't Scale

## Discussion

**1 · Sean Ellis** — The product market fit survey I built for Qualaroo, and later laid out with Morgan Brown in Hacking Growth, exists for exactly this moment. Your 400-person waitlist is not a funnel, it's a lab. Ship a working version to fifty of them this week, then ask how disappointed they'd be to lose it. AI demos fake engagement easily through novelty, so don't trust usage, trust that survey. Below 40 percent very disappointed, skip go-to-market entirely and keep iterating the product.

`POSITION: Survey your 400 waitlist users for 40% very-disappointed before any go-to-market spend | MOVE: hold | OPEN: what if novelty inflates the survey score too`

**2 · Clayton Christensen** — Sean says trust the 40 percent disappointed survey over usage data, and he's right that novelty fakes engagement. But the survey score without the circumstance behind it is just a number. Before you ship to those fifty, ask each one what job they hired your waitlist signup to do — what were they struggling with the moment before they typed their email. Segment the disappointed answers by that circumstance, not by user, or you'll optimize for the wrong average customer.

`POSITION: Segment the 40% survey by the circumstance that made people sign up, not by user | MOVE: hold | OPEN: how many distinct jobs is too many to serve`

**3 · Paul Graham** — Sean's right that the disappointment survey beats usage data — novelty fakes engagement every time. But he treats it as a broadcast: ship to fifty, then measure from a distance. That's backwards for a solo founder. Pick fifteen off your waitlist, get each one on a call, watch them use it live, fix what stalls them that day. The 40 percent number matters less than knowing, firsthand, why the other sixty shrugged. Go-to-market isn't the question yet.

`POSITION: Onboard 15 waitlist users by hand, one call each, before any go-to-market spend | MOVE: hold | OPEN: How many hand-onboarded users are enough to trust`

**4 · Sean Ellis** — My broadcast-then-measure framing took the worst hit. Graham's right that watching fifteen people live beats surveying fifty from a distance — a solo founder isn't Dropbox with a growth team. I concede that framing. But keep the number: run the survey inside those calls, segmented by Christensen's job-before-signup, not averaged. No channel spend until segmented-disappointed clears 40.

`POSITION: Interview 15 waitlisters now, embed the survey in the calls, gate channel spend on segmented-disappointed clearing 40 percent | MOVE: shift | OPEN: whether go-to-market prep can start before 40 percent`

**5 · Clayton Christensen** — Graham's plan to fix each call's product live threatens my segmentation — a patched build isn't the same offering twice. I hold: segment by the job the caller hired your signup to do before they ever saw a build; that circumstance survives the fix. Name three hypothesized jobs before you start calling, or you'll rebuild around whoever you watched last.

`POSITION: Pre-name three hypothesized jobs before the calls; segment by job, not by build shown | MOVE: hold | OPEN: how to pick the right three jobs`

**6 · Paul Graham** — Christensen's right that fixing live during calls breaks his segmentation — the offering isn't fixed across calls anymore. Fine: Do Things That Don't Scale never promised clean data, it promised users who love the product. Skip his three-job segmentation. Find whichever job makes even three of fifteen callers light up, kill the rest, build only for that group. That's your go-to-market.

`POSITION: Fix the product live in fifteen calls; find the one job that delights any three, build only for it | MOVE: hold | OPEN: whether three delighted callers justifies killing the other two jobs`

**7 · Sean Ellis** — Graham's right: find whichever job makes three of fifteen light up, build only for that group. He skips confirming it — run my survey inside just that surviving cohort. First move: call fifteen waitlisters this week, watch a live build, keep the job that clusters three-plus "very disappointed," kill the rest. No spend until that cohort clears 40.

`POSITION: Call fifteen waitlisters live, find the job clustering three-plus very disappointed, hold spend till 40 | MOVE: shift | OPEN: what happens if no job clears three of fifteen`

**8 · Clayton Christensen** — Sean's first move is right: call fifteen this week. Write down the three jobs you think that signup was hired for tonight, before you dial, or you'll build for whoever you liked talking to Thursday. Watch live, and let the disappointed answers cluster around one of those jobs before you touch a channel.

`POSITION: Write three hypothesized jobs tonight, then call the fifteen this week | MOVE: hold | OPEN: none`

**9 · Paul Graham** — Christensen and Ellis converged on one move: write three hypothesized jobs tonight, then call fifteen waitlisters yourself this week and watch each use a working build live. Do that first — a solo founder's real lab is his own attention, not a survey at a distance. Any channel spend waits on what those calls show.

`POSITION: Tonight, write three hypothesized jobs; this week call fifteen waitlisters yourself and watch them live | MOVE: hold | OPEN: none`

## Summary

### How to validate AI product-market fit before spending on go-to-market

**What they agree on**
- AI novelty fakes engagement; measure user disappointment, not usage metrics
- Call fifteen waitlisters this week; watch them use the product live before any channel spend
- Pre-name three hypothesized customer jobs before calling to avoid building for whoever you liked

**Where they differ**
- Ellis gates spend on 40% very-disappointed per job segment; Graham trusts observing three delighted users. It comes down to whether you need statistical confidence before committing, or trust founder observation of authentic love — both can work if you observe first (Graham), then quantify (Ellis).

**What fits your situation**
Tonight, write three hypothesized jobs for why those 400 signed up (Christensen's discipline). This week, call fifteen of them, watch them use your product live (Graham's founder insight). Track which job makes most say 'very disappointed' to lose it (Ellis's validation bar) before spending on channels.

**One next step**
Tonight, write three hypothesized customer jobs. This week, call and watch fifteen waitlisters use your product live.

**The books behind the conversation**
- *Hacking Growth* — Sean Ellis and Morgan Brown · Describes the product-market fit survey this founder should run this week
- *Competing Against Luck* — Clayton Christensen · Grounds the three jobs hypotheses in the jobs-to-be-done framework for segmentation
- *Do Things That Don't Scale* — Paul Graham · Emphasizes direct founder attention over distant measurement in product discovery

## Timings (subagent wall seconds; includes Claude Code overhead, not production latency)

| step | s |
|---|---|
| cast | 397.8 |
| screen | 5.8 |
| forge Sean Ellis | 197.9 |
| forge Clayton Christensen | 170.4 |
| forge Paul Graham | 197.8 |
| turn 1 | 21.6 |
| turn 2 | 26.3 |
| turn 3 | 42.4 |
| turn 4 | 84.5 |
| turn 5 | 87.6 |
| turn 6 | 114.8 |
| turn 7 | 51.5 |
| turn 8 | 67 |
| turn 9 | 51.8 |
| summary | 98.8 |

Production estimate for the same run: cast ≈ 3 s, forge (cold, parallel) ≈ 15 s, turns ≈ 2.5 s each, summary ≈ 3 s.

## Notes

- Matching: 3/3 apt (Ellis: PMF survey; Christensen: JTBD; Graham: first users by hand). Bench used: 2 of 3 (Ellis came from outside the bench).
- Moves: 2 shifts (Ellis, turns 4 and 7), both naming the argument that moved them. Cycle 3 converged on one action; the remaining split (quantify vs observe) is conditional.
- Word counts: 80/80/77 · 57/60/61 · 58/53/55 — inside the caps.
- Forge listed two non-books (Qualaroo, GrowthHackers.com) as works for Ellis; production book verification drops these.
- Summarizer returned `differ` as a string; the server now normalizes lists.
