// ============================================================
// owlry — The Council Room: what comes back from the three recall calls,
// made safe. The schema fixes the shape; this file fixes the content:
// sizes, enums, duplicates, and the one thing the client must never be
// allowed to forget — a quote the model recalled is "attributed", not
// verified, whatever the model said about its own certainty. It is pure
// (no Deno, no network) so it can be checked without a key.
// ============================================================
import type { ReaderLang } from '../lang.ts';
import { MIND_AXES, MIND_CATEGORIES } from './schemas.ts';
import type { BookReply, CastReply, FigureReply, MindAxis, MindCategory, QuoteCertainty, QuoteLang } from './schemas.ts';
import { normalizeQuote, type Dossier } from './quotes.ts';

/** a recalled quote — the client's Quote plus what the model said about it and where it came from */
export interface MindQuote {
  text: string;
  lang: QuoteLang;
  source: { work: string; loc?: string };
  gloss?: string;
  certainty: QuoteCertainty;
  provenance: 'model';
}

export interface MindSeat {
  /** the id the client would give this figure — equals the curated id when the model cast a catalogue thinker */
  id: string;
  name: string;
  canonicalName: string;
  short: string;
  label: string;
  role: string;
  why: string;
  stance: string;
  book: { title: string; year: string };
}

export interface MindCast {
  title: string;
  seats: [MindSeat, MindSeat, MindSeat];
}

/** the client's Figure (src/content/types.ts) minus portrait and colour, plus provenance */
export interface MindFigure {
  id: string;
  canonicalName: string;
  name: string;
  short: string;
  role: string;
  label: string;
  initials: string;
  born: number | null;
  died: number | null;
  bio: string;
  works: { title: string; originalTitle: string; year: string }[];
  quotes: MindQuote[];
  voice: { followUp: string[]; context: string[]; passage: string[]; direct: string[] };
  provenance: 'model';
  model: string;
  lang: ReaderLang;
}

/** the client's Book minus palette, isbn and the reading text — `guide` becomes a `text` of kind "guide" there */
export interface MindBook {
  id: string;
  canonicalTitle: string;
  canonicalAuthor: string;
  authorId: string;
  title: string;
  authorName: string;
  year: number;
  category: MindCategory;
  axes: MindAxis[];
  tags: string[];
  blurb: string;
  quote: MindQuote | null;
  summary: { gist: string; ideas: string[] };
  start: { label: string; title: string; why: string };
  guide: { heading: string; paragraphs: string[] };
  provenance: 'model';
  model: string;
  lang: ReaderLang;
}

export const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const strings = (v: unknown, max: number, each: number): string[] =>
  (Array.isArray(v) ? v : []).map((x) => str(x, each)).filter(Boolean).slice(0, max);

/** the Latin letters NFKD leaves whole (no diacritic to strip): ø æ œ ß ð þ ł đ ı → their ascii spellings */
const LETTERS: Record<string, string> = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', ð: 'd', þ: 'th', ł: 'l', đ: 'd', ı: 'i' };
const fold = (s: string): string =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[øæœßðþłđı]/g, (c) => LETTERS[c] ?? c);

/** the cache key for a name or a title: ascii-folded, hyphenated; Chinese kept as it is */
export function keyOf(s: string): string {
  return fold(s).replace(/[^a-z0-9㐀-鿿]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
}

/** an ascii id in the catalogue's style ("marcus-aurelius"); empty when the name has no Latin letters */
export function slug(s: string): string {
  return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
}

/** two letters for the avatar: initials of the first and last word, or the first character of a Chinese name */
export function initialsOf(name: string): string {
  const words = name.split(/[\s·•]+/).filter(Boolean);
  if (!words.length) return '?';
  if (/^[㐀-鿿]/.test(words[0])) return words[0].slice(0, 1);
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? words[words.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase() || '?';
}

const isLang = (v: unknown): v is QuoteLang => v === 'en' || v === 'zh' || v === 'other';

function coerceQuote(raw: unknown): MindQuote | null {
  if (!raw || typeof raw !== 'object') return null;
  const q = raw as Record<string, unknown>;
  const src = (q.source ?? {}) as Record<string, unknown>;
  const text = str(q.text, 400);
  const work = str(src.work, 120);
  // a quote without its work is a rumour, not a quote
  if (!text || !work) return null;
  const loc = str(src.loc, 120);
  const gloss = str(q.gloss, 600);
  return {
    text,
    lang: isLang(q.lang) ? q.lang : 'other',
    source: loc ? { work, loc } : { work },
    ...(gloss ? { gloss } : {}),
    // the model's word for its own confidence; the label the reader sees is decided by provenance, not by this
    certainty: q.certainty === 'exact' ? 'exact' : 'attributed',
    provenance: 'model',
  };
}

/** the usable quotes, most certain first, without duplicates */
export function coerceQuotes(raw: unknown, max = 5): MindQuote[] {
  const out: MindQuote[] = [];
  const seen = new Set<string>();
  for (const r of Array.isArray(raw) ? raw : []) {
    const q = coerceQuote(r);
    if (!q) continue;
    const key = normalizeQuote(q.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(q);
    if (out.length >= max) break;
  }
  return out;
}

export function coerceCast(parsed: CastReply): MindCast | null {
  const seats: MindSeat[] = [];
  for (const raw of Array.isArray(parsed?.seats) ? parsed.seats.slice(0, 3) : []) {
    const s = (raw ?? {}) as unknown as Record<string, unknown>;
    const name = str(s.name, 80);
    const canonicalName = str(s.canonicalName, 80) || name;
    if (!name) return null;
    const book = (s.book ?? {}) as Record<string, unknown>;
    seats.push({
      id: slug(canonicalName) || keyOf(name),
      name,
      canonicalName,
      short: str(s.short, 40) || name.split(/\s+/)[0],
      label: str(s.label, 60),
      role: str(s.role, 160),
      why: str(s.why, 240),
      stance: str(s.stance, 300),
      book: { title: str(book.title, 160), year: str(book.year, 40) },
    });
  }
  // three different people, or it is not a council
  if (seats.length !== 3 || new Set(seats.map((s) => s.id)).size !== 3) return null;
  return { title: str(parsed.title, 60), seats: seats as [MindSeat, MindSeat, MindSeat] };
}

/** the words a seat speaks when the live council cannot reach a moment and the model gave no line for it */
const VOICE_FALLBACK: Record<ReaderLang, MindFigure['voice']> = {
  en: {
    followUp: ['You ask "{q}". Let me answer from what I actually wrote rather than from a slogan: take the idea, apply it to your case, and see what it changes.'],
    context: ['Given that {ctx}, my answer narrows rather than changes — the same idea, held closer to your situation.'],
    passage: ['"{passage}" — from {book}. Read it once more, slowly; the argument is in the second half of the sentence.'],
    direct: ['You ask me directly, so I will be plain: "{q}" is a question my work answers only in part, and I will tell you which part.'],
  },
  zh: {
    followUp: ['你问「{q}」。让我从我真正写过的东西出发来回答，而不是从口号出发：拿起那个想法，放到你的处境里，看它改变了什么。'],
    context: ['既然{ctx}，我的回答不是改变，而是收窄——同一个想法，贴着你的处境再说一遍。'],
    passage: ['「{passage}」——出自{book}。再慢慢读一遍；论证藏在句子的后半段。'],
    direct: ['你直接问我，那我就直说：「{q}」这个问题，我的著作只回答了一部分，我会告诉你是哪一部分。'],
  },
};

export function coerceFigure(parsed: FigureReply, asked: string, lang: ReaderLang, model: string): MindFigure | null {
  if (!parsed || parsed.known !== true) return null;
  const canonicalName = str(parsed.canonicalName, 80) || asked;
  const name = str(parsed.name, 80) || canonicalName;
  const id = slug(canonicalName) || keyOf(name);
  if (!id) return null;
  const v = (parsed.voice ?? {}) as Record<string, unknown>;
  const voice = {
    followUp: strings(v.followUp, 2, 300),
    context: strings(v.context, 1, 300),
    passage: strings(v.passage, 1, 300),
    direct: strings(v.direct, 1, 300),
  };
  for (const k of ['followUp', 'context', 'passage', 'direct'] as const) if (!voice[k].length) voice[k] = VOICE_FALLBACK[lang][k];
  const year = (x: unknown): number | null => (typeof x === 'number' && Number.isInteger(x) && x > -4000 && x < 2100 ? x : null);
  const works = (Array.isArray(parsed.works) ? parsed.works : [])
    .map((w) => {
      const x = (w ?? {}) as Record<string, unknown>;
      const title = str(x.title, 120);
      return { title, originalTitle: str(x.originalTitle, 120) || title, year: str(x.year, 40) };
    })
    .filter((w) => w.title)
    .slice(0, 4);
  return {
    id,
    canonicalName,
    name,
    short: str(parsed.short, 40) || name.split(/\s+/)[0],
    role: str(parsed.role, 160),
    label: str(parsed.label, 60),
    initials: initialsOf(name),
    born: year(parsed.born),
    died: year(parsed.died),
    bio: str(parsed.bio, 700),
    works,
    quotes: coerceQuotes(parsed.quotes),
    voice,
    provenance: 'model',
    model,
    lang,
  };
}

const isCategory = (v: unknown): v is MindCategory => (MIND_CATEGORIES as readonly unknown[]).includes(v);
const isAxis = (v: unknown): v is MindAxis => (MIND_AXES as readonly unknown[]).includes(v);

export function coerceBook(parsed: BookReply, askedTitle: string, askedAuthor: string, lang: ReaderLang, model: string): MindBook | null {
  if (!parsed || parsed.known !== true) return null;
  const canonicalTitle = str(parsed.canonicalTitle, 160) || askedTitle;
  const canonicalAuthor = str(parsed.canonicalAuthor, 80) || askedAuthor;
  const title = str(parsed.title, 160) || canonicalTitle;
  const authorName = str(parsed.authorName, 80) || canonicalAuthor;
  const id = slug(canonicalTitle) || keyOf(title);
  const authorId = slug(canonicalAuthor) || keyOf(authorName);
  if (!id || !authorId) return null;
  const year = typeof parsed.year === 'number' && Number.isInteger(parsed.year) && parsed.year > -4000 && parsed.year < 2100 ? parsed.year : 0;
  const axes = (Array.isArray(parsed.axes) ? parsed.axes : []).filter(isAxis).slice(0, 3);
  const summary = (parsed.summary ?? {}) as Record<string, unknown>;
  const start = (parsed.start ?? {}) as Record<string, unknown>;
  const guide = (parsed.guide ?? {}) as Record<string, unknown>;
  const paragraphs = strings(guide.paragraphs, 6, 900);
  const gist = str(summary.gist, 900);
  // a card with no argument and no guide is a title, not a book — the client has nothing to show
  if (!gist && !paragraphs.length) return null;
  return {
    id,
    canonicalTitle,
    canonicalAuthor,
    authorId,
    title,
    authorName,
    year,
    category: isCategory(parsed.category) ? parsed.category : 'Philosophy',
    axes: axes.length ? axes : ['philosophy'],
    tags: strings(parsed.tags, 5, 30),
    blurb: str(parsed.blurb, 300),
    quote: coerceQuotes([parsed.quote], 1)[0] ?? null,
    summary: { gist, ideas: strings(summary.ideas, 5, 300) },
    start: { label: str(start.label, 60), title: str(start.title, 160), why: str(start.why, 400) },
    guide: { heading: str(guide.heading, 120) || str(start.label, 60), paragraphs },
    provenance: 'model',
    model,
    lang,
  };
}

/**
 * The dossier open/turn expect, built from a recalled figure — the shape the
 * client sends for a seat that is not in the curated catalogue. Its quotes
 * carry provenance "model", so the council may copy them and the reader sees
 * "attributed" (quotes.ts), never "verbatim".
 */
export function dossierOf(f: MindFigure, book?: { id: string; title: string }): Dossier {
  return {
    id: f.id,
    name: f.name,
    short: f.short,
    role: f.role,
    label: f.label,
    bio: f.bio,
    works: f.works.map((w) => ({ title: w.title, year: w.year })),
    quotes: f.quotes.map((q) => ({ text: q.text, source: { work: q.source.work, loc: q.source.loc }, provenance: 'model' as const })),
    bookId: book?.id ?? '',
    bookTitle: book?.title ?? f.works[0]?.title ?? '',
  };
}
