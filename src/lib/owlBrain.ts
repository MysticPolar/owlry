/* ============================================================
   owlry — the simulated owl brain.

   Pure, UI-agnostic intent matching, ported faithfully from the
   mockup. It consumes the standalone content modules
   (content/owl.ts + content/guides.ts) and emits STRUCTURED
   message nodes (not HTML), so the chat renders real, clickable
   React and a live model could later replace `respond()` without
   the UI noticing.
   ============================================================ */
import { BOOKS } from '../content/books';
import { GUIDES } from '../content/guides';
import { INTENTS, FPOOL, FNOTE, AFTER_CHIPS } from '../content/owl';
import type { BookId, BookRef, GuideId } from '../content/types';
import type { WeatherKey } from '../content/weather';

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
const book = (id: BookRef): MsgNode => ({ t: 'book', id, v: BOOKS[id as BookId]?.t ?? id });
const em = (v: string): MsgNode => ({ t: 'em', v });

function guideReply(k: GuideId, s: OwlSession): OwlReply {
  const g = GUIDES[k];
  s.lastGuide = k;
  s.lastKind = 'guide';
  if (!s.usedGuides.includes(k)) s.usedGuides.push(k);
  const [pre, post = ''] = g.say.split('{{b}}');
  return {
    msgs: [[text(pre), book(k), text(post)]],
    letter: k,
    batch: { main: k, also: g.fr.map((f) => f.id) },
    chips: AFTER_CHIPS,
  };
}

function fictionReply(s: OwlSession): OwlReply {
  const pool = FPOOL[s.wxKey];
  const a = pool[s.fIdx % pool.length];
  const b2 = pool[(s.fIdx + 1) % pool.length];
  s.fIdx++;
  s.lastKind = 'fiction';
  s.lastGuide = null;
  return {
    msgs: [
      [
        text('easy does it — no homework, just pages. try '),
        book(a),
        text(` (${FNOTE[a]}), or `),
        book(b2),
        text(` (${FNOTE[b2]}).`),
      ],
    ],
    batch: { main: a, also: [b2] },
    chips: ['more like this', 'new vibe', 'surprise me'],
  };
}

function deeperReply(s: OwlSession): OwlReply {
  const g = GUIDES[s.lastGuide as GuideId];
  return {
    msgs: [[text('from the same letter, something to sit with: '), em(`“${g.ask[0]}”`), text(' — no rush.')]],
    chips: AFTER_CHIPS,
  };
}

function moreReply(s: OwlSession): OwlReply {
  if (s.lastKind === 'fiction' || !s.lastGuide) return fictionReply(s);
  const fr = GUIDES[s.lastGuide].fr;
  const nodes: MsgNode[] = [text('from the same desk: ')];
  fr.forEach((f, i) => {
    nodes.push(book(f.id), text(` — ${f.why}`), text(i < fr.length - 1 ? '; ' : '.'));
  });
  return {
    msgs: [nodes],
    batch: { main: fr[0].id, also: fr.slice(1).map((f) => f.id) },
    chips: AFTER_CHIPS,
  };
}

function fallbackReply(fresh: boolean): OwlReply {
  return {
    msgs: [
      [
        text(
          fresh
            ? `clean slate, then. what's the weather inside — rest, focus, heartache, or escape?`
            : `tell me a little more — what's the shape of it: rest, focus, heartache, or escape?`,
        ),
      ],
    ],
    chips: ['rest', 'need focus', 'feeling blue', 'cozy escape'],
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
  if (t.includes('go deeper') && s.lastGuide) return deeperReply(s);
  if (t.includes('more like this')) return moreReply(s);
  if (t.includes('new vibe')) return fallbackReply(true);
  for (const it of INTENTS) {
    if (it.re.test(t)) {
      if (it.k === '__surprise') return guideReply(pickSurprise(s), s);
      if (it.k === '__fiction') return fictionReply(s);
      return guideReply(it.k, s);
    }
  }
  return fallbackReply(false);
}
