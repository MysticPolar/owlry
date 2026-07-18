// ============================================================
// owlry — owl-peek edge function (Deno / Supabase).
//
// Peek: the reading letter, generated ONLY when the reader taps the
// letter card — never as part of the Scout turn. Cache-first (so a
// re-open, even from another device, is instant); on a miss it loads
// the peek context Scout stashed (or rebuilds a minimal one from the
// client's title/author fallback + the reader's taste/topics) and
// fires Call C (3.5 Flash) to write the letter.
//
// Deploy:  supabase functions deploy owl-peek
// Secrets: same as owl-chat (GEMINI_API_KEY; SUPABASE_* provided automatically)
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import { callGeminiJson, geminiClient, MODEL_VOICE } from '../_shared/gemini.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { formatTopic, EMPTY_LONG_TERM } from '../_shared/memory.ts';
import { PEEK_SYSTEM, peekUser } from '../_shared/prompts/peek.ts';
import { LETTER_SCHEMA } from '../_shared/schemas.ts';
import { isValidLetterWire } from '../_shared/validators.ts';
import type { TopicEntry } from '../_shared/memory.ts';

interface PeekRequest {
  slug?: string;
  title?: string;
  author?: string;
}

interface PeekCtx {
  book: { title: string; author: string };
  query: unknown;
  selectedMemory: string[];
}

function hourStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours()));
}

/** a cached_responses row is stale once its ttl_hours has elapsed since created_at */
function isFresh(createdAt: string, ttlHours: number): boolean {
  return Date.now() - new Date(createdAt).getTime() < ttlHours * 3600_000;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return jsonResponse({ error: 'owl-peek is not configured' }, 503);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  let body: PeekRequest;
  try {
    body = (await req.json()) as PeekRequest;
  } catch {
    return jsonResponse({ error: 'invalid body' }, 400);
  }
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (!slug) return jsonResponse({ error: 'slug required' }, 400);

  const authHeader = req.headers.get('Authorization') ?? '';
  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: authErr } = await authedClient.auth.getUser();
  if (authErr || !userData?.user) return jsonResponse({ error: 'unauthorized' }, 401);
  const uid = userData.user.id;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: rlOk } = await admin.rpc('owlry_rl_bump', { p_key: `owl-peek:${uid}`, p_window_start: hourStart().toISOString(), p_max: 20 });
  if (rlOk === false) return jsonResponse({ error: 'rate_limited' }, 429);

  // ── cache-first: a letter is generated once, then always served from cache ──
  const letterKey = `peek_letter:${uid}:${slug}`;
  const { data: cachedLetter } = await admin
    .from('cached_responses')
    .select('response_json, created_at, ttl_hours')
    .eq('question_hash', letterKey)
    .maybeSingle();
  if (cachedLetter && isFresh(cachedLetter.created_at, cachedLetter.ttl_hours)) {
    return jsonResponse({ letter: cachedLetter.response_json, slug, cached: true });
  }

  // ── resolve peek context: what Scout stashed, or a minimal rebuild ──
  const ctxKey = `peek_ctx:${uid}:${slug}`;
  const { data: cachedCtx } = await admin
    .from('cached_responses')
    .select('response_json, created_at, ttl_hours')
    .eq('question_hash', ctxKey)
    .maybeSingle();

  let ctx: PeekCtx;
  if (cachedCtx && isFresh(cachedCtx.created_at, cachedCtx.ttl_hours)) {
    ctx = cachedCtx.response_json as PeekCtx;
  } else {
    const title = typeof body.title === 'string' ? body.title : '';
    const author = typeof body.author === 'string' ? body.author : '';
    if (!title) return jsonResponse({ error: 'no context for this letter — reopen from the chat' }, 400);

    const { data: memRow } = await admin.from('owlry_user_memory').select('long_term, topics').eq('user_id', uid).maybeSingle();
    const longTerm = memRow?.long_term ?? EMPTY_LONG_TERM;
    const topics = (memRow?.topics ?? []) as TopicEntry[];
    const selectedMemory = [
      ...topics.slice(0, 3).map(formatTopic),
      ...longTerm.taste.loves.slice(0, 2).map((l: string) => `loves ${l}`),
    ];
    ctx = { book: { title, author }, query: { themes: [], intent: `revisit ${title}`, language: 'en' }, selectedMemory };
  }

  const ai = geminiClient(apiKey);

  // ── Call C — Peek (3.5 Flash): the reading letter, on tap ──
  let letter: unknown;
  try {
    letter = await callGeminiJson(ai, {
      model: MODEL_VOICE,
      system: PEEK_SYSTEM,
      user: peekUser(ctx.book, JSON.stringify(ctx.query), ctx.selectedMemory),
      schema: LETTER_SCHEMA,
      temperature: 0.8, // same warmth clamp as Scout — literary, but anchored to the real book
      // Gemini counts thinking tokens against maxOutputTokens. MEDIUM here spent
      // ~1.3–1.7k tokens thinking and rode right up against a 3000 cap, so a
      // slightly longer think intermittently tripped MAX_TOKENS and 502'd the
      // letter. LOW matches the original "thinking disabled for low latency"
      // intent, produces an equivalent letter (real quotes, 3 further-reads) at
      // ~120 thinking tokens and ~2.5× faster; 6000 is generous headroom.
      maxOutputTokens: 6000,
      thinkingLevel: 'LOW',
    });
  } catch (err) {
    // includes GeminiBlocked — a letter that stopped short is never half-shipped.
    console.error('[owl-peek] Peek call failed', err);
    return jsonResponse({ error: 'generation_failed' }, 502);
  }

  if (!isValidLetterWire(letter)) {
    console.error('[owl-peek] Peek reply failed shape validation', letter);
    return jsonResponse({ error: 'generation_failed' }, 502);
  }

  const { error: cacheErr } = await admin.from('cached_responses').upsert(
    { question_hash: letterKey, mode: 'peek_letter', question_text: ctx.book.title, response_json: letter, ttl_hours: 720 },
    { onConflict: 'question_hash' },
  );
  if (cacheErr) console.error('[owl-peek] failed to cache the letter', cacheErr);

  return jsonResponse({ letter, slug, cached: false });
});
