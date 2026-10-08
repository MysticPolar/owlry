// Renders every council prompt with sample inputs into docs/council-prompts.md.
// Run from the repo root:  deno run --allow-read --allow-write=docs scripts/render-prompts.ts
// (Deno 2; the prompts import nothing but types, so no npm packages are fetched.)
import { COUNCIL_SYSTEM, KNOWLEDGE_SYSTEM, READINGS_SYSTEM, openUser, turnUser, readingsUser, castUser, figureUser, bookUser } from '../supabase/functions/_shared/council/prompts.ts';
import type { Dossier } from '../supabase/functions/_shared/council/quotes.ts';

const d = (id: string, name: string, short: string, label: string, role: string, bookTitle: string, quotes: Dossier['quotes']): Dossier => ({
  id, name, short, label, role, bio: `(bio of ${name}, ≤ 700 chars)`, works: [{ title: bookTitle, year: '…' }], quotes, bookId: id + '-book', bookTitle,
});
const dossiers: Dossier[] = [
  d('marcus-aurelius', 'Marcus Aurelius', 'Marcus', 'The Stoic', 'Roman emperor and Stoic philosopher, 121–180', 'Meditations', [
    { text: 'Waste no more time arguing about what a good man should be. Be one.', source: { work: 'Meditations', loc: 'Book X, 16 (Gregory Hays translation)' } },
  ]),
  d('james-clear', 'James Clear', 'James', 'The Systems Builder', 'Author and habits researcher, b. 1986', 'Atomic Habits', [
    { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', source: { work: 'Atomic Habits', loc: 'Chapter 1' } },
  ]),
  d('seneca', 'Seneca', 'Seneca', 'The Stoic Adviser', 'Roman Stoic philosopher and statesman, c. 4 BC – AD 65', 'Letters from a Stoic', [
    { text: 'We suffer more often in imagination than in reality.', source: { work: 'Letters from a Stoic', loc: 'Letter XIII' }, provenance: 'model' },
  ]),
];
const Q = 'Why do I keep breaking promises to myself?';
const fence = (s: string) => '```text\n' + s.replace(/```/g, "'''") + '\n```';
const H = (n: number, s: string) => '#'.repeat(n) + ' ' + s;

const out: string[] = [];
out.push('# The council prompts', '',
  '*Generated from `supabase/functions/_shared/council/prompts.ts` with sample inputs (`scripts/render-prompts.ts`); the code is the source of truth. The JSON shape each call must return is forced by the schemas in `schemas.ts`; the post-processing that follows is in `quotes.ts` (the verbatim gate) and `minds.ts` (the recall cards).*', '',
  '> **Screens since the v14 interface (6 October 2026).** The re-flow left the',
  '> calls as they were; the screens that make them moved. "Council room" is now',
  '> the room (`#/council`: the ask box under the drawn stage); its "intro cards"',
  '> are *Act I — Stands* (`#/stands/:id`); the group-chat "Discussion" became',
  '> *Act II — Debate* (`#/debate/:id`, one line at a time) for the opening and',
  '> every whole-council follow-up, and the one-on-one (`#/one/:id/:figure`) for',
  '> a direct question. Follow-ups are asked from the Summary\'s bar; "added',
  '> context" has no affordance in v14 (the store still supports it). See',
  '> `docs/council-redesign.md`, "The v14 interface".', '',
  '> **The debate and the readings (6 October 2026).** Every line of `open`',
  '> (`round1`, `round2`) and `turn` (`replies`) now carries `to`: the seats it',
  '> addresses by name, `[]` when it speaks to the reader — the debate draws',
  '> "X to Y" from it, and `quotes.ts` holds it to the names the words use.',
  '> The opening is written as one conversation in the order the debate plays',
  '> it (round one seat 0, 1, 2; round two seat 0, 1, 2), each line answering',
  '> what came before it. The selection page (`#/confirm`) asks',
  '> the new `readings` call for three readings of the reader\'s own question.', '',
  '| Screen in the mockup | Call | Prompt | Model |', '| --- | --- | --- | --- |',
  '| Selection page (`#/confirm`) — three readings of the reader\'s own question, plus Other | `readings` | `READINGS_SYSTEM` + `readingsUser` | voice model, minimal thinking, Flash-Lite fallback |',
  '| Council room — the seats fill for a question the scripts do not cover | `cast` | `KNOWLEDGE_SYSTEM` + `castUser` | voice model, Flash-Lite fallback |',
  '| Council room — a seat\'s card (about, works, quotes, voice) | `figure` | `KNOWLEDGE_SYSTEM` + `figureUser` | recall model, no fallback, cached |',
  '| Council room — intro cards; Discussion — round one and two (one conversation; every line with `to`); Summary — common ground, differences, fits, next step; Reading — why each book, best start | `open` | `COUNCIL_SYSTEM` + `openUser` | voice model (low thinking, 8192 output tokens), Flash-Lite fallback |',
  '| Discussion — follow-up, direct question, added context, a passage from the reader (every reply with `to`) | `turn` | `COUNCIL_SYSTEM` + `turnUser` | voice model (low thinking, 4096 output tokens), Flash-Lite fallback |',
  '| Book — the card, the summary, where to start, the reading guide | `book` | `KNOWLEDGE_SYSTEM` + `bookUser` | recall model, no fallback, cached |', '');

out.push(H(2, 'The council: `COUNCIL_SYSTEM` (system prompt for `open` and `turn`)'), '', fence(COUNCIL_SYSTEM), '');
out.push(H(2, '`open` — the opening (intros, two rounds, takeaways, reading)'), '', '*Sample: three seats, English. The third seat shows how a recalled quote is marked for the council.*', '', fence(openUser(Q, 'health', dossiers, 'en')), '');
out.push(H(2, '`turn` — a later turn'), '', '*Sample: a follow-up to the whole council, after two rounds.*', '',
  fence(turnUser(Q, dossiers, [
    { who: 'user', text: Q }, { who: 0, text: '(seat 0, round one)' }, { who: 1, text: '(seat 1, round one)' }, { who: 2, text: '(seat 2, round one)' },
  ], ['I work night shifts'], 'followup', 'But what if the system itself is the problem?', [0, 1, 2], 'en')), '',
  '*The other slots change only the ask block:*', '',
  fence(turnUser(Q, dossiers, [], [], 'direct', 'Marcus, how did you actually get out of bed?', [0], 'en').split('THE CONVERSATION SO FAR')[1].split('Reply as JSON')[0].trim()), '',
  fence(turnUser(Q, dossiers, [], [], 'context', 'I have two kids under five.', [0, 1, 2], 'en').split('THE CONVERSATION SO FAR')[1].split('Reply as JSON')[0].trim()), '',
  fence(turnUser(Q, dossiers, [], [], 'passage', '', [1, 2], 'en', { bookTitle: 'Atomic Habits', text: 'Every action you take is a vote for the type of person you wish to become.' }).split('THE CONVERSATION SO FAR')[1].split('Reply as JSON')[0].trim()), '');
out.push(H(2, 'The selection page: `READINGS_SYSTEM` (system prompt for `readings`)'), '', fence(READINGS_SYSTEM), '');
out.push(H(2, '`readings` — three readings of the question'), '', '*Sample: a typed question no script covers, English. The reply is `{"readings": [{"title", "detail"} ×3]}`; a wrapping quotation mark and a title\'s closing full stop are dropped, titles are trimmed to 80 characters and details to 160, and fewer than three distinct readings is a `502 generation_failed`.*', '', fence(readingsUser('Should I quit a stable job to go back to school at 34?', 'career', 'en')), '');
out.push(H(2, 'The librarian: `KNOWLEDGE_SYSTEM` (system prompt for `cast`, `figure` and `book`)'), '', fence(KNOWLEDGE_SYSTEM), '');
out.push(H(2, '`cast` — who should answer'), '', '*Sample: the client lists the curated names it holds and one seat the reader declined.*', '', fence(castUser('How do I stop checking my phone every few minutes?', 'health', 'en', ['Marcus Aurelius', 'James Clear', 'Jon Kabat-Zinn', 'Cal Newport'], ['Naval Ravikant'])), '');
out.push(H(2, '`figure` — a thinker\'s card'), '', fence(figureUser('Seneca', 'en', 'Roman Stoic philosopher and statesman, c. 4 BC – AD 65')), '');
out.push(H(2, '`book` — a book\'s card and reading guide'), '', fence(bookUser('On the Shortness of Life', 'Seneca', 'en', 'the essay De Brevitate Vitae, c. AD 49')), '');
out.push(H(2, 'In Chinese'), '', '*The language line is the only thing that changes. For the council and the readings (which also spell out the Chinese forms, "甲，还是乙" and a question ending in "？", in their rules):*', '', fence(openUser(Q, 'health', dossiers, 'zh').split('\n')[0]), '', '*For the librarian:*', '', fence(castUser(Q, 'health', 'zh', [], []).split('\n')[0]), '');
await Deno.writeTextFile(new URL('../docs/council-prompts.md', import.meta.url), out.join('\n'));
console.log('written', out.join('\n').length, 'chars');
