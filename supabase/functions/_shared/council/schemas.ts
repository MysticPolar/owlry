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

const SEGMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'text', 'source'],
  properties: {
    kind: { type: 'string', enum: ['text', 'quote'] },
    text: { type: 'string' },
    source: {
      anyOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: ['work', 'loc'],
          properties: { work: { type: 'string' }, loc: { anyOf: [{ type: 'string' }, { type: 'null' }] } },
        },
        { type: 'null' },
      ],
    },
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
