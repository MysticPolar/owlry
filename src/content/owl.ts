/* ============================================================
   owlry — Owl Post content (the simulated owl's vocabulary).

   This is a STANDALONE content module: intents, chips, flavor
   lines, and the fiction pools all live here so a live model
   could replace the brain (see lib/owlBrain.ts) without touching
   the UI. No API calls, no keys — the v1 owl ships from this file
   plus content/guides.ts.
   ============================================================ */
import type { BookId, GuideId } from './types';
import type { WeatherKey } from './weather';

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

/** weather-reactive opening flavor, keyed by WeatherKey */
export const FLAVOR: Record<WeatherKey, string> = {
  rain: 'the rain is doing its best work out there',
  cloud: 'a soft grey blanket of a sky today',
  sun: 'sun on the shelves, dust in the light',
  snow: 'snow is hushing the whole street',
  night: 'the lamps are lit and the street has gone quiet',
};

/** time-of-day salutation */
export const SAL: Record<DayPart, string> = {
  morning: 'good morning.',
  afternoon: 'good afternoon.',
  evening: 'good evening.',
  night: 'late hours, hm?',
};

/** starter chips offered before the first message, by time of day */
export const START_CHIPS: Record<DayPart, string[]> = {
  morning: ['fresh start today', 'build a habit', 'need focus', 'surprise me'],
  afternoon: ['feeling stuck', 'build a habit', 'something lighter', 'surprise me'],
  evening: ['wind down', 'feeling blue', 'cozy escape', 'surprise me'],
  night: ["can't sleep", 'big life question', 'cozy escape', 'surprise me'],
};

/** chips offered after a reading letter has been sorted */
export const AFTER_CHIPS: string[] = ['go deeper', 'something lighter', 'more like this', 'new vibe'];

/** fiction picks by weather (the "no homework, just pages" path) */
export const FPOOL: Record<WeatherKey, BookId[]> = {
  rain: ['piranesi', 'snow', 'goldfinch'],
  cloud: ['remains', 'pachinko', 'cuckoo'],
  sun: ['beach', 'circe', 'hail'],
  snow: ['snow', 'cuckoo', 'tranq'],
  night: ['tranq', 'kindred', 'sleep'],
};

/** one-line notes for the fiction picks */
export const FNOTE: Partial<Record<BookId, string>> = {
  piranesi: 'a dreamlike house with its own tides',
  snow: 'a wintry hush of a story',
  goldfinch: 'one painting, one long ride',
  remains: 'quiet, devastating, butler-shaped',
  pachinko: 'four generations to disappear into',
  cuckoo: 'one story passed across centuries',
  beach: 'rivals, a porch, zero chill',
  circe: 'an island and a witch finding her nerve',
  hail: 'a lone astronaut with a job to do',
  tranq: 'slim and time-bending',
  kindred: 'the past with a grip',
  sleep: 'rain, neon, and a case',
};

/** intent → guide key. `__surprise` and `__fiction` are special routes. */
export type IntentKey = GuideId | '__surprise' | '__fiction';
export interface Intent {
  re: RegExp;
  k: IntentKey;
}

export const INTENTS: Intent[] = [
  { re: /surprise|random|anything|dealer/, k: '__surprise' },
  { re: /light|fun|escape|cozy|quick|short|easy|laugh|romance|novel|story|fiction/, k: '__fiction' },
  { re: /sleep|insom|bed|tired|awake|3 ?a\.?m|wind down|rest|night/, k: 'wws' },
  { re: /morning|fresh|new (day|chapter|leaf|start)|monday|wake/, k: 'medit' },
  { re: /habit|routine|discipline|consisten|improve|better|change m|quit/, k: 'atomic' },
  { re: /stuck|focus|procrast|distract|concentrat|deep|productiv|attention/, k: 'deep' },
  { re: /sad|blue|heart|break ?up|lonel|cry|hurt|anx|fall(ing)? apart|worried|fear|grief/, k: 'pema' },
  { re: /meaning|purpose|why|lost|empty|pointless|direction|what.*for|big life/, k: 'frankl' },
  { re: /overwhelm|too much|deadline|stress|paraly|can.?t (start|begin)|writ|project/, k: 'bird' },
];

export function dayPart(d: Date = new Date()): DayPart {
  const h = d.getHours();
  return h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}
