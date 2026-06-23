// ============================================================
// owlry — owl-chat edge function (Deno / Supabase).
//
// The live owl's brain. The browser sends the conversation so far;
// this runs Claude Haiku server-side (so the ANTHROPIC_API_KEY never
// touches the client) and returns the structured owl reply. The
// client maps that onto the chat UI; if this function is missing,
// errors, or the user is offline, the client falls back to the
// simulated mockup brain (src/lib/owlBrain.ts) — chat never breaks.
//
// Deploy:   supabase functions deploy owl-chat
// Secret:   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// ============================================================
import Anthropic from 'npm:@anthropic-ai/sdk';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { OWL_SYSTEM, OWL_SCHEMA, OWL_MODEL, OWL_MAX_TOKENS } from './owl-system.ts';

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

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return jsonResponse({ error: 'owl-chat is not configured' }, 503);

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
  // Anthropic requires the first message to be a user turn
  if (recent[0].role !== 'user') recent.unshift({ role: 'user', text: '(a visitor sits down at the post desk.)' });

  const client = new Anthropic({ apiKey });

  try {
    // output_config is the current structured-output surface; cast around SDK
    // type drift so Deno's bundler doesn't trip on a slightly older typings.
    const res = await client.messages.create({
      model: OWL_MODEL,
      max_tokens: OWL_MAX_TOKENS,
      // Sonnet 4.6 defaults to effort:"high"; an owl reply is one or two
      // sentences, so keep it fast — thinking off, effort low (Anthropic's
      // recommended config for chat workloads). Bump effort to "medium" if you
      // want the owl to deliberate more over which book to sort.
      thinking: { type: 'disabled' },
      system: [{ type: 'text', text: OWL_SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: recent.map((t) => ({ role: t.role, content: t.text })),
      output_config: { effort: 'low', format: { type: 'json_schema', schema: OWL_SCHEMA } },
      // deno-lint-ignore no-explicit-any
    } as any);

    if (res.stop_reason === 'refusal') return jsonResponse(FALLBACK);

    const textBlock = res.content.find((b: { type: string }) => b.type === 'text') as
      | { type: 'text'; text: string }
      | undefined;
    if (!textBlock) return jsonResponse(FALLBACK);

    const parsed = JSON.parse(textBlock.text) as OwlReplyPayload;
    // light shape-guard so a malformed reply can't crash the client
    const reply: OwlReplyPayload = {
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
    return jsonResponse(reply);
  } catch (err) {
    console.error('owl-chat error', err);
    // surface the upstream cause (status/type/message) so failures are
    // diagnosable from the client — no secrets are present in these fields.
    const e = err as { status?: number; message?: string; error?: { type?: string; message?: string } };
    return jsonResponse(
      {
        ...FALLBACK,
        error: 'owl-chat upstream error',
        detail: {
          status: e?.status ?? null,
          type: e?.error?.type ?? null,
          message: e?.error?.message ?? e?.message ?? String(err),
        },
      },
      502,
    );
  }
});
