// ============================================================
// owlry — owl-chat v2 edge function (Deno / Supabase).
//
// Scout: the reader's turn, in three model calls (docs/owl-chat-revision.md
// + the memory/history plan). The browser sends only the current message —
// history and memory are loaded server-side, so the GEMINI_API_KEY and
// the reader's memory never touch the client.
//
//   A  3.1 Flash-Lite  digest   → semantic_query + memory selection
//   B  3.5 Flash       Scout    → {say, main, picks, note?, chips}  (NO letter)
//
// The user's turn is persisted immediately (survives even if generation
// fails); the owl's reply is persisted after. Peek context (book + query +
// selected memory) is stashed in `cached_responses` so a cold instance can
// still serve Peek later. The memory-merge job (Flash-Lite) runs AFTER the
// response, non-blocking (EdgeRuntime.waitUntil) — it never delays the reply.
//
// If this function is missing, errors, or the reader is offline, the client
// falls back to the simulated mockup brain (src/lib/owlBrain.ts) — chat
// never breaks.
//
// Deploy:   supabase functions deploy owl-chat
// Secrets:  supabase secrets set GEMINI_API_KEY=AIza...
//           (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY
//            are provided automatically to every edge function)
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import type { GoogleGenAI } from 'npm:@google/genai@2.14.0';
import {
  callGeminiJson,
  callGeminiJsonWithFallback,
  geminiClient,
  GeminiBlocked,
  MODEL_FAST,
  MODEL_VOICE,
} from '../_shared/gemini.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { slugify } from '../_shared/slug.ts';
import { capSelectedMemory, EMPTY_LONG_TERM, mergeTopic, sanitizeLongTerm } from '../_shared/memory.ts';
import { DIGEST_SYSTEM, digestUser } from '../_shared/prompts/digest.ts';
import { SCOUT_SYSTEM, scoutUser } from '../_shared/prompts/scout.ts';
import { MEMORY_MERGE_SYSTEM, memoryMergeUser } from '../_shared/prompts/memoryMerge.ts';
import { SEMANTIC_QUERY_SCHEMA, SCOUT_SCHEMA, MEMORY_PATCH_SCHEMA } from '../_shared/schemas.ts';
import type { SemanticQuery, ScoutReply, MemoryPatch } from '../_shared/schemas.ts';
import { coerceLang, type ReaderLang } from '../_shared/lang.ts';

interface ChatRequest {
  message?: string;
  client_day?: string; // reader's local YYYY-MM-DD (drives dated topics + history grouping)
  /** UI language prefs — Scout/Peek must honour this for every reader-facing field */
  lang?: string;
  desk?: 'all' | 'pro';
}

const FALLBACK_QUERY = (lang: ReaderLang): Omit<SemanticQuery, 'themes' | 'intent'> => ({
  mood: '',
  avoid: [],
  depth: 'mixed',
  length: 'any',
  language: lang,
  selected_memory: [],
  topic_candidate: null,
  note_domain: null,
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function hourStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours()));
}

function dayStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** background job: merge this exchange into the reader's memory. Never blocks the reply. */
async function runMemoryMerge(
  ai: GoogleGenAI,
  admin: ReturnType<typeof createClient>,
  uid: string,
  currentLongTerm: unknown,
  currentTopics: unknown,
  message: string,
  say: string,
  mainTitle: string | null,
  clientDay: string,
): Promise<void> {
  try {
    const parsed = (await callGeminiJson(ai, {
      model: MODEL_FAST,
      system: MEMORY_MERGE_SYSTEM,
      user: memoryMergeUser(JSON.stringify(currentLongTerm ?? {}), JSON.stringify(currentTopics ?? []), message, say, mainTitle, clientDay),
      schema: MEMORY_PATCH_SCHEMA,
      temperature: 0.2, // extraction job — stay close to the evidence, never embellish
      maxOutputTokens: 1200,
      thinkingLevel: 'MINIMAL',
    })) as MemoryPatch;
    if (!parsed.change) return;

    const longTerm = sanitizeLongTerm(parsed.long_term);
    const topics = mergeTopic(currentTopics, parsed.topic, clientDay);
    await admin.from('owlry_user_memory').upsert({ user_id: uid, long_term: longTerm, topics, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error('[owl-chat] memory merge failed', err);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return jsonResponse({ error: 'owl-chat is not configured' }, 503);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return jsonResponse({ error: 'invalid body' }, 400);
  }
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 600) : '';
  if (!message) return jsonResponse({ error: 'message required' }, 400);
  const clientDay = typeof body.client_day === 'string' && DATE_RE.test(body.client_day) ? body.client_day : today();
  const lang = coerceLang(body.lang);

  // ── auth: revalidate the caller's JWT against the auth server ──
  const authHeader = req.headers.get('Authorization') ?? '';
  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: authErr } = await authedClient.auth.getUser();
  if (authErr || !userData?.user) return jsonResponse({ error: 'unauthorized' }, 401);
  const uid = userData.user.id;

  // service-role client for all DB access from here — always scoped to `uid` explicitly.
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── rate limit: 20/hour and 120/day per reader ──
  const [{ data: hourOk }, { data: dayOk }] = await Promise.all([
    admin.rpc('owlry_rl_bump', { p_key: `owl-chat:${uid}`, p_window_start: hourStart().toISOString(), p_max: 20 }),
    admin.rpc('owlry_rl_bump', { p_key: `owl-chat-day:${uid}`, p_window_start: dayStart().toISOString(), p_max: 120 }),
  ]);
  if (hourOk === false || dayOk === false) return jsonResponse({ error: 'rate_limited' }, 429);

  // ── load memory + recent history in parallel ──
  const [{ data: memRow }, { data: historyRows }] = await Promise.all([
    admin.from('owlry_user_memory').select('long_term, topics').eq('user_id', uid).maybeSingle(),
    admin
      .from('owlry_chat_messages')
      .select('who, kind, payload, created_at')
      .eq('user_id', uid)
      .eq('kind', 'msg')
      .order('created_at', { ascending: false })
      .limit(12),
  ]);
  const longTerm = memRow?.long_term ?? EMPTY_LONG_TERM;
  const topics = memRow?.topics ?? [];
  type Row = { who: string; kind: string; payload: Record<string, unknown> };
  const history = ((historyRows ?? []) as Row[])
    .slice()
    .reverse()
    .map((r) => ({
      role: (r.who === 'me' ? 'user' : 'owl') as 'user' | 'owl',
      text: r.who === 'me' ? String(r.payload.text ?? '') : String(r.payload.say ?? ''),
    }))
    .filter((t) => t.text);

  // persist the reader's turn immediately — history survives even if generation fails
  const { error: persistUserErr } = await admin
    .from('owlry_chat_messages')
    .insert({ user_id: uid, who: 'me', kind: 'msg', payload: { text: message } });
  if (persistUserErr) console.error('[owl-chat] failed to persist user turn', persistUserErr);

  const ai = geminiClient(apiKey);

  // ── Call A — digest (Flash-Lite): semantic_query + memory selection ──
  let query: SemanticQuery;
  try {
    const parsed = (await callGeminiJson(ai, {
      model: MODEL_FAST,
      system: DIGEST_SYSTEM,
      user: digestUser(message, history, JSON.stringify(longTerm), JSON.stringify(topics), clientDay, lang),
      schema: SEMANTIC_QUERY_SCHEMA,
      temperature: 0.2, // intake distillation — near-deterministic, no invented themes
      maxOutputTokens: 1000,
      thinkingLevel: 'MINIMAL',
    })) as SemanticQuery;
    // Force UI language prefs — never let the model default to English for a zh reader.
    query = { ...parsed, language: lang, selected_memory: capSelectedMemory(parsed.selected_memory) };
  } catch (err) {
    console.error('[owl-chat] digest failed, using thin fallback query', err);
    query = { themes: [message], intent: message, ...FALLBACK_QUERY(lang) };
  }

  // ── Call B — Scout (3.5 Flash): pick + bubble, no letter ──
  let scout: ScoutReply;
  try {
    scout = (await callGeminiJsonWithFallback(ai, {
      model: MODEL_VOICE,
      system: SCOUT_SYSTEM,
      user: scoutUser(JSON.stringify(query)),
      schema: SCOUT_SCHEMA,
      temperature: 0.8, // warmth without drift (founder spec) — steadier book picks than the 1.0 default
      maxOutputTokens: 2000,
      thinkingLevel: 'LOW',
    })) as ScoutReply;
  } catch (err) {
    if (err instanceof GeminiBlocked) {
      console.error('[owl-chat] Scout blocked', err.reason);
      return jsonResponse({ error: 'generation_blocked' }, 502);
    } else {
      console.error('[owl-chat] Scout call failed', err);
      return jsonResponse({ error: 'generation_failed' }, 502);
    }
  }

  // ── slug + persistence + peek context (survives cold instances) ──
  const slug = scout.main ? slugify(scout.main.title) : null;
  const rows: Record<string, unknown>[] = [
    { user_id: uid, who: 'owl', kind: 'msg', payload: { say: scout.say, main: scout.main, picks: scout.picks, chips: scout.chips } },
  ];
  if (scout.main && slug) rows.push({ user_id: uid, who: 'owl', kind: 'letter', payload: { slug, book: scout.main } });
  if (scout.note) rows.push({ user_id: uid, who: 'owl', kind: 'note', payload: { text: scout.note } });
  const { error: persistOwlErr } = await admin.from('owlry_chat_messages').insert(rows);
  if (persistOwlErr) console.error('[owl-chat] failed to persist owl turn', persistOwlErr);

  if (scout.main && slug) {
    const { error: cacheErr } = await admin.from('cached_responses').upsert(
      {
        question_hash: `peek_ctx:${uid}:${slug}`,
        mode: 'peek_ctx',
        question_text: message,
        response_json: {
          book: { title: scout.main.title, author: scout.main.author },
          query,
          selectedMemory: query.selected_memory,
          lang,
        },
        ttl_hours: 72,
      },
      { onConflict: 'question_hash' },
    );
    if (cacheErr) console.error('[owl-chat] failed to stash peek context', cacheErr);
  }

  // ── memory merge: fire-and-forget, never blocks the reply ──
  const mergeJob = runMemoryMerge(ai, admin, uid, longTerm, topics, message, scout.say, scout.main?.title ?? null, clientDay);
  // deno-lint-ignore no-explicit-any
  const waitUntil = (globalThis as any).EdgeRuntime?.waitUntil as ((p: Promise<unknown>) => void) | undefined;
  if (waitUntil) waitUntil(mergeJob);
  else void mergeJob;

  return jsonResponse({ say: scout.say, main: scout.main, picks: scout.picks, note: scout.note, chips: scout.chips, slug });
});
