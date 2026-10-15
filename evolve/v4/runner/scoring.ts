// Runner-computed scores. The evaluator returns 35 ratings and no totals; the
// runner turns them into points with rubric-map.json, exactly, and applies the
// 89.99 cap only on established triggers. Arithmetic is done in integer
// hundredths of a rating (a rating 7.25 is 725) so that no float drift reaches
// a decision; display rounding happens once, at the end.

import type { RawCell, RubricCard, RubricRaw } from "./types.ts";

export interface RubricMap { version: string; criteria: { id: string; name: string; max_points: number; cells: { id: string; name: string; max_points: number }[] }[] }

export interface RawValidation { ok: boolean; problems: string[] }

/** Structural and rule checks the schema cannot fully express across cells. */
export function validateRaw(raw: RubricRaw, map: RubricMap): RawValidation {
  const problems: string[] = [];
  const expected = map.criteria.flatMap((c) => c.cells.map((s) => s.id));
  const cells = Array.isArray(raw?.cells) ? raw.cells : [];
  if (cells.length !== 35) problems.push(`cells: ${cells.length}, expected 35`);
  cells.forEach((c, i) => {
    if (c.id !== expected[i]) problems.push(`cell ${i + 1}: id ${c.id}, expected ${expected[i]}`);
    if (typeof c.rating !== "number" || c.rating < 0 || c.rating > 10) problems.push(`${c.id}: rating out of range`);
    // tolerant: 8.3 * 100 is 830.0000000000001 in IEEE doubles, and 135 of the 1001 legal two-decimal ratings fail an exact test
    if (Math.abs(c.rating * 100 - Math.round(c.rating * 100)) > 1e-6) problems.push(`${c.id}: more than two decimals`);
    if (c.limitation_severity === "material" && c.rating > 6.99) problems.push(`${c.id}: material weakness but rating ${c.rating}`);
    if (c.limitation_severity === "minor" && !c.excellent_anchor_met && c.rating > 8.99) problems.push(`${c.id}: minor weakness without the anchor but rating ${c.rating}`);
    if (c.limitation_severity === "minor" && c.excellent_anchor_met && c.rating > 9.49) problems.push(`${c.id}: minor weakness with anchor but rating ${c.rating}`);
    if (c.limitation_severity === "none" && !c.excellent_anchor_met && c.rating > 8.99) problems.push(`${c.id}: no anchor evidence but rating ${c.rating}`);
    if (c.rating >= 9 && !c.excellent_anchor_met) problems.push(`${c.id}: 9+ without the anchor`);
    if ((c.limitation_severity === "none") !== (c.limitation?.trim().toLowerCase() === "none")) problems.push(`${c.id}: severity and limitation text disagree`);
  });
  if (!Array.isArray(raw?.symptoms) || raw.symptoms.length < 3 || raw.symptoms.length > 5) problems.push("symptoms: 3 to 5 required");
  for (const s of raw?.symptoms ?? []) if (!expected.includes(s.cell_id)) problems.push(`symptom cell_id ${s.cell_id} unknown`);
  for (const cr of raw?.cap_reasons ?? []) {
    const f = raw.findings?.[cr.finding_index];
    if (!f) problems.push(`cap_reason ${cr.reason}: finding_index ${cr.finding_index} missing`);
    else if (!["observed", "supported_by_evidence"].includes(f.status)) problems.push(`cap_reason ${cr.reason}: finding is ${f.status}, not established`);
  }
  for (const f of raw?.findings ?? []) if (f.status === "supported_by_evidence" && !(f.evidence_ids?.length)) problems.push(`finding at ${f.location}: supported_by_evidence without evidence ids`);
  return { ok: problems.length === 0, problems };
}

const CAP = 8999; // 89.99 in hundredths

/** Points from ratings. cell points = rating/10 × cell max; integer hundredths throughout. */
export function scoreCard(raw: RubricRaw, map: RubricMap): RubricCard {
  const byId = new Map(raw.cells.map((c) => [c.id, c] as const));
  let uncappedH = 0;
  const criteria = map.criteria.map((c) => {
    const sub = c.cells.map((cell) => {
      const r = byId.get(cell.id) as RawCell;
      // rating in hundredths × max_points in hundredths / 1000 → points in hundredths (rating/10 × max)
      const pointsH = Math.round((Math.round(r.rating * 100) * Math.round(cell.max_points * 100)) / 1000);
      return { id: cell.id, name: cell.name, rating: r.rating, points: pointsH / 100, example: r.example, limitation: r.limitation, severity: r.limitation_severity, anchorMet: r.excellent_anchor_met, _h: pointsH };
    });
    const pointsH = sub.reduce((a, s) => a + s._h, 0);
    uncappedH += pointsH;
    return { id: c.id, name: c.name, max: c.max_points, points: pointsH / 100, sub: sub.map(({ _h, ...s }) => s) };
  });
  const established = (raw.cap_reasons ?? []).filter((cr) => ["observed", "supported_by_evidence"].includes(raw.findings?.[cr.finding_index]?.status ?? ""));
  const capReason = established.length ? established.map((c) => c.reason).join(", ") : null;
  const scoreH = capReason ? Math.min(uncappedH, CAP) : uncappedH;
  return {
    criteria,
    uncapped: uncappedH / 100,
    score: scoreH / 100,
    capReason,
    provisional: raw.evaluation_status === "provisional_truncated",
    strengths: raw.strengths ?? [], weaknesses: raw.weaknesses ?? [],
    symptoms: raw.symptoms ?? [], mechanical: raw.mechanical ?? [],
    findings: raw.findings ?? [], rubricFitNotes: raw.rubric_fit_notes ?? [], questionTypeNote: raw.question_type_note,
    safety: (raw.findings ?? []).some((f) => f.type === "safety" && f.severity === "critical") ? { flagged: true, reason: "critical safety finding" } : undefined,
  };
}

/** Points lost per cell over a set of cards, sorted descending: the optimizer's target list. */
export function pointsLost(cards: RubricCard[]): { id: string; name: string; criterion: string; max: number; meanRating: number; meanPoints: number; lost: number }[] {
  const acc = new Map<string, { name: string; criterion: string; max: number; r: number; p: number; n: number }>();
  for (const c of cards) for (const cr of c.criteria) for (const s of cr.sub) {
    const a = acc.get(s.id) ?? { name: s.name, criterion: cr.name, max: cr.max / cr.sub.length, r: 0, p: 0, n: 0 };
    a.r += s.rating; a.p += s.points; a.n++; acc.set(s.id, a);
  }
  return [...acc.entries()].map(([id, a]) => ({ id, name: a.name, criterion: a.criterion, max: a.max, meanRating: a.r / a.n, meanPoints: a.p / a.n, lost: a.max - a.p / a.n })).sort((x, y) => y.lost - x.lost);
}
