/* ============================================================
   owlry — the v2 owl wire (Scout).

   Replaces the old HEAD/---/BODY contract (owlContract.ts) with the
   shape returned by the live owl-chat v2 edge function: a single
   JSON object with a prose "say" line plus structured book metadata.
   The 3-tier say→bubble mapper below finds each recommended title
   inside "say" (exact substring → case-insensitive span →
   deterministic append) so the reader's chat bubble stays real,
   clickable React exactly like the mockup and the offline brain.

   mapChatV2() registers every mentioned book in the runtime registry
   (bookRegistry.ts) and returns the SAME `OwlReply` shape the store
   and UI already consume — sendToOwl needs no changes.
   ============================================================ */
import type { MsgNode, OwlReply } from './owlBrain';
import { slugify, deriveCover } from './cover';
import { registerBook } from './bookRegistry';
import type { Book, BookRef, Genre } from '../content/types';

/* ---------- the wire shape (owl-chat v2 response) ---------- */

export interface ScoutBook {
  title: string;
  author: string;
  pages: number;
  blurb: string;
  tagline: string;
  genre: Genre;
  rating: string | null;
  bio: string | null;
}

export interface ScoutPick {
  title: string;
  author: string;
  note: string;
}

export interface ChatV2Response {
  say: string;
  main: ScoutBook | null;
  picks: ScoutPick[];
  note: string | null;
  chips: string[];
  slug: string | null;
}

/* ---------- validation (never trust the network response) ---------- */

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

function isValidPick(p: unknown): p is ScoutPick {
  if (!p || typeof p !== 'object') return false;
  const r = p as Record<string, unknown>;
  return isStr(r.title) && typeof r.author === 'string' && typeof r.note === 'string';
}

export function validateChatV2(raw: unknown): { ok: true; res: ChatV2Response } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const r = raw as Record<string, unknown> | null;
  if (!r || typeof r !== 'object') return { ok: false, errors: ['response is not an object'] };

  if (!isStr(r.say)) errors.push('say must be a non-empty string');

  if (r.main !== null) {
    const m = r.main as Record<string, unknown> | undefined;
    if (!m || typeof m !== 'object') errors.push('main must be an object or null');
    else {
      if (!isStr(m.title)) errors.push('main.title required');
      if (typeof m.author !== 'string') errors.push('main.author required');
      if (typeof m.pages !== 'number') errors.push('main.pages must be a number');
      if (typeof m.blurb !== 'string') errors.push('main.blurb required');
    }
  }

  if (!Array.isArray(r.picks) || !r.picks.every(isValidPick)) errors.push('picks must be [{title, author, note}]');
  if (!Array.isArray(r.chips) || !r.chips.every((c) => typeof c === 'string')) errors.push('chips must be a string array');
  if (r.note !== null && typeof r.note !== 'string') errors.push('note must be a string or null');
  if ('slug' in r && r.slug !== null && typeof r.slug !== 'string') errors.push('slug must be a string or null');

  return errors.length ? { ok: false, errors } : { ok: true, res: raw as ChatV2Response };
}

/* ---------- mapping book metadata → the registry's Book shape ---------- */

export function recToBook(r: ScoutBook): Book {
  const cover = deriveCover(r.title, r.author);
  return {
    t: r.title,
    a: r.author,
    n: r.pages,
    q: r.tagline || r.blurb,
    i: r.blurb,
    g: r.genre,
    r: r.rating ?? undefined,
    w: r.bio ?? undefined,
    ...cover,
  };
}

export function recToBookLite(p: ScoutPick): Book {
  const cover = deriveCover(p.title, p.author);
  return { t: p.title, a: p.author, n: 0, q: p.note, i: p.note, g: 'fiction', ...cover };
}

/* ---------- the 3-tier say→bubble mapper ---------- */

/**
 * Split `say` into MsgNodes, turning each of `titles` (processed in order)
 * into a clickable book node: exact substring match first, then a
 * case-insensitive span (preserving the model's casing), and finally — for
 * any title that never appears verbatim in the text — a deterministic
 * append so the recommendation is still clickable rather than silently lost.
 */
export function splitSayIntoNodes(say: string, titles: string[], slugOf: (title: string) => string): MsgNode[] {
  const nodes: MsgNode[] = [];
  let cursor = 0;
  const missing: string[] = [];

  for (const title of titles) {
    if (!title) continue;
    const rest = say.slice(cursor);
    let idx = rest.indexOf(title);
    let matchedText = title;
    if (idx === -1) {
      idx = rest.toLowerCase().indexOf(title.toLowerCase());
      if (idx !== -1) matchedText = rest.slice(idx, idx + title.length);
    }
    if (idx === -1) {
      missing.push(title);
      continue;
    }
    const absStart = cursor + idx;
    const absEnd = absStart + matchedText.length;
    if (absStart > cursor) nodes.push({ t: 'text', v: say.slice(cursor, absStart) });
    nodes.push({ t: 'book', id: slugOf(title), v: matchedText });
    cursor = absEnd;
  }

  if (cursor < say.length) nodes.push({ t: 'text', v: say.slice(cursor) });
  for (const title of missing) {
    nodes.push({ t: 'text', v: nodes.length ? ' — ' : '' });
    nodes.push({ t: 'book', id: slugOf(title), v: title });
  }
  if (!nodes.length) nodes.push({ t: 'text', v: say });
  return nodes;
}

/* ---------- mapping (wire → the shapes the UI renders) ---------- */

/**
 * Map a validated owl-chat v2 response to the exact `OwlReply` the store
 * and UI already consume (unchanged from the earlier HEAD/---/BODY wire),
 * registering every mentioned book. `letter` is only set for a genuine
 * "sort a letter" turn (`main` present) — a fiction/further-reading hand-off
 * (`picks` only) populates the tray/strip but offers no letter, matching the
 * offline brain's fictionReply().
 */
export function mapChatV2(res: ChatV2Response): OwlReply {
  const titles: string[] = res.main ? [res.main.title] : res.picks.map((p) => p.title);
  const bubble = splitSayIntoNodes(res.say, titles, slugify);
  const note = res.note ?? undefined;

  if (res.main) {
    const slug = res.slug ?? slugify(res.main.title);
    registerBook(slug, recToBook(res.main));
    // the sidelong picks ride along as the rest of the dealt hand (the UI deals
    // up to three cards per turn; the letter stays the lead)
    const also: BookRef[] = res.picks
      .map((p) => {
        const s = slugify(p.title);
        if (s === slug) return null;
        registerBook(s, recToBookLite(p));
        return s;
      })
      .filter((s): s is BookRef => !!s);
    return {
      msgs: [bubble],
      letter: slug,
      batch: { main: slug, also },
      note,
      chips: res.chips,
    };
  }

  if (res.picks.length) {
    const slugs: BookRef[] = res.picks.map((p) => {
      const s = slugify(p.title);
      registerBook(s, recToBookLite(p));
      return s;
    });
    return {
      msgs: [bubble],
      batch: { main: slugs[0], also: slugs.slice(1) },
      note,
      chips: res.chips,
    };
  }

  // a genuine clarify/ask turn — no book at all
  return { msgs: [bubble], note, chips: res.chips };
}
