/* ============================================================
   The council registry: which scripted council answers which question,
   what each interest area suggests, and the matcher for free-text asks.
   ============================================================ */
import type { Area, CouncilScript, SeatScript, AltScript } from '../types';
import { DISCIPLINE, CAREER, FAILURE, GOOD_LIFE } from './councils-1';
import { HEALTH, INVESTING, RELATIONSHIPS, LITERATURE } from './councils-2';
import { isZh } from '../../i18n';
import { COUNCILS_ZH } from '../zh/councils';
import { AREAS_ZH } from '../zh/areas';
import type { SeatZh } from '../zh/types';

export const COUNCILS: CouncilScript[] = [DISCIPLINE, CAREER, FAILURE, GOOD_LIFE, HEALTH, INVESTING, RELATIONSHIPS, LITERATURE];
const BY_ID = new Map(COUNCILS.map((c) => [c.id, c]));

/* the Chinese rendering of a script: seat by seat, the override's words over the English source */
function seatZh<T extends SeatScript | AltScript>(s: T, z: SeatZh | undefined): T {
  if (!z) return s;
  return {
    ...s,
    why: z.why,
    bookWhy: z.bookWhy,
    r1: z.r1,
    r2: z.r2,
    ...(z.f1 ? { f1: z.f1 } : {}),
    ...(z.f2 ? { f2: z.f2 } : {}),
    ...(z.ctx ? { ctx: z.ctx } : {}),
    ...(z.direct ? { direct: z.direct } : {}),
    differs: z.differs,
  };
}
const ZH_CACHE = new Map<string, CouncilScript>();
function localized(c: CouncilScript): CouncilScript {
  const hit = ZH_CACHE.get(c.id);
  if (hit) return hit;
  const z = COUNCILS_ZH[c.id];
  const out: CouncilScript = z
    ? {
        ...c,
        question: z.question,
        title: z.title,
        keywords: [...c.keywords, ...z.keywords],
        seats: [seatZh(c.seats[0], z.seats[0]), seatZh(c.seats[1], z.seats[1]), seatZh(c.seats[2], z.seats[2])],
        alternates: [0, 1, 2].map((i) => c.alternates[i].map((a, j) => seatZh(a, z.alternates[i]?.[j]))) as CouncilScript['alternates'],
        takeaways: z.takeaways,
      }
    : c;
  ZH_CACHE.set(c.id, out);
  return out;
}

export function council(id: string): CouncilScript {
  const c = BY_ID.get(id);
  if (!c) throw new Error(`unknown council: ${id}`);
  return isZh() ? localized(c) : c;
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
      { text: 'Why do I keep breaking promises to myself?', councilId: 'health' },
      { text: 'Is discipline a trait, or a daily decision?', councilId: 'discipline' },
      { text: 'What does it mean to live well?', councilId: 'good-life' },
    ],
  },
  {
    id: 'career',
    title: 'Career',
    tagline: 'Build what matters',
    councilId: 'career',
    suggestions: [
      { text: 'What work would I do if no one applauded?', councilId: 'career' },
      { text: 'What is this failure trying to teach me?', councilId: 'failure' },
      { text: 'Why don’t I do what I know I should?', councilId: 'discipline' },
    ],
  },
  {
    id: 'investing',
    title: 'Investing',
    tagline: 'Make wiser decisions',
    councilId: 'investing',
    suggestions: [
      { text: 'Am I investing, or gambling with hope?', councilId: 'investing' },
      { text: 'How do I take a loss without losing myself?', councilId: 'failure' },
      { text: 'How much is enough?', councilId: 'good-life' },
    ],
  },
  {
    id: 'relationships',
    title: 'Relationships',
    tagline: 'Deeper connections',
    councilId: 'relationships',
    suggestions: [
      { text: 'Do I love people, or just need them?', councilId: 'relationships' },
      { text: 'What does it mean to live well?', councilId: 'good-life' },
      { text: 'Can I be rejected without being diminished?', councilId: 'failure' },
    ],
  },
  {
    id: 'literature',
    title: 'Literature',
    tagline: 'A richer mind',
    councilId: 'literature',
    suggestions: [
      { text: 'How do I read so a book actually changes me?', councilId: 'literature' },
      { text: 'How much is enough?', councilId: 'good-life' },
      { text: 'What work is worth a whole life?', councilId: 'career' },
    ],
  },
  {
    id: 'other',
    title: 'Other',
    tagline: 'Tell us what’s on your mind',
    councilId: 'good-life',
    suggestions: [
      { text: 'Why don’t I do what I know I should?', councilId: 'discipline' },
      { text: 'What work would I do if no one applauded?', councilId: 'career' },
      { text: 'What is this failure trying to teach me?', councilId: 'failure' },
      { text: 'What does it mean to live well?', councilId: 'good-life' },
    ],
  },
];

/** the areas in the interface language (suggestion texts parallel to the English ones) */
export function areasList(): AreaMeta[] {
  if (!isZh()) return AREAS;
  return AREAS.map((a) => {
    const z = AREAS_ZH[a.id];
    return z ? { ...a, title: z.title, tagline: z.tagline, suggestions: a.suggestions.map((s, i) => ({ ...s, text: z.suggestions[i] ?? s.text })) } : a;
  });
}

export function areaMeta(id: Area): AreaMeta {
  const list = areasList();
  return list.find((a) => a.id === id) ?? list[list.length - 1];
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
  for (const base of COUNCILS) {
    const c = council(base.id);
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
