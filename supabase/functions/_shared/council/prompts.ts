// ============================================================
// owlry — The Council Room: the prompts behind council-chat.
//
// One system prompt for both calls (opening a council; a later turn), and
// two user-prompt builders. The client sends the dossiers — name, role,
// bio, works and the verified quotes — so the server stays generic and the
// content catalogue (src/content) remains the single source of truth.
// ============================================================
import type { Dossier } from './quotes.ts';
import type { ReaderLang } from '../lang.ts';

export type TurnSlot = 'followup' | 'direct' | 'context' | 'passage';

export interface HistoryTurn {
  /** 'user' for the reader, or the seat index (0–2) that spoke */
  who: 'user' | number;
  text: string;
}

const LANG_LINE: Record<ReaderLang, string> = {
  en: 'Write everything in English.',
  zh: '所有面向读者的文字使用简体中文；直接引语保持原文（英文）不翻译。',
};

export const COUNCIL_SYSTEM = `WHAT THIS IS

You write a council: three real thinkers, seated together, answering one reader's real question. The reader
came to "walk with great minds", not to be lectured — each thinker speaks in the first person, in their own
voice, from their own published work, and they talk to EACH OTHER, not only to the reader.

THE RULES OF THE HOUSE (these are enforced after you answer; break them and the line is cut)

1. Every thinker is an interpretation grounded in what they actually wrote. Paraphrase their real ideas — the
   specific argument, the named concept, the chapter — never a vague "as I always say". Do not invent
   biography, events or opinions they did not hold.
2. Quotation is sacred. Each dossier lists VERIFIED QUOTES. You may present words as a quotation ONLY by
   copying one of those quotes exactly, as a segment with kind "quote" and its listed source. Never put
   quotation marks around anything else. Never attribute a line to a work it is not from. If none of the
   verified quotes fits, quote nothing — paraphrase is always fine.
3. Each thinker's message is 2–4 sentences: one idea, said plainly, with a concrete edge (a practice, a
   distinction, a test the reader can apply). No headings, bullets, emoji or markdown. No "As a Stoic, I…"
   throat-clearing. Address the reader as "you".
4. In round two, each thinker responds to ANOTHER seat by their short name — agree and sharpen, or disagree
   and say why. Real friction is welcome; contempt is not.
5. Speak to the reader's actual situation. If they added context, the advice must change with it.
6. The thinkers are not doctors, lawyers or financial advisers. On medical, legal, financial-crisis or
   self-harm territory, stay with what their work genuinely offers and, in one plain sentence, point the
   reader to a professional or a crisis line. Never diagnose, never prescribe.
7. Say "I don't know" in the thinker's voice when the honest answer is that their work does not reach the
   question, rather than stretching it.

SEGMENTS

A message is an array of segments in order. A "text" segment is the thinker's own words. A "quote" segment
is one verified quote, copied verbatim, with "source": {"work", "loc"} copied from the dossier. Most
messages are a single text segment; use at most one quote per message, and only when it genuinely earns
its place.`;

function dossierBlock(d: Dossier, i: number): string {
  const works = d.works.map((w) => `${w.title} (${w.year})`).join('; ');
  const quotes = d.quotes.length
    ? d.quotes.map((q) => `  - "${q.text}" — ${q.source.work}${q.source.loc ? `, ${q.source.loc}` : ''}`).join('\n')
    : '  (none — this thinker may not be quoted; paraphrase only)';
  return `SEAT ${i} — ${d.name} ("${d.short}"), ${d.label}
Role: ${d.role}
Bio: ${d.bio}
Works: ${works}
Their book on the reading list: ${d.bookTitle}
VERIFIED QUOTES:
${quotes}`;
}

export function openUser(question: string, area: string, dossiers: Dossier[], lang: ReaderLang): string {
  return `${LANG_LINE[lang]}

THE READER'S QUESTION (area: ${area}):
"${question}"

THE COUNCIL:
${dossiers.map(dossierBlock).join('\n\n')}

WRITE, as JSON:
- "intros": for each seat in order, ONE sentence (third person, ≤ 22 words) on why this perspective fits the
  question — e.g. "Wrote the book on why willpower is the wrong lever."
- "round1": each seat (0, 1, 2 in order) opens with a distinct idea. No two seats may make the same point.
- "round2": each seat responds to another seat by short name (rule 4). Vary who answers whom.
- "takeaways": "commonGround" (2–3 sentences: what all three agree on, in plain words); "differences": one
  sentence per seat (≤ 20 words) on where that thinker parts from the others; "fits": 2–3 sentences on how
  this applies to the reader's question as asked; "nextStep": ONE small concrete action for tomorrow,
  imperative, ≤ 25 words.
- "reading": for each seat, "why" (one sentence, ≤ 24 words) on why THEIR listed book is worth opening for
  this question, and "bestStart": true for exactly ONE seat — the book to begin with.`;
}

export function turnUser(
  question: string,
  dossiers: Dossier[],
  history: HistoryTurn[],
  context: string[],
  slot: TurnSlot,
  text: string,
  seats: number[],
  lang: ReaderLang,
  passage?: { bookTitle: string; text: string },
): string {
  const hist = history
    .slice(-12)
    .map((h) => (h.who === 'user' ? `READER: ${h.text}` : `${dossiers[h.who]?.short ?? 'SEAT'}: ${h.text}`))
    .join('\n');
  const ctx = context.length ? `\nCONTEXT THE READER ADDED EARLIER:\n${context.map((c) => `- ${c}`).join('\n')}` : '';
  const who = seats.map((s) => `${s} (${dossiers[s]?.short ?? '?'})`).join(', ');
  let ask: string;
  switch (slot) {
    case 'direct':
      ask = `The reader asks ONE thinker directly — seat ${seats[0]} (${dossiers[seats[0]]?.name}). Only that seat replies, plainly, in 2–4 sentences.\nTHEIR QUESTION: "${text}"`;
      break;
    case 'context':
      ask = `The reader adds context about their situation. Each of seats ${who} responds in turn, in 2–3 sentences, saying how this changes (or doesn't change) their advice. Quote the reader's words back sparingly, if at all.\nTHE CONTEXT: "${text}"`;
      break;
    case 'passage':
      ask = `The reader brings a passage from their reading. Seats ${who} respond in turn — the first is the author if they are seated. 2–4 sentences each: what the passage means, and what it changes for the reader's question.\nFROM ${passage?.bookTitle ?? 'the book'}: "${passage?.text ?? text}"`;
      break;
    default:
      ask = `The reader follows up to the whole council. Seats ${who} reply in that order, 2–4 sentences each, each adding something the previous reply did not.\nTHE FOLLOW-UP: "${text}"`;
  }
  return `${LANG_LINE[lang]}

THE READER'S ORIGINAL QUESTION: "${question}"

THE COUNCIL:
${dossiers.map(dossierBlock).join('\n\n')}
${ctx}

THE CONVERSATION SO FAR (most recent last):
${hist || '(the council has just opened)'}

${ask}

Reply as JSON: {"replies": [{"seat", "segments"}...]} with exactly the seats named above, in that order.`;
}
