// ============================================================
// owlry — council-chat edge function (Deno / Supabase).
//
// The Council Room's live brain: one JWT-gated call that writes what three
// thinkers say and, for a question the catalogue has no script for, recalls
// who the thinkers are. Modelled on owl-chat — the same Gemini client, the
// same auth revalidation, the same owlry_rl_bump rate limiter — and
// stateless but for one cache: the client owns the session row
// (owlry_council_sessions) because the scripted engine writes it too, so
// this function generates and returns; only recalled cards are kept
// (owlry_council_minds), so a thinker is recalled once and every reader
// gets the same card.
//
//   mode "open"   → intros + round one + round two + takeaways + reading
//                   (one 3.5 Flash call; Flash-Lite fallback on provider errors)
//   mode "turn"   → the replies to a follow-up / direct question / added
//                   context / passage from the reader
//   mode "cast"   → three real thinkers for the question, one book each
//   mode "figure" → a thinker's card from the model's own knowledge: bio,
//                   works, attributed quotes, voice lines (cached)
//   mode "book"   → a book's card and its reading guide (cached)
//
// The client sends the three dossiers (name, role, bio, works, quotes, the
// seat's book) for open/turn, so the catalogue in src/content stays the
// one source of truth for curated seats; a recalled seat travels the same
// way with provenance "model". The verbatim-quote rule is enforced after
// the parse (_shared/council/quotes.ts): a quote the model did not copy
// exactly from the dossier is demoted to paraphrase, and a copied quote
// that was itself recalled comes back marked attributed, never verbatim.
//
// If this function is missing, errors, or the reader is offline or signed
// out, the client keeps the scripted council (src/engine/council.ts) —
// the room never goes dark.
//
// Deploy:   supabase functions deploy council-chat
// Secrets:  GEMINI_API_KEY          (shared with owl-chat)
//           COUNCIL_DAILY_CAP       (optional: Gemini calls per UTC day across all readers; default 1500)
//           COUNCIL_RECALL_MODEL    (optional: the model for figure/book; default MODEL_VOICE)
// ============================================================
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { callGeminiJson, callGeminiJsonWithFallback, geminiClient, GeminiBlocked, MODEL_VOICE, type GoogleGenAI } from '../_shared/gemini.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { coerceLang, type ReaderLang } from '../_shared/lang.ts';
import { BOOK_SCHEMA, CAST_SCHEMA, FIGURE_SCHEMA, OPEN_SCHEMA, TURN_SCHEMA } from '../_shared/council/schemas.ts';
import type { BookReply, CastReply, FigureReply, OpenReply, TurnReply, WireLine } from '../_shared/council/schemas.ts';
import { enforceQuotes, type Dossier } from '../_shared/council/quotes.ts';
import { bookUser, castUser, COUNCIL_SYSTEM, figureUser, KNOWLEDGE_SYSTEM, openUser, turnUser, type HistoryTurn, type TurnSlot } from '../_shared/council/prompts.ts';
import { coerceBook, coerceCast, coerceFigure, keyOf, str, strings } from '../_shared/council/minds.ts';

type Mode = 'open' | 'turn' | 'cast' | 'figure' | 'book';
const MODES: readonly Mode[] = ['open', 'turn', 'cast', 'figure', 'book'];

interface CouncilRequest {
  mode?: string;
  question?: string;
  area?: string;
  seats?: unknown[];
  lang?: string;
  // turn
  slot?: TurnSlot;
  text?: string;
  reply_seats?: unknown[];
  history?: unknown[];
  context?: unknown[];
  passage?: { bookTitle?: unknown; text?: unknown };
  // cast: the names the client holds full cards for, and the seats not to cast again
  known?: unknown[];
  avoid?: unknown[];
  // figure / book, with an optional line that disambiguates ("Roman Stoic philosopher, c. 4 BC – AD 65")
  name?: string;
  title?: string;
  author?: string;
  hint?: string;
}

/** shape + size-limit the dossiers — the client is trusted for content, not for volume */
function coerceDossiers(raw: unknown[] | undefined): Dossier[] | null {
  if (!Array.isArray(raw) || raw.length !== 3) return null;
  const out: Dossier[] = [];
  for (const r of raw) {
    if (!r || typeof r !== 'object') return null;
    const d = r as Record<string, unknown>;
    const id = str(d.id, 64);
    const name = str(d.name, 60);
    if (!id || !name) return null;
    const works = Array.isArray(d.works)
      ? d.works.slice(0, 4).map((w) => {
          const x = (w ?? {}) as Record<string, unknown>;
          return { title: str(x.title, 120), year: str(x.year, 40) };
        }).filter((w) => w.title)
      : [];
    const quotes = Array.isArray(d.quotes)
      ? d.quotes.slice(0, 6).map((q) => {
          const x = (q ?? {}) as Record<string, unknown>;
          const src = (x.source ?? {}) as Record<string, unknown>;
          return {
            text: str(x.text, 400),
            source: { work: str(src.work, 120), loc: str(src.loc, 120) || undefined },
            // a recalled quote keeps its provenance through the council, so the reader sees "attributed"
            provenance: x.provenance === 'model' ? ('model' as const) : ('curated' as const),
          };
        }).filter((q) => q.text && q.source.work)
      : [];
    out.push({
      id,
      name,
      short: str(d.short, 40) || name.split(' ')[0],
      role: str(d.role, 160),
      label: str(d.label, 60),
      bio: str(d.bio, 700),
      works,
      quotes,
      bookId: str(d.bookId, 64),
      bookTitle: str(d.bookTitle, 120) || 'their book',
    });
  }
  return out;
}

function coerceHistory(raw: unknown[] | undefined): HistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-12)
    .map((h) => {
      const x = (h ?? {}) as Record<string, unknown>;
      const who = x.who === 'user' ? 'user' : typeof x.who === 'number' && x.who >= 0 && x.who <= 2 ? x.who : null;
      const text = str(x.text, 700);
      return who === null || !text ? null : ({ who, text } as HistoryTurn);
    })
    .filter((h): h is HistoryTurn => h !== null);
}

function hourStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours()));
}

function dayStart(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Gemini calls per UTC day across every reader — the one spend guard the project has; per-reader limits sit under it */
function dailyCap(): number {
  const n = Number(Deno.env.get('COUNCIL_DAILY_CAP') ?? '');
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1500;
}

const isLine = (v: unknown): v is WireLine =>
  !!v && typeof v === 'object' && typeof (v as WireLine).seat === 'number' && Array.isArray((v as WireLine).segments);

/* ---------- the minds cache ---------- */

const CACHE = 'owlry_council_minds';
type Kind = 'figure' | 'book';

/** a card already recalled in this language, or null — a missing table (migration not applied yet) reads as a miss */
async function cacheGet(admin: SupabaseClient, kind: Kind, key: string, lang: ReaderLang): Promise<unknown | null> {
  const { data, error } = await admin.from(CACHE).select('payload').eq('kind', kind).eq('key', key).eq('lang', lang).maybeSingle();
  if (error) {
    console.warn('[council-chat] cache read failed', error.message);
    return null;
  }
  return data?.payload ?? null;
}

/** keep a card under every key it may be asked for by; a failed write is logged, never surfaced */
async function cachePut(admin: SupabaseClient, kind: Kind, keys: string[], lang: ReaderLang, payload: unknown, model: string): Promise<void> {
  const rows = [...new Set(keys.filter(Boolean))].map((key) => ({ kind, key, lang, payload, model }));
  if (!rows.length) return;
  const { error } = await admin.from(CACHE).upsert(rows, { onConflict: 'kind,key,lang' });
  if (error) console.warn('[council-chat] cache write failed', error.message);
}

/* ---------- the five modes ---------- */

async function runOpen(ai: GoogleGenAI, question: string, area: string, dossiers: Dossier[], lang: ReaderLang): Promise<Response> {
  const parsed = (await callGeminiJsonWithFallback(ai, {
    model: MODEL_VOICE,
    system: COUNCIL_SYSTEM,
    user: openUser(question, area, dossiers, lang),
    schema: OPEN_SCHEMA,
    temperature: 0.9, // three voices, real friction — a touch warmer than Scout
    maxOutputTokens: 4000,
    thinkingLevel: 'LOW',
  })) as OpenReply;

  const round1 = enforceQuotes((parsed.round1 ?? []).filter(isLine), dossiers);
  const round2 = enforceQuotes((parsed.round2 ?? []).filter(isLine), dossiers);
  const complete = [0, 1, 2].every((s) => round1.some((l) => l.seat === s) && round2.some((l) => l.seat === s));
  if (!complete) return jsonResponse({ error: 'generation_failed' }, 502);

  const differences = [0, 1, 2].map((s) => str(parsed.takeaways?.differences?.find((d) => d.seat === s)?.text, 300));
  const reading = [0, 1, 2].map((s) => {
    const r = parsed.reading?.find((x) => x.seat === s);
    return { why: str(r?.why, 300), bestStart: !!r?.bestStart };
  });
  if (!reading.some((r) => r.bestStart)) reading[0].bestStart = true;
  else {
    let seen = false;
    for (const r of reading) {
      if (r.bestStart && seen) r.bestStart = false;
      if (r.bestStart) seen = true;
    }
  }
  return jsonResponse({
    intros: [0, 1, 2].map((i) => str(parsed.intros?.[i], 240)),
    round1,
    round2,
    takeaways: {
      commonGround: str(parsed.takeaways?.commonGround, 900),
      differences,
      fits: str(parsed.takeaways?.fits, 900),
      nextStep: str(parsed.takeaways?.nextStep, 300),
    },
    reading,
  });
}

async function runTurn(ai: GoogleGenAI, body: CouncilRequest, question: string, dossiers: Dossier[], lang: ReaderLang): Promise<Response> {
  const slot: TurnSlot = body.slot === 'direct' || body.slot === 'context' || body.slot === 'passage' ? body.slot : 'followup';
  const text = str(body.text, 700);
  if (!text) return jsonResponse({ error: 'text required' }, 400);
  const replySeats = (Array.isArray(body.reply_seats) ? body.reply_seats : [])
    .filter((s): s is number => typeof s === 'number' && s >= 0 && s <= 2)
    .slice(0, 3);
  const seats = replySeats.length ? replySeats : slot === 'direct' ? [0] : [0, 1, 2];
  const context = (Array.isArray(body.context) ? body.context : []).map((c) => str(c, 400)).filter(Boolean).slice(0, 6);
  const passage = body.passage ? { bookTitle: str(body.passage.bookTitle, 120), text: str(body.passage.text, 700) } : undefined;

  const parsed = (await callGeminiJsonWithFallback(ai, {
    model: MODEL_VOICE,
    system: COUNCIL_SYSTEM,
    user: turnUser(question, dossiers, coerceHistory(body.history), context, slot, text, seats, lang, passage),
    schema: TURN_SCHEMA,
    temperature: 0.9,
    maxOutputTokens: 2000,
    thinkingLevel: 'LOW',
  })) as TurnReply;

  const replies = enforceQuotes((parsed.replies ?? []).filter(isLine), dossiers).filter((l) => seats.includes(l.seat));
  // keep the requested order, one reply per seat
  const ordered = seats.map((s) => replies.find((l) => l.seat === s)).filter((l): l is WireLine => !!l);
  if (!ordered.length) return jsonResponse({ error: 'generation_failed' }, 502);
  return jsonResponse({ replies: ordered });
}

/** who should answer this question: a judgment call, so the voice model with the usual fallback */
async function runCast(ai: GoogleGenAI, body: CouncilRequest, question: string, lang: ReaderLang): Promise<Response> {
  const parsed = (await callGeminiJsonWithFallback(ai, {
    model: MODEL_VOICE,
    system: KNOWLEDGE_SYSTEM,
    user: castUser(question, str(body.area, 40) || 'other', lang, strings(body.known, 40, 80), strings(body.avoid, 12, 80)),
    schema: CAST_SCHEMA,
    temperature: 0.6, // some range in who gets seated, but the same question should not draw a wildly different bench
    maxOutputTokens: 1500,
    thinkingLevel: 'LOW',
  })) as CastReply;
  const cast = coerceCast(parsed);
  if (!cast) return jsonResponse({ error: 'generation_failed' }, 502);
  return jsonResponse(cast);
}

/**
 * The two recall modes call the recall model without the Flash-Lite fallback:
 * a smaller model recalls less and invents more, and a wrong card is worse
 * than no card — the client keeps what it has. Low temperature for the same
 * reason. What comes back is checked (minds.ts) and then kept.
 */
async function runFigure(ai: GoogleGenAI, admin: SupabaseClient, body: CouncilRequest, name: string, key: string, lang: ReaderLang, model: string): Promise<Response> {
  const parsed = (await callGeminiJson(ai, {
    model,
    system: KNOWLEDGE_SYSTEM,
    user: figureUser(name, lang, str(body.hint, 200)),
    schema: FIGURE_SCHEMA,
    temperature: 0.3,
    maxOutputTokens: 3000,
    thinkingLevel: 'LOW',
  })) as FigureReply;
  const figure = coerceFigure(parsed, name, lang, model);
  if (!figure) return jsonResponse({ error: 'unknown_mind' }, 404);
  await cachePut(admin, 'figure', [key, keyOf(figure.canonicalName)], lang, figure, model);
  return jsonResponse({ figure, cached: false });
}

async function runBook(ai: GoogleGenAI, admin: SupabaseClient, body: CouncilRequest, title: string, author: string, key: string, lang: ReaderLang, model: string): Promise<Response> {
  const parsed = (await callGeminiJson(ai, {
    model,
    system: KNOWLEDGE_SYSTEM,
    user: bookUser(title, author, lang, str(body.hint, 200)),
    schema: BOOK_SCHEMA,
    temperature: 0.3,
    maxOutputTokens: 4000,
    thinkingLevel: 'LOW',
  })) as BookReply;
  const book = coerceBook(parsed, title, author, lang, model);
  if (!book) return jsonResponse({ error: 'unknown_book' }, 404);
  await cachePut(admin, 'book', [key, `${keyOf(book.canonicalTitle)}--${keyOf(book.canonicalAuthor)}`], lang, book, model);
  return jsonResponse({ book, cached: false });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return jsonResponse({ error: 'council-chat is not configured' }, 503);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  let body: CouncilRequest;
  try {
    body = (await req.json()) as CouncilRequest;
  } catch {
    return jsonResponse({ error: 'invalid body' }, 400);
  }
  const mode = MODES.find((m) => m === body.mode);
  if (!mode) return jsonResponse({ error: 'mode required' }, 400);
  const lang = coerceLang(body.lang);

  // ── what each mode needs, checked before any round trip ──
  const question = str(body.question, 600);
  const dossiers = mode === 'open' || mode === 'turn' ? coerceDossiers(body.seats) : null;
  const name = str(body.name, 80);
  const title = str(body.title, 160);
  const author = str(body.author, 80);
  if ((mode === 'open' || mode === 'turn' || mode === 'cast') && !question) return jsonResponse({ error: 'question required' }, 400);
  if ((mode === 'open' || mode === 'turn') && !dossiers) return jsonResponse({ error: 'three seats required' }, 400);
  if (mode === 'figure' && !name) return jsonResponse({ error: 'name required' }, 400);
  if (mode === 'book' && (!title || !author)) return jsonResponse({ error: 'title and author required' }, 400);

  // ── auth: revalidate the caller's JWT against the auth server ──
  const authHeader = req.headers.get('Authorization') ?? '';
  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: authErr } = await authedClient.auth.getUser();
  if (authErr || !userData?.user) return jsonResponse({ error: 'unauthorized' }, 401);
  const uid = userData.user.id;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // ── the minds cache: a card already recalled in this language costs no quota and needs no model ──
  const cacheKey = mode === 'figure' ? keyOf(name) : mode === 'book' ? `${keyOf(title)}--${keyOf(author)}` : '';
  if (mode === 'figure' || mode === 'book') {
    const hit = await cacheGet(admin, mode, cacheKey, lang);
    if (hit) return jsonResponse({ [mode]: hit, cached: true });
  }

  // ── rate limit: 30/hour and 150/day per reader (an opening counts double), under one cap for the whole room ──
  const cost = mode === 'open' ? 2 : 1;
  const bumps: PromiseLike<{ data: unknown }>[] = [];
  for (let i = 0; i < cost; i++) {
    bumps.push(admin.rpc('owlry_rl_bump', { p_key: `council-chat:${uid}`, p_window_start: hourStart().toISOString(), p_max: 30 }));
    bumps.push(admin.rpc('owlry_rl_bump', { p_key: `council-chat-day:${uid}`, p_window_start: dayStart().toISOString(), p_max: 150 }));
  }
  bumps.push(admin.rpc('owlry_rl_bump', { p_key: 'council-chat:all', p_window_start: dayStart().toISOString(), p_max: dailyCap() }));
  const results = await Promise.all(bumps);
  if (results.some((r) => r.data === false)) return jsonResponse({ error: 'rate_limited' }, 429);

  const ai = geminiClient(apiKey);
  const recallModel = Deno.env.get('COUNCIL_RECALL_MODEL') || MODEL_VOICE;

  try {
    switch (mode) {
      case 'open':
        return await runOpen(ai, question, str(body.area, 40) || 'other', dossiers!, lang);
      case 'turn':
        return await runTurn(ai, body, question, dossiers!, lang);
      case 'cast':
        return await runCast(ai, body, question, lang);
      case 'figure':
        return await runFigure(ai, admin, body, name, cacheKey, lang, recallModel);
      case 'book':
        return await runBook(ai, admin, body, title, author, cacheKey, lang, recallModel);
    }
  } catch (err) {
    if (err instanceof GeminiBlocked) {
      console.error('[council-chat] blocked', err.reason);
      return jsonResponse({ error: 'generation_blocked' }, 502);
    }
    console.error('[council-chat] call failed', err);
    return jsonResponse({ error: 'generation_failed' }, 502);
  }
});
