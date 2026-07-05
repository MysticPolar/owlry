// ============================================================
// owlry — owl-chat edge function (Deno / Supabase).
//
// The live owl's brain. The browser sends the conversation so far;
// this runs an LLM server-side (so the API key never touches the
// client) and returns the structured owl reply. The client maps
// that onto the chat UI; if this function is missing, errors, or
// the user is offline, the client falls back to the simulated
// mockup brain (src/lib/owlBrain.ts) — chat never breaks.
//
// PROVIDER SWITCH — pick the model vendor with the OWL_PROVIDER secret:
//   • OWL_PROVIDER=anthropic  (default) → Claude, needs ANTHROPIC_API_KEY
//   • OWL_PROVIDER=gemini               → Gemini, needs GEMINI_API_KEY
// The OWL_SYSTEM prompt + {say,letter,picks,chips} contract are shared.
//
// Deploy:  supabase functions deploy owl-chat
// Secrets: supabase secrets set OWL_PROVIDER=gemini GEMINI_API_KEY=...
//          (or OWL_PROVIDER=anthropic ANTHROPIC_API_KEY=sk-ant-...)
// ============================================================
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import {
  OWL_SYSTEM,
  OWL_SCHEMA,
  OWL_MODEL,
  OWL_GEMINI_MODEL,
  OWL_MAX_TOKENS,
  OWL_PRO_DESK,
  LETTER_SYSTEM,
  OWL_LETTER_SCHEMA,
  OWL_LETTER_MAX_TOKENS,
} from './owl-system.ts';

interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

interface OwlReplyPayload {
  say: string;
  letter: { title: string; author: string } | null;
  picks: { title: string; author: string; note: string }[];
  chips: string[];
}

const FALLBACK: OwlReplyPayload = {
  say: "the post desk is quiet for a moment — tell me what's going on and i'll sort you something.",
  letter: null,
  picks: [],
  chips: ['rest', 'need focus', 'feeling blue', 'cozy escape'],
};

// The mockup uses fixed chip sets per response kind (content/owl.ts). To match
// its style exactly, override the model's chips deterministically by shape. (The
// greeting's starter chips are set client-side from START_CHIPS by day-part.)
const CHIPS = {
  letter: ['go deeper', 'something lighter', 'more like this', 'new vibe'],
  fiction: ['more like this', 'new vibe', 'surprise me'],
  ask: ['rest', 'need focus', 'feeling blue', 'cozy escape'],
};

/** Trim a raw model reply into the strict contract so a stray field can't crash the client. */
function sanitize(parsed: OwlReplyPayload): OwlReplyPayload {
  const letter =
    parsed.letter && typeof parsed.letter.title === 'string'
      ? { title: parsed.letter.title, author: String(parsed.letter.author ?? '') }
      : null;
  const picks = Array.isArray(parsed.picks)
    ? parsed.picks
        .filter((p) => p && typeof p.title === 'string')
        .map((p) => ({ title: p.title, author: String(p.author ?? ''), note: String(p.note ?? '') }))
    : [];
  return {
    say: typeof parsed.say === 'string' && parsed.say.trim() ? parsed.say : FALLBACK.say,
    letter,
    picks,
    chips: letter ? CHIPS.letter : picks.length ? CHIPS.fiction : CHIPS.ask,
  };
}

/** Claude (Anthropic): structured output via output_config.format. Returns the JSON text, or '' on refusal. */
async function anthropicReply(turns: Turn[], apiKey: string, system: string): Promise<string> {
  const Anthropic = (await import('npm:@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: OWL_MODEL,
    max_tokens: OWL_MAX_TOKENS,
    // Sonnet 4.6 defaults to effort:"high"; an owl reply is one or two sentences,
    // so keep it fast — thinking off, effort low.
    thinking: { type: 'disabled' },
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: turns.map((t) => ({ role: t.role, content: t.text })),
    output_config: { effort: 'low', format: { type: 'json_schema', schema: OWL_SCHEMA } },
    // deno-lint-ignore no-explicit-any
  } as any);
  if (res.stop_reason === 'refusal') return '';
  const textBlock = res.content.find((b: { type: string }) => b.type === 'text') as
    | { type: 'text'; text: string }
    | undefined;
  return textBlock?.text ?? '';
}

/** Claude: write a reading letter for one open-world book (tap-triggered, cached client-side). */
async function anthropicLetter(title: string, author: string, context: string, apiKey: string): Promise<string> {
  const Anthropic = (await import('npm:@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });
  const ask = context ? ` The reader's ask: "${context}".` : '';
  const res = await client.messages.create({
    model: OWL_MODEL,
    max_tokens: OWL_LETTER_MAX_TOKENS,
    thinking: { type: 'disabled' },
    // letters are the product — worth a notch more deliberation than chat turns
    system: [{ type: 'text', text: LETTER_SYSTEM, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `The book: ${title} by ${author}.${ask} Write the reading letter.` }],
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: OWL_LETTER_SCHEMA } },
    // deno-lint-ignore no-explicit-any
  } as any);
  if (res.stop_reason === 'refusal') return '';
  const textBlock = res.content.find((b: { type: string }) => b.type === 'text') as
    | { type: 'text'; text: string }
    | undefined;
  return textBlock?.text ?? '';
}

/** Gemini letter variant (JSON mode; schema enforced by prompt + client guard). */
async function geminiLetter(title: string, author: string, context: string, apiKey: string): Promise<string> {
  const { GoogleGenAI } = await import('npm:@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  const ask = context ? ` The reader's ask: "${context}".` : '';
  const response = await ai.models.generateContent({
    model: OWL_GEMINI_MODEL,
    contents: [{ role: 'user', parts: [{ text: `The book: ${title} by ${author}.${ask} Write the reading letter.` }] }],
    config: {
      systemInstruction: LETTER_SYSTEM,
      maxOutputTokens: 2400,
      temperature: 0.7,
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
    // deno-lint-ignore no-explicit-any
  } as any);
  return (response.text ?? '').trim();
}

/** Gemini: JSON mode via responseMimeType; thinking disabled so the short reply stays fast. */
async function geminiReply(turns: Turn[], apiKey: string, system: string): Promise<string> {
  const { GoogleGenAI } = await import('npm:@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  // Gemini has no 'system' role — the prompt goes in config.systemInstruction,
  // and the assistant role is named 'model'.
  const contents = turns.map((t) => ({
    role: t.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: t.text }],
  }));
  const response = await ai.models.generateContent({
    model: OWL_GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: system,
      maxOutputTokens: 512,
      temperature: 0.8,
      responseMimeType: 'application/json',
      // 2.5-flash thinks by default and would eat the token budget; disable it so
      // the whole budget goes to the (short) JSON reply, and latency stays low.
      thinkingConfig: { thinkingBudget: 0 },
    },
    // deno-lint-ignore no-explicit-any
  } as any);
  return (response.text ?? '').trim();
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const provider = (Deno.env.get('OWL_PROVIDER') ?? 'anthropic').trim().toLowerCase();
  const apiKey = provider === 'gemini' ? Deno.env.get('GEMINI_API_KEY') : Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return jsonResponse({ error: `owl-chat: ${provider} key not configured` }, 503);

  let turns: Turn[];
  let desk: 'fiction' | 'pro' = 'fiction';
  let letterFor: { title: string; author: string } | null = null;
  let letterContext = '';
  try {
    const body = (await req.json()) as {
      turns?: Turn[];
      desk?: string;
      letterFor?: { title?: string; author?: string };
      context?: string;
    };
    turns = Array.isArray(body.turns) ? body.turns : [];
    if (body.desk === 'pro') desk = 'pro';
    if (body.letterFor && typeof body.letterFor.title === 'string' && body.letterFor.title.trim()) {
      letterFor = {
        title: body.letterFor.title.trim().slice(0, 200),
        author: String(body.letterFor.author ?? '').trim().slice(0, 200),
      };
      letterContext = String(body.context ?? '').slice(0, 400);
    }
  } catch {
    return jsonResponse({ error: 'invalid body' }, 400);
  }

  // ── letter mode: write one reading letter for a tapped recommendation ──
  if (letterFor) {
    try {
      const text =
        provider === 'gemini'
          ? await geminiLetter(letterFor.title, letterFor.author, letterContext, apiKey)
          : await anthropicLetter(letterFor.title, letterFor.author, letterContext, apiKey);
      if (!text) return jsonResponse({ error: 'letter refused' }, 502);
      return jsonResponse(JSON.parse(text));
    } catch (err) {
      console.error('owl-letter error', err);
      const e = err as { status?: number; message?: string };
      return jsonResponse({ error: 'owl-letter upstream error', detail: { status: e?.status ?? null, message: e?.message ?? String(err) } }, 502);
    }
  }

  // keep the window bounded (cost + latency); the desk doesn't need deep history
  const recent = turns.filter((t) => t && t.text && t.text.trim()).slice(-24);
  if (!recent.length) return jsonResponse(FALLBACK);
  // both providers want the first turn to be the visitor
  if (recent[0].role !== 'user') recent.unshift({ role: 'user', text: '(a visitor sits down at the post desk.)' });

  try {
    const system = desk === 'pro' ? OWL_SYSTEM + OWL_PRO_DESK : OWL_SYSTEM;
    const text =
      provider === 'gemini' ? await geminiReply(recent, apiKey, system) : await anthropicReply(recent, apiKey, system);
    if (!text) return jsonResponse(FALLBACK); // refusal / empty
    return jsonResponse(sanitize(JSON.parse(text) as OwlReplyPayload));
  } catch (err) {
    console.error('owl-chat error', err);
    // surface the upstream cause (status/type/message) so failures are diagnosable
    // from the client — no secrets are present in these fields.
    const e = err as { status?: number; message?: string; error?: { type?: string; message?: string } };
    return jsonResponse(
      {
        ...FALLBACK,
        error: 'owl-chat upstream error',
        detail: {
          provider,
          status: e?.status ?? null,
          type: e?.error?.type ?? null,
          message: e?.error?.message ?? e?.message ?? String(err),
        },
      },
      502,
    );
  }
});
