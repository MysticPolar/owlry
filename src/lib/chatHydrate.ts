/* ============================================================
   owlry — chat hydration.

   Rebuilds today's ChatItem[] (+ tray + strip + chips) from persisted
   owlry_chat_messages rows, so reloading mid-day restores the exact
   conversation instead of resetting to the greeting. Every mentioned
   book is re-registered in the runtime registry so Cover/Tray/Sheet/
   Letter resolve it exactly as they did when it first arrived.
   ============================================================ */
import type { OwlBatch } from './owlBrain';
import { slugify } from './cover';
import { registerBook } from './bookRegistry';
import type { DynamicRegistryScope } from './bookRegistry';
import { recToBook, recToBookLite, splitSayIntoNodes } from './owlWireV2';
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
  collected: BookRef[];
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
  let collected: BookRef[] = [];
  let lastBatch: OwlBatch | null = null;
  let chips: string[] = [];
  let maxId = 0;

  const collect = (slug: BookRef) => {
    if (!collected.includes(slug)) collected = [slug, ...collected];
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

      if (main) {
        const slug = slugify(main.title);
        registerBook(slug, recToBook(main), registryScope);
        lastBatch = { main: slug, also: [] };
        collect(slug);
      } else if (picks.length) {
        const slugs = picks.map((p) => {
          const s = slugify(p.title);
          registerBook(s, recToBookLite(p), registryScope);
          return s;
        });
        lastBatch = { main: slugs[0], also: slugs.slice(1) };
        slugs.forEach(collect);
      }

      chips = rowChips;
      messages.push({ kind: 'msg', id: row.id, who: 'owl', nodes: bubble });
      continue;
    }

    if (row.who === 'owl' && row.kind === 'letter') {
      const slug = String(row.payload.slug ?? '');
      const book = (row.payload.book ?? null) as ScoutBook | null;
      if (slug && book) registerBook(slug, recToBook(book), registryScope);
      messages.push({ kind: 'letter', id: row.id, book: slug });
      continue;
    }

    if (row.who === 'owl' && row.kind === 'note') {
      const text = String(row.payload.text ?? '');
      messages.push({ kind: 'msg', id: row.id, who: 'owl', nodes: [{ t: 'text', v: text }], tone: 'note' });
      continue;
    }
  }

  return { messages, collected, lastBatch, chips, maxId };
}
