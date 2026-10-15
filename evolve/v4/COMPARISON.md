# Comparison: the two v4.1 packages, and what v4.2 takes from each

Two packages were written against the same v4.1 draft: `owlry-evo-v4.1` (prompts, contracts, schemas, no code; "theirs" below) and `evo-v4.1` (briefs, runner modules, tests; "mine"). v4.2 is the merge. Every row names what v4.2 does and why.

## 1. The gate, on one shared noise model

Both gates were simulated on the same latent-quality model (per-sample rubric sd 3.11 as measured on rounds 3–11; blind votes correlated with latent quality; 18% ties). `tools/gate_stats2.py`, 100k runs per cell.

| rule | false promote (δ=0) | detects +2 | detects +3 | detects +4 | calls per iteration |
|---|---|---|---|---|---|
| theirs: 5 pairs, ≥4 question wins and mean Δ ≥ 1.0, up to 2 targeted extra pairs | 9.2% | 45% | 67% | 84% | 22 |
| mine: 10 pairs ≥8, else +5 → ≥11, rubric guard | 4.4% | 47% | 77% | 94% | 45 |
| **v4.2: mine + rubric mean Δ ≥ +0.5 required to promote** | **3.5%** | **47%** | **77%** | **94%** | **47** |

Theirs is cheaper and its targeted retest is efficient; it promotes a null challenger one time in eleven. With their rule to reuse the promoted samples as the next baseline, every false promotion also inflates the bar for the next challenger. v4.2 spends twice the calls to halve the false-promotion rate and detect a +3 three times in four, and takes their idea that the rubric must agree in direction (it costs no power and removes a fifth of the false promotions).

## 2. Component by component

| component | theirs | mine | v4.2 |
|---|---|---|---|
| Starting champion | the round-12 v2 prompts, labelled unvalidated | the original prompt (Sonnet unchanged = the 76.57 control; Gemini + basis plumbing) | **mine as v0; theirs as the first manual challenger** (`evo4 challenge`), so the gate chooses the champion |
| Samples per question | 1, plus up to 2 targeted extra pairs | 2, plus 1 more per question on retest | **2 + 1** (table above) |
| Baseline after a promotion | reuse the winning bundle; refresh after 5 comparisons | re-draw fresh samples | **re-draw, and refresh after 5 comparisons** (both: winner's curse +1.2 under null; a long-lived bundle gets fitted) |
| Rubric evaluator output | 35 cells with ids, severity, anchor flag; no totals; findings with statuses; runner computes points with Decimal | criteria with points computed by the model; symptoms with turn evidence; mechanical patterns; question-type reading | **theirs' contract + mine's content**: cells/ids/severity/anchor, no totals, finding statuses, plus `symptoms`, `mechanical`, `question_type_note`; runner computes points in integer hundredths (`runner/scoring.ts`) |
| The 9–10 band | kept the judge.v2 rule: 9 needs "none" and ★ (0 of 2,170 Gemini cells ever reached it) | minor weakness with ★ may reach 9.49 | **mine**: the owner's band text says 9–10 = no *material* weakness; the brief's cell rule was stricter than the matrix it serves |
| Grounding | four finding statuses; unverified ≠ fabrication; cap only on established triggers; an unresolved material concern blocks promotion pending an evidence adapter | fabricated basis format and pd=false quotes as deterministic critical failures; suspected misattribution as a symptom | **theirs' statuses and cap rule; mine's blocking rule**: without an evidence adapter, suspected concerns rate C2.3 but never block, or the Gemini lane freezes (66 of 241 old judge notes were sourcing) |
| Optimizer actions | propose / no_change / escalate; cause_type; exact ordered edits that must reproduce the candidate; protected spans byte-identical | kind (DELETE/ABLATE/REPLACE/REWRITE/ADD); targets; expected delta; minimum effect size; ablation cadence; ledger binding; lane profiles | **both**: their contract and validation (`runner/edits.ts`, `runner/spans.ts`, `runner/challenger.ts`), my evidence rules, kinds, ablation every third iteration, ledger binding, lane profiles as observations |
| Protected spans | whole of section 3 protected | prose list in config, no check | **spans checked by code, list narrowed**: protecting all of section 3 would have frozen the "(verified URL)" / "chapter or section" wording that produced an invented chapter in every round-12 Gemini basis; v4.2 protects the quotation rule, the pd field, the format line and, on Gemini, the basis plumbing fix |
| Length | 1900 ceiling and 10% growth | 1900 ceiling only | **both** (growth ≠ change size; a REPLACE can be large without growing) |
| Blind judge | winner/margin, paired locations, best-of each side, concerns with statuses, contamination rule | lens priority order, explicit anti-template list | **theirs' output contract; mine's lens order and template list** |
| Overfitting guards | optimizer promises; Set B wall; Set B reuse limit 3 | topicality lint in code; form metrics; re-baseline | **all**: lint, metrics, re-baseline, Set B wall and reuse limit, canary test |
| Question records | `intent`, `conversation_history` | `type` (decision/exploratory), curated `topicWords` | **all four fields** |
| Set B | five newly drafted texts, runner-only | the schema-2 holdout ids with a pool | **their texts in `runner-only/setB.json`, the holdout ids as the pool** |
| Aggregation | question-weighted means; a missing judge result is not a tie; INCOMPLETE state | pair tally; sequential stages | **pair tally decides** (balanced by design), question tally reported; missing verdict = missing pair; incomplete panel keeps the champion |
| Runner | prose contract, 18 fixtures to write | TypeScript modules + 30 tests + CLI skeleton | **code**: 41 tests, type-checked, their fixtures mapped (README 11) |
| Orchestrator | "existing agent adapter", fresh context per call | dispatcher brief for subagent-only models | **dispatcher**, both lineages in one batch |
| Lineages | separate registries | separate directories | **separate prompts, champions, baselines, optimizer calls and gates; shared sets, evaluator, judge, caches; one `evo4 next` for both** |
| Stop rules | 10 iterations, 4 non-promotions, 3 same-hypothesis failures | 30 iterations, 6 non-promotions, escalation bans | **mine**: at 47% power, four consecutive misses of a working optimizer happen 8% of the time |
| Gemini settings | temperature 0.9, Explore agent type kept | 0.5, general-purpose | **mine** (variance is the enemy of every comparison; the worker writes, so the general agent) |
| Targets | report-only milestones 70 / 90 | none; stop on plateau | **none**; the capability report replaces the milestone as the capability measure |

## 3. What is new in v4.2 that neither package had

- **Parallel lineages with one evaluator**: both workers run on the same Set A under the same rubric and judge versions; the runner keeps them apart everywhere a decision is made and together everywhere a comparison is informative.
- **Capability report** (`runner/capability.ts`, `evo4 capability [--blind]`): per-cell rating gap between the two champions, per-question and per-criterion gaps, optional cross-lane blind pairs; cells where one worker trails by ≥ 2.0 on every question are capability-bound. The trailing lineage's optimizer receives the numbers (never the other prompt or transcripts) and treats those cells as `cause_type: model`.
- **Champion selection by the gate**: v0 (original) is bootstrapped, the round-12 v2 is entered with `evo4 challenge`, and the first decision of each lineage is the control experiment the old loop never ran.
- **Deterministic checks handed to the evaluator** (schema and membership, turns outside the word range, pd=false quotation marks, fabricated basis), so an evaluator never has to count.

## 4. What was left out, deliberately

- Their source-evidence adapter and "unresolved concern blocks promotion": correct in principle, but with no retrieval it would stop the Gemini lane on its first challenger. Re-enable when an evidence adapter exists (`evaluation.sourceEvidence`).
- Their 3,600-second per-lineage elapsed budget: a Sonnet iteration is 15–20 minutes; budgets are per session in v4.2 (`stop`).
- My `confidence` field on verdicts: their `margin` carries the same information with a tie constraint the schema can check.
- Their Set B `B-health-01` and `B-purpose-01` are near-duplicates of questions judged in rounds 5 and 8. The new optimizer never sees those logs, so they stay; the pool holds the bank's own held-out ids for the first rotation.
