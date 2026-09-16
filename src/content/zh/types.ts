/* ============================================================
   Shapes of the Chinese content overrides (src/content/zh/*). English in
   src/content stays the source of truth — ids, seat structure, books,
   verified quotes; these carry the words a Chinese reader sees. Verified
   quotes are not replaced: they keep their original text and gain a
   gloss, which the UI shows under them marked as a translation.
   ============================================================ */
import type { Segment } from '../../store/types';
import type { Figure } from '../types';

export interface FigureZh {
  /** Chinese rendering of the name and the short form the others use in chat */
  name: string;
  short: string;
  role: string;
  label: string;
  bio: string;
  /** titles parallel to `works` (a title with no established Chinese edition can stay English) */
  works?: (string | undefined)[];
  /** glosses parallel to `quotes` */
  quotes?: string[];
  voice: Figure['voice'];
}

export interface BookZh {
  title: string;
  authorName: string;
  tags: string[];
  blurb: string;
  /** gloss for the epigraph quote */
  quote?: string;
  summary: { gist: string; ideas: string[] };
  start: { label: string; title: string; why: string };
  text: { heading: string; note: string; paragraphs: string[] };
}

export interface SeatZh {
  why: string;
  bookWhy: string;
  r1: Segment[];
  r2: Segment[];
  f1?: Segment[];
  f2?: Segment[];
  ctx?: Segment[];
  direct?: Segment[][];
  differs: string;
}

export interface CouncilZh {
  question: string;
  title: string;
  /** Chinese keywords, added to the English ones for the free-text matcher */
  keywords: string[];
  seats: [SeatZh, SeatZh, SeatZh];
  alternates: [SeatZh[], SeatZh[], SeatZh[]];
  takeaways: { commonGround: string; fits: string; nextStep: string };
}

export interface AreaZh {
  title: string;
  tagline: string;
  /** parallel to the English suggestions */
  suggestions: string[];
}
