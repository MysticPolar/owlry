// ============================================================
// owlry — the two-layer reader memory: shapes, budgets, and the
// server-side sanitizer. The Haiku merge job's JSON output is NEVER
// written raw — sanitizeLongTerm()/mergeTopic() enforce a field
// allowlist, enums, every char/array cap, a PII scrub, and
// deterministic dedupe/eviction. DB CHECK constraints on
// owlry_user_memory are the backstop, not the primary defense.
//
// Pure (no Deno/Node globals) so this is importable by both the
// owl-chat edge function AND tsx smoke scripts
// (scripts/memory-merge-smoke.ts) with zero mocking.
// ============================================================

export type Reaction = 'loved' | 'liked' | 'meh' | 'rejected';
export type Depth = 'frameworks' | 'narrative' | 'mixed';
export type Length = 'short' | 'medium' | 'long' | 'any';

export interface BookReaction {
  t: string;
  reaction: Reaction;
  ts: string; // YYYY-MM-DD
}

export interface LongTermMemory {
  profile: string;
  focus: string;
  taste: { loves: string[]; avoids: string[]; depth: Depth; length: Length };
  goals: string[];
  books: BookReaction[];
}

export interface TopicEntry {
  d: string; // YYYY-MM-DD
  topic: string;
  gist: string;
  book?: string;
}

export const EMPTY_LONG_TERM: LongTermMemory = {
  profile: '',
  focus: '',
  taste: { loves: [], avoids: [], depth: 'mixed', length: 'any' },
  goals: [],
  books: [],
};

/** the budgets from the memory design — keep every number here, nowhere else */
export const CAPS = {
  profile: 140,
  focus: 140,
  loveItem: 24,
  avoidItem: 24,
  goalItem: 60,
  bookTitle: 48,
  loves: 6,
  avoids: 6,
  goals: 3,
  books: 12,
  longTermTarget: 1400,
  longTermHardCap: 2000,
  topicTopic: 40,
  topicGist: 90,
  topics: 10,
  topicsTarget: 800,
  topicsHardCap: 1200,
  selectedMemoryItems: 5,
  selectedMemoryChars: 400,
} as const;

const REACTIONS = new Set<Reaction>(['loved', 'liked', 'meh', 'rejected']);
const DEPTHS = new Set<Depth>(['frameworks', 'narrative', 'mixed']);
const LENGTHS = new Set<Length>(['short', 'medium', 'long', 'any']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// never store an email, a URL, a street address, or a phone number
const PII =
  /[\w.+-]+@[\w-]+\.[\w.-]+|https?:\/\/\S+|\b\d{1,5}\s+\w+(?:\s+\w+){0,3}\s+(street|st|ave|avenue|road|rd|blvd|drive|dr|lane|ln)\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/i;

function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const t = value.trim();
  if (!t || PII.test(t)) return '';
  return t.slice(0, max);
}

function cleanArr(value: unknown, itemMax: number, arrMax: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const c = clean(item, itemMax);
    if (c) out.push(c);
    if (out.length >= arrMax) break;
  }
  return out;
}

function serializedLen(v: unknown): number {
  return JSON.stringify(v).length;
}

/**
 * Validate + sanitize a model-proposed FULL REWRITE of long_term. Never
 * trusts the model's shape/strings directly — unknown keys are dropped,
 * invalid enums fall back to a safe default, every string/array is capped,
 * and the whole object is shrunk to fit the target/hard-cap serialized size.
 */
export function sanitizeLongTerm(raw: unknown): LongTermMemory {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const tasteRaw = (r.taste && typeof r.taste === 'object' ? r.taste : {}) as Record<string, unknown>;

  const out: LongTermMemory = {
    profile: clean(r.profile, CAPS.profile),
    focus: clean(r.focus, CAPS.focus),
    taste: {
      loves: cleanArr(tasteRaw.loves, CAPS.loveItem, CAPS.loves),
      avoids: cleanArr(tasteRaw.avoids, CAPS.avoidItem, CAPS.avoids),
      depth: DEPTHS.has(tasteRaw.depth as Depth) ? (tasteRaw.depth as Depth) : 'mixed',
      length: LENGTHS.has(tasteRaw.length as Length) ? (tasteRaw.length as Length) : 'any',
    },
    goals: cleanArr(r.goals, CAPS.goalItem, CAPS.goals),
    books: [],
  };

  if (Array.isArray(r.books)) {
    // dedup by normalized title; newest ts wins
    const seen = new Map<string, BookReaction>();
    for (const b of r.books) {
      if (!b || typeof b !== 'object') continue;
      const e = b as Record<string, unknown>;
      const title = clean(e.t, CAPS.bookTitle);
      const reaction = REACTIONS.has(e.reaction as Reaction) ? (e.reaction as Reaction) : null;
      const ts = typeof e.ts === 'string' && DATE_RE.test(e.ts) ? e.ts : null;
      if (!title || !reaction || !ts) continue;
      const key = title.toLowerCase();
      const existing = seen.get(key);
      if (!existing || existing.ts < ts) seen.set(key, { t: title, reaction, ts });
    }
    out.books = [...seen.values()].sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0)).slice(0, CAPS.books);
  }

  return shrinkLongTerm(out);
}

/** evict oldest books, then trim goals, then hard-truncate focus — never exceed the hard cap */
function shrinkLongTerm(lt: LongTermMemory): LongTermMemory {
  let out = lt;
  while (serializedLen(out) > CAPS.longTermTarget && out.books.length > 0) {
    out = { ...out, books: out.books.slice(0, -1) };
  }
  while (serializedLen(out) > CAPS.longTermTarget && out.goals.length > 0) {
    out = { ...out, goals: out.goals.slice(0, -1) };
  }
  if (serializedLen(out) > CAPS.longTermTarget && out.focus.length > 0) {
    out = { ...out, focus: out.focus.slice(0, Math.max(0, out.focus.length - 40)) };
  }
  // absolute backstop; the DB CHECK enforces this too, but never emit an oversized write
  while (serializedLen(out) > CAPS.longTermHardCap && out.books.length > 0) {
    out = { ...out, books: out.books.slice(0, -1) };
  }
  while (serializedLen(out) > CAPS.longTermHardCap && out.goals.length > 0) {
    out = { ...out, goals: out.goals.slice(0, -1) };
  }
  return out;
}

/**
 * Merge one candidate topic into the existing short-term list. Same
 * normalized topic on the same day replaces the gist (latest wins);
 * otherwise the candidate is prepended. Sorted newest-first, capped at
 * CAPS.topics entries, oldest evicted first past the serialized budget.
 */
export function mergeTopic(
  existing: unknown,
  candidate: { topic?: unknown; gist?: unknown; book?: unknown } | null | undefined,
  day: string,
): TopicEntry[] {
  const list: TopicEntry[] = Array.isArray(existing)
    ? existing
        .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
        .map((e) => {
          const topic = clean(e.topic, CAPS.topicTopic);
          const gist = clean(e.gist, CAPS.topicGist);
          const d = typeof e.d === 'string' && DATE_RE.test(e.d) ? e.d : day;
          const book = typeof e.book === 'string' ? clean(e.book, 80) : undefined;
          return topic && gist ? ({ d, topic, gist, ...(book ? { book } : {}) } satisfies TopicEntry) : null;
        })
        .filter((e): e is TopicEntry => e !== null)
    : [];

  if (candidate) {
    const topic = clean(candidate.topic, CAPS.topicTopic);
    const gist = clean(candidate.gist, CAPS.topicGist);
    const book = typeof candidate.book === 'string' ? clean(candidate.book, 80) : undefined;
    if (topic && gist) {
      const norm = topic.toLowerCase();
      const idx = list.findIndex((e) => e.d === day && e.topic.toLowerCase() === norm);
      const entry: TopicEntry = { d: day, topic, gist, ...(book ? { book } : {}) };
      if (idx >= 0) list[idx] = entry;
      else list.unshift(entry);
    }
  }

  let out = [...list].sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0)).slice(0, CAPS.topics);
  while (serializedLen(out) > CAPS.topicsTarget && out.length > 1) out = out.slice(0, -1);
  while (serializedLen(out) > CAPS.topicsHardCap && out.length > 1) out = out.slice(0, -1);
  return out;
}

/** the display line for a dated topic, used both in prompt injection and the Memory UI */
export function formatTopic(t: TopicEntry): string {
  return `${t.d} · ${t.topic} — ${t.gist}`;
}

/** cap + join selected_memory strings from Call A before they reach Call B/C */
export function capSelectedMemory(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  let total = 0;
  for (const item of items) {
    if (typeof item !== 'string' || !item.trim()) continue;
    const v = item.trim().slice(0, 120);
    if (total + v.length > CAPS.selectedMemoryChars) break;
    out.push(v);
    total += v.length;
    if (out.length >= CAPS.selectedMemoryItems) break;
  }
  return out;
}
