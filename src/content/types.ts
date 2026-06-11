/* ============================================================
   owlry — content types.
   Field names mirror the mockup's data objects verbatim (t, a, c,
   s, q, n, g, ...) so the content modules read as a faithful,
   reviewable port of the source of truth. These modules are the
   seam a live backend / model would later replace.
   ============================================================ */

export type BookId =
  | 'gentle' | 'snow' | 'piranesi' | 'goldfinch' | 'pachinko' | 'tranq' | 'cuckoo'
  | 'rose' | 'hail' | 'circe' | 'sleep' | 'kindred' | 'remains' | 'spqr' | 'beach'
  | 'oldman' | 'none' | 'wws' | 'medit' | 'deep' | 'atomic' | 'pema' | 'frankl' | 'bird';

/** Books that the owl can write a reading letter for. */
export type GuideId = 'wws' | 'medit' | 'deep' | 'atomic' | 'pema' | 'frankl' | 'bird';

export type Genre = 'history' | 'fiction' | 'scifi' | 'mystery' | 'romance' | 'life';

/** A catalog entry — the mockup's `B` (core) merged with `BMETA` (about-sheet). */
export interface Book {
  /** title */
  t: string;
  /** author */
  a: string;
  /** cover background color */
  c: string;
  /** cover text color (defaults to #E8E0BC) */
  tc?: string;
  /** spine label; may contain <br> line breaks */
  s: string;
  /** short italic tagline */
  q: string;
  /** page count */
  n: number;
  /** genre */
  g: Genre;
  /** about-sheet: goodreads-style rating */
  r?: string;
  /** about-sheet: book intro */
  i?: string;
  /** about-sheet: who the author is */
  w?: string;
}

export interface GuideQuote {
  t: string;
  by: string;
}

export interface GuideInsight {
  /** insight title */
  t: string;
  /** the reasoning / idea */
  r: string;
  /** an example "from the book" */
  ex: string;
  /** an optional short, confidently-genuine quote */
  q?: GuideQuote;
}

export interface GuideFurther {
  id: BookId;
  why: string;
}

/** A reading letter. The full GUIDES content *is* the v1 owl product. */
export interface Guide {
  /** chat line; contains a {{b}} placeholder for the linked book title */
  say: string;
  /** resonance line — names the feeling the reader arrived with */
  res: string;
  /** recommended chapter */
  chap: string;
  /** the core idea */
  core: string;
  /** insights from the chapter */
  ins: GuideInsight[];
  /** closing reflection */
  close: string;
  /** "take with you" */
  take: string[];
  /** "to sit with" */
  ask: string[];
  /** further reading */
  fr: GuideFurther[];
}
