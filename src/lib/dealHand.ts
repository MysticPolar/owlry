/* ============================================================
   owlry — scout's hand.

   Fill a turn's picks to three cards: the turn's own picks lead, then
   catalog neighbours of the lead book's genre (feed order), never
   repeating. Keeps a thin live/offline reply from dealing a lonely card.

   Lives here rather than in the store because BOTH sides need it: the
   live turn deals a hand as the reply lands, and chat hydration deals
   the same hand again when the conversation is rebuilt from the
   transcript. If they disagree, cards appear on first sight and vanish
   on the next visit.
   ============================================================ */
import { getBook } from './bookRegistry';
import { FEED } from '../content/feed';
import type { BookRef } from '../content/types';

export const dealHand = (ids: BookRef[]): BookRef[] => {
  const hand = [...new Set(ids)].slice(0, 3);
  if (hand.length >= 3 || !hand.length) return hand;
  const lead = getBook(hand[0]);
  const pool = [...FEED.filter((id) => lead && getBook(id)?.g === lead.g), ...FEED];
  for (const id of pool) {
    if (hand.length >= 3) break;
    if (!hand.includes(id)) hand.push(id);
  }
  return hand;
};
