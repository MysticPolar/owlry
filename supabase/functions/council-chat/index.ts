// ============================================================
// owlry — council-chat edge function (Deno / Supabase).
//
// The Council Room's live brain: one JWT-gated call that writes what three
// thinkers say. Modelled on owl-chat — the same Gemini client, the same
// auth revalidation, the same owlry_rl_bump rate limiter — but stateless:
// the client owns the session row (owlry_council_sessions) because the
// scripted engine writes it too, so this function generates lines and
// returns them; nothing is persisted here except the rate-limit bucket.
//
//   mode "open"  → intros + round one + round two + takeaways + reading
//                  (one 3.5 Flash call; Flash-Lite fallback on provider errors)
//   mode "turn"  → the replies to a follow-up / direct question / added
//                  context / passage from the reader
//
// The client sends the three dossiers (name, role, bio, works, verified
// quotes, the seat's book) so the catalogue in src/content stays the one
// source of truth. The verbatim-quote rule is enforced after the parse
// (_shared/council/quotes.ts) — a quote the model did not copy exactly
// from the dossier is demoted to paraphrase.
//
// If this function is missing, errors, or the reader is offline or signed
// out, the client keeps the scripted council (src/engine/council.ts) —
// the room never goes dark.
//
// Deploy:   supabase functions deploy council-chat
// Secrets:  GEMINI_API_KEY (shared with owl-chat)
// ============================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import { callGeminiJsonWithFallback, geminiClient, GeminiBlocked, MODEL_VOICE } from '../_shared/gemini.ts';
import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { coerceLang } from '../_shared/lang.ts';
import { OPEN_SCHEMA, TURN_SCHEMA } from '../_shared/council/schemas.ts';
import type { OpenReply, TurnReply, WireLine } from '../_shared/council/schemas.ts';
import { enforceQuotes, type Dossier } from '../_shared/council/quotes.ts';
import { COUNCIL_SYSTEM, openUser, turnUser, type HistoryTurn, type TurnSlot } from '../_shared/council/prompts.ts';

interface CouncilRequest {
  mode?: 'open' | 'turn';
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
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

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
          return { text: str(x.text, 400), source: { work: str(src.work, 120), loc: str(src.loc, 120) || undefined } };
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

const isLine = (v: unknown): v is WireLine =>
  !!v && typeof v === 'object' && typeof (v as WireLine).seat === 'number' && Array.isArray((v as WireLine).segments);

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
  const mode = body.mode === 'turn' ? 'turn' : body.mode === 'open' ? 'open' : null;
  if (!mode) return jsonResponse({ error: 'mode required' }, 400);
  const question = str(body.question, 600);
  if (!question) return jsonResponse({ error: 'question required' }, 400);
  const dossiers = coerceDossiers(body.seats);
  if (!dossiers) return jsonResponse({ error: 'three seats required' }, 400);
  const lang = coerceLang(body.lang);

  // ── auth: revalidate the caller's JWT against the auth server ──
  const authHeader = req.headers.get('Authorization') ?? '';
  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: authErr } = await authedClient.auth.getUser();
  if (authErr || !userData?.user) return jsonResponse({ error: 'unauthorized' }, 401);
  const uid = userData.user.id;

  // ── rate limit: 30/hour and 150/day per reader (opens are the pricier call, counted double) ──
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const cost = mode === 'open' ? 2 : 1;
  const bumps: PromiseLike<{ data: unknown }>[] = [];
  for (let i = 0; i < cost; i++) {
    bumps.push(admin.rpc('owlry_rl_bump', { p_key: `council-chat:${uid}`, p_window_start: hourStart().toISOString(), p_max: 30 }));
    bumps.push(admin.rpc('owlry_rl_bump', { p_key: `council-chat-day:${uid}`, p_window_start: dayStart().toISOString(), p_max: 150 }));
  }
  const results = await Promise.all(bumps);
  if (results.some((r) => r.data === false)) return jsonResponse({ error: 'rate_limited' }, 429);

  const ai = geminiClient(apiKey);

  try {
    if (mode === 'open') {
      const parsed = (await callGeminiJsonWithFallback(ai, {
        model: MODEL_VOICE,
        system: COUNCIL_SYSTEM,
        user: openUser(question, str(body.area, 40) || 'other', dossiers, lang),
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

    // ── a later turn ──
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
  } catch (err) {
    if (err instanceof GeminiBlocked) {
      console.error('[council-chat] blocked', err.reason);
      return jsonResponse({ error: 'generation_blocked' }, 502);
    }
    console.error('[council-chat] call failed', err);
    return jsonResponse({ error: 'generation_failed' }, 502);
  }
});
