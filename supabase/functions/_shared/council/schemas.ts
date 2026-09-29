// ============================================================
// owlry — The Council Room: JSON Schemas for the council-chat call.
//
// Same conventions as _shared/schemas.ts: every object sets
// additionalProperties:false and lists all properties as required;
// optional fields are anyOf-with-null. Schemas go to Gemini via
// responseJsonSchema (see _shared/gemini.ts). The TypeScript interfaces
// beside them are kept in lockstep by hand.
//
// The wire shape is the client's `Segment` (src/store/types.ts): a figure
// speaks in text segments, and may set one segment to kind:"quote" ONLY
// when the words are one of the verified quotes in that figure's dossier.
// _shared/council/quotes.ts enforces that after the parse — a "quote" the
// model made up is demoted to plain text, never rendered as a quotation.
// ============================================================

export interface WireSource {
  work: string;
  loc: string | null;
}

export interface WireSegment {
  kind: 'text' | 'quote';
  text: string;
  source: WireSource | null;
  /** set by the quote gate (quotes.ts), never by the model and not in the schema: the words are a dossier quote
   *  the model recalled (mode "figure"), so they render as "attributed", never as "verbatim" */
  attributed?: true;
}

export interface WireLine {
  seat: number;
  segments: WireSegment[];
}

export interface OpenReply {
  intros: string[];
  round1: WireLine[];
  round2: WireLine[];
  takeaways: {
    commonGround: string;
    differences: { seat: number; text: string }[];
    fits: string;
    nextStep: string;
  };
  reading: { seat: number; why: string; bestStart: boolean }[];
}

export interface TurnReply {
  replies: WireLine[];
}

const NULLABLE_STRING = { anyOf: [{ type: 'string' }, { type: 'null' }] } as const;

const SOURCE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['work', 'loc'],
  properties: { work: { type: 'string' }, loc: NULLABLE_STRING },
} as const;

const SEGMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'text', 'source'],
  properties: {
    kind: { type: 'string', enum: ['text', 'quote'] },
    text: { type: 'string' },
    source: { anyOf: [SOURCE_SCHEMA, { type: 'null' }] },
  },
} as const;

const LINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['seat', 'segments'],
  properties: {
    seat: { type: 'integer', minimum: 0, maximum: 2 },
    segments: { type: 'array', minItems: 1, maxItems: 4, items: SEGMENT_SCHEMA },
  },
} as const;

export const OPEN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['intros', 'round1', 'round2', 'takeaways', 'reading'],
  properties: {
    intros: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string' } },
    round1: { type: 'array', minItems: 3, maxItems: 3, items: LINE_SCHEMA },
    round2: { type: 'array', minItems: 3, maxItems: 3, items: LINE_SCHEMA },
    takeaways: {
      type: 'object',
      additionalProperties: false,
      required: ['commonGround', 'differences', 'fits', 'nextStep'],
      properties: {
        commonGround: { type: 'string' },
        differences: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['seat', 'text'],
            properties: { seat: { type: 'integer', minimum: 0, maximum: 2 }, text: { type: 'string' } },
          },
        },
        fits: { type: 'string' },
        nextStep: { type: 'string' },
      },
    },
    reading: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['seat', 'why', 'bestStart'],
        properties: {
          seat: { type: 'integer', minimum: 0, maximum: 2 },
          why: { type: 'string' },
          bestStart: { type: 'boolean' },
        },
      },
    },
  },
} as const;

export const TURN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['replies'],
  properties: {
    replies: { type: 'array', minItems: 1, maxItems: 3, items: LINE_SCHEMA },
  },
} as const;

/* ============================================================
   Minds from the model: the three recall calls (prompts.ts, KNOWLEDGE_*).
   Same conventions. The enums below are the client's Category and Axis
   (src/content/types.ts) spelled out for the schema; keep them in step.
   Property order is generation order — the cheap, certain fields come
   first ("known" above all, so an unknown name ends the card early) and
   the long paraphrase last, after the facts it has to rest on.
   ============================================================ */

export const MIND_CATEGORIES = ['Philosophy', 'Self-help', 'Business', 'Psychology', 'Science', 'Literature', 'Investing', 'Relationships', 'Health', 'History'] as const;
export const MIND_AXES = ['philosophy', 'career', 'health', 'investing', 'relationships', 'literature'] as const;
export type MindCategory = (typeof MIND_CATEGORIES)[number];
export type MindAxis = (typeof MIND_AXES)[number];

/** the model's own confidence in a recalled quote — "exact" is still not "verified"; only the curated catalogue is */
export type QuoteCertainty = 'exact' | 'attributed';
export type QuoteLang = 'en' | 'zh' | 'other';

export interface WireQuote {
  text: string;
  lang: QuoteLang;
  source: WireSource;
  /** a translation into the reader's language when `text` is in another — never a replacement */
  gloss: string | null;
  certainty: QuoteCertainty;
}

const QUOTE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['text', 'lang', 'source', 'gloss', 'certainty'],
  properties: {
    text: { type: 'string' },
    lang: { type: 'string', enum: ['en', 'zh', 'other'] },
    source: SOURCE_SCHEMA,
    gloss: NULLABLE_STRING,
    certainty: { type: 'string', enum: ['exact', 'attributed'] },
  },
} as const;

/* ---------- cast: three real thinkers for a question ---------- */

export interface CastSeat {
  name: string;
  canonicalName: string;
  short: string;
  label: string;
  role: string;
  why: string;
  stance: string;
  book: { title: string; year: string };
}

export interface CastReply {
  title: string;
  seats: CastSeat[];
}

export const CAST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'seats'],
  properties: {
    title: { type: 'string' },
    seats: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'canonicalName', 'short', 'label', 'role', 'why', 'stance', 'book'],
        properties: {
          name: { type: 'string' },
          canonicalName: { type: 'string' },
          short: { type: 'string' },
          label: { type: 'string' },
          role: { type: 'string' },
          why: { type: 'string' },
          stance: { type: 'string' },
          book: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'year'],
            properties: { title: { type: 'string' }, year: { type: 'string' } },
          },
        },
      },
    },
  },
} as const;

/* ---------- figure: a thinker's card ---------- */

export interface FigureReply {
  known: boolean;
  canonicalName: string;
  name: string;
  short: string;
  role: string;
  label: string;
  born: number | null;
  died: number | null;
  bio: string;
  works: { title: string; originalTitle: string; year: string }[];
  quotes: WireQuote[];
  /** templates for the scripted moments; {q} {ctx} {passage} {book} as in src/content/types.ts */
  voice: { followUp: string[]; context: string[]; passage: string[]; direct: string[] };
}

const NULLABLE_INTEGER = { anyOf: [{ type: 'integer' }, { type: 'null' }] } as const;
const LINES = (min: number, max: number) => ({ type: 'array', minItems: min, maxItems: max, items: { type: 'string' } }) as const;

export const FIGURE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['known', 'canonicalName', 'name', 'short', 'role', 'label', 'born', 'died', 'bio', 'works', 'quotes', 'voice'],
  properties: {
    known: { type: 'boolean' },
    canonicalName: { type: 'string' },
    name: { type: 'string' },
    short: { type: 'string' },
    role: { type: 'string' },
    label: { type: 'string' },
    born: NULLABLE_INTEGER,
    died: NULLABLE_INTEGER,
    bio: { type: 'string' },
    works: {
      type: 'array',
      minItems: 0,
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'originalTitle', 'year'],
        properties: { title: { type: 'string' }, originalTitle: { type: 'string' }, year: { type: 'string' } },
      },
    },
    quotes: { type: 'array', minItems: 0, maxItems: 5, items: QUOTE_SCHEMA },
    voice: {
      type: 'object',
      additionalProperties: false,
      required: ['followUp', 'context', 'passage', 'direct'],
      properties: { followUp: LINES(0, 2), context: LINES(0, 1), passage: LINES(0, 1), direct: LINES(0, 1) },
    },
  },
} as const;

/* ---------- book: a book's card and its reading guide ---------- */

export interface BookReply {
  known: boolean;
  canonicalTitle: string;
  canonicalAuthor: string;
  title: string;
  authorName: string;
  year: number;
  category: MindCategory;
  axes: MindAxis[];
  tags: string[];
  blurb: string;
  quote: WireQuote | null;
  summary: { gist: string; ideas: string[] };
  start: { label: string; title: string; why: string };
  guide: { heading: string; paragraphs: string[] };
}

export const BOOK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['known', 'canonicalTitle', 'canonicalAuthor', 'title', 'authorName', 'year', 'category', 'axes', 'tags', 'blurb', 'quote', 'summary', 'start', 'guide'],
  properties: {
    known: { type: 'boolean' },
    canonicalTitle: { type: 'string' },
    canonicalAuthor: { type: 'string' },
    title: { type: 'string' },
    authorName: { type: 'string' },
    year: { type: 'integer' },
    category: { type: 'string', enum: MIND_CATEGORIES },
    axes: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string', enum: MIND_AXES } },
    tags: LINES(0, 5),
    blurb: { type: 'string' },
    quote: { anyOf: [QUOTE_SCHEMA, { type: 'null' }] },
    summary: {
      type: 'object',
      additionalProperties: false,
      required: ['gist', 'ideas'],
      properties: { gist: { type: 'string' }, ideas: LINES(0, 5) },
    },
    start: {
      type: 'object',
      additionalProperties: false,
      required: ['label', 'title', 'why'],
      properties: { label: { type: 'string' }, title: { type: 'string' }, why: { type: 'string' } },
    },
    guide: {
      type: 'object',
      additionalProperties: false,
      required: ['heading', 'paragraphs'],
      properties: { heading: { type: 'string' }, paragraphs: LINES(0, 6) },
    },
  },
} as const;
