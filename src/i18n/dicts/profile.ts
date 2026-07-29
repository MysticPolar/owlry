/* ============================================================
   i18n namespace "profile" — the profile screen chrome (header,
   streak, tabs, stats / calendar / quotes panels), the memory
   card, and the radar chart aria. en values are byte-identical
   to the strings they replaced; zh keeps the owl-post-office
   voice — 亲切、有文气、不过度感叹. Owl cast names stay English.
   Seeded display content (radar dims, report stats, calendar
   recs, saved quotes…) lives in src/content/profile.ts, keyed
   per-language there.
   ============================================================ */

const en = {
  /* ---------- header / identity ---------- */
  settingsAria: 'Settings',
  readerTitle: 'BIBLIOPHILE',
  levelLabel: (lv: number) => `LEVEL ${lv}`,
  xpToNext: (xp: number, max: number, next: number) => `${xp} / ${max} XP to Level ${next}`,
  streakChip: (n: number) => `${n}-day`,
  streakAria: (n: number) => `${n}-day reading streak`,
  inkAria: (ink: number) => `${ink} ink`,
  coinsAria: (coins: number) => `${coins} coins`,
  bioEdit: 'edit bio',
  bioDone: 'done',
  bioKept: 'bio kept',

  /* ---------- the seat map (levels are seats; row = 14 - LV) ---------- */
  seatLabel: (row: number) => `ROW ${row}`,
  seatAria: (row: number, lv: number) => `Row ${row} from the stage — level ${lv}`,
  seatMapAria: 'The house, thirteen rows deep',
  seatFront: 'the front row',
  seatToNext: (xp: number, max: number, row: number) => `${xp} / ${max} XP to row ${row}`,
  seatEncore: (xp: number, max: number, n: number) => `${xp} / ${max} XP to encore ${n}`,

  /* ---------- the album (ticket stubs) ---------- */
  albumTitle: 'the album',
  albumCount: (n: number) => `${n} stubs`,
  albumEmpty: 'no stubs yet — the night is young',
  albumSeason: (year: number, q: number) => `${year} · programme ${q}`,
  albumEncore: (n: number) => `encore ×${n}`,

  /* ---------- the lobby stand (keeper's counter) ---------- */
  standTitle: 'the lobby stand',
  standSub: 'keeper minds the counter · brass only',
  standClose: 'close the stand',
  standOwned: 'yours',
  standBuy: 'buy',
  standPrice: (n: number) => `${n}`,
  standPurse: (n: number) => `${n} in the purse`,
  standSeason: (q: number) => `this programme · no. ${q}`,
  standBottleNote: 'one a day — the well fills the rest itself',
  standEmpty: 'the shelf is bare this programme',
  goods: {
    bottle: { n: 'a small bottle', d: 'five coins, ten ink' },
    stationery: { n: "this programme's stationery", d: "peek's letters arrive on it" },
    marquee: { n: 'marquee letters', d: 'spare vowels for the sign' },
    cushion: { n: 'a velvet cushion', d: 'for your row, whichever it is' },
  } as Record<string, { n: string; d: string }>,

  /* ---------- tab bar ---------- */
  sectionsAria: 'Profile sections',
  tabs: {
    stats: 'stats',
    cal: 'calendar',
    quotes: 'quotes',
    mem: 'memory',
  },

  /* ---------- stats tab ---------- */
  readingBalance: 'reading balance',
  sixShelves: 'six shelves of you',
  radarAria: (dims: string) => `Radar chart of reading balance: ${dims}`,
  thisWeek: 'this week',
  /** monday-first single letters — shared by the week bars & the calendar header */
  weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],

  /* ---------- calendar tab ---------- */
  owlPosts: (n: number) => `${n} owl posts`,
  calDayAria: (d: number, title: string) => `june ${d} — asked the owl, peeked ${title}`,
  calDayAriaPlain: (d: number) => `june ${d}`,
  calFoot: 'a day you asked the owl & peeked a pick',
  owlPost: (d: number) => `OWL POST · JUN ${d}`,
  youAsked: 'YOU ASKED',
  youPeeked: 'YOU PEEKED',
  firstPages: 'first pages, by owl',

  /* ---------- quotes tab ---------- */
  tuckedAway: 'tucked away',
  quotesKept: (n: number) => `${n} quotes kept`,
  keptOn: (d: string) => `kept ${d}`,
  copyAria: 'Copy quote',
  clipQuote: (x: string, author: string, title: string) => `“${x}” — ${author}, ${title}`,
  copiedToast: 'copied — word for word.',
  keptToast: 'kept. word for word.',

  /* ---------- memory tab ---------- */
  mem: {
    fetching: 'fetching what the owl remembers…',
    title: 'WHAT THE OWL REMEMBERS',
    subtitle: 'the owl’s notes on you — yours to edit or erase.',
    emptyAll: 'nothing yet — a few conversations and this fills in.',
    whoYouAre: 'who you are',
    workingThrough: "what you're working through lately",
    notLearned: "the owl hasn't learned this yet",
    love: 'WHAT YOU LOVE',
    avoid: 'WHAT TO AVOID',
    why: 'WHY YOU READ',
    empty: 'nothing yet',
    addLove: 'add a genre, author, topic…',
    addAvoid: 'add an exclusion…',
    addWhy: 'add a reason you read…',
    addAria: 'Add',
    removeAria: (v: string) => `Remove ${v}`,
    booksReacted: "BOOKS YOU'VE REACTED TO",
    mentioned: "THINGS YOU'VE MENTIONED",
    forget: 'forget everything',
    forgetConfirm: 'really forget everything the owl knows about you?',
    forgetYes: 'yes, forget it',
    forgetNo: 'never mind',
    forgotToast: 'the owl has forgotten — starting fresh',
  },
};

const zh: typeof en = {
  /* ---------- 页首 / 身份 ---------- */
  settingsAria: '设置',
  readerTitle: '藏书家',
  levelLabel: (lv: number) => `等级 ${lv}`,
  xpToNext: (xp: number, max: number, next: number) => `${xp} / ${max} 经验，升到等级 ${next}`,
  streakChip: (n: number) => `${n} 天`,
  streakAria: (n: number) => `连读 ${n} 天`,
  inkAria: (ink: number) => `${ink} 墨水`,
  coinsAria: (coins: number) => `${coins} 枚铜币`,
  bioEdit: '编辑简介',
  bioDone: '完成',
  bioKept: '简介已收好',

  /* ---------- 座位表（等级即座位；排号 = 14 − LV） ---------- */
  seatLabel: (row: number) => `第 ${row} 排`,
  seatAria: (row: number, lv: number) => `距舞台第 ${row} 排 — 等级 ${lv}`,
  seatMapAria: '整座剧院，十三排',
  seatFront: '第一排',
  seatToNext: (xp: number, max: number, row: number) => `${xp} / ${max} XP 到第 ${row} 排`,
  seatEncore: (xp: number, max: number, n: number) => `${xp} / ${max} XP 到第 ${n} 次返场`,

  /* ---------- 票根册 ---------- */
  albumTitle: '票根册',
  albumCount: (n: number) => `${n} 张票根`,
  albumEmpty: '还没有票根 — 夜还长',
  albumSeason: (year: number, q: number) => `${year} · 第 ${q} 季`,
  albumEncore: (n: number) => `返场 ×${n}`,

  /* ---------- 大厅的小摊子 ---------- */
  standTitle: '大厅小摊',
  standSub: 'Keeper 看摊 · 只收铜币',
  standClose: '收摊',
  standOwned: '已入手',
  standBuy: '买下',
  standPrice: (n: number) => `${n}`,
  standPurse: (n: number) => `钱袋里还有 ${n}`,
  standSeason: (q: number) => `本季节目 · 第 ${q} 号`,
  standBottleNote: '一天一瓶 — 其余的，墨井自己会涨',
  standEmpty: '这一季的架子空着',
  goods: {
    bottle: { n: '一小瓶墨', d: '五枚铜币，十点墨水' },
    stationery: { n: '本季的信笺', d: 'Peek 的信会写在它上面' },
    marquee: { n: '招牌字母', d: '给那块招牌配上备用元音' },
    cushion: { n: '一块绒垫', d: '给你的那一排 — 不管是哪一排' },
  } as Record<string, { n: string; d: string }>,

  /* ---------- 分栏 ---------- */
  sectionsAria: '个人主页栏目',
  tabs: {
    stats: '统计',
    cal: '日历',
    quotes: '摘句',
    mem: '记忆',
  },

  /* ---------- 统计 ---------- */
  readingBalance: '阅读平衡',
  sixShelves: '六个书架上的你',
  radarAria: (dims: string) => `阅读平衡雷达图：${dims}`,
  thisWeek: '本周',
  /** 周一开头的单字 — 周条形图与日历表头共用 */
  weekdays: ['一', '二', '三', '四', '五', '六', '日'],

  /* ---------- 日历 ---------- */
  owlPosts: (n: number) => `${n} 封猫头鹰来信`,
  calDayAria: (d: number, title: string) => `6月${d}日 — 问过猫头鹰，翻过《${title}》`,
  calDayAriaPlain: (d: number) => `6月${d}日`,
  calFoot: '这一天，你问过猫头鹰，也翻过它的推荐',
  owlPost: (d: number) => `猫头鹰来信 · 6月${d}日`,
  youAsked: '你问过',
  youPeeked: '你翻过',
  firstPages: '开篇几页，由猫头鹰递来',

  /* ---------- 摘句 ---------- */
  tuckedAway: '悄悄收好',
  quotesKept: (n: number) => `已收藏 ${n} 句`,
  keptOn: (d: string) => `${d} 收藏`,
  copyAria: '复制摘句',
  clipQuote: (x: string, author: string, title: string) => `“${x}” — ${author}《${title}》`,
  copiedToast: '已复制 — 一字不差。',
  keptToast: '已收好，一字不差。',

  /* ---------- 记忆 ---------- */
  mem: {
    fetching: '正在取回猫头鹰的记忆…',
    title: '猫头鹰记得的事',
    subtitle: '猫头鹰为你记下的笔记 — 你可以修改，也可以清空。',
    emptyAll: '暂时还没有 — 聊上几回，这里会慢慢填满。',
    whoYouAre: '你是谁',
    workingThrough: '你最近在经历什么',
    notLearned: '猫头鹰还没了解到这一点',
    love: '你的心头好',
    avoid: '想避开的',
    why: '你为什么读书',
    empty: '暂时还没有',
    addLove: '添加类型、作者或话题…',
    addAvoid: '添加想避开的内容…',
    addWhy: '添加一个读书的理由…',
    addAria: '添加',
    removeAria: (v: string) => `移除 ${v}`,
    booksReacted: '你留下过感受的书',
    mentioned: '你提到过的事',
    forget: '全部忘掉',
    forgetConfirm: '真的要让猫头鹰忘掉关于你的一切吗？',
    forgetYes: '对，忘掉吧',
    forgetNo: '先不了',
    forgotToast: '猫头鹰已经忘了 — 一切重新开始',
  },
};

export const profile = { en, zh };
