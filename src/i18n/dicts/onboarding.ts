/* ============================================================
   i18n namespace "onboarding" — opening night, the five-act
   arrival: splash → playbill → the door (invite + name) →
   the curtain → scout's first flight.
   en is the source of truth (byte-identical to the old copy);
   zh mirrors its shape exactly (zh: typeof en).
   ============================================================ */

const en = {
  /** the whole overlay (role="dialog") */
  dialogAria: 'Opening night',

  /* act 1 · the splash */
  splash: {
    aria: 'Owlry — a wakeup! human production',
    sub: 'a wakeup! human production',
  },

  /* act 2 · the playbill deck */
  cast: {
    deckAria: 'Meet the cast — swipe through five owls',
    slideAria: (n: number, total: number, owl: string) => `${n} of ${total} — ${owl}`,
    dotsAria: 'Slides',
    dotAria: (n: number, owl: string) => `Go to slide ${n} — ${owl}`,
    nextAria: 'Next',
    enterAria: 'Enter the owlery',
    enter: 'enter the owlery',
    scout: {
      job: 'the finder',
      head: 'the right book finds you',
      body: 'tell scout what’s going on — a problem, a mood, a rainy sunday.',
      em: 'she always brings back one too many.',
    },
    peek: {
      job: 'the taster',
      head: 'taste before you commit',
      bodyA: 'a peek opens the right chapter first — the pages that matter to ',
      bodyAEm: 'you',
      bodyB: '.',
      em: 'peek has never finished a book. that’s the point.',
    },
    scribe: {
      job: 'the rememberer',
      head: 'never lose a line',
      body: 'keep a line once — scribe files it forever, word for word.',
      em: 'page 118 is not page 117.',
    },
    keeper: {
      job: 'the collector',
      head: 'your shelf remembers',
      body: 'every book, every streak, your whole reading life —',
      em: 'shelved lovingly, counted twice.',
    },
    mirror: {
      job: 'the reflection',
      head: 'meet your reading self',
      body: 'mirror charts your reading identity, and it levels as you read.',
      em: 'six shelves of you.',
    },
  },

  /* act 3a · the door — invite only */
  gate: {
    line1: 'the owlery opens',
    line2: 'by invite only',
    codePlaceholder: 'invite code',
    codeAria: 'Invite code',
    enter: 'enter',
    err: 'that code isn’t on the list.',
    noInvite: 'no invite yet?',
    waitlist: 'join the waitlist',
    waitlistToast: 'the waitlist opens outside owlry',
    or: 'or',
    guest: 'peek in as guest',
  },

  /* act 3b · the name plaque */
  name: {
    q: 'how should the owls address you?',
    dear: 'Dear',
    comma: ',',
    placeholder: 'your name',
    aria: 'Your name',
    thatsMe: 'that’s me',
    sealedFor: (name: string) => `sealed for ${name}`,
    note: 'every letter you receive opens this way',
  },

  /* act 4 · the curtain rises */
  reveal: {
    kick: 'tonight & every night',
    marq1: 'read',
    marq2: 'better',
    at: 'at',
    enter: 'enter',
    eveningShow: 'the evening show',
    raiseAria: 'Raise the curtain',
    seat: 'now seating — tap to raise the curtain',
  },

  /* act 5 · scout's first flight */
  flight: {
    friend: 'friend',
    /* steps with `pre`/`em`/`post` render <em> around the middle piece;
       steps with a separate `node` differ from the typed `text`
       (curly vs straight apostrophes, kept byte-identical to the old copy) */
    steps: {
      s1: { pre: 'dear ', post: ' — you made it in.' },
      s2: 'this hall was a theatre once. red curtains, full houses.',
      s3: {
        text: "now it's a mailroom — owls, carrying the right words to readers all over the world.",
        node: 'now it’s a mailroom — owls, carrying the right words to readers all over the world.',
      },
      s4: { text: "you'll want to know two things.", node: 'you’ll want to know two things.' },
      s5: { pre: 'we write with ', em: 'ink', post: '. every ask, every peek costs a drop. here — one drop, on me.' },
      s6: { pre: 'and you? you grow. every ask, every page — ', em: 'level up', post: ', and more of the owlery opens.' },
      s7: { text: "right — your turn. what's going on?", node: 'right — your turn. what’s going on?' },
    },
    asks: {
      focus: {
        label: "can't focus lately",
        why: "you said you can't hold a thought lately. this one argues your attention is a muscle the world keeps poking — and shows how to guard it.",
      },
      habit: {
        label: 'new manager, no manual',
        why: "new role, no handbook — so build the systems that do the managing. clear's case: you don't rise to your goals, you fall to your habits.",
      },
      heart: {
        label: 'heartbreak',
        why: "heartbreak. this one won't rush you past it — pema's advice is to stop running and let the ground be gone a while. gentler than it sounds.",
      },
      rest: {
        label: 'rainy sunday',
        why: 'a rainy sunday earns a slow read. walker on why the sleeping third of your life quietly runs the waking two — and how to get it back.',
      },
      decide: {
        label: 'before a big decision',
        why: "before a big decision, the biggest question: what's it for? frankl found the one thing that survives when everything else is taken.",
      },
    },
    // act 5 counts what the ledger actually grants — never a rehearsed number
    xpFly: (n: number) => `+${n} xp`,
    levelAria: 'Level',
    inkAria: 'Ink',
    lv: (n: number) => `lv ${n}`,
    skip: 'skip intro ›',
    who: 'scout · the finder',
    tapNote: 'tap to continue',
    sayNoMore: ' — say no more.',
    offToShelves: '…off to the shelves…',
    stamp: 'first ask',
    postLine: (name: string) => `owl post · nº 1 · for ${name}`,
    you: 'you',
    firstBookFallback: 'your first book',
    sign: '— scout, first post',
    bannerSeat: (lv: number, row: number) => `row ${row} · lv ${lv}`,
    bannerSub: 'the owlery stirs',
    bundleLine: 'welcome bundle — your first ten questions are on us.',
    bundleInk: (n: number) => `+${n} ink`,
    cont: 'continue',
  },
};

const zh: typeof en = {
  dialogAria: '首演夜',

  splash: {
    aria: 'Owlry — wakeup! human 出品',
    sub: 'wakeup! human 出品',
  },

  cast: {
    deckAria: '认识全体演员 — 滑动看过五只猫头鹰',
    slideAria: (n: number, total: number, owl: string) => `第 ${n} 页，共 ${total} 页 — ${owl}`,
    dotsAria: '节目单',
    dotAria: (n: number, owl: string) => `翻到第 ${n} 页 — ${owl}`,
    nextAria: '下一页',
    enterAria: '走进猫头鹰邮局',
    enter: '走进猫头鹰邮局',
    scout: {
      job: '寻书者',
      head: '对的书，会找到你',
      body: '把正在发生的事说给 Scout — 一道难题、一种心情、一个下雨的星期天。',
      em: '她带回来的，总会多出一本。',
    },
    peek: {
      job: '试读者',
      head: '先尝一口，再决定',
      bodyA: '一封试读，会先翻开对的那一章 — 专挑对',
      bodyAEm: '你',
      bodyB: '要紧的那几页。',
      em: 'Peek 从没读完过一本书。妙处正在这里。',
    },
    scribe: {
      job: '铭记者',
      head: '一句话也不丢',
      body: '把一句话交给它一次 — Scribe 会一字不差，永远存档。',
      em: '第 118 页，不是第 117 页。',
    },
    keeper: {
      job: '收藏者',
      head: '你的书架记得',
      body: '每一本书、每一段连读、你完整的阅读岁月 —',
      em: '妥帖上架，清点两遍。',
    },
    mirror: {
      job: '倒影',
      head: '与阅读中的自己相见',
      body: 'Mirror 描画你的阅读身份，随你的阅读一路升级。',
      em: '六个书架，都是你。',
    },
  },

  gate: {
    line1: '猫头鹰邮局',
    line2: '凭邀请开门',
    codePlaceholder: '邀请码',
    codeAria: '邀请码',
    enter: '进入',
    err: '这串邀请码不在名单上。',
    noInvite: '还没有邀请？',
    waitlist: '加入候补名单',
    waitlistToast: '候补名单在 owlry 之外开放',
    or: '或',
    guest: '以访客身份先看看',
  },

  name: {
    q: '猫头鹰们该怎么称呼你？',
    dear: '亲爱的',
    comma: '，',
    placeholder: '你的名字',
    aria: '你的名字',
    thatsMe: '就是我',
    sealedFor: (name: string) => `已为 ${name} 封缄`,
    note: '你收到的每一封信，都将这样开头',
  },

  reveal: {
    kick: '今夜，也是每一夜',
    marq1: '读得',
    marq2: '更好',
    at: '在',
    enter: '入场',
    eveningShow: '夜场演出',
    raiseAria: '升起幕布',
    seat: '正在入座 — 轻点，升起幕布',
  },

  flight: {
    friend: '朋友',
    steps: {
      s1: { pre: '亲爱的 ', post: ' — 你进来了。' },
      s2: '这座大厅从前是一家剧院。红色的幕布，满座的观众。',
      s3: {
        text: '如今它是一间邮务室 — 猫头鹰们衔着恰好的文字，送往世界各地的读者。',
        node: '如今它是一间邮务室 — 猫头鹰们衔着恰好的文字，送往世界各地的读者。',
      },
      s4: { text: '有两件事，你需要先知道。', node: '有两件事，你需要先知道。' },
      s5: { pre: '我们用', em: '墨水', post: '写信。每一次提问、每一封试读，都要花上一滴。来 — 这一滴，算我的。' },
      s6: { pre: '而你呢？你会成长。每一次提问、每一页 — ', em: '升级', post: '，猫头鹰邮局也随之为你敞开更多。' },
      s7: { text: '好了 — 轮到你了。说说，你最近怎么样？', node: '好了 — 轮到你了。说说，你最近怎么样？' },
    },
    asks: {
      focus: {
        label: '最近静不下心',
        why: '你说最近留不住一个念头。这本书认为，注意力是一块被世界不停戳弄的肌肉 — 它也教你如何守住它。',
      },
      habit: {
        label: '新官上任，没有手册',
        why: '新角色，没有手册 — 那就搭起替你打理的系统。克利尔的论断是：你不会升到目标的高度，只会落回习惯的水平。',
      },
      heart: {
        label: '心碎了',
        why: '心碎。这本书不会催你翻篇 — 佩玛的建议是别再奔逃，允许脚下的地面空一阵子。比听上去温柔得多。',
      },
      rest: {
        label: '下雨的星期天',
        why: '下雨的星期天，配得上一场慢读。沃克讲人生里睡去的那三分之一，如何悄悄掌管醒着的那三分之二 — 以及怎样把它找回来。',
      },
      decide: {
        label: '大决定之前',
        why: '大决定之前，先问最大的那个问题：这是为了什么？弗兰克尔找到了那样东西 — 当其余一切都被夺走，它仍然还在。',
      },
    },
    xpFly: (n: number) => `+${n} xp`,
    levelAria: '等级',
    inkAria: '墨水',
    lv: (n: number) => `lv ${n}`,
    skip: '跳过开场 ›',
    who: 'scout · 寻书者',
    tapNote: '轻点继续',
    sayNoMore: ' — 不必多说。',
    offToShelves: '……去书架那边了……',
    stamp: '第一问',
    postLine: (name: string) => `猫头鹰邮政 · nº 1 · 致 ${name}`,
    you: '你',
    firstBookFallback: '你的第一本书',
    sign: '— scout，首次投递',
    bannerSeat: (lv: number, row: number) => `第 ${row} 排 · LV ${lv}`,
    bannerSub: '猫头鹰邮局醒了',
    bundleLine: '见面礼包 — 你的前十次提问，我们请。',
    bundleInk: (n: number) => `+${n} ink`,
    cont: '继续',
  },
};

export const onboarding = { en, zh };
