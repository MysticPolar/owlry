/* ============================================================
   The minds registry — recalled cards behind the content accessors.

   A thinker the catalogue lacks arrives as a card the model wrote
   (council-chat mode `figure` / `book`, see src/lib/councilClient.ts).
   `figure(id)` and `book(id)` fall back here before throwing, so every
   screen keeps reading content through the same two functions and never
   learns where a card came from — except through `recalled`, which is
   what makes a quotation render as "attributed" instead of "verbatim".

   Module-level state, no store import: figures.ts and books.ts import
   this file, and the store imports those. The store owns the durable
   copy (its `minds` slice) and pushes it in here on rehydrate and on
   every change; a cast registers placeholders so a seat has a name the
   moment the council is seated, before any card has landed.
   ============================================================ */
import type { Book, Category, Figure, Quote } from './types';
import type { CastInfo, CastSeat } from '../store/types';
import type { MindBook, MindFigure, MindQuote } from '../lib/councilClient';
import { BOOKS_1 } from './books-1';
import { BOOKS_2 } from './books-2';
import { getActiveLang, type Lang } from '../i18n';
import { UI } from '../i18n/ui';
import { initialsOf } from '../lib/minds';

const mindKey = (id: string, lang: Lang) => `${id}|${lang}`;
const otherLang = (lang: Lang): Lang => (lang === 'zh' ? 'en' : 'zh');

/* ---------- what is held ---------- */

const figureCards = new Map<string, MindFigure>();
const bookCards = new Map<string, MindBook>();
/** the cast seat a figure id came from — the placeholder's source, and the name to ask the model for */
const seatSeeds = new Map<string, CastSeat>();
/** the book a cast seat named, under the client's id — the placeholder's source */
const bookSeeds = new Map<string, BookSeed>();

export interface BookSeed {
  id: string;
  title: string;
  year: string;
  authorId: string;
  authorName: string;
}

/** the curated figures' colours, handed in by figures.ts so a recalled avatar sits in the same palette */
let figureColors: string[] = [];
export function registerFigureColors(colors: string[]): void {
  if (colors.length) figureColors = colors;
}

/* ---------- registering ---------- */

/* a derived Figure/Book is keyed by the card object itself, so a replaced card simply derives afresh and the old one is forgotten */
export function registerFigureCard(card: MindFigure): void {
  figureCards.set(mindKey(card.id, card.lang), card);
}

export function registerBookCard(card: MindBook): void {
  bookCards.set(mindKey(card.id, card.lang), card);
}

/** placeholders for every seat and alternate of a cast, and their books — a real card always wins over them */
export function registerCast(cast: CastInfo): void {
  for (const seat of [...cast.seats, ...cast.alternates]) {
    seatSeeds.set(seat.id, seat);
    if (seat.bookId) bookSeeds.set(seat.bookId, { id: seat.bookId, title: seat.bookTitle, year: seat.bookYear, authorId: seat.id, authorName: seat.name });
  }
  placeholders.clear();
}

/** the store's whole slice at once (rehydrate, reset, every change) — a card already held under its key is left as it is */
export function registerMinds(minds: { figures: Record<string, MindFigure>; books: Record<string, MindBook> }): void {
  for (const card of Object.values(minds.figures)) if (figureCards.get(mindKey(card.id, card.lang)) !== card) registerFigureCard(card);
  for (const card of Object.values(minds.books)) if (bookCards.get(mindKey(card.id, card.lang)) !== card) registerBookCard(card);
}

/* ---------- looking up ---------- */

export const figureCard = (id: string, lang: Lang): MindFigure | undefined => figureCards.get(mindKey(id, lang));
export const bookCard = (id: string, lang: Lang): MindBook | undefined => bookCards.get(mindKey(id, lang));
export const castSeatOf = (id: string): CastSeat | undefined => seatSeeds.get(id);
export const bookSeedOf = (id: string): BookSeed | undefined => bookSeeds.get(id);

/** the active language's card, else the other language's, else the placeholder from the cast */
export function mindFigure(id: string): Figure | undefined {
  const lang = getActiveLang();
  const card = figureCards.get(mindKey(id, lang)) ?? figureCards.get(mindKey(id, otherLang(lang)));
  if (card) return figureFromCard(card);
  const seed = seatSeeds.get(id);
  return seed ? placeholderFigure(seed, lang) : undefined;
}

export function mindBook(id: string): Book | undefined {
  const lang = getActiveLang();
  const card = bookCards.get(mindKey(id, lang)) ?? bookCards.get(mindKey(id, otherLang(lang)));
  if (card) return bookFromCard(card);
  const seed = bookSeeds.get(id);
  return seed ? placeholderBook(seed, lang) : undefined;
}

/* ---------- card → content shape ---------- */

/* a derived Figure/Book is built once per card; placeholders once per id and language (their voice is the dictionary's) */
const derivedFigures = new WeakMap<MindFigure, Figure>();
const derivedBooks = new WeakMap<MindBook, Book>();
const placeholders = new Map<string, Figure | Book>();

/** a stable pick from the curated palette, so a thinker keeps their colour across sessions and devices */
function colorFor(id: string): string {
  if (!figureColors.length) return '#5B4A3A';
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return figureColors[h % figureColors.length];
}

function quoteOf(q: MindQuote): Quote {
  return { text: q.text, source: { work: q.source.work, ...(q.source.loc ? { loc: q.source.loc } : {}) }, ...(q.gloss ? { gloss: q.gloss } : {}) };
}

/** the card's lines, the dictionary's where the model left a slot empty */
function voiceOf(v: Partial<MindFigure['voice']> | undefined, lang: Lang): Figure['voice'] {
  const d = UI[lang].cast.voice;
  const pick = (k: keyof Figure['voice']) => (v?.[k]?.length ? v[k] as string[] : d[k]);
  return { followUp: pick('followUp'), context: pick('context'), passage: pick('passage'), direct: pick('direct') };
}

/** the card's works, with the cast's book linked — added as a work of its own when the model listed it under another title */
function worksOf(id: string, works: { title: string; year: string }[]): Figure['works'] {
  const seed = seatSeeds.get(id);
  const out: Figure['works'] = works.map((w) => ({ title: w.title, year: w.year }));
  if (!seed?.bookId) return out;
  const want = seed.bookTitle.trim().toLowerCase();
  const hit = want ? out.find((w) => w.title.trim().toLowerCase() === want) : undefined;
  if (hit) hit.bookId = seed.bookId;
  else out.unshift({ title: seed.bookTitle, year: seed.bookYear, bookId: seed.bookId });
  return out;
}

function figureFromCard(card: MindFigure): Figure {
  const hit = derivedFigures.get(card);
  if (hit) return hit;
  const out: Figure = {
    id: card.id,
    name: card.name,
    short: card.short,
    role: card.role,
    label: card.label,
    initials: card.initials || initialsOf(card.name),
    color: colorFor(card.id),
    bio: card.bio,
    works: worksOf(card.id, card.works),
    quotes: card.quotes.map(quoteOf),
    voice: voiceOf(card.voice, card.lang),
    recalled: true,
  };
  derivedFigures.set(card, out);
  return out;
}

function placeholderFigure(seat: CastSeat, lang: Lang): Figure {
  const key = `f|${mindKey(seat.id, lang)}`;
  const hit = placeholders.get(key) as Figure | undefined;
  if (hit) return hit;
  const out: Figure = {
    id: seat.id,
    name: seat.name,
    short: seat.short || seat.name,
    role: seat.role,
    label: seat.label,
    initials: initialsOf(seat.name),
    color: colorFor(seat.id),
    bio: '',
    works: seat.bookId ? [{ title: seat.bookTitle, year: seat.bookYear, bookId: seat.bookId }] : [],
    quotes: [],
    voice: voiceOf(undefined, lang),
    recalled: true,
    pending: true,
  };
  placeholders.set(key, out);
  return out;
}

const DEFAULT_PALETTE = { bg: '#2B2A33', fg: '#F3EEE2' };

/** the cover colours of the first curated book on the same shelf, so a recalled book looks at home there */
function paletteFor(category: Category): Book['palette'] {
  return [...BOOKS_1, ...BOOKS_2].find((b) => b.category === category)?.palette ?? DEFAULT_PALETTE;
}

function bookFromCard(card: MindBook): Book {
  const hit = derivedBooks.get(card);
  if (hit) return hit;
  const out: Book = {
    id: card.id,
    title: card.title,
    authorId: card.authorId,
    authorName: card.authorName,
    year: card.year,
    category: card.category,
    axes: card.axes,
    tags: card.tags,
    palette: paletteFor(card.category),
    blurb: card.blurb,
    ...(card.quote ? { quote: quoteOf(card.quote) } : {}),
    summary: card.summary,
    start: card.start,
    text: {
      kind: 'guide',
      heading: card.guide.heading || card.start.label,
      note: UI[card.lang].book.guideNote,
      paragraphs: card.guide.paragraphs,
    },
    recalled: true,
  };
  derivedBooks.set(card, out);
  return out;
}

function placeholderBook(seed: BookSeed, lang: Lang): Book {
  const key = `b|${mindKey(seed.id, lang)}`;
  const hit = placeholders.get(key) as Book | undefined;
  if (hit) return hit;
  const year = /^\s*-?\d+\s*$/.test(seed.year) ? Number(seed.year) : 0;
  const out: Book = {
    id: seed.id,
    title: seed.title,
    authorId: seed.authorId,
    authorName: seed.authorName,
    year,
    category: 'Philosophy',
    axes: ['philosophy'],
    tags: [],
    palette: paletteFor('Philosophy'),
    blurb: '',
    summary: { gist: '', ideas: [] },
    start: { label: '', title: '', why: '' },
    text: { kind: 'guide', heading: '', note: UI[lang].book.guideNote, paragraphs: [] },
    recalled: true,
    pending: true,
  };
  placeholders.set(key, out);
  return out;
}
