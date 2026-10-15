// Experiment state machine. Every transition is persisted by the runner before
// the next job is emitted, so an interrupted run resumes from the last state
// and never repeats a completed call (the caches make repeats no-ops anyway).

export type State =
  | "BASELINE"      // champion generating + scoring on Set A (also after PROMOTE, as a re-baseline)
  | "OPTIMIZING"    // one optimizer job out
  | "LINTING"       // challenger received, lint + length + protected-parts checks
  | "GENERATING"    // challenger generations out (and extra samples for both on retest)
  | "EVALUATING"    // rubric jobs out
  | "COMPARING"     // blind jobs out
  | "DECIDING"      // gate runs in code
  | "PROMOTED"
  | "REBASELINING"  // fresh samples for the new champion
  | "RETESTING"
  | "REJECTED"
  | "KEPT"          // inconclusive, champion retained
  | "ESCALATED"
  | "VALIDATING"    // outer loop on Set B
  | "RELEASED"
  | "ROLLED_BACK"
  | "EXPERIMENTAL"  // failed to pass validation but not a regression; kept as a branch
  | "STOPPED"
  | "NEEDS_HUMAN";

export type Event =
  | "baseline_done" | "optimizer_done" | "lint_ok" | "lint_failed" | "generated" | "evaluated" | "compared"
  | "promote" | "retest" | "reject" | "keep" | "escalate" | "rebaselined"
  | "validate" | "pass" | "fail" | "inconclusive" | "stop" | "human";

const T: Record<State, Partial<Record<Event, State>>> = {
  BASELINE:     { baseline_done: "OPTIMIZING", stop: "STOPPED" },
  OPTIMIZING:   { optimizer_done: "LINTING", stop: "STOPPED" },
  LINTING:      { lint_ok: "GENERATING", lint_failed: "OPTIMIZING", stop: "STOPPED" },
  GENERATING:   { generated: "EVALUATING", stop: "STOPPED" },
  EVALUATING:   { evaluated: "COMPARING", stop: "STOPPED" },
  COMPARING:    { compared: "DECIDING", stop: "STOPPED" },
  DECIDING:     { promote: "PROMOTED", retest: "RETESTING", reject: "REJECTED", keep: "KEPT", escalate: "ESCALATED", human: "NEEDS_HUMAN" },
  PROMOTED:     { rebaselined: "REBASELINING", validate: "VALIDATING", optimizer_done: "LINTING", stop: "STOPPED" },
  REBASELINING: { baseline_done: "OPTIMIZING", validate: "VALIDATING", stop: "STOPPED" },
  RETESTING:    { generated: "EVALUATING", stop: "STOPPED" },
  REJECTED:     { optimizer_done: "LINTING", stop: "STOPPED" },
  KEPT:         { optimizer_done: "LINTING", stop: "STOPPED" },
  ESCALATED:    { optimizer_done: "LINTING", stop: "STOPPED", human: "NEEDS_HUMAN" },
  VALIDATING:   { pass: "RELEASED", fail: "ROLLED_BACK", inconclusive: "EXPERIMENTAL", stop: "STOPPED" },
  RELEASED:     { optimizer_done: "LINTING", stop: "STOPPED" },
  ROLLED_BACK:  { baseline_done: "OPTIMIZING", optimizer_done: "LINTING", stop: "STOPPED" },
  EXPERIMENTAL: { optimizer_done: "LINTING", validate: "VALIDATING", stop: "STOPPED" },
  STOPPED:      {},
  NEEDS_HUMAN:  { optimizer_done: "LINTING", stop: "STOPPED" },
};

export function transition(state: State, event: Event): State {
  const next = T[state]?.[event];
  if (!next) throw new Error(`invalid transition: ${state} --${event}-->`);
  return next;
}

export function canTransition(state: State, event: Event): boolean {
  return Boolean(T[state]?.[event]);
}

/** States in which jobs may be outstanding; on resume the runner re-emits only the jobs whose outputs are missing. */
export const JOB_STATES: ReadonlySet<State> = new Set(["BASELINE", "OPTIMIZING", "GENERATING", "EVALUATING", "COMPARING", "REBASELINING", "RETESTING", "VALIDATING"]);

/** Terminal outcomes of one iteration, for the ledger and the stop rules. */
export const ITERATION_OUTCOMES: ReadonlySet<State> = new Set(["PROMOTED", "REJECTED", "KEPT", "ESCALATED"]);

export interface StopConfig { maxIterationsPerSession: number; maxCallsPerSession: number; consecutiveNonPromotions: number; consecutiveEscalations: number }

export function stopReason(
  s: { iterations: number; calls: number; outcomes: State[] }, cfg: StopConfig,
): string | null {
  if (s.iterations >= cfg.maxIterationsPerSession) return `max iterations (${cfg.maxIterationsPerSession})`;
  if (s.calls >= cfg.maxCallsPerSession) return `max calls (${cfg.maxCallsPerSession})`;
  const recent = s.outcomes.slice(-cfg.consecutiveNonPromotions);
  if (recent.length === cfg.consecutiveNonPromotions && recent.every((o) => o !== "PROMOTED")) return `plateau: ${cfg.consecutiveNonPromotions} iterations without a promotion`;
  const esc = s.outcomes.slice(-cfg.consecutiveEscalations);
  if (esc.length === cfg.consecutiveEscalations && esc.every((o) => o === "ESCALATED")) return `repeated escalation: the limitation is not in the prompt`;
  return null;
}
