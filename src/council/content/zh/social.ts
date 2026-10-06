import type { Post } from '../../store/types';

/* ============================================================
   Seed posts for the feed, in Chinese. Same readers, same ids and
   timings as the English seeds (../social.ts); the passages are the
   Chinese renderings of the same lines — the ones a Chinese reader would
   have highlighted in this app's own texts — and the reflections are in
   the poster's own words.
   ============================================================ */
const H = 3600_000;
const D = 24 * H;

export function seedPostsZh(now = Date.now()): Post[] {
  return [
    {
      id: 'p_alex',
      author: { handle: 'alex.reader', name: 'Alex', color: '#B07A2A', initial: 'A' },
      ts: now - 2 * H,
      quote: '难道我还不愿去做我生来就为之而来到这个世界上的事吗？',
      bookId: 'meditations',
      attribution: '《沉思录》第五卷 · 马可·奥勒留',
      caption: '心静了，日子就亮了。今天读到这句被击中——自律真的就是自由。🙂',
      likes: 342,
      comments: 18,
      prompt: '它为你改变了什么？',
    },
    {
      id: 'p_luna',
      author: { handle: 'luna.reads', name: 'Luna', color: '#8A5CE0', initial: 'L' },
      ts: now - 5 * H,
      quote: '女人不是天生的，而是后天成为的。',
      bookId: 'second-sex',
      attribution: '《第二性》· 西蒙娜·德·波伏瓦',
      caption: '还在“成为”的路上……至少我在读书。🌙',
      likes: 129,
      comments: 7,
      prompt: '它为你改变了什么？',
    },
    {
      id: 'p_sam',
      author: { handle: 'sam.stoic', name: 'Sam', color: '#2FB8A6', initial: 'S' },
      ts: now - 1 * D,
      quote: '令我们害怕的事远多于真能压垮我们的事；我们更常在想象中受苦，而非在现实里。',
      bookId: 'letters-stoic',
      attribution: '《道德书简》第十三封 · 塞涅卡',
      caption: '凌晨两点读到这句。合上电脑。睡了。这就是全部书评。',
      likes: 88,
      comments: 4,
      prompt: '它为你改变了什么？',
    },
    {
      id: 'p_priya',
      author: { handle: 'priya.pages', name: 'Priya', color: '#E2483C', initial: 'P' },
      ts: now - 2 * D,
      quote: '欲望是你与自己签下的一份契约：在得到想要的东西之前，一直不快乐。',
      bookId: 'almanack',
      attribution: '《纳瓦尔宝典》',
      caption: '读完退订了三个新闻邮件。它为我改变了什么？我的刷屏。',
      likes: 210,
      comments: 12,
      prompt: '它为你改变了什么？',
    },
    {
      id: 'p_theo',
      author: { handle: 'theo.turnspages', name: 'Theo', color: '#4C86F5', initial: 'T' },
      ts: now - 3 * D,
      quote: '关于阅读，一个人能给另一个人的唯一建议，就是不要接受任何建议：跟随你自己的直觉，运用你自己的理性，得出你自己的结论。',
      bookId: 'common-reader',
      attribution: '《人该怎样读一本书？》· 弗吉尼亚·伍尔夫',
      caption: '给我整摞待读书的一张许可证。',
      likes: 64,
      comments: 3,
      prompt: '它为你改变了什么？',
    },
  ];
}

/** the two highlights the demo library starts with, in Chinese (the first is a line of this app's own Meditations text) */
export const SEED_HIGHLIGHTS_ZH = {
  meditations: '难道我还不愿去做我生来就为之而来到这个世界上的事吗？',
  atomicHabits: '你采取的每一个行动，都是在为你想成为的那种人投票。',
  note: '星期二的投票。',
};
