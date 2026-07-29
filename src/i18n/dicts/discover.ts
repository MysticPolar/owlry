/* i18n namespace "discover" — the discover screen, shared chat items,
   and the simulated owl brain's canned lines (brain.*).
   en entries are byte-identical to the strings previously hardcoded in
   DiscoverScreen.tsx / ChatItems.tsx / owlBrain.ts — scripts/owl-smoke.ts
   asserts on the English replies. */
const en = {
  /* ---- discover screen chrome ---- */
  title: 'discover',
  introKicker: 'scout · book finder',
  chipHint: 'or choose a starting point',
  starterPromptsAria: 'Starter prompts',
  followupPromptsAria: 'Suggested follow-ups',
  followupCarouselRole: 'carousel',
  followupCarouselHint: 'Swipe horizontally for more suggestions.',
  shortlist: "scout's picks",
  deskAria: "Scout's desk",
  deskAll: 'EVERYTHING',
  deskOfficeHour: 'OFFICE HOUR',
  deskNonFiction: 'NON-FICTION',
  deskAllShort: 'ALL',
  deskNonFictionShort: 'NON-FICTION',
  officeHourLockedAria: 'Office hour — opens at level 3',
  nonFictionAria: 'Non-fiction',
  historyAria: 'Chat history',
  backAria: 'Back to Home',
  guestLevelAria: (lv: number) => `Gain a level — guest preview (level ${lv})`,

  /* ---- shelf rail ---- */
  shelfAria: 'Your shelf',
  shelfCount: (n: number) => `${n} ${n === 1 ? 'book' : 'books'}`,

  /* ---- composer ---- */
  composerPlaceholderPro: 'tell scout what you’re solving…',
  composerPlaceholder: 'tell scout what’s going on…',
  composerAria: 'Message scout',
  sendAria: 'Send',
  skip: 'skip',

  /* ---- chat items (letter card, typing dots) ---- */
  typing: 'the owl is typing…',
  letterAria: (title: string) => `Reading letter: ${title}`,
  letterKick: (no: number) => `owl post · nº ${no}`,
  saveAria: 'Save to library',
  pages: (n: number) => `${n} pages`,
  about: 'about',
  peek: 'peek',
  reasonAria: (title: string) => `Scout's reason for recommending ${title}`,
  peekInside: 'peek inside',
  openBook: 'open the book',

  /* ---- the owl brain's canned lines (lib/owlBrain.ts) ---- */
  brain: {
    fictionLead: 'easy does it — no homework, just pages. try ',
    fictionNote1: (note: string) => ` (${note}), or `,
    fictionNote2: (note: string) => ` (${note}).`,
    fictionChips: ['more like this', 'new vibe', 'surprise me'],
    deeperLead: 'from the same peek, something to sit with: ',
    deeperQuote: (q: string) => `“${q}”`,
    deeperTail: ' — no rush.',
    moreLead: 'from the same desk: ',
    moreWhy: (why: string) => ` — ${why}`,
    moreSep: '; ',
    moreEnd: '.',
    fallbackFresh: `clean slate, then. what's the weather inside — rest, focus, heartache, or escape?`,
    fallbackMore: `tell me a little more — what's the shape of it: rest, focus, heartache, or escape?`,
    fallbackChips: ['rest', 'need focus', 'feeling blue', 'cozy escape'],
  },
};

const zh: typeof en = {
  /* ---- discover screen chrome ---- */
  title: '发现',
  introKicker: 'Scout · 选书向导',
  chipHint: '或者，从这里开始',
  starterPromptsAria: '开场提示',
  followupPromptsAria: '后续建议',
  followupCarouselRole: '轮播',
  followupCarouselHint: '横向滑动查看更多建议。',
  shortlist: 'Scout 的书单',
  deskAria: 'Scout 的书桌',
  deskAll: '全部',
  deskOfficeHour: '办公时间',
  deskNonFiction: '非虚构',
  deskAllShort: '全部',
  deskNonFictionShort: '非虚构',
  officeHourLockedAria: '办公时间——LV 3 开启',
  nonFictionAria: '非虚构',
  historyAria: '聊天记录',
  backAria: '返回首页',
  guestLevelAria: (lv: number) => `升一级——访客预览（LV ${lv}）`,

  /* ---- shelf rail ---- */
  shelfAria: '你的书架',
  shelfCount: (n: number) => `${n} 本书`,

  /* ---- composer ---- */
  composerPlaceholderPro: '告诉 Scout 你正在解决什么…',
  composerPlaceholder: '跟 Scout 说说，最近怎么了…',
  composerAria: '给 Scout 留言',
  sendAria: '发送',
  skip: '跳过',

  /* ---- chat items (letter card, typing dots) ---- */
  typing: '猫头鹰正在打字…',
  letterAria: (title: string) => `阅读信笺：${title}`,
  letterKick: (no: number) => `猫头鹰来信 · 第 ${no} 封`,
  saveAria: '收进书房',
  pages: (n: number) => `${n} 页`,
  about: '简介',
  peek: '试读',
  reasonAria: (title: string) => `Scout 推荐《${title}》的理由`,
  peekInside: '翻开看看',
  openBook: '打开这本书',

  /* ---- the owl brain's canned lines (lib/owlBrain.ts) ---- */
  brain: {
    fictionLead: '慢慢来——没有功课，只有书页。试试 ',
    fictionNote1: (note: string) => `（${note}），或者 `,
    fictionNote2: (note: string) => `（${note}）。`,
    /* phrasing mirrors AFTER_CHIPS/START_CHIPS zh in content/owl.ts so the
       brain recognises them when tapped */
    fictionChips: ['多来点这类', '换个风格', '给我个惊喜'],
    deeperLead: '出自同一封信，留一句话陪你坐一会儿：',
    deeperQuote: (q: string) => `“${q}”`,
    deeperTail: '——不急。',
    moreLead: '同一张书桌上还有：',
    moreWhy: (why: string) => `——${why}`,
    moreSep: '；',
    moreEnd: '。',
    fallbackFresh: '那就摊开一张白纸。你心里此刻是什么天气——想休息、要专注、心里难受，还是想躲进故事里？',
    fallbackMore: '再跟我多说一点——它是什么形状的：想休息、要专注、心里难受，还是想躲进故事里？',
    /* each of these matches an INTENTS regex in content/owl.ts */
    fallbackChips: ['想休息', '需要专注', '心情低落', '来点治愈的'],
  },
};

export const discover = { en, zh };
