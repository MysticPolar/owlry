/* ============================================================
   owlry — chat hydration.

   Rebuilds today's ChatItem[] (+ tray + strip + chips) from persisted
   owlry_chat_messages rows, so reloading mid-day restores the exact
   conversation instead of resetting to the greeting. Every mentioned
   book is re-registered in the runtime registry so Cover/Tray/Sheet/
   Letter resolve it exactly as they did when it first arrived.

   The desk shelf is NOT rebuilt from recommendations — only from books
   the reader actually peeked (openedLetters ∩ mentioned). Auto-shelving
   every dealt hand made the Peek flight a no-op.
   ============================================================ */
import type { OwlBatch } from './owlBrain';
import { slugify } from './cover';
import { registerBook } from './bookRegistry';
import type { DynamicRegistryScope } from './bookRegistry';
import { recToBook, recToBookLite, splitSayIntoNodes } from './owlWireV2';
import { dealHand } from './dealHand';
import type { ScoutBook, ScoutPick } from './owlWireV2';
import type { BookRef } from '../content/types';
import type { ChatItem } from '../store/types';

/** one row of the persisted transcript (owlry_chat_messages) */
export interface ChatRow {
  id: number;
  who: 'me' | 'owl';
  kind: 'msg' | 'letter' | 'note';
  payload: Record<string, unknown>;
}

export interface HydratedChat {
  messages: ChatItem[];
  /** books Scout named today — metadata / shelf ∩ peeks, not auto-shelved */
  mentioned: BookRef[];
  lastBatch: OwlBatch | null;
  chips: string[];
  maxId: number;
}

/** Rebuild the chat state from rows in chronological (ascending created_at) order. */
export function rowsToChat(
  rows: ChatRow[],
  registryScope?: DynamicRegistryScope,
): HydratedChat {
  const messages: ChatItem[] = [];
  let mentioned: BookRef[] = [];
  let lastBatch: OwlBatch | null = null;
  let chips: string[] = [];
  let maxId = 0;
  /** slugs the turn just above dealt, so its legacy letter row isn't doubled */
  let dealtSlugs: BookRef[] = [];

  const remember = (slug: BookRef) => {
    if (!mentioned.includes(slug)) mentioned = [...mentioned, slug];
  };

  for (const row of rows) {
    maxId = Math.max(maxId, row.id);

    if (row.who === 'me' && row.kind === 'msg') {
      const text = String(row.payload.text ?? '');
      messages.push({ kind: 'msg', id: row.id, who: 'me', nodes: [{ t: 'text', v: text }] });
      continue;
    }

    if (row.who === 'owl' && row.kind === 'msg') {
      const say = String(row.payload.say ?? '');
      const main = (row.payload.main ?? null) as ScoutBook | null;
      const picks = (row.payload.picks ?? []) as ScoutPick[];
      const rowChips = (row.payload.chips ?? []) as string[];

      const titles = main ? [main.title] : picks.map((p) => p.title);
      const bubble = splitSayIntoNodes(say, titles, slugify);

      let turnSlugs: BookRef[] = [];
      if (main) {
        const slug = slugify(main.title);
        registerBook(slug, recToBook(main), registryScope);
        lastBatch = { main: slug, also: [] };
        remember(slug);
        turnSlugs = [slug];
      } else if (picks.length) {
        const slugs = picks.map((p) => {
          const s = slugify(p.title);
          registerBook(s, recToBookLite(p), registryScope);
          remember(s);
          return s;
        });
        lastBatch = { main: slugs[0], also: slugs.slice(1) };
        turnSlugs = slugs;
      }

      chips = rowChips;
      messages.push({ kind: 'msg', id: row.id, who: 'owl', nodes: bubble });

      // …and the hand that was dealt under it. The live turn fans a 'deal'
      // after the words settle; without this the cards were there when the
      // reply first landed and gone the next time the app opened.
      // Negative ids can never collide with a row id or a future nextId().
      if (turnSlugs.length) {
        dealtSlugs = turnSlugs;
        messages.push({ kind: 'deal', id: -row.id, books: dealHand(turnSlugs) });
      } else {
        dealtSlugs = [];
      }
      continue;
    }

    if (row.who === 'owl' && row.kind === 'letter') {
      const slug = String(row.payload.slug ?? '');
      const book = (row.payload.book ?? null) as ScoutBook | null;
      if (slug && book) {
        registerBook(slug, recToBook(book), registryScope);
        remember(slug);
      }
      // this turn already dealt that book as a card — a letter row for the same
      // slug is the older shape of the same moment, not a second one
      if (slug && dealtSlugs.includes(slug)) continue;
      messages.push({ kind: 'letter', id: row.id, book: slug });
      continue;
    }

    if (row.who === 'owl' && row.kind === 'note') {
      const text = String(row.payload.text ?? '');
      messages.push({ kind: 'msg', id: row.id, who: 'owl', nodes: [{ t: 'text', v: text }], tone: 'note' });
      continue;
    }
  }

  return { messages, mentioned, lastBatch, chips, maxId };
}

/** Shelf spines = books the reader peeked that Scout also named today. */
export function shelfFromPeeks(openedLetters: BookRef[], mentioned: BookRef[]): BookRef[] {
  if (!openedLetters.length || !mentioned.length) return [];
  const named = new Set(mentioned);
  return openedLetters.filter((id) => named.has(id));
}
