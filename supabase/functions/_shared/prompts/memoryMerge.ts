// ============================================================
// owlry — the memory merge job (Haiku 4.5, post-reply, non-blocking).
//
// Reads the CURRENT long_term + topics (read-only context) plus this
// turn's exchange, and emits a FULL REWRITE of long_term (not a patch —
// a small, capped object is cheap to rewrite whole, and it keeps
// validation trivial) plus at most one topic candidate for today.
// The model's output is NEVER written raw: _shared/memory.ts's
// sanitizeLongTerm()/mergeTopic() enforce the allowlist, enums, caps,
// PII scrub, and dedupe/eviction server-side.
// ============================================================

export const MEMORY_MERGE_SYSTEM = `You maintain a reader's memory for a book-recommendation app: a small long-term profile
and a running list of dated short-term topics. You update it after one exchange.

NEVER GUESS. Only record what the reader explicitly stated or demonstrably did (e.g. asked
for more chapters, said they loved/disliked a book). Do not infer profession, mood, health,
beliefs, or identity from indirect signals. Never store a name, email, location, phone
number, or any other direct identifier — describe situation and goals, never diagnose.

TASK: return a full, updated "long_term" object (even if nothing changed — in that case
return it EXACTLY as given) plus AT MOST ONE "topic" candidate for today (or null). Set
"change" to true only if you actually modified long_term or are proposing a new/updated topic.

FIELDS (long_term)
- profile: <=140 chars — role/life stage/situation, e.g. "new parent, night-shift nurse".
- focus:   <=140 chars — what they're working through lately; the most dynamic field.
- taste:   {loves: up to 6 short genres/authors/topics, avoids: up to 6 EXPLICIT exclusions
           only, depth: frameworks|narrative|mixed, length: short|medium|long|any}.
- goals:   up to 3 short reasons they read, in their own terms.
- books:   up to 12 {t: title, reaction: loved|liked|meh|rejected, ts: today's date}. Only add
           an entry when the reader gave a clear reaction to a specific book (asked for more
           like it, said they loved/hated it, rejected a recommendation, etc.) — never guess
           a reaction from silence. Newest entry for the same title replaces the old one.
- Latest evidence wins; drop anything now stale. Every field is a rewrite, not an append —
  you decide what stays.

FIELD (topic, optional)
- A dated short-term memory candidate for TODAY, only if the reader raised something worth
  remembering (a real topic, question, or situation): {topic: <=40 chars, gist: <=90 chars,
  book: the book's title if this turn recommended one, else null}. If nothing rises to that
  bar, set "topic" to null.

Output must be valid JSON matching the required schema exactly.`;

export function memoryMergeUser(
  currentLongTermJson: string,
  currentTopicsJson: string,
  userMessage: string,
  owlSay: string,
  mainTitle: string | null,
  clientDay: string,
): string {
  return `TODAY: ${clientDay}

CURRENT LONG-TERM MEMORY:
${currentLongTermJson || '{}'}

CURRENT SHORT-TERM TOPICS (context only — you do not rewrite this list, just propose one candidate):
${currentTopicsJson || '[]'}

THIS EXCHANGE:
Reader: ${userMessage}
Owl: ${owlSay}
${mainTitle ? `Owl recommended: ${mainTitle}` : '(no book recommended this turn)'}

Return the updated long_term + at most one topic candidate, per the schema.`;
}
