import type { Debate, RubricCard, RubricRaw, RawCell, PairResult, BlindVerdict, LedgerEntry } from "../runner/types.ts";

const words = (n: number, seed: string) => Array.from({ length: n }, (_, i) => `${seed}${i}`).join(" ");

/** A structurally valid 9-turn debate with no formula markers. */
export function cleanDebate(): Debate {
  const minds = [
    { title: "The Experimenter", concern: "testing one thing at a time", author: "John Stuart Mill", book: "A System of Logic", year: 1843 },
    { title: "The Subtractor", concern: "removing before adding", author: "Nassim Nicholas Taleb", book: "Antifragile", year: 2012 },
    { title: "The Story Skeptic", concern: "the vivid suspect", author: "Daniel Kahneman", book: "Thinking, Fast and Slow", year: 2011 },
  ];
  const turn = (i: number) => {
    const m = minds[i % 3];
    return { speaker: m.title, text: `Plainly put, ${words(32, "w")}.`, author: m.author, book: m.book, pd: m.year < 1931, basis: `Basis: ${m.author}, ${m.book}` };
  };
  return { situation: "You started three things at once and now one of them hurts.", minds, debate: Array.from({ length: 9 }, (_, i) => turn(i)), clearer: "Calm first, then isolate.", dependsOn: "If it fades when you stop, reintroduce one at a time." };
}

/** The same debate filled with the old slot formulas and plumbing faults. */
export function roteDebate(): Debate {
  const d = cleanDebate();
  d.debate[1].text = "The Experimenter mentions stopping everything, but perhaps you might not isolate the culprit if you maybe reintroduce too fast, if at all. " + words(10, "r");
  d.debate[4].text = "Dropping the claim that a single product is to blame, I now hold the narrower claim that it might be the combination. " + words(12, "r");
  d.debate[6].text = "You might ask yourself which matters more, clarity or comfort? Perhaps reread the first chapter of my book. " + words(12, "r");
  d.debate[7].text = 'Short "quoted" turn here.';                       // pd=false with quotation marks, and under 25 words
  d.debate[7].basis = "[Basis: Nassim Nicholas Taleb, Antifragile, Chapter 4](https://example.org)";  // fabricated section + link
  d.debate[8].text = "The user should wait 3 weeks. " + words(20, "r");  // third person
  return d;
}

export function card(score: number, perCriterion?: number[], targets: Record<string, number> = {}): RubricCard {
  const maxes = [20, 20, 10, 20, 10, 10, 10];
  const names = ["Quality of discussion", "Quality of disagreement, trust and grounding", "Personal relevance", "Constructive self-discovery", "Decision usefulness", "Clarity and engagement", "Drama and entertainment"];
  const pts = perCriterion ?? maxes.map((m) => (score / 100) * m);
  const criteria = names.map((name, i) => ({
    id: `C${i + 1}`, name, max: maxes[i], points: pts[i],
    sub: Array.from({ length: 5 }, (_, k) => {
      const id = `C${i + 1}.${k + 1}`;
      const sub = `${name.split(" ")[0]} sub ${k + 1}`;
      const rating = targets[sub] ?? targets[id] ?? (pts[i] / maxes[i]) * 10;
      return { id, name: sub, rating, points: (rating / 10) * (maxes[i] / 5), example: "", limitation: "none", severity: "none" as const, anchorMet: rating >= 9 };
    }),
  }));
  const uncapped = criteria.reduce((a, c) => a + c.points, 0);
  return { criteria, uncapped, score: Math.min(uncapped, 89.99), capReason: null, provisional: false, strengths: [], weaknesses: [], symptoms: [], mechanical: [], findings: [], rubricFitNotes: [] };
}

/** A raw evaluator output (schema shape) with every cell at `rating`, optionally overriding some cells. */
export function rawCard(rating: number, overrides: Record<string, Partial<RawCell>> = {}, extra: Partial<RubricRaw> = {}): RubricRaw {
  const cells: RawCell[] = [];
  for (let c = 1; c <= 7; c++) for (let k = 1; k <= 5; k++) {
    const id = `C${c}.${k}`;
    cells.push({ id, name: CELL_NAMES[id], rating, example: "T1", limitation: rating >= 9 ? "none" : "minor: T2 restates", limitation_severity: rating >= 9 ? "none" : "minor", excellent_anchor_met: rating >= 9, ...(overrides[id] ?? {}) });
  }
  return { schema_version: "rubric-evaluator-4.2.0", rubric_version: "owlry-matrix-v2-bands", evaluation_status: "complete", cells, strengths: ["a", "b", "c"], weaknesses: ["a", "b", "c"], findings: [], cap_reasons: [], rubric_fit_notes: [], symptoms: [{ cell_id: "C1.1", turns: [2], observed: "x", evidence: "" }, { cell_id: "C2.3", turns: [4], observed: "y", evidence: "" }, { cell_id: "C7.2", turns: [8], observed: "z", evidence: "" }], mechanical: [], question_type_note: "", ...extra };
}

export const CELL_NAMES: Record<string, string> = {
  "C1.1": "Continuity and responsiveness", "C1.2": "Development of ideas", "C1.3": "Exploration of central tensions", "C1.4": "Integration of perspectives", "C1.5": "Progress toward understanding",
  "C2.1": "Faithful engagement", "C2.2": "Substance of challenges", "C2.3": "Accuracy and support", "C2.4": "Calibration and transparency", "C2.5": "Intellectual honesty and revision",
  "C3.1": "Identification of the actual concern, including ambiguity about what the user is really asking", "C3.2": "Meaningful use of personal context", "C3.3": "Fit with goals and values", "C3.4": "Attention to constraints and stakes", "C3.5": "Responsiveness to information",
  "C4.1": "Clarification of desires and motivations", "C4.2": "Examination of assumptions", "C4.3": "Clarification of values and priorities", "C4.4": "Recognition of fears and outside expectations", "C4.5": "Agency and reflective ownership",
  "C5.1": "Definition of the decision and options, including waiting, learning more, or a limited step", "C5.2": "Explanation of tradeoffs in terms that matter to the user; no option treated as costless", "C5.3": "Identification of decisive conditions", "C5.4": "Treatment of uncertainty", "C5.5": "Proportionate next steps that follow from the analysis and fit the constraints",
  "C6.1": "Accessible language", "C6.2": "Traceable arguments and references", "C6.3": "Manageable pacing and turn length", "C6.4": "Distinguishable positions and voices, with explicit changes of position", "C6.5": "Economy and sustained attention",
  "C7.1": "Meaningful stakes and tension arising from the issue itself", "C7.2": "Surprise and reversals that stay plausible. ★ A reversal the text traces to an earlier turn's argument, naming what changed the speaker's mind. A change of position with no stated cause is a template, not a reversal", "C7.3": "Personality and expressive voice without caricature", "C7.4": "Memorable delivery", "C7.5": "Anticipation and emotional movement, with varied rhythm rather than constant intensity",
};

export const RUBRIC_MAP = {
  version: "owlry-matrix-v2-bands",
  criteria: [
    { id: "C1", name: "Quality of discussion", max_points: 20, cells: [1, 2, 3, 4, 5].map((k) => ({ id: `C1.${k}`, name: CELL_NAMES[`C1.${k}`], max_points: 4 })) },
    { id: "C2", name: "Quality of disagreement, trust and grounding", max_points: 20, cells: [1, 2, 3, 4, 5].map((k) => ({ id: `C2.${k}`, name: CELL_NAMES[`C2.${k}`], max_points: 4 })) },
    { id: "C3", name: "Personal relevance", max_points: 10, cells: [1, 2, 3, 4, 5].map((k) => ({ id: `C3.${k}`, name: CELL_NAMES[`C3.${k}`], max_points: 2 })) },
    { id: "C4", name: "Constructive self-discovery", max_points: 20, cells: [1, 2, 3, 4, 5].map((k) => ({ id: `C4.${k}`, name: CELL_NAMES[`C4.${k}`], max_points: 4 })) },
    { id: "C5", name: "Decision usefulness", max_points: 10, cells: [1, 2, 3, 4, 5].map((k) => ({ id: `C5.${k}`, name: CELL_NAMES[`C5.${k}`], max_points: 2 })) },
    { id: "C6", name: "Clarity and engagement", max_points: 10, cells: [1, 2, 3, 4, 5].map((k) => ({ id: `C6.${k}`, name: CELL_NAMES[`C6.${k}`], max_points: 2 })) },
    { id: "C7", name: "Drama and entertainment", max_points: 10, cells: [1, 2, 3, 4, 5].map((k) => ({ id: `C7.${k}`, name: CELL_NAMES[`C7.${k}`], max_points: 2 })) },
  ],
};

export function pairs(wins: number, n: number, ties = 0): PairResult[] {
  const out: PairResult[] = [];
  for (let i = 0; i < n; i++) {
    const credit: 0 | 0.5 | 1 = i < wins ? 1 : i < wins + ties ? 0.5 : 0;
    const championSlot: "A" | "B" = i % 2 ? "A" : "B";
    const challengerSlot = championSlot === "A" ? "B" : "A";
    const winner = credit === 1 ? challengerSlot : credit === 0.5 ? "tie" : championSlot;
    const verdict: BlindVerdict = { winner, margin: winner === "tie" ? "none" : "small_but_meaningful", reason: "", comparisons: [], best_of_a: "", best_of_b: "", concerns: [] };
    out.push({ q: (i % 5) + 1, sample: Math.floor(i / 5) + 1, championSample: "c", challengerSample: "x", championSlot, verdict, challengerWon: credit });
  }
  return out;
}

export function ledgerEntry(targets: string[], outcome: LedgerEntry["outcome"]): LedgerEntry {
  return { id: "exp", lineage: "gemini", version: "v9", base: "v8", kind: "ADD", hypothesis: { statement: "", targets, expectedDelta: 3, mechanism: "", refutedIf: "" }, diffSummary: "", outcome, wins: 4, pairs: 10, pValue: 0.5, rubricMeanDelta: 0, perCategoryDelta: {}, cardsAfter: "", at: "" };
}
