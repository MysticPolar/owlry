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
import { OWL_SYSTEM, OWL_SCHEMA, OWL_MODEL, OWL_GEMINI_MODEL, OWL_MAX_TOKENS } from './owl-system.ts';

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

/** Trim a raw model reply into the strict contract so a stray field can't crash the client. */
function sanitize(parsed: OwlReplyPayload): OwlReplyPayload {
  return {
    say: typeof parsed.say === 'string' && parsed.say.trim() ? parsed.say : FALLBACK.say,
    letter:
      parsed.letter && typeof parsed.letter.title === 'string'
        ? { title: parsed.letter.title, author: String(parsed.letter.author ?? '') }
        : null,
    picks: Array.isArray(parsed.picks)
      ? parsed.picks
          .filter((p) => p && typeof p.title === 'string')
          .map((p) => ({ title: p.title, author: String(p.author ?? ''), note: String(p.note ?? '') }))
      : [],
    chips: Array.isArray(parsed.chips) ? parsed.chips.filter((c) => typeof c === 'string').slice(0, 4) : [],
  };
}

/** Claude (Anthropic): structured output via output_config.format. Returns the JSON text, or '' on refusal. */
async function anthropicReply(turns: Turn[], apiKey: string): Promise<string> {
  const Anthropic = (await import('npm:@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: OWL_MODEL,
    max_tokens: OWL_MAX_TOKENS,
    // Sonnet 4.6 defaults to effort:"high"; an owl reply is one or two sentences,
    // so keep it fast — thinking off, effort low.
    thinking: { type: 'disabled' },
    system: [{ type: 'text', text: OWL_SYSTEM, cache_control: { type: 'ephemeral' } }],
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

/** Gemini: JSON mode via responseMimeType; thinking disabled so the short reply stays fast. */
async function geminiReply(turns: Turn[], apiKey: string): Promise<string> {
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
      systemInstruction: OWL_SYSTEM,
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
  try {
    const body = (await req.json()) as { turns?: Turn[] };
    turns = Array.isArray(body.turns) ? body.turns : [];
  } catch {
    return jsonResponse({ error: 'invalid body' }, 400);
  }

  // keep the window bounded (cost + latency); the desk doesn't need deep history
  const recent = turns.filter((t) => t && t.text && t.text.trim()).slice(-24);
  if (!recent.length) return jsonResponse(FALLBACK);
  // both providers want the first turn to be the visitor
  if (recent[0].role !== 'user') recent.unshift({ role: 'user', text: '(a visitor sits down at the post desk.)' });

  try {
    const text = provider === 'gemini' ? await geminiReply(recent, apiKey) : await anthropicReply(recent, apiKey);
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
