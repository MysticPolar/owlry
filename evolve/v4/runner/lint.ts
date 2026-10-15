// Topicality lint: a challenger's ADDED text may not contain a topic word of
// any Set A question, a category name, or a category conditional. This is the
// deterministic guard against the Optimizer tuning the prompt to the five
// questions it can see.
//
// Topic words are curated once per Set A question and stored in sets/setA.json
// (`topicWords`), because a bag-of-words extraction flags common verbs ("offer",
// "decide") that any general rule may use. `candidateTopicWords()` proposes the
// list from the question text; a person prunes it when the set is created.
// A word that already appears in the champion prompt is never flagged: adding it
// again cannot leak the question into the prompt.

const STOP = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "so", "of", "to", "in", "on", "at", "by", "for", "with", "from",
  "into", "than", "as", "is", "am", "are", "was", "were", "be", "been", "being", "do", "does", "did", "have", "has", "had",
  "i", "me", "my", "mine", "we", "us", "our", "you", "your", "yours", "he", "she", "it", "its", "they", "them", "their",
  "this", "that", "these", "those", "there", "here", "what", "which", "who", "whom", "how", "why", "when", "where",
  "not", "no", "nor", "now", "just", "very", "too", "also", "only", "even", "still", "yet", "all", "any", "some", "most",
  "more", "less", "many", "much", "one", "two", "three", "each", "every", "both", "either", "neither", "other", "another",
  "can", "could", "should", "would", "will", "shall", "may", "might", "must", "need", "want", "wants", "like", "feel",
  "feels", "sure", "really", "something", "nothing", "anything", "everything", "thing", "things", "got", "get", "gets",
  "started", "start", "last", "week", "weeks", "day", "days", "month", "months", "year", "years", "time", "times",
  "ago", "new", "old", "long", "short", "way", "ways", "say", "said", "know", "knows", "think", "thinks", "figure", "out",
  "whether", "always", "never", "part", "parts", "decide", "decides", "offer", "offers", "worth", "makes", "make", "making",
]);

export interface LintOptions {
  minWordLength: number;   // 4
  allow: string[];         // product-generic words never flagged (user, debate, mind, …)
}

/** Light stemmer. Imperfect by design; `variants` covers the common misses (make/making, marry/married). */
export function stem(w: string): string {
  let s = w.toLowerCase().replace(/[^a-z]/g, "");
  if (s.endsWith("ies") && s.length > 4) s = s.slice(0, -3) + "y";
  else if (s.endsWith("ied") && s.length > 4) s = s.slice(0, -3) + "y";
  else if (s.endsWith("ing") && s.length > 5) s = s.slice(0, -3);
  else if (s.endsWith("ed") && s.length > 4) s = s.slice(0, -2);
  else if (/(ss|x|z|ch|sh)es$/.test(s) && s.length > 4) s = s.slice(0, -2);
  else if (s.endsWith("s") && !s.endsWith("ss") && s.length > 3) s = s.slice(0, -1);
  return s;
}

/** The stem plus the spellings a different inflection would stem to. */
export function variants(s: string): string[] {
  const out = new Set([s]);
  if (!s.endsWith("e")) out.add(s + "e");          // mak -> make, commut -> commute
  if (s.endsWith("e")) out.add(s.slice(0, -1));
  if (s.endsWith("i")) out.add(s.slice(0, -1) + "y");
  return [...out];
}

export function tokens(text: string): string[] {
  return (text ?? "").split(/[^A-Za-z’']+/).map((w) => w.replace(/[’']/g, "")).filter(Boolean);
}

/** Candidate topic words extracted from question texts: a proposal for the curated list, not the list itself. */
export function candidateTopicWords(questions: string[], o: LintOptions): string[] {
  const allow = new Set(o.allow.map(stem));
  const out = new Set<string>();
  for (const q of questions) {
    for (const w of tokens(q)) {
      const lw = w.toLowerCase();
      if (lw.length < o.minWordLength || STOP.has(lw)) continue;
      const s = stem(lw);
      if (!s || allow.has(s) || STOP.has(s)) continue;
      out.add(s);
    }
  }
  return [...out].sort();
}

/** The stemmed topic set from curated lists (one list per question), with inflection variants. */
export function topicSet(curated: string[][]): Set<string> {
  const out = new Set<string>();
  for (const list of curated) for (const w of list) for (const v of variants(stem(w))) if (v.length >= 3) out.add(v);
  return out;
}

const CATEGORY_WORDS = ["health", "wealth", "love", "purpose", "wonder"];
const CATEGORY_CONDITIONAL = /\bfor (?:a |an |any )?(?:health|wealth|love|purpose|wonder|medical|financial|money|relationship|romantic|career|factual|scientific|geograph\w+)\b[^.]{0,40}\b(?:question|situation|topic|case|problem)s?\b/i;

export interface LintResult { ok: boolean; hits: string[] }

/** Lines of `after` that are not in `before` (the added text of a diff). */
export function addedText(before: string, after: string): string {
  const old = new Set(before.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
  return after.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !old.has(l)).join("\n");
}

export function lintText(added: string, topic: Set<string>, o: LintOptions, alreadyInBase: Set<string> = new Set()): LintResult {
  const hits = new Set<string>();
  const allow = new Set(o.allow.map(stem));
  for (const w of tokens(added)) {
    const lw = w.toLowerCase();
    if (lw.length < o.minWordLength || STOP.has(lw)) continue;
    const s = stem(lw);
    if (allow.has(s) || alreadyInBase.has(s)) continue;
    if (topic.has(s)) hits.add(`topic word: ${w}`);
    if (CATEGORY_WORDS.includes(lw)) hits.add(`category name: ${w}`);
  }
  const m = added.match(CATEGORY_CONDITIONAL);
  if (m) hits.add(`category conditional: "${m[0].trim()}"`);
  return { ok: hits.size === 0, hits: [...hits] };
}

/** Lint a challenger against the curated topic lists; words already in the champion prompt are never hits. */
export function lintDiff(before: string, after: string, curatedTopicWords: string[][], o: LintOptions): LintResult {
  const base = new Set(tokens(before).map((w) => stem(w.toLowerCase())));
  return lintText(addedText(before, after), topicSet(curatedTopicWords), o, base);
}
