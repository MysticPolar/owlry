/* ============================================================
   The council registry: which scripted council answers which question,
   what each interest area suggests, and the matcher for free-text asks.
   ============================================================ */
import type { Area, CouncilScript } from '../types';
import { DISCIPLINE, CAREER, FAILURE, GOOD_LIFE } from './councils-1';
import { HEALTH, INVESTING, RELATIONSHIPS, LITERATURE } from './councils-2';

export const COUNCILS: CouncilScript[] = [DISCIPLINE, CAREER, FAILURE, GOOD_LIFE, HEALTH, INVESTING, RELATIONSHIPS, LITERATURE];
const BY_ID = new Map(COUNCILS.map((c) => [c.id, c]));

export function council(id: string): CouncilScript {
  const c = BY_ID.get(id);
  if (!c) throw new Error(`unknown council: ${id}`);
  return c;
}

export interface AreaMeta {
  id: Area;
  title: string;
  tagline: string;
  councilId: string;
  suggestions: { text: string; councilId: string }[];
}

export const AREAS: AreaMeta[] = [
  {
    id: 'health',
    title: 'Health',
    tagline: 'A healthier, happier you',
    councilId: 'health',
    suggestions: [
      { text: 'Why can’t I stick to healthy habits?', councilId: 'health' },
      { text: 'How can I be more disciplined?', councilId: 'discipline' },
      { text: 'What is a good life?', councilId: 'good-life' },
    ],
  },
  {
    id: 'career',
    title: 'Career',
    tagline: 'Build what matters',
    councilId: 'career',
    suggestions: [
      { text: 'What does a meaningful career look like?', councilId: 'career' },
      { text: 'How do I handle failure?', councilId: 'failure' },
      { text: 'How can I be more disciplined?', councilId: 'discipline' },
    ],
  },
  {
    id: 'investing',
    title: 'Investing',
    tagline: 'Make wiser decisions',
    councilId: 'investing',
    suggestions: [
      { text: 'How should I start investing?', councilId: 'investing' },
      { text: 'How do I handle a big loss?', councilId: 'failure' },
      { text: 'How do I stop wanting more?', councilId: 'good-life' },
    ],
  },
  {
    id: 'relationships',
    title: 'Relationships',
    tagline: 'Deeper connections',
    councilId: 'relationships',
    suggestions: [
      { text: 'How do I build deeper relationships?', councilId: 'relationships' },
      { text: 'What is a good life?', councilId: 'good-life' },
      { text: 'How do I handle rejection?', councilId: 'failure' },
    ],
  },
  {
    id: 'literature',
    title: 'Literature',
    tagline: 'A richer mind',
    councilId: 'literature',
    suggestions: [
      { text: 'How do I get more out of reading?', councilId: 'literature' },
      { text: 'What is a good life?', councilId: 'good-life' },
      { text: 'What does a meaningful career look like?', councilId: 'career' },
    ],
  },
  {
    id: 'other',
    title: 'Other',
    tagline: 'Tell us what’s on your mind',
    councilId: 'good-life',
    suggestions: [
      { text: 'How can I be more disciplined?', councilId: 'discipline' },
      { text: 'What does a meaningful career look like?', councilId: 'career' },
      { text: 'How do I handle failure?', councilId: 'failure' },
      { text: 'What is a good life?', councilId: 'good-life' },
    ],
  },
];

export function areaMeta(id: Area): AreaMeta {
  return AREAS.find((a) => a.id === id) ?? AREAS[AREAS.length - 1];
}

/** suggestions for the council room: the chosen areas' questions, de-duplicated, poster order when none chosen */
export function suggestionsFor(areas: Area[]): { text: string; councilId: string }[] {
  const picked = areas.length ? areas : ['other' as Area];
  const seen = new Set<string>();
  const out: { text: string; councilId: string }[] = [];
  for (const a of picked) {
    for (const s of areaMeta(a).suggestions) {
      if (seen.has(s.text)) continue;
      seen.add(s.text);
      out.push(s);
    }
  }
  return out.slice(0, 4);
}

/**
 * Pick the council for a free-text question: keyword hits weighted by
 * specificity, a small bonus for the reader's chosen areas, and a sensible
 * default when nothing matches.
 */
export function matchCouncil(question: string, areas: Area[]): CouncilScript {
  const qn = question.toLowerCase();
  let best: CouncilScript | null = null;
  let bestScore = 0;
  for (const c of COUNCILS) {
    let score = 0;
    for (const k of c.keywords) {
      if (qn.includes(k)) score += 1 + Math.min(k.length, 12) / 6;
    }
    if (score > 0 && areas.includes(c.area)) score += 1.5;
    if (score > bestScore) {
      best = c;
      bestScore = score;
    }
  }
  if (best) return best;
  const first = areas[0];
  return first ? council(areaMeta(first).councilId) : GOOD_LIFE;
}
