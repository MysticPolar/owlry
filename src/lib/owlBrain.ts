/* ============================================================
   owlry — the simulated owl brain.

   Pure, UI-agnostic intent matching, ported faithfully from the
   mockup. It consumes the standalone content modules
   (content/owl.ts + content/guides.ts) and emits STRUCTURED
   message nodes (not HTML), so the chat renders real, clickable
   React and a live model could later replace `respond()` without
   the UI noticing.
   ============================================================ */
import { GUIDES } from '../content/guides';
import { INTENTS, FPOOL, FNOTE, AFTER_CHIPS } from '../content/owl';
import { getActiveLang, tOf } from '../i18n';
import { getBook, getGuide } from './bookRegistry';
import type { BookRef, GuideId } from '../content/types';
import type { WeatherKey } from '../content/weather';

/** the brain's canned lines, in the reader's language */
const say = () => tOf(getActiveLang()).discover.brain;

/** A renderable fragment of an owl message. */
export type MsgNode =
  | { t: 'text'; v: string }
  | { t: 'book'; id: BookRef; v: string }
  | { t: 'em'; v: string };

export type OwlMessage = MsgNode[];

export interface OwlBatch {
  main: BookRef;
  also: BookRef[];
}

export interface OwlReply {
  msgs: OwlMessage[];
  /** a reading letter to post (catalog GuideId or an open-world slug) */
  letter?: BookRef;
  batch?: OwlBatch;
  /** contextual, non-blocking note appended after the reply (e.g. "not financial advice") */
  note?: string;
  chips: string[];
}

/** Mutable per-conversation memory. Serializable (no Set) so it can persist. */
export interface OwlSession {
  wxKey: WeatherKey;
  fIdx: number;
  usedGuides: GuideId[];
  lastGuide: GuideId | null;
  lastKind: 'guide' | 'fiction' | null;
}

export const newSession = (wxKey: WeatherKey): OwlSession => ({
  wxKey,
  fIdx: 0,
  usedGuides: [],
  lastGuide: null,
  lastKind: null,
});

const text = (v: string): MsgNode => ({ t: 'text', v });
const book = (id: BookRef): MsgNode => ({ t: 'book', id, v: getBook(id)?.t ?? id });
const em = (v: string): MsgNode => ({ t: 'em', v });

function guideReply(k: GuideId, s: OwlSession): OwlReply {
  const g = getGuide(k) ?? GUIDES[k];
  s.lastGuide = k;
  s.lastKind = 'guide';
  if (!s.usedGuides.includes(k)) s.usedGuides.push(k);
  const [pre, post = ''] = g.say.split('{{b}}');
  return {
    msgs: [[text(pre), book(k), text(post)]],
    letter: k,
    batch: { main: k, also: g.fr.map((f) => f.id) },
    chips: AFTER_CHIPS[getActiveLang()],
  };
}

function fictionReply(s: OwlSession): OwlReply {
  const d = say();
  const note = FNOTE[getActiveLang()];
  const pool = FPOOL[s.wxKey];
  const a = pool[s.fIdx % pool.length];
  const b2 = pool[(s.fIdx + 1) % pool.length];
  s.fIdx++;
  s.lastKind = 'fiction';
  s.lastGuide = null;
  return {
    msgs: [
      [
        text(d.fictionLead),
        book(a),
        text(d.fictionNote1(note[a] ?? '')),
        book(b2),
        text(d.fictionNote2(note[b2] ?? '')),
      ],
    ],
    batch: { main: a, also: [b2] },
    chips: [...d.fictionChips],
  };
}

function deeperReply(s: OwlSession): OwlReply {
  const d = say();
  const g = getGuide(s.lastGuide) ?? GUIDES[s.lastGuide as GuideId];
  return {
    msgs: [[text(d.deeperLead), em(d.deeperQuote(g.ask[0])), text(d.deeperTail)]],
    chips: AFTER_CHIPS[getActiveLang()],
  };
}

function moreReply(s: OwlSession): OwlReply {
  if (s.lastKind === 'fiction' || !s.lastGuide) return fictionReply(s);
  const d = say();
  const fr = (getGuide(s.lastGuide) ?? GUIDES[s.lastGuide]).fr;
  const nodes: MsgNode[] = [text(d.moreLead)];
  fr.forEach((f, i) => {
    nodes.push(book(f.id), text(d.moreWhy(f.why)), text(i < fr.length - 1 ? d.moreSep : d.moreEnd));
  });
  return {
    msgs: [nodes],
    batch: { main: fr[0].id, also: fr.slice(1).map((f) => f.id) },
    chips: AFTER_CHIPS[getActiveLang()],
  };
}

function fallbackReply(fresh: boolean): OwlReply {
  const d = say();
  return {
    msgs: [[text(fresh ? d.fallbackFresh : d.fallbackMore)]],
    chips: [...d.fallbackChips],
  };
}

function pickSurprise(s: OwlSession): GuideId {
  const keys = Object.keys(GUIDES) as GuideId[];
  const unused = keys.filter((k) => !s.usedGuides.includes(k));
  const src = unused.length ? unused : keys;
  return src[Math.floor(Math.random() * src.length)];
}

/**
 * The simulated brain. Mutates the provided session (lastGuide,
 * lastKind, fIdx, usedGuides) and returns a reply — pass a copy you
 * intend to commit to the store.
 */
export function respond(input: string, s: OwlSession): OwlReply {
  const t = input.toLowerCase();
  // the conversational follow-ups match both languages' chip phrasings
  // (the zh strings mirror AFTER_CHIPS zh in content/owl.ts)
  if ((t.includes('go deeper') || t.includes('再深入')) && s.lastGuide) return deeperReply(s);
  if (t.includes('more like this') || t.includes('多来点这类')) return moreReply(s);
  if (t.includes('new vibe') || t.includes('换个风格')) return fallbackReply(true);
  for (const it of INTENTS) {
    if (it.re.test(t)) {
      if (it.k === '__surprise') return guideReply(pickSurprise(s), s);
      if (it.k === '__fiction') return fictionReply(s);
      return guideReply(it.k, s);
    }
  }
  return fallbackReply(false);
}
