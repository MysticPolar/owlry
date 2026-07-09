// ============================================================
// owlry — JSON Schemas for every structured-output call (Anthropic
// output_config.format). Every object sets additionalProperties:false
// and lists all its properties as required; optional fields are
// modelled as an anyOf-with-null union (the supported subset for
// structured outputs — no minLength/maxLength/numeric constraints).
//
// These schemas are the source of truth for the TypeScript interfaces
// beside them; keep both in lockstep by hand (there is no codegen here).
// ============================================================

// ---------- Call A: the semantic_query digest (Haiku) ----------

export interface SemanticQuery {
  themes: string[];
  mood: string;
  intent: string;
  avoid: string[];
  depth: 'frameworks' | 'narrative' | 'mixed';
  length: 'short' | 'medium' | 'long' | 'any';
  language: string;
  selected_memory: string[];
  topic_candidate: { topic: string; gist: string } | null;
  note_domain: 'finance' | 'medical' | 'legal' | 'crisis' | 'addiction' | 'grief' | null;
}

export const SEMANTIC_QUERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['themes', 'mood', 'intent', 'avoid', 'depth', 'length', 'language', 'selected_memory', 'topic_candidate', 'note_domain'],
  properties: {
    themes: { type: 'array', items: { type: 'string' } },
    mood: { type: 'string' },
    intent: { type: 'string' },
    avoid: { type: 'array', items: { type: 'string' } },
    depth: { type: 'string', enum: ['frameworks', 'narrative', 'mixed'] },
    length: { type: 'string', enum: ['short', 'medium', 'long', 'any'] },
    language: { type: 'string' },
    selected_memory: { type: 'array', items: { type: 'string' } },
    topic_candidate: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['topic', 'gist'],
          properties: { topic: { type: 'string' }, gist: { type: 'string' } },
        },
        { type: 'null' },
      ],
    },
    note_domain: {
      anyOf: [{ type: 'string', enum: ['finance', 'medical', 'legal', 'crisis', 'addiction', 'grief'] }, { type: 'null' }],
    },
  },
} as const;

// ---------- Call B: Scout — pick + bubble (Sonnet) ----------

export type Genre = 'history' | 'fiction' | 'scifi' | 'mystery' | 'romance' | 'life';

export interface ScoutBook {
  title: string;
  author: string;
  pages: number;
  blurb: string;
  tagline: string;
  genre: Genre;
  rating: string | null;
  bio: string | null;
}

export interface ScoutPick {
  title: string;
  author: string;
  note: string;
}

export interface ScoutReply {
  say: string;
  main: ScoutBook | null;
  picks: ScoutPick[];
  note: string | null;
  chips: string[];
}

export const SCOUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['say', 'main', 'picks', 'note', 'chips'],
  properties: {
    say: { type: 'string' },
    main: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'author', 'pages', 'blurb', 'tagline', 'genre', 'rating', 'bio'],
          properties: {
            title: { type: 'string' },
            author: { type: 'string' },
            pages: { type: 'integer' },
            blurb: { type: 'string' },
            tagline: { type: 'string' },
            genre: { type: 'string', enum: ['history', 'fiction', 'scifi', 'mystery', 'romance', 'life'] },
            rating: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            bio: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          },
        },
        { type: 'null' },
      ],
    },
    picks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'author', 'note'],
        properties: { title: { type: 'string' }, author: { type: 'string' }, note: { type: 'string' } },
      },
    },
    note: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    chips: { type: 'array', items: { type: 'string' } },
  },
} as const;

// ---------- Call C: Peek — the reading letter (Sonnet) ----------
// Mirrors src/lib/owlContract.ts's LetterWire + validateLetter exactly.

export interface LetterQuote {
  t: string;
  by: string;
}
export interface LetterInsight {
  t: string;
  r: string;
  ex: string;
  q: LetterQuote | null;
}
export interface LetterFurther {
  title: string;
  author: string;
  why: string;
}
export interface LetterWire {
  res: string;
  chap: string;
  core: string;
  ins: LetterInsight[];
  close: string;
  take: string[];
  ask: string[];
  fr: LetterFurther[];
}

export const LETTER_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['res', 'chap', 'core', 'ins', 'close', 'take', 'ask', 'fr'],
  properties: {
    res: { type: 'string' },
    chap: { type: 'string' },
    core: { type: 'string' },
    ins: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['t', 'r', 'ex', 'q'],
        properties: {
          t: { type: 'string' },
          r: { type: 'string' },
          ex: { type: 'string' },
          q: {
            anyOf: [
              {
                type: 'object',
                additionalProperties: false,
                required: ['t', 'by'],
                properties: { t: { type: 'string' }, by: { type: 'string' } },
              },
              { type: 'null' },
            ],
          },
        },
      },
    },
    close: { type: 'string' },
    take: { type: 'array', items: { type: 'string' } },
    ask: { type: 'array', items: { type: 'string' } },
    fr: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'author', 'why'],
        properties: { title: { type: 'string' }, author: { type: 'string' }, why: { type: 'string' } },
      },
    },
  },
} as const;

// ---------- Memory merge (Haiku, post-reply, non-blocking) ----------

export interface MemoryPatch {
  change: boolean;
  long_term: {
    profile: string;
    focus: string;
    taste: { loves: string[]; avoids: string[]; depth: string; length: string };
    goals: string[];
    books: { t: string; reaction: string; ts: string }[];
  };
  topic: { topic: string; gist: string; book: string | null } | null;
}

export const MEMORY_PATCH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['change', 'long_term', 'topic'],
  properties: {
    change: { type: 'boolean' },
    long_term: {
      type: 'object',
      additionalProperties: false,
      required: ['profile', 'focus', 'taste', 'goals', 'books'],
      properties: {
        profile: { type: 'string' },
        focus: { type: 'string' },
        taste: {
          type: 'object',
          additionalProperties: false,
          required: ['loves', 'avoids', 'depth', 'length'],
          properties: {
            loves: { type: 'array', items: { type: 'string' } },
            avoids: { type: 'array', items: { type: 'string' } },
            depth: { type: 'string', enum: ['frameworks', 'narrative', 'mixed'] },
            length: { type: 'string', enum: ['short', 'medium', 'long', 'any'] },
          },
        },
        goals: { type: 'array', items: { type: 'string' } },
        books: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['t', 'reaction', 'ts'],
            properties: {
              t: { type: 'string' },
              reaction: { type: 'string', enum: ['loved', 'liked', 'meh', 'rejected'] },
              ts: { type: 'string' },
            },
          },
        },
      },
    },
    topic: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['topic', 'gist', 'book'],
          properties: {
            topic: { type: 'string' },
            gist: { type: 'string' },
            book: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          },
        },
        { type: 'null' },
      ],
    },
  },
} as const;
