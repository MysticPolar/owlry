/* ============================================================
   i18n namespace "today" — the today screen, the library shelves,
   the app chrome (nav / status / player bar), and the first-use
   owl intro cards. en values are byte-identical to the strings
   they replaced; zh keeps the owl-post-office voice — 亲切、有
   文气、不过度感叹. Owl cast names stay English.
   ============================================================ */

/** a run of intro-card speech; `em: true` renders inside <em> */
export interface IntroSeg {
  t: string;
  em?: boolean;
}
const s = (t: string): IntroSeg => ({ t });
const e = (t: string): IntroSeg => ({ t, em: true });

const en = {
  /* ---------- today screen ---------- */
  today: {
    wxAria: (label: string) => `Weather: ${label}. Tap to change`,
    lightingAria: 'Lighting',
    playerAria: 'Your reading progress',
    portraitAria: (name: string) => `${name}'s reader portrait`,
    levelAria: (lv: number) => `Level ${lv}`,
    xpBarAria: (lv: number) => `Level ${lv} experience`,
    inkBarAria: 'Ink',
    coinsAria: (coins: number) => `${coins} coins`,
    postAria: (i: number, total: number) => `Owl post ${i} of ${total}`,
    aboutAria: (title: string) => `About ${title}`,
    askAria: (title: string) => `Ask Scout about ${title}`,
    ask: 'ASK',
    resumeTitle: 'pick up where you left off',
    all: 'ALL',
    continueAria: (title: string, p: number) => `Continue ${title}, ${p}% complete`,
    marqueeAria: "Today's post",
    mq1: 'today’s',
    mq2: 'post',
    mqSub: 'delivered while you slept.',
  },

  /* ---------- library shelves ---------- */
  library: {
    title: 'library',
    segReading: (n: number) => `READING · ${n}`,
    segSaved: (n: number) => `SAVED · ${n}`,
    segFinished: (n: number) => `FINISHED · ${n}`,
    resumeAria: (title: string) => `Resume ${title}`,
    emptySavedTitle: 'nothing saved yet',
    emptySavedBody: 'tap the ♥ on any book to keep it here.',
    finished: 'FINISHED',
    readAgainAria: (title: string) => `Read ${title} again`,
  },

  /* ---------- app chrome ---------- */
  chrome: {
    navAria: 'Primary',
    nav: {
      today: 'today',
      discover: 'discover',
      library: 'library',
      profile: 'profile',
    },
    profileChainedAria: 'Profile — chained until level 5',
    gainLevel: 'gain a level',
    gainLevelAria: (lv: number) => `Gain a level — guest preview (level ${lv})`,
  },

  /* ---------- first-use owl intro cards ---------- */
  intro: {
    peek: {
      eb: 'peek · the taster',
      say: [
        s("first taste? that's me — "),
        e('peek'),
        s('. i pull the pages that matter to '),
        e('you'),
        s(", so you never buy blind. this one's already sorted."),
      ],
      btn: 'open it',
    },
    scribe: {
      eb: 'scribe · the rememberer',
      say: [
        s('ohh — you found me! '),
        e('scribe'),
        s(". every line you love, i keep forever. that one's already filed."),
      ],
      btn: 'carry on',
    },
    keeper: {
      eb: 'keeper · the collector',
      say: [
        s('welcome to the shelves — '),
        e('keeper'),
        s(' here. everything you read, save, and finish lives with me. '),
        e('hoarded lovingly, counted twice.'),
      ],
      btn: 'to the shelves',
    },
    proscout: {
      eb: 'scout pro · office hours',
      say: [
        s('level three — '),
        e('my office is open'),
        s(". the non-fiction desk is yours: bring the crossroads, the can't-decides, the questions with weight."),
      ],
      btn: 'good to know',
    },
    proscoutLocked: {
      eb: 'scout pro · office hours',
      say: [
        s('that desk is '),
        e('my office'),
        s(' — the non-fiction shelf. bring a real problem and i research it properly: your context, the right book, the right chapter. '),
        e('opens at level three.'),
      ],
      btn: 'noted',
    },
    mirror: {
      eb: 'mirror · the reflection',
      say: [
        s('the chains fall — you climbed all the way to me. i am '),
        e('mirror'),
        s('. the others keep your books; i keep '),
        e('you'),
        s('. every page you turn leaves a mark, and i have kept them all. '),
        e('come — see who you are becoming.'),
      ],
      btn: 'i see',
    },
  },
};

const zh: typeof en = {
  /* ---------- 今日 ---------- */
  today: {
    wxAria: (label: string) => `天气：${label}。点按切换`,
    lightingAria: '灯光',
    playerAria: '你的阅读进度',
    portraitAria: (name: string) => `${name} 的读者画像`,
    levelAria: (lv: number) => `等级 ${lv}`,
    xpBarAria: (lv: number) => `等级 ${lv} 经验`,
    inkBarAria: '墨水',
    coinsAria: (coins: number) => `${coins} 枚金币`,
    postAria: (i: number, total: number) => `第 ${i} 封猫头鹰来信，共 ${total} 封`,
    aboutAria: (title: string) => `关于《${title}》`,
    askAria: (title: string) => `向 Scout 请教《${title}》`,
    ask: '问一问',
    resumeTitle: '接着上次读下去',
    all: '全部',
    continueAria: (title: string, p: number) => `继续《${title}》，已读 ${p}%`,
    marqueeAria: '今日邮报',
    mq1: '今日',
    mq2: '邮报',
    mqSub: '趁你睡着时，悄悄送达。',
  },

  /* ---------- 书架 ---------- */
  library: {
    title: '书架',
    segReading: (n: number) => `在读 · ${n}`,
    segSaved: (n: number) => `收藏 · ${n}`,
    segFinished: (n: number) => `读完 · ${n}`,
    resumeAria: (title: string) => `继续读《${title}》`,
    emptySavedTitle: '还没有收藏',
    emptySavedBody: '点一下书上的 ♥，就把它留在这里。',
    finished: '已读完',
    readAgainAria: (title: string) => `再读一遍《${title}》`,
  },

  /* ---------- 界面 ---------- */
  chrome: {
    navAria: '主导航',
    nav: {
      today: '今天',
      discover: '发现',
      library: '书架',
      profile: '我的',
    },
    profileChainedAria: '我的 — 锁链缠绕，等级 5 解开',
    gainLevel: '升一级',
    gainLevelAria: (lv: number) => `升一级 — 游客预览（等级 ${lv}）`,
  },

  /* ---------- 猫头鹰初次登场 ---------- */
  intro: {
    peek: {
      eb: 'peek · 尝书官',
      say: [
        s('第一口的滋味？那是我 — '),
        e('peek'),
        s('。我把真正对'),
        e('你'),
        s('要紧的那几页挑出来，让你不必盲买。这一本，已经替你理好了。'),
      ],
      btn: '打开看看',
    },
    scribe: {
      eb: 'scribe · 铭记者',
      say: [
        s('哦 — 你找到我啦！我是'),
        e('scribe'),
        s('。你爱过的每一行字，我都替你永远收着。刚才那句，已经归档了。'),
      ],
      btn: '接着读吧',
    },
    keeper: {
      eb: 'keeper · 收藏家',
      say: [
        s('欢迎来到书架 — 我是'),
        e('keeper'),
        s('。你在读的、收藏的、读完的，都住在我这里。'),
        e('宝贝般囤着，还要数上两遍。'),
      ],
      btn: '去书架',
    },
    proscout: {
      eb: 'scout pro · 办公时间',
      say: [
        s('到三级了 — '),
        e('我的办公室开门了'),
        s('。非虚构书桌归你用：把岔路口、拿不定的主意、有分量的问题，都带来吧。'),
      ],
      btn: '明白了',
    },
    proscoutLocked: {
      eb: 'scout pro · 办公时间',
      say: [
        s('那张书桌是'),
        e('我的办公室'),
        s(' — 非虚构书架。带一个真问题来，我替你认真去查：你的处境、对的书、对的章节。'),
        e('等级三时开门。'),
      ],
      btn: '记下了',
    },
    mirror: {
      eb: 'mirror · 镜中之影',
      say: [
        s('锁链落下 — 你一路走到了我这里。我是'),
        e('mirror'),
        s('。其他伙伴替你收着书；我收着的，是'),
        e('你'),
        s('。你翻过的每一页都留下痕迹，我一页不落地记着。'),
        e('来 — 看看你正在成为谁。'),
      ],
      btn: '我看见了',
    },
  },
};

export const today = { en, zh };
