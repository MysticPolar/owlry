// Owlry Council Room — Supabase Edge Function
//
// POST /functions/v1/council
//   { action: "start", question, situation?, category? }
//   { action: "reply", session_id, message }
//
// Responds with a Server-Sent Events stream:
//   cast       {session_id, kind, tension, seats}   sent BEFORE any forging, so the card shows at ~3 s
//   seats      {seats}                              books/links filled in once cards exist (only if changed)
//   turn_start {turn, speaker, name, cycle}
//   delta      {turn, text}                         visible text only; the hidden tail never reaches the client
//   turn_end   {turn, speaker, text, position, move, open}
//   summary    {…five sections…}
//   done       {session_id}
//   error      {message}
//
// The whole run is generated eagerly at model speed; the client paces the reveal.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { complete, parseJson, prewarm, stream } from "./model.ts";
import {
  benchFor,
  CAST_SYSTEM,
  cycleForTurn,
  directorNote,
  forgeSystem,
  mindSystem,
  ROUTE_SYSTEM,
  SCREEN_SYSTEM,
  SUMMARY_SYSTEM,
  summaryUser,
} from "./prompts.ts";
import type {
  Book,
  Card,
  CastResult,
  CastSeat,
  Cycle,
  Mind,
  ScreenResult,
  Seat,
  Summary,
  Tail,
  Turn,
  Usage,
} from "./types.ts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MODEL_MIND = Deno.env.get("COUNCIL_MODEL_MIND") ?? "claude-sonnet-5";
const MODEL_CAST = Deno.env.get("COUNCIL_MODEL_CAST") ?? MODEL_MIND; // matching is priority one
const MODEL_FAST = Deno.env.get("COUNCIL_MODEL_FAST") ?? "claude-haiku-4-5-20251001";
const TOTAL_TURNS = Number(Deno.env.get("COUNCIL_TURNS") ?? "9");
const MAX_REPLY_TURNS = 2;
// Thinking is on by default on Sonnet 5; for 60-word dialogue turns it is latency, not quality.
// Set COUNCIL_MIND_THINKING=default to A/B it.
const MIND_THINKING: "disabled" | "default" = Deno.env.get("COUNCIL_MIND_THINKING") === "default" ? "default" : "disabled";

/** Options shared by every mind turn AND by the cache pre-warm (they must match for a cache hit). */
const MIND_CALL = { model: MODEL_MIND, effort: "low" as const, thinking: MIND_THINKING, cacheSystem: true };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// SSE plumbing
// ---------------------------------------------------------------------------
type Send = (event: string, data: unknown) => void;

function createSse(): { response: Response; send: Send; close: () => void } {
  const enc = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  let closed = false;
  const send: Send = (event, data) => {
    if (closed) return;
    try {
      controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch {
      closed = true;
    }
  };
  const close = () => {
    if (closed) return;
    closed = true;
    try {
      controller.close();
    } catch { /* already closed */ }
  };
  return {
    response: new Response(body, {
      headers: {
        ...CORS,
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    }),
    send,
    close,
  };
}

// ---------------------------------------------------------------------------
// Hidden tail helpers
// ---------------------------------------------------------------------------
const TAIL_MARK = "POSITION:";
// Tolerates "Position:", "**POSITION:**" and a space before the colon.
const TAIL_RE = /\*{0,2}POSITION\s*:/i;

function tailIndex(full: string): number {
  const m = TAIL_RE.exec(full);
  return m ? m.index : -1;
}

/** Visible part of a streaming turn: everything before the hidden tail, withholding a partial "POSITION:" prefix at the end. */
function visibleSlice(full: string, final: boolean): string {
  const i = tailIndex(full);
  if (i >= 0) return full.slice(0, i);
  if (final) return full;
  const upper = full.toUpperCase();
  for (let k = Math.min(TAIL_MARK.length - 1, full.length); k > 0; k--) {
    if (upper.endsWith(TAIL_MARK.slice(0, k))) return full.slice(0, full.length - k);
  }
  return full;
}

function parseTail(full: string): Tail | undefined {
  const i = tailIndex(full);
  if (i < 0) return undefined;
  const m = full.slice(i).match(
    /POSITION\s*:\*{0,2}\s*([\s\S]*?)\s*\|\s*\*{0,2}MOVE\s*:\*{0,2}\s*(hold|shift|concede)\s*\|\s*\*{0,2}OPEN\s*:\*{0,2}\s*([\s\S]*)$/i,
  );
  if (!m) return undefined;
  const open = m[3].trim().replace(/[.\s]+$/, "");
  return {
    position: m[1].trim(),
    move: m[2].toLowerCase() as Tail["move"],
    open: /^none$/i.test(open) || !open ? null : open,
  };
}

// ---------------------------------------------------------------------------
// Minds, seats, books
// ---------------------------------------------------------------------------
function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function introFor(name: string, books: Book[]): string {
  const b = books[0];
  const access = b?.read_free ? "read free" : b ? "get the book" : "";
  return `${name} · an AI persona inspired by ${name}${b ? ` (${b.title})` : ""}${access ? ` · ${access}` : ""}`;
}

function seatFrom(seat: 1 | 2 | 3, cs: CastSeat, mind: Mind | undefined): Seat {
  const books = mind?.books?.length ? mind.books : (cs.books ?? []).map((b) => ({ title: b.title, author: b.author }));
  return {
    seat,
    slug: slugify(cs.name),
    name: mind?.name ?? cs.name,
    lived: mind?.lived ?? cs.lived ?? null,
    lens: cs.lens,
    why: cs.why,
    intro: introFor(mind?.name ?? cs.name, books),
    books,
  };
}

/** Project Gutenberg via Gutendex: free edition when the work is public domain. */
async function findFreeEdition(title: string, author: string): Promise<Book | null> {
  try {
    const q = encodeURIComponent(`${title} ${author.split(" ").slice(-1)[0]}`);
    const res = await fetch(`https://gutendex.com/books?search=${q}`);
    if (!res.ok) return null;
    const json = await res.json();
    const hit = (json.results ?? []).find((r: { title: string; authors: Array<{ name: string }> }) =>
      r.title.toLowerCase().includes(title.toLowerCase().split(":")[0].trim()) &&
      r.authors.some((a) => a.name.toLowerCase().includes(author.split(" ").slice(-1)[0].toLowerCase()))
    );
    if (!hit) return null;
    return {
      title: hit.title,
      author,
      year: null,
      read_free: `https://www.gutenberg.org/ebooks/${hit.id}`,
      buy: null,
    };
  } catch {
    return null;
  }
}

/** Google Books: verify the title exists and get a buy/info link. */
async function findEdition(title: string, author: string): Promise<Book | null> {
  try {
    const q = encodeURIComponent(`intitle:${title} inauthor:${author}`);
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`);
    if (!res.ok) return null;
    const json = await res.json();
    const v = json.items?.[0]?.volumeInfo;
    if (!v?.title) return null;
    return {
      title: v.title,
      author: v.authors?.[0] ?? author,
      year: v.publishedDate ? Number(String(v.publishedDate).slice(0, 4)) : null,
      read_free: null,
      buy: v.infoLink ?? null,
    };
  } catch {
    return null;
  }
}

async function verifyBooks(list: Array<{ title: string; author: string }>): Promise<Book[]> {
  const out: Book[] = [];
  for (const b of list.slice(0, 3)) {
    const free = await findFreeEdition(b.title, b.author);
    const found = free ?? await findEdition(b.title, b.author);
    if (found) out.push(found);
  }
  return out;
}

async function loadMinds(db: SupabaseClient, slugs: string[]): Promise<Map<string, Mind>> {
  const { data, error } = await db.from("council_minds").select("*").in("slug", slugs);
  if (error) throw new Error(`load minds: ${error.message}`);
  return new Map((data as Mind[]).map((m) => [m.slug, m]));
}

/** Forge a persona card for a mind not yet in the cache; verify its books; insert. */
async function forgeMind(db: SupabaseClient, cs: CastSeat): Promise<Mind> {
  const [forged, books] = await Promise.all([
    complete({
      model: MODEL_MIND,
      system: forgeSystem(cs.name, cs.lived, cs.field, cs.lens),
      messages: [{ role: "user", content: "Build the card now." }],
      maxTokens: 4000,
      effort: "medium",
    }),
    verifyBooks(cs.books ?? []),
  ]);
  const card = parseJson<Card & { works?: Array<{ title: string; author: string; year?: number }> }>(forged.text);
  // Fall back to the forge's own works list when the caster's titles didn't verify
  const finalBooks = books.length ? books : await verifyBooks((card.works ?? []).map((w) => ({ title: w.title, author: w.author || cs.name })));
  const mind: Mind = {
    slug: slugify(cs.name),
    name: cs.name,
    lived: cs.lived ?? null,
    field: cs.field ?? null,
    lens: cs.lens,
    card: {
      school: card.school,
      lens: cs.lens,
      core_ideas: card.core_ideas ?? [],
      claims_for: card.claims_for ?? [],
      claims_against: card.claims_against ?? [],
      blind_spots: card.blind_spots ?? [],
      voice: card.voice ?? { rules: [], samples: [] },
    },
    books: finalBooks,
  };
  const { error } = await db.from("council_minds").insert(mind);
  if (error && !/duplicate/i.test(error.message)) throw new Error(`insert mind: ${error.message}`);
  return mind;
}

// ---------------------------------------------------------------------------
// Cast + screen
// ---------------------------------------------------------------------------
async function castCouncil(input: {
  question: string;
  situation: string | null;
  category: string | null;
  exclude: string[];
  recent: string[];
}): Promise<CastResult> {
  const res = await complete({
    model: MODEL_CAST,
    system: CAST_SYSTEM,
    messages: [{
      role: "user",
      content: JSON.stringify({
        question: input.question,
        situation: input.situation ?? "",
        category: input.category ?? "other",
        bench: benchFor(input.category),
        exclude: input.exclude,
        recent: input.recent,
      }),
    }],
    maxTokens: 1200,
    effort: "low",
  });
  const cast = parseJson<CastResult>(res.text);
  if (!Array.isArray(cast.seats) || cast.seats.length !== 3 || cast.seats.some((s) => !s?.name)) {
    throw new Error("Cast returned fewer than three named seats");
  }
  return cast;
}

/** Names rejected by the hard denylist (code) or by the model screen. */
async function screenNames(db: SupabaseClient, names: string[]): Promise<string[]> {
  const { data: deny } = await db.from("council_denylist").select("name");
  const denied = new Set((deny ?? []).map((d: { name: string }) => d.name.toLowerCase().trim()));
  const byList = names.filter((n) => denied.has(n.toLowerCase().trim()));

  const res = await complete({
    model: MODEL_FAST,
    system: SCREEN_SYSTEM,
    messages: [{ role: "user", content: JSON.stringify({ names }) }],
    maxTokens: 300,
    temperature: 0,
  });
  const r = parseJson<ScreenResult>(res.text);
  const byModel = (r.verdicts ?? []).filter((v) => v.ok === false).map((v) => v.name);
  return Array.from(new Set([...byList, ...byModel]));
}

// ---------------------------------------------------------------------------
// One mind turn: stream, withhold tail, persist, emit
// ---------------------------------------------------------------------------
async function speak(opts: {
  db: SupabaseClient;
  send: Send;
  sessionId: string;
  turn: number;
  cycle: Cycle;
  mind: Mind;
  me: Seat;
  others: Seat[];
  question: string;
  situation: string | null;
  tension: string | null;
  turns: Turn[];
  readerMessage?: string;
}): Promise<Turn> {
  const { db, send, sessionId, turn, cycle, mind, me, others, question, situation, tension, turns } = opts;
  send("turn_start", { turn, speaker: mind.slug, name: mind.name, cycle });

  const note = directorNote({
    cycle,
    turn,
    totalTurns: TOTAL_TURNS,
    question,
    situation,
    tension,
    me,
    others,
    turns,
    readerMessage: opts.readerMessage,
  });

  let full = "";
  let emitted = 0;
  const flush = (final: boolean) => {
    const vis = visibleSlice(full, final);
    if (vis.length > emitted) {
      send("delta", { turn, text: vis.slice(emitted) });
      emitted = vis.length;
    }
  };

  const started = Date.now();
  let usage: Usage = {};
  try {
    const result = await stream(
      {
        ...MIND_CALL,
        system: mindSystem(mind),
        messages: [{ role: "user", content: note }],
        maxTokens: 500,
      },
      (t) => {
        full += t;
        flush(false);
      },
    );
    usage = result.usage;
  } finally {
    flush(true);
  }

  const tail = parseTail(full);
  const text = visibleSlice(full, true).trim();
  const row: Turn = { turn, speaker: mind.slug, cycle, text, tail };

  const { error } = await db.from("council_turns").insert({
    session_id: sessionId,
    turn,
    speaker: mind.slug,
    cycle,
    text,
    position: tail?.position ?? null,
    move: tail?.move ?? null,
    open: tail?.open ?? null,
    usage,
    latency_ms: Date.now() - started,
  });
  if (error) throw new Error(`insert turn: ${error.message}`);

  send("turn_end", {
    turn,
    speaker: mind.slug,
    text,
    position: tail?.position ?? null,
    move: tail?.move ?? null,
    open: tail?.open ?? null,
  });
  return row;
}

// ---------------------------------------------------------------------------
// START: cast → screen → session + cast event → forge (parallel) → 9 turns → summary
// ---------------------------------------------------------------------------
async function startCouncil(opts: {
  db: SupabaseClient;
  send: Send;
  userId: string;
  question: string;
  situation: string | null;
  category: string | null;
}): Promise<void> {
  const { db, send, userId, question, situation, category } = opts;

  // Names this reader saw in their last three councils: passed as "recent", avoided unless best fit
  const { data: recentRows } = await db
    .from("council_sessions")
    .select("seats")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(3);
  const recent = Array.from(new Set((recentRows ?? []).flatMap((r: { seats: Seat[] }) => r.seats.map((s) => s.name))));

  // 1. Cast, then screen; recast once if the screen rejects a name
  let exclude: string[] = [];
  let cast = await castCouncil({ question, situation, category, exclude, recent });
  let rejected = await screenNames(db, cast.seats.map((s) => s.name));
  if (rejected.length) {
    exclude = rejected;
    cast = await castCouncil({ question, situation, category, exclude, recent });
    rejected = await screenNames(db, cast.seats.map((s) => s.name));
    if (rejected.length) throw new Error(`Cast rejected by screen: ${rejected.join(", ")}`);
  }

  // 2. Seats from the cache where possible; the card shows before any forging
  const castSeats = [1, 2, 3].map((n) => cast.seats.find((s) => s.seat === n) ?? cast.seats[n - 1]) as CastSeat[];
  let minds = await loadMinds(db, castSeats.map((s) => slugify(s.name)));
  let seats: Seat[] = castSeats.map((cs, i) => seatFrom((i + 1) as 1 | 2 | 3, cs, minds.get(slugify(cs.name))));

  const { data: session, error: sessErr } = await db
    .from("council_sessions")
    .insert({
      user_id: userId,
      question,
      situation,
      category,
      axis: cast.tension,
      kind: cast.kind,
      seats,
      status: "running",
    })
    .select("id")
    .single();
  if (sessErr) throw new Error(`insert session: ${sessErr.message}`);
  const sessionId = session.id as string;

  send("cast", { session_id: sessionId, kind: cast.kind, tension: cast.tension, seats });

  // 3. Forge any uncached minds, in parallel, while the reader reads the card
  const missing = castSeats.filter((cs) => !minds.has(slugify(cs.name)));
  if (missing.length) {
    await Promise.all(missing.map((cs) => forgeMind(db, cs)));
    minds = await loadMinds(db, castSeats.map((s) => slugify(s.name)));
    seats = castSeats.map((cs, i) => seatFrom((i + 1) as 1 | 2 | 3, cs, minds.get(slugify(cs.name))));
    await db.from("council_sessions").update({ seats }).eq("id", sessionId);
    send("seats", { seats });
  }

  const seated: Mind[] = seats.map((s) => minds.get(s.slug)!);
  if (seated.some((m) => !m)) throw new Error("A seat could not be forged");

  // 4. Warm the prompt cache for the seats that speak second and third (best effort, not awaited)
  const openingIdx = Math.min(Math.max((cast.opening_seat ?? 1) - 1, 0), 2);
  for (let i = 0; i < 3; i++) {
    if (i !== openingIdx) prewarm({ ...MIND_CALL, system: mindSystem(seated[i]) });
  }

  // 5. Serial turns, round-robin from the opening seat
  const turns: Turn[] = [];
  try {
    for (let turn = 1; turn <= TOTAL_TURNS; turn++) {
      const idx = (openingIdx + (turn - 1)) % 3;
      const t = await speak({
        db,
        send,
        sessionId,
        turn,
        cycle: cycleForTurn(turn, TOTAL_TURNS),
        mind: seated[idx],
        me: seats[idx],
        others: seats.filter((_, j) => j !== idx),
        question,
        situation,
        tension: cast.tension,
        turns,
      });
      turns.push(t);
    }

    // 6. Summary
    const summary = await summarize(db, sessionId, question, situation, seats, turns);
    send("summary", summary);

    await db.from("council_sessions").update({ status: "done", turn_count: turns.length }).eq("id", sessionId);
    send("done", { session_id: sessionId });
  } catch (e) {
    await db.from("council_sessions").update({ status: "error", turn_count: turns.length }).eq("id", sessionId);
    throw e;
  }
}

async function summarize(
  db: SupabaseClient,
  sessionId: string,
  question: string,
  situation: string | null,
  seats: Seat[],
  turns: Turn[],
): Promise<Summary> {
  const res = await complete({
    model: MODEL_FAST,
    system: SUMMARY_SYSTEM,
    messages: [{ role: "user", content: summaryUser({ question, situation, seats, turns }) }],
    maxTokens: 900,
    temperature: 0.2,
  });
  const summary = parseJson<Summary>(res.text);
  // Fast models sometimes return a single string where the schema asks for a list
  const asList = (v: unknown): string[] => Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];
  summary.agree = asList(summary.agree);
  summary.differ = asList(summary.differ);

  // Attach links from the cards; never trust the model for URLs
  summary.books = (summary.books ?? []).map((b) => {
    const seat = seats.find((s) => s.name === b.mind) ?? seats.find((s) => s.books.some((x) => x.title === b.title));
    const book = seat?.books.find((x) => x.title.toLowerCase() === (b.title ?? "").toLowerCase()) ?? seat?.books[0];
    return {
      ...b,
      title: book?.title ?? b.title,
      author: book?.author ?? b.author,
      access: book?.read_free ? "read_free" : "buy",
      url: book?.read_free ?? book?.buy ?? null,
    };
  });

  const { error } = await db.from("council_summaries").upsert({ session_id: sessionId, summary });
  if (error) throw new Error(`upsert summary: ${error.message}`);
  return summary;
}

// ---------------------------------------------------------------------------
// REPLY: reader message → route → one or two mind turns
// ---------------------------------------------------------------------------
async function replyCouncil(opts: {
  db: SupabaseClient;
  send: Send;
  userId: string;
  sessionId: string;
  message: string;
}): Promise<void> {
  const { db, send, userId, sessionId, message } = opts;

  const { data: session, error } = await db
    .from("council_sessions")
    .select("id,user_id,question,situation,axis,seats")
    .eq("id", sessionId)
    .single();
  if (error || !session || session.user_id !== userId) throw new Error("Session not found");

  const seats = session.seats as Seat[];
  const { data: rows } = await db
    .from("council_turns")
    .select("turn,speaker,cycle,text,position,move,open")
    .eq("session_id", sessionId)
    .order("turn", { ascending: true });
  const turns: Turn[] = (rows ?? []).map((r) => ({
    turn: r.turn,
    speaker: r.speaker,
    cycle: r.cycle,
    text: r.text,
    tail: r.position ? { position: r.position, move: r.move, open: r.open } : undefined,
  }));
  const minds = await loadMinds(db, seats.map((s) => s.slug));

  // Persist the reader's message as a turn
  let nextTurn = (turns.at(-1)?.turn ?? 0) + 1;
  await db.from("council_turns").insert({
    session_id: sessionId,
    turn: nextTurn,
    speaker: "reader",
    cycle: "reply",
    text: message,
  });
  turns.push({ turn: nextTurn, speaker: "reader", cycle: "reply", text: message });

  // Route: name match in code first, then a fast model call
  const lower = message.toLowerCase();
  const named = seats.filter((s) => {
    const full = s.name.toLowerCase();
    const last = full.split(" ").slice(-1)[0];
    return lower.includes(full) || (last.length > 3 && lower.includes(last));
  });
  let responders: Seat[] = named.slice(0, MAX_REPLY_TURNS);
  if (responders.length === 0) {
    const latest = seats.map((s) => ({
      slug: s.slug,
      name: s.name,
      lens: s.lens,
      position: [...turns].reverse().find((t) => t.speaker === s.slug)?.tail?.position ?? null,
    }));
    const res = await complete({
      model: MODEL_FAST,
      system: ROUTE_SYSTEM,
      messages: [{ role: "user", content: JSON.stringify({ message, seats: latest }) }],
      maxTokens: 120,
      temperature: 0,
    });
    const r = parseJson<{ reply: string; second?: string | null }>(res.text);
    const first = seats.find((s) => s.slug === r.reply) ?? seats[0];
    const second = r.second ? seats.find((s) => s.slug === r.second && s.slug !== first.slug) : undefined;
    responders = second ? [first, second] : [first];
  }

  for (let i = 0; i < responders.length; i++) {
    const me = responders[i];
    const mind = minds.get(me.slug);
    if (!mind) continue;
    nextTurn += 1;
    const t = await speak({
      db,
      send,
      sessionId,
      turn: nextTurn,
      cycle: "reply",
      mind,
      me,
      others: seats.filter((s) => s.slug !== me.slug),
      question: session.question,
      situation: session.situation,
      tension: session.axis ?? null,
      turns,
      readerMessage: message,
    });
    turns.push(t);
    // Quiet-table rule: if the first responder sees nothing open, the second stays silent
    if (i === 0 && responders.length > 1 && !t.tail?.open) break;
  }

  await db.from("council_sessions").update({ turn_count: turns.length }).eq("id", sessionId);
  send("done", { session_id: sessionId });
}

// ---------------------------------------------------------------------------
// HTTP entry
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return new Response("Missing bearer token", { status: 401, headers: CORS });
  const { data: userData, error: userErr } = await db.auth.getUser(jwt);
  if (userErr || !userData?.user) return new Response("Invalid token", { status: 401, headers: CORS });
  const userId = userData.user.id;

  let body: { action?: string; question?: string; situation?: string; category?: string; session_id?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400, headers: CORS });
  }

  const sse = createSse();

  const run = (async () => {
    try {
      if (body.action === "start") {
        const question = (body.question ?? "").trim();
        if (!question) throw new Error("question is required");
        await startCouncil({
          db,
          send: sse.send,
          userId,
          question: question.slice(0, 600),
          situation: body.situation?.trim().slice(0, 400) || null,
          category: body.category?.trim().slice(0, 40) || null,
        });
      } else if (body.action === "reply") {
        const message = (body.message ?? "").trim();
        if (!body.session_id || !message) throw new Error("session_id and message are required");
        await replyCouncil({ db, send: sse.send, userId, sessionId: body.session_id, message: message.slice(0, 600) });
      } else {
        throw new Error(`Unknown action: ${body.action}`);
      }
    } catch (e) {
      sse.send("error", { message: e instanceof Error ? e.message : String(e) });
    } finally {
      sse.close();
    }
  })();

  // Keep the worker alive until the run finishes, even if the reader closes the app mid-stream:
  // the session then completes in the database and can be reopened from the library.
  // deno-lint-ignore no-explicit-any
  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(run);

  return sse.response;
});
