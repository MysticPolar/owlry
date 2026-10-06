/* ============================================================
   Readings: the ways a question can be taken. Asking the council opens
   the confirmation page, which offers three readings of the question —
   each a tension the reader is caught in ("Security now vs. freedom
   later") with a question that sharpens it — plus "Other", in the
   reader's own words. The chosen one is the angle the council debates.

   A scripted council has its own three, written for its three seats in
   seat order; a question no script covers gets the general three. A
   picked reading is stored by reference as well as by its words, so
   Act I and the live council read it in the interface language of the
   moment. Chinese lives in ./zh/readings.ts with the same keys.
   ============================================================ */
import type { Focus } from '../store/types';
import { isZh } from '../i18n';
import { COUNCIL_READINGS_ZH, GENERAL_READINGS_ZH } from './zh/readings';

export interface Reading {
  /** the tension, as "X vs. Y" — what the council will debate */
  title: string;
  /** one question that sharpens it */
  detail: string;
}

export type Readings = [Reading, Reading, Reading];

/** three per scripted council, keyed by council id */
export const COUNCIL_READINGS: Record<string, Readings> = {
  discipline: [
    { title: 'Doing it vs. feeling like it', detail: 'What would you do today if your mood had no say?' },
    { title: 'Effort vs. direction', detail: 'Is the thing you’re forcing yourself to do worth doing?' },
    { title: 'Your standards vs. someone else’s', detail: 'Whose picture of a disciplined life are you trying to fit?' },
  ],
  career: [
    { title: 'Feeling fulfilled vs. being needed', detail: 'Who, besides you, is your work really for?' },
    { title: 'Passion first vs. skill first', detail: 'Are you waiting to love work you’re not yet good at?' },
    { title: 'The safe path vs. the calling', detail: 'What would you risk for work that makes you feel alive?' },
  ],
  failure: [
    { title: 'What happened vs. what you fear', detail: 'How much of what you dread hasn’t actually happened?' },
    { title: 'A setback vs. a verdict', detail: 'Did you fail, or decide you are a failure?' },
    { title: 'Small falls vs. one big fall', detail: 'Can you make the next try cheap enough to repeat?' },
  ],
  'good-life': [
    { title: 'Good days vs. a good life', detail: 'At the end, what would you want to have done well?' },
    { title: 'Wanting more vs. needing less', detail: 'What could you stop wanting, and feel lighter for it?' },
    { title: 'Having it all vs. knowing why', detail: 'If you had everything, what would still feel missing?' },
  ],
  health: [
    { title: 'Willpower vs. your surroundings', detail: 'What in your day makes the wrong choice the easy one?' },
    { title: 'Autopilot vs. paying attention', detail: 'What are you feeling in the moment you give up?' },
    { title: 'Vague goals vs. a clear target', detail: 'What do you want your body to do at eighty?' },
  ],
  investing: [
    { title: 'Investing vs. gambling', detail: 'Could you say what it’s worth before you buy it?' },
    { title: 'Picking winners vs. owning everything', detail: 'Do you really expect to beat the market after fees?' },
    { title: 'Getting rich vs. having enough', detail: 'How much is enough, and will you stop there?' },
  ],
  relationships: [
    { title: 'Being loved vs. learning to love', detail: 'What are you giving, not just hoping to receive?' },
    { title: 'Being nice vs. being honest', detail: 'What honest thing have you been holding back?' },
    { title: 'Closeness vs. room to breathe', detail: 'How much space does this bond need to stay alive?' },
  ],
  literature: [
    { title: 'Reading freely vs. reading to judge', detail: 'Do you let a book in before you grade it?' },
    { title: 'The plot vs. the details', detail: 'Do you remember the small things, or only what happened?' },
    { title: 'The latest vs. the lasting', detail: 'Which book would you gladly read again in ten years?' },
  ],
};

/** the general three, for a question no script covers */
export const GENERAL_READINGS: Readings = [
  { title: 'What you want vs. what you fear', detail: 'Which one is really asking the question?' },
  { title: 'The short run vs. the long run', detail: 'What does this look like in ten years?' },
  { title: 'You vs. the people around you', detail: 'Who else is carrying this?' },
];

/** the three readings offered for a question: the answering council's own, else the general three */
export function readingsFor(scriptId: string | null): Readings {
  if (scriptId) {
    const own = (isZh() ? COUNCIL_READINGS_ZH[scriptId] : undefined) ?? COUNCIL_READINGS[scriptId];
    if (own) return own;
  }
  return (isZh() ? GENERAL_READINGS_ZH : undefined) ?? GENERAL_READINGS;
}

/** a chosen focus in the interface language of the moment: a picked reading is re-read from its set; own words stay as typed */
export function focusText(focus: Focus): { title: string; detail?: string } {
  const ref = focus.reading;
  if (ref && !focus.custom) {
    const r = readingsFor(ref.scriptId)[ref.index];
    if (r) return r;
  }
  return { title: focus.title, ...(focus.detail ? { detail: focus.detail } : {}) };
}
