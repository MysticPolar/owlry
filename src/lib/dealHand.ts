/* ============================================================
   owlry — scout's hand.

   Deal only the books Scout actually named (1–3). Never pad with
   catalog neighbours — invented jackets used to show up under a
   thin reply and imply Scout recommended them.

   When the hand is thin (< 3), soft-suggest “more like this” as a
   chip instead (see chipsForHand).

   Lives here rather than in the store because BOTH sides need it: the
   live turn deals a hand as the reply lands, and chat hydration deals
   the same hand again when the conversation is rebuilt from the
   transcript. If they disagree, cards appear on first sight and vanish
   on the next visit.
   ============================================================ */
import { AFTER_CHIPS } from '../content/owl';
import type { Lang } from '../i18n';
import type { BookRef } from '../content/types';

/** Scout's picks only — unique, capped at three, never filled from the feed. */
export const dealHand = (ids: BookRef[]): BookRef[] =>
  [...new Set(ids.filter(Boolean))].slice(0, 3);

const MORE_LIKE_RE = /more like this|多来点这类/i;

/** When fewer than three jackets land, nudge “more like this” instead of inventing cards. */
export function chipsForHand(chips: string[], handSize: number, lang: Lang): string[] {
  const base = chips.filter(Boolean);
  if (handSize === 0 || handSize >= 3) return base.slice(0, 3);
  const more = AFTER_CHIPS[lang].find((c) => MORE_LIKE_RE.test(c)) ?? AFTER_CHIPS[lang][2];
  if (base.some((c) => MORE_LIKE_RE.test(c))) return base.slice(0, 3);
  return [more, ...base].slice(0, 3);
}
