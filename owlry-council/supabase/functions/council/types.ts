export type Cycle = "positions" | "pressure" | "application" | "reply";
export type Move = "hold" | "shift" | "concede";

export interface Book {
  title: string;
  author: string;
  year?: number | null;
  read_free?: string | null; // Project Gutenberg / Standard Ebooks link when the work is public domain
  buy?: string | null; // Google Books info link otherwise
}

export interface Card {
  school: string;
  lens: string;
  core_ideas: string[];
  claims_for: string[];
  claims_against: string[];
  blind_spots: string[];
  voice: { rules: string[]; samples: string[] };
}

/** A row of public.council_minds — one per great mind, forged on first use and cached. */
export interface Mind {
  slug: string;
  name: string; // the figure's name, as shown on the bubble
  lived: string | null; // "121–180" | "1955–2011" | "living"
  field: string | null;
  lens: string;
  card: Card;
  books: Book[];
}

/** What the reader sees on the council card; stored on the session. */
export interface Seat {
  seat: 1 | 2 | 3;
  slug: string;
  name: string;
  lived: string | null;
  lens: string;
  why: string; // the specific work or idea that makes this mind fit this question
  intro: string;
  books: Book[];
}

export interface Tail {
  position: string;
  move: Move;
  open: string | null;
}

export interface Turn {
  turn: number;
  speaker: string; // mind slug or 'reader'
  cycle: Cycle;
  text: string;
  tail?: Tail;
}

export interface SummaryBook {
  mind: string;
  title: string;
  author: string;
  why: string;
  access: "read_free" | "buy";
  url?: string | null;
}

export interface Summary {
  title: string;
  agree: string[];
  differ: string[];
  fits: string;
  next_step: string;
  books: SummaryBook[];
}

export interface CastSeat {
  seat: 1 | 2 | 3;
  name: string;
  lived: string;
  field: string;
  lens: string;
  why: string;
  books: Array<{ title: string; author: string }>;
}

export interface CastResult {
  kind: string; // decision | diagnosis | strategy | meaning | habit | relationship | craft
  tension: string; // the disagreement hiding inside the question
  seats: CastSeat[];
  opening_seat: 1 | 2 | 3;
}

export interface ScreenResult {
  verdicts: Array<{ name: string; ok: boolean; reason: string }>;
}

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
}
