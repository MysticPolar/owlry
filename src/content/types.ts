/* ============================================================
   Content model. Everything the council "knows" is data in this folder:
   the figures, their books, and the scripted conversations. The engine in
   src/engine turns these into transcripts; the UI never hard-codes a name.
   ============================================================ */
import type { Segment } from '../store/types';

export type Area = 'health' | 'career' | 'investing' | 'relationships' | 'literature' | 'other';

/** the six spokes of the profile radar (the poster's axes) */
export type Axis = 'philosophy' | 'career' | 'health' | 'investing' | 'relationships' | 'literature';

/** shelf labels in the library */
export type Category =
  | 'Philosophy'
  | 'Self-help'
  | 'Business'
  | 'Psychology'
  | 'Science'
  | 'Literature'
  | 'Investing'
  | 'Relationships'
  | 'Health'
  | 'History';

export interface Quote {
  text: string;
  source: { work: string; loc?: string; url?: string };
  /** a translation shown under the verbatim line when the interface is in another language — never in its place */
  gloss?: string;
}

export interface Figure {
  id: string;
  name: string;
  /** how the others address them in the chat */
  short: string;
  /** one line: who they were/are */
  role: string;
  /** the perspective label under the avatar, e.g. "The Stoic" */
  label: string;
  initials: string;
  color: string;
  /** /portraits/<slug>.jpg when a licensed one exists */
  portrait?: string;
  bio: string;
  works: { title: string; year: string; bookId?: string; url?: string }[];
  /** verbatim, sourced — the only lines the UI renders as direct quotation */
  quotes: Quote[];
  /** generic lines in this figure's voice for unscripted moments. {q} = the user's words, {ctx} = added context, {passage} = a quoted passage, {book} = its book */
  voice: {
    followUp: string[];
    context: string[];
    passage: string[];
    direct: string[];
  };
}

export interface ReadingText {
  kind: 'public-domain' | 'guide';
  heading: string;
  /** shown above the text: translation/provenance, or the "reading guide" disclaimer */
  note: string;
  paragraphs: string[];
}

export interface Book {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  year: number;
  isbn?: string;
  category: Category;
  axes: Axis[];
  tags: string[];
  palette: { bg: string; fg: string };
  blurb: string;
  /** an epigraph-style verbatim line from the book, with its location */
  quote?: Quote;
  summary: { gist: string; ideas: string[] };
  /** the recommended place to begin */
  start: { label: string; title: string; why: string };
  text: ReadingText;
}

/* ---------- scripted councils ---------- */
export interface SeatScript {
  figureId: string;
  /** intro card: why this perspective fits the question */
  why: string;
  bookId: string;
  bookWhy: string;
  bestStart?: boolean;
  /** round one: a distinct idea */
  r1: Segment[];
  /** round two: responds to another seat ({0} {1} {2} = the seats' short names) */
  r2: Segment[];
  /** scripted answers to the first two whole-council follow-ups ({q} = the follow-up) */
  f1?: Segment[];
  f2?: Segment[];
  /** reaction to added context ({ctx}) */
  ctx?: Segment[];
  /** answers when asked directly (cycled) */
  direct?: Segment[][];
  /** the "Key differences" bullet for this seat */
  differs: string;
}

export interface AltScript extends Omit<SeatScript, 'bestStart'> {
  bestStart?: boolean;
}

export interface CouncilScript {
  id: string;
  area: Area;
  question: string;
  /** short topic for the header: "A Conversation on {title}" */
  title: string;
  keywords: string[];
  seats: [SeatScript, SeatScript, SeatScript];
  /** alternates per seat, in order of preference */
  alternates: [AltScript[], AltScript[], AltScript[]];
  takeaways: {
    commonGround: string;
    fits: string;
    nextStep: string;
  };
}
