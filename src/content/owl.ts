/* ============================================================
   owlry — Owl Post content (the simulated owl's vocabulary).

   This is a STANDALONE content module: intents, chips, flavor
   lines, and the fiction pools all live here so a live model
   could replace the brain (see lib/owlBrain.ts) without touching
   the UI. No API calls, no keys — the v1 owl ships from this file
   plus content/guides.ts.

   Every reader-facing pool is keyed by language ('en' | 'zh');
   consumers pick a language via i18n getActiveLang()/useLang().
   ============================================================ */
import type { BookId, GuideId } from './types';
import type { WeatherKey } from './weather';
import type { Lang } from '../i18n';

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

/** weather-reactive opening flavor, keyed by WeatherKey */
export const FLAVOR: Record<Lang, Record<WeatherKey, string>> = {
  en: {
    rain: 'the rain is doing its best work out there',
    cloud: 'a soft grey blanket of a sky today',
    sun: 'sun on the shelves, dust in the light',
    snow: 'snow is hushing the whole street',
    night: 'the lamps are lit and the street has gone quiet',
  },
  zh: {
    rain: '外面的雨正下得尽职尽责',
    cloud: '今天的天空像一床软软的灰毯子',
    sun: '阳光落在书架上，灰尘在光里慢慢飘',
    snow: '雪把整条街都哄安静了',
    night: '灯都点亮了，街上已经安静下来',
  },
};

/** time-of-day salutation */
export const SAL: Record<Lang, Record<DayPart, string>> = {
  en: {
    morning: 'good morning.',
    afternoon: 'good afternoon.',
    evening: 'good evening.',
    night: 'late hours, hm?',
  },
  zh: {
    morning: '早上好。',
    afternoon: '下午好。',
    evening: '晚上好。',
    night: '这么晚还醒着，嗯？',
  },
};

/** starter chips offered before the first message, by time of day */
export const START_CHIPS: Record<Lang, Record<DayPart, string[]>> = {
  en: {
    morning: ['fresh start today', 'build a habit', 'need focus', 'surprise me'],
    afternoon: ['feeling stuck', 'build a habit', 'something lighter', 'surprise me'],
    evening: ['wind down', 'feeling blue', 'cozy escape', 'surprise me'],
    night: ["can't sleep", 'big life question', 'cozy escape', 'surprise me'],
  },
  zh: {
    morning: ['今天想有个新开始', '想养成习惯', '需要专注', '给我个惊喜'],
    afternoon: ['有点卡住了', '想养成习惯', '来点轻松的', '给我个惊喜'],
    evening: ['想放松一下', '心情低落', '来点治愈的', '给我个惊喜'],
    night: ['睡不着', '人生大问题', '来点治愈的', '给我个惊喜'],
  },
};

/** chips offered after a peek has been sorted */
export const AFTER_CHIPS: Record<Lang, string[]> = {
  en: ['go deeper', 'something lighter', 'more like this', 'new vibe'],
  zh: ['再深入一点', '来点轻松的', '多来点这类', '换个风格'],
};

/** fiction picks by weather (the "no homework, just pages" path) */
export const FPOOL: Record<WeatherKey, BookId[]> = {
  rain: ['piranesi', 'snow', 'goldfinch'],
  cloud: ['remains', 'pachinko', 'cuckoo'],
  sun: ['beach', 'circe', 'hail'],
  snow: ['snow', 'cuckoo', 'tranq'],
  night: ['tranq', 'kindred', 'sleep'],
};

/** one-line notes for the fiction picks */
export const FNOTE: Record<Lang, Partial<Record<BookId, string>>> = {
  en: {
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
  },
  zh: {
    piranesi: '一栋有自己潮汐的梦境之屋',
    snow: '一个落雪般安静的故事',
    goldfinch: '一幅画，一段漫长的旅程',
    remains: '安静、克制、令人心碎的管家',
    pachinko: '四代人的故事，足够沉进去',
    cuckoo: '一个跨越几个世纪相传的故事',
    beach: '欢喜冤家、一个门廊、火花四溅',
    circe: '一座岛，和一位找回底气的女巫',
    hail: '孤身宇航员和一件必须做成的事',
    tranq: '轻薄的小书，折叠的时间',
    kindred: '抓着人不放的过去',
    sleep: '雨、霓虹和一桩悬案',
  },
};

/** intent → guide key. `__surprise` and `__fiction` are special routes.
    Each pattern matches BOTH English and 简体中文 phrasings, so the
    offline owl understands the reader in either language. */
export type IntentKey = GuideId | '__surprise' | '__fiction';
export interface Intent {
  re: RegExp;
  k: IntentKey;
}

export const INTENTS: Intent[] = [
  { re: /surprise|random|anything|dealer|惊喜|随便|随机|都行/, k: '__surprise' },
  {
    re: /light|fun|escape|cozy|quick|short|easy|laugh|romance|novel|story|fiction|轻松|好玩|治愈|逃离|小说|故事|爱情|浪漫|温暖/,
    k: '__fiction',
  },
  { re: /sleep|insom|bed|tired|awake|3 ?a\.?m|wind down|rest|night|睡|失眠|熬夜|好累|困|休息|放松/, k: 'wws' },
  { re: /morning|fresh|new (day|chapter|leaf|start)|monday|wake|早晨|早上|清晨|新的开始|新开始/, k: 'medit' },
  { re: /habit|routine|discipline|consisten|improve|better|change m|quit|习惯|自律|坚持|规律|改变自己|戒掉/, k: 'atomic' },
  { re: /stuck|focus|procrast|distract|concentrat|deep|productiv|attention|专注|拖延|分心|效率|卡住|集中/, k: 'deep' },
  {
    re: /sad|blue|heart|break ?up|lonel|cry|hurt|anx|fall(ing)? apart|worried|fear|grief|难过|伤心|分手|孤独|焦虑|心碎|想哭|害怕|低落|失恋|崩溃/,
    k: 'pema',
  },
  { re: /meaning|purpose|why|lost|empty|pointless|direction|what.*for|big life|意义|迷茫|空虚|方向|为什么活|人生/, k: 'frankl' },
  {
    re: /overwhelm|too much|deadline|stress|paraly|can.?t (start|begin)|writ|project|压力|太多|截止|开始不了|无从下手|写作|项目/,
    k: 'bird',
  },
];

export function dayPart(d: Date = new Date()): DayPart {
  const h = d.getHours();
  return h < 5 ? 'night' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}
