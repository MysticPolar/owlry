/* ============================================================
   owlry — the reading-letter (Peek) wire contract.

   Peek is fired only when the reader taps the letter card, and
   returns the reading letter on its own — a LetterWire that maps
   onto the exact `Guide` shape Letter.tsx already renders, so the
   rendered output matches the mockup. The letter is generated once,
   on tap, and typewriter-revealed.

   (The Scout turn — bubble + book pick — has its own wire in
   owlWireV2.ts; this file used to carry that contract too, back when
   the live owl spoke a custom HEAD/---/BODY format. It now speaks
   through the owl-chat/owl-peek Supabase edge functions instead —
   see docs/owl-chat-pipeline.md for the full history.)
   ============================================================ */
import { slugify, deriveCover } from './cover';
import { registerBook, registerGuide } from './bookRegistry';
import type { Book, BookRef, Genre, Guide, GuideInsight, GuideQuote } from '../content/types';

/** full metadata for a recommended book (tray + sheet + letter header) */
export interface RecBook {
  title: string;
  author: string;
  pages: number;
  blurb: string;
  tagline?: string;
  rating?: string;
  bio?: string;
  genre?: Genre;
}

/** lite metadata for strip companions */
export interface RecBookLite {
  title: string;
  author: string;
}

export interface LetterWire {
  res: string;
  chap: string;
  core: string;
  ins: GuideInsight[];
  close: string;
  take: string[];
  ask: string[];
  fr: { title: string; author: string; why: string }[];
}

/* ---------- validation (never trust the model's JSON) ---------- */

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** validate a parsed LETTER body (Peek's output) */
export function validateLetter(raw: unknown): { ok: true; letter: LetterWire } | { ok: false; errors: string[] } {
  const e: string[] = [];
  const L = raw as Record<string, unknown>;
  if (!L || typeof L !== 'object') return { ok: false, errors: ['letter is not an object'] };
  for (const k of ['res', 'chap', 'core', 'close'] as const) if (!isStr(L[k])) e.push(`letter.${k} required`);
  if (!Array.isArray(L.ins) || L.ins.length < 3) e.push('letter.ins needs ≥3 insights');
  if (!Array.isArray(L.take) || !L.take.length) e.push('letter.take required');
  if (!Array.isArray(L.ask) || !L.ask.length) e.push('letter.ask required');
  if (!Array.isArray(L.fr) || L.fr.length !== 3) e.push('letter.fr needs exactly 3 entries');
  return e.length ? { ok: false, errors: e } : { ok: true, letter: raw as LetterWire };
}

/* ---------- mapping (wire → the shapes the UI renders) ---------- */

export function recToBook(r: RecBook | RecBookLite): Book {
  const full = r as RecBook;
  const cover = deriveCover(r.title, r.author);
  return {
    t: r.title,
    a: r.author,
    n: full.pages ?? 0,
    q: full.tagline ?? full.blurb ?? '',
    i: full.blurb,
    g: full.genre ?? 'life',
    r: full.rating,
    w: full.bio,
    ...cover,
  };
}

const quote = (q?: GuideQuote): GuideQuote | undefined =>
  q && isStr(q.t) && isStr(q.by) ? { t: q.t, by: q.by } : undefined;

/**
 * Turn a validated LETTER wire into a Guide and register it under `ref` (so
 * Letter.tsx resolves it), registering the further-reading books too. Returns
 * the Guide. Called by fetchLetter() the first time a reader taps the card.
 */
export function registerLetter(ref: BookRef, wire: LetterWire): Guide {
  const fr = wire.fr.map((f) => {
    const slug = slugify(f.title);
    registerBook(slug, recToBook({ title: f.title, author: f.author, pages: 0, blurb: f.why }));
    return { id: slug, why: f.why };
  });
  const guide: Guide = {
    say: '',
    res: wire.res,
    chap: wire.chap,
    core: wire.core,
    ins: wire.ins.map((n) => ({ t: n.t, r: n.r, ex: n.ex, q: quote(n.q) })),
    close: wire.close,
    take: wire.take,
    ask: wire.ask,
    fr,
  };
  registerGuide(ref, guide);
  return guide;
}
