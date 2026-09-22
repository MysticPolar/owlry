# Council run — 2026-09-22 10:59 UTC

Harness: Claude Code subagents in fallback mode (general-purpose agents with the council-*.md bodies prepended; cast/forge/minds on Sonnet, screen/summary on Haiku). No API key used.

**Question:** How does an AI consumer product achieve product-market fit? And how should I do go-to-market for it?

**Situation:** Solo founder, pre-launch, 400 on a waitlist, no paid channel yet

**Category:** career · **Kind:** strategy

**Tension:** Whether to validate carefully before scaling or scale fast to seize network-effect timing

## Council

- **Eric Ries** (living) — Wrote 'The Lean Startup' — validated learning and MVPs to find real product-market fit · lens: What's the smallest experiment that proves real demand exists · The Lean Startup
- **Reid Hoffman** (living) — Coined 'blitzscaling'; also wrote 'Impromptu' on building AI products at speed · lens: When timing and network effects justify scaling before certainty · Blitzscaling
- **Seth Godin** (living) — Author of 'This Is Marketing' — find your smallest viable audience, skip paid ads · lens: Who exactly this is for, and how trust spreads · This Is Marketing

## Discussion

**1 · Eric Ries** — The Lean Startup's build-measure-learn loop says product-market fit isn't declared, it's measured: you need a minimum viable product in front of those 400 people that puts a real hypothesis at risk, not a demo that just collects more signups. Before any go-to-market spend, convert a slice of that waitlist into a paid or committed-use cohort. If they won't act now, you don't have demand, you have curiosity, and no channel fixes that.

`POSITION: Ship an MVP to convert waitlist signups into paid commitments before any go-to-market spend | MOVE: hold | OPEN: what counts as a valid commitment signal`

**2 · Reid Hoffman** — Eric's right that curiosity isn't demand, but his fix — convert a slice to paid before any GTM — treats an AI consumer product like a point solution you validate slowly. If usage and feedback loops are where the value compounds, the embarrassing v1 belongs in front of all 400 now, not a sampled cohort. Payment proves willingness; usage proves the network is forming. At this stage I'd rather learn the second thing faster.

`POSITION: Ship the embarrassing v1 to the full 400 now, not a paid sample | MOVE: hold | OPEN: how small can v1 be and still show network effects`

**3 · Seth Godin** — Reid says usage across all 400 teaches the network signal faster than a paid slice — but usage without permission just produces noise, not a tribe. Those 400 didn't all ask for the same thing; find the tightest cluster among them, the ten who'd feel a hole if the product vanished, and build only for them. If those ten don't tell three friends unprompted, you don't have product-market fit, you have a mailing list.

`POSITION: Find the smallest cluster of 400 who'd feel a hole if you vanished, serve only them. | MOVE: hold | OPEN: how to identify which ten feel that hole`

**4 · Eric Ries** — Seth's point that my "convert a slice to paid" averages across all 400 and misses the real cluster is the one that lands — undifferentiated cohorts hide the signal. I shift on that. But his test stays a hypothesis until priced: don't ask if the ten would feel a hole, charge them this week. Unprompted referral plus payment is the actual falsifiable MVP.

`POSITION: Find the ten-person cluster first, then charge them — don't just ask if they'd miss it | MOVE: shift | OPEN: how to identify the cluster from waitlist signup data alone`

**5 · Reid Hoffman** — Eric and Seth's merged test — charge the ten this week — is the one that damages my "usage across all 400" claim, and I concede the "all 400" part: blasting an unfinished product at an undifferentiated list just measures reach, not network formation. But a single payment from AI-curious users is still cheap; the real blitzscaling signal is whether those ten return unprompted in week two without a nudge from you.

`POSITION: Charge the ten this week, but count week-two unprompted return use, not the payment | MOVE: shift | OPEN: what counts as "unprompted" return usage`

**6 · Seth Godin** — Reid's point that return-in-week-two beats my friend-test as the real signal damages my claim - he's right that retention proves the product holds under use, which a referral count never tested. I shift: price it, then watch for return before counting mouths. But return without referral only proves a good tool; a tribe still needs someone recruited unprompted too.

`POSITION: Price the ten this week, then require both retention and unprompted referral for fit | MOVE: shift | OPEN: how long to wait for the referral signal`

**7 · Eric Ries** — Seth's claim that return without referral only proves a good tool, not a tribe, is right — so test both. This week, price it for the ten highest-signal names on your waitlist, not all 400. Measure payment now, and unprompted return in two weeks. That's the real MVP.

`POSITION: Charge the ten highest-signal names this week; track payment plus unprompted week-two return | MOVE: hold | OPEN: how to identify the ten highest-signal names`

**8 · Reid Hoffman** — Segment the 400 today, pull your ten highest-signal names — those who replied, asked questions, or engaged most — and ship them the embarrassing v1 with a price attached by Friday. Track two numbers only: who pays this week, who returns unprompted in week two. Build no channel until both hold.

`POSITION: Price the v1 for your ten highest-signal waitlist names this week | MOVE: hold | OPEN: what price signals real commitment`

**9 · Seth Godin** — Segment the 400 today: pull the ten who already replied, asked questions, or engaged most. Ship them the priced, embarrassing v1 by Friday. Track exactly two numbers — who pays this week, who returns unprompted in week two — and build no channel, no landing page, no waitlist push until both come back true.

`POSITION: Price the v1 for your ten highest-signal names by Friday; track payment and week-two unprompted return | MOVE: hold | OPEN: how long to wait if only one signal holds`

## Summary

### Validate product-market fit for your AI product with early signals

**What they agree on**
- Waitlist signups show curiosity, not demand—need real commitment signal.
- The 400 is too broad; segment to ten highest-engagement users.
- Charge the ten this week; measure payment plus week-two return.

**Where they differ**
- Seth says unprompted referral proves tribe-fit; Eric and Reid rest on payment plus return. It comes down to whether you need organic word-of-mouth as a fit signal or payment and retention suffice—both can be right: referral validates tribe-building (Seth), while payment and return validate launch readiness (Eric, Reid).

**What fits your situation**
From Eric: charge the ten; measure payment and unprompted week-two return. From Reid: segment the 400, identify the ten who replied, asked, engaged most, ship priced v1 by Friday. From Seth: both signals must hold—no channels until payment and week-two return are confirmed.

**One next step**
Segment your 400 today, identify ten highest-engagement names, ship priced v1 by Friday.

**The books behind the conversation**
- *The Lean Startup* — Eric Ries · Build-measure-learn loop validates hypotheses with real commitments, not feedback (Eric Ries)
- *Blitzscaling* — Reid Hoffman · Rapid deployment measures network effects and unprompted user return (Reid Hoffman)
- *Tribes: We Need You to Lead Us* — Seth Godin · Find smallest tribe who feel a hole and recruit unprompted (Seth Godin)

## Timings (subagent wall seconds; includes Claude Code overhead, not production latency)

| step | s |
|---|---|
| cast | 94.4 |
| screen | 8.9 |
| forge Eric Ries | 34.8 |
| forge Reid Hoffman | 37.5 |
| forge Seth Godin | 32.1 |
| turn 1 | 4.2 |
| turn 2 | 8 |
| turn 3 | 12.2 |
| turn 4 | 6.9 |
| turn 5 | 7.4 |
| turn 6 | 49.2 |
| turn 7 | 14.9 |
| turn 8 | 6.8 |
| turn 9 | 6.8 |
| summary | 93.3 |
| total (cast + screen + slowest forge + turns + summary) | 350.5 |

Production estimate for the same run: cast ≈ 3 s, forge (cold, parallel) ≈ 15 s, turns ≈ 2.5 s each, summary ≈ 3 s.

## Verification

- Cast: Eric Ries — "Wrote 'The Lean Startup' — validated learning and MVPs to find real product-market fit"; Reid Hoffman — "Coined 'blitzscaling'; also wrote 'Impromptu' on building AI products at speed"; Seth Godin — "Author of 'This Is Marketing' — find your smallest viable audience, skip paid ads"
- Screen: Eric Ries ok=true, Reid Hoffman ok=true, Seth Godin ok=true
- Tails parsed: 9/9
- Word counts (cap 80 for cycle 1, 60 after): 72 / 74 / 74 / 63! / 72! / 59 / 48 / 51 / 54 — over cap on turns 4,5
- Moves: 3 shift/concede (Eric Ries t4 shift, Reid Hoffman t5 shift, Seth Godin t6 shift); holds: 6
- Summary sections: agree=yes, differ=yes, fits=yes, next_step=yes, books=yes; books 3 for 3 minds (one per mind)
- Note: summarizer returned differ as a string
- Note: summarizer wrapped JSON in code fences
