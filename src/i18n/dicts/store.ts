/* strings emitted by store actions (toasts, the chat greeting) */
const en = {
  finishedTwice: 'finished — counted twice. +40 XP',
  lineSaved: 'line saved — scribe has it',
  unshelved: 'unshelved. keeper noticed.',
  shelved: 'shelved · +5 XP',
  levelUp: (lv: number) => `level up! LV ${lv}`,
  inkFull: 'daily ink full · +50 coins',
  peekOpened: 'a peek, opened · +5 XP',
  inkwellDry: 'the inkwell is dry — a few pages will refill it',
  eveningShow: 'the evening show',
  matinee: 'the matinée',
  greeting: (sal: string, flavor: string) =>
    `${sal} ${flavor}. scout here, at the post desk — tell me what's going on, and i'll sort you a peek.`,
  firstSorted: `sorted. and since you're new — peek pulled the pages that matter. `,
  firstTaste: `first taste is free.`,
  deskPro: 'right — office hours. what are we solving?',
  deskAll: 'off the clock — the whole desk is open. where shall we wander?',
};

const zh: typeof en = {
  finishedTwice: '读完了 — 这本记双份。+40 XP',
  lineSaved: '这一句收好了 — Scribe 替你存着',
  unshelved: '下架了。Keeper 看在眼里。',
  shelved: '上架 · +5 XP',
  levelUp: (lv: number) => `升级啦！LV ${lv}`,
  inkFull: '今日墨水已满 · +50 金币',
  peekOpened: '拆开一封试读 · +5 XP',
  inkwellDry: '墨水见底了 — 读上几页就能续满',
  eveningShow: '夜场开演',
  matinee: '日场开演',
  greeting: (sal: string, flavor: string) =>
    `${sal}${flavor}。我是 Scout，坐镇邮务台 — 说说你最近的状态，我来给你分拣一封试读。`,
  firstSorted: `分拣好了。你是新来的 — Peek 已经把最要紧的那几页抽了出来。`,
  firstTaste: `第一口，免费尝。`,
  deskPro: '好 — 办公时间到。我们来解决什么？',
  deskAll: '下班啦 — 整张书桌都敞开着。想去哪儿逛逛？',
};

export const store = { en, zh };
