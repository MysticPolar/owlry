// Shared types for the v4.1 runner. Pure TypeScript, no Deno or Node APIs.

export type Lane = "gemini" | "sonnet";
export type QuestionType = "decision" | "exploratory";

export interface Question {
  idx: number;
  id: string;
  category: "Health" | "Wealth" | "Love" | "Purpose" | "Wonder";
  type: QuestionType;
  label?: string;
  intent?: string;         // finer label from the set file (decision, troubleshooting, self_reflection, explanation …); informational
  text: string;
  conversation_history?: string[];   // earlier turns of the product conversation, when the question has any
  topicWords?: string[];   // curated words the topicality lint rejects in a challenger (sets/setA.json)
}

export interface Mind { title: string; concern: string; author: string; book: string; year: number }
export interface Turn { speaker: string; text: string; author: string; book: string; pd: boolean; basis: string }
export interface Debate {
  situation: string;
  minds: Mind[];
  debate: Turn[];
  clearer: string;
  dependsOn: string;
}

export interface FormMetrics {
  turns: number;
  words: number;
  meanWordsPerTurn: number;
  shortTurns: number;          // under wordsPerTurn.min
  longTurns: number;           // over wordsPerTurn.max
  hedges: number;              // maybe | perhaps | might | if
  hedgeDensity: number;        // per 100 words
  bannedCertainty: number;     // must | clearly | always | obviously
  templatedOpeners: number;    // "The <Role> claims/notes/… " openers
  slotMarkers: number;         // "I drop…", "reread", "which matters more" …
  questionsToUser: number;     // turns with a "?" addressed to "you"
  theUser: number;             // third-person "the user"
  pdFalseQuoteTurns: number;   // quotation marks in a pd=false turn
  fabricatedBasisTurns: number;// chapter/section/page/URL in basis when the worker cannot browse
  distinctSpeakers: number;
  distinctBooks: number;
}

export interface Validity { ok: boolean; problems: string[] }

/** What the Rubric Evaluator returns (schemas/rubric.output.schema.json): ratings only, no totals. */
export interface RawCell { id: string; name: string; rating: number; example: string; limitation: string; limitation_severity: "none" | "minor" | "material"; excellent_anchor_met: boolean }
export interface Finding { type: "source_error" | "unsupported_claim" | "safety" | "format" | "unverified_grounding" | "rubric_mismatch"; severity: "minor" | "material" | "critical"; status: "observed" | "suspected" | "unverified" | "supported_by_evidence"; location: string; description: string; evidence_ids: string[] }
export interface Symptom { cell_id: string; turns: number[]; observed: string; evidence: string }
export interface RubricRaw {
  schema_version: string; rubric_version: string; evaluation_status: "complete" | "provisional_truncated";
  cells: RawCell[]; strengths: string[]; weaknesses: string[]; findings: Finding[];
  cap_reasons: { reason: string; finding_index: number }[]; rubric_fit_notes: string[];
  symptoms: Symptom[]; mechanical: { pattern: string; turns: number[] }[]; question_type_note: string;
}

/** The runner-scored card: points computed in code from the 35 ratings and rubric-map.json. */
export interface SubCell { id: string; name: string; rating: number; points: number; example: string; limitation: string; severity: "none" | "minor" | "material"; anchorMet: boolean }
export interface Criterion { id: string; name: string; max: number; points: number; sub: SubCell[] }
export interface RubricCard {
  criteria: Criterion[];
  uncapped: number;
  score: number;
  capReason: string | null;        // established cap triggers only (observed or supported_by_evidence findings)
  provisional: boolean;            // evaluation_status === provisional_truncated; never authorizes a promotion
  strengths: string[];
  weaknesses: string[];
  symptoms: Symptom[];
  mechanical: { pattern: string; turns: number[] }[];
  findings: Finding[];
  rubricFitNotes: string[];
  questionTypeNote?: string;
  safety?: { flagged: boolean; reason?: string };
}

/** What the Blind Judge returns (schemas/blind.output.schema.json). */
export interface BlindVerdict {
  schema_version?: string;
  winner: "A" | "B" | "tie";
  margin: "clear" | "small_but_meaningful" | "none";
  reason: string;
  comparisons: { aspect: string; a_location: string; a_observation: string; b_location: string; b_observation: string; advantage: "A" | "B" | "tie"; why_it_matters: string }[];
  best_of_a: string;
  best_of_b: string;
  concerns: { side: "A" | "B" | "both"; type: "grounding" | "safety" | "format" | "uncertainty"; severity: "minor" | "material" | "critical"; status: "observed" | "suspected" | "unverified" | "supported_by_evidence"; location: string; description: string; evidence_ids: string[] }[];
}

export interface PairResult {
  q: number;
  sample: number;
  championSample: string;    // gen cache key
  challengerSample: string;  // gen cache key
  championSlot: "A" | "B";   // randomized by the runner
  verdict: BlindVerdict;
  challengerWon: 0 | 0.5 | 1;
}

export type Decision = "PROMOTE" | "RETEST" | "REJECT" | "KEEP" | "ESCALATE";
export type ReleaseDecision = "PASS" | "FAIL" | "INCONCLUSIVE";

export interface Hypothesis {
  statement: string;
  targets: string[];
  expectedDelta: number;
  mechanism: string;
  refutedIf: string;
}

/** What the Optimizer returns (schemas/optimizer.output.schema.json). */
export interface OptimizerOutput {
  schema_version: string;
  action: "propose" | "no_change" | "escalate";
  parent_prompt_id: string;
  kind: "DELETE" | "ABLATE" | "REPLACE" | "REWRITE" | "ADD" | null;
  hypothesis: {
    problem: string; cause_type: "prompt" | "model" | "source" | "architecture" | "evaluation" | "uncertain"; mechanism: string;
    proposed_change: string; expected_observations: string[]; falsification_condition: string; regression_risk: string;
    targets: string[]; expected_delta: number;
  };
  evidence: { question_id: string; job_id: string; location: string; observation: string }[];
  candidate_system_prompt: string | null;
  edits: Edit[];
  blocked: string[];
  next_system_action: string | null;
  change_summary: string;
}
export interface Edit { operation: "add" | "replace" | "delete" | "restructure"; before: string; after: string; reason: string }

/** The runner's own record of an accepted challenger (what the ledger and version files carry). */
export interface Challenger {
  version: string;
  kind: "DELETE" | "ABLATE" | "REPLACE" | "REWRITE" | "ADD";
  hypothesis: Hypothesis;
  diff: { before: string; after: string }[];
  prompt: string;
  wordCount: { before: number; after: number };
  risks: string[];
  blocked: string[];
  changelog: string;
}

export interface LedgerEntry {
  id: string;                  // exp-012
  lineage: string;
  version: string;             // challenger version
  base: string;                // champion version it challenged
  kind: Challenger["kind"];
  hypothesis: Hypothesis;
  diffSummary: string;
  outcome: Decision | `RETEST→${Decision}`;
  wins: number;
  pairs: number;
  pValue: number;              // binomial upper tail under p = 0.5
  rubricMeanDelta: number;
  perCategoryDelta: Record<string, number>;
  cardsAfter: string;          // one line: what the cards said about the targets afterwards
  reason?: string;             // the inner-loop gate's reason (e.g. "critical: …"); never anything from a Set B validation
  at: string;                  // ISO time
}

export interface GateConfig {
  stage1: { pairs: number; promoteWins: number; rejectWins: number };
  stage2: { addPairs: number; promoteWins: number; rejectWins: number };
  tieWeight: number;
  promoteMinMeanDelta: number;     // the rubric must agree in direction before a blind win promotes (their rule, softened)
  regression: { maxMeanDrop: number; maxCriterionDropFraction: number };
  critical: { maxInvalidTranscripts: number; maxFabricatedBasisTurns: number; maxPdFalseQuoteTurns: number; maxSafetyFlags: number };
  escalate: { sameTargetFailures: number; banIterations: number };
}

export interface ValidationConfig {
  everyPromotions: number;
  samplesPerQuestion: number;
  pass: { minWins: number; ofPairs: number; minMeanDelta: number };
  fail: { maxWins: number; orMeanDeltaBelow: number };
  inconclusiveAddSamples: number;
  inconclusivePass: { minWins: number; ofPairs: number };
  rotateSetBOnPass: number;
}
