/* ============================================================
   owlry — reader text.

   v1 ships the mockup's original placeholder literary prose (it is
   legally safe — original writing, not a copyrighted excerpt) and
   cycles it through the reader exactly as the mockup does.

   This module is the seam for real public-domain texts (Standard
   Ebooks / Project Gutenberg). To give a title its own pages, add a
   BookId-keyed entry to BOOK_TEXT below; the reader picks it up with
   zero UI changes. Genuinely public-domain catalog titles (e.g.
   `medit` — Meditations) are the natural first candidates.
   ============================================================ */
import type { BookId } from './types';

/** A page "spread" is the set of paragraphs shown on one reader page. */
export type PageSpread = string[];

/** Original placeholder prose, cycled through the reader. */
export const PAGES: PageSpread[] = [
  [
    `The rain had been falling since before the shop opened, a patient, unhurried rain that made the windows look like old glass. Inside, the lamps were lit early and the smell of paper rose from the shelves the way warmth rises from bread.`,
    `Nobody came in for the first hour, which suited the owner fine. There were three crates of estate books to sort, and sorting was best done slowly, with tea, while the gutters ticked overhead like a clock that had given up on minutes.`,
  ],
  [
    `The ledger sat open on the counter, its columns inked in a hand so careful it seemed to apologize for every figure. Sold: one atlas, water-damaged. Acquired: forty-one novels, one box of letters, a dictionary missing its own definition of the word lost.`,
    `By the radiator, the shop cat had claimed the warmest chair and defended it with nothing but sleep. Outside, umbrellas moved past the window like a parade of small dark planets.`,
  ],
  [
    `The letter arrived on a Tuesday, slipped between the pages of a returned book as though it had grown there. The paper was thin, the handwriting urgent, and it said only this: Come at once. Bring the green notebook. Tell no one but the dog.`,
    `She read it three times standing up and a fourth time sitting down. The dog, to his credit, told no one.`,
  ],
  [
    `Morning came scrubbed clean by the storm, the whole street smelling of slate and bakery smoke. She walked fast, the green notebook under one arm, rehearsing questions she had no intention of asking politely.`,
    `Her grandmother used to say that a good book and a good secret were the same thing: both were just waiting for the right person to open them. She had never believed it until now.`,
  ],
  [
    `The library stood at the top of the hill, exactly where libraries should stand, with the town arranged below it like an audience. The doors were open. The reading room was empty except for the light.`,
    `On the third shelf of the third case, where she had not left it, sat the green notebook's twin. She took a breath, the kind you take before the first page of anything, and reached for it.`,
  ],
];

/** Per-book real texts plug in here (public domain). Empty in v1. */
const BOOK_TEXT: Partial<Record<BookId, PageSpread[]>> = {};

/** Returns the spread for a 1-indexed page of a given book. */
export function getSpread(id: BookId, pageNumber: number): PageSpread {
  const text = BOOK_TEXT[id] ?? PAGES;
  return text[(pageNumber - 1 + text.length) % text.length];
}
