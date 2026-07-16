/* ============================================================
   owlry — reader text.

   v1 ships the mockup's original placeholder literary prose (it is
   legally safe — original writing, not a copyrighted excerpt) and
   cycles it through the reader exactly as the mockup does.

   This module is the seam for real public-domain texts (Standard
   Ebooks / Project Gutenberg). To give a title its own pages, add a
   BookId-keyed entry to BOOK_TEXT below; the reader picks it up with
   zero UI changes. Genuinely public-domain catalog titles (e.g.
   `medit` — Meditations) are the natural first candidates.
   ============================================================ */
import type { BookId, BookRef } from './types';
import { getActiveLang, type Lang } from '../i18n';

/** A page "spread" is the set of paragraphs shown on one reader page. */
export type PageSpread = string[];

/** Original placeholder prose, cycled through the reader — one set per language. */
export const PAGES: Record<Lang, PageSpread[]> = {
  en: [
    [
      `The rain had been falling since before the shop opened, a patient, unhurried rain that made the windows look like old glass. Inside, the lamps were lit early and the smell of paper rose from the shelves the way warmth rises from bread.`,
      `Nobody came in for the first hour, which suited the owner fine. There were three crates of estate books to sort, and sorting was best done slowly, with tea, while the gutters ticked overhead like a clock that had given up on minutes.`,
    ],
    [
      `The ledger sat open on the counter, its columns inked in a hand so careful it seemed to apologize for every figure. Sold: one atlas, water-damaged. Acquired: forty-one novels, one box of letters, a dictionary missing its own definition of the word lost.`,
      `By the radiator, the shop cat had claimed the warmest chair and defended it with nothing but sleep. Outside, umbrellas moved past the window like a parade of small dark planets.`,
    ],
    [
      `The letter arrived on a Tuesday, slipped between the pages of a returned book as though it had grown there. The paper was thin, the handwriting urgent, and it said only this: Come at once. Bring the green notebook. Tell no one but the dog.`,
      `She read it three times standing up and a fourth time sitting down. The dog, to his credit, told no one.`,
    ],
    [
      `Morning came scrubbed clean by the storm, the whole street smelling of slate and bakery smoke. She walked fast, the green notebook under one arm, rehearsing questions she had no intention of asking politely.`,
      `Her grandmother used to say that a good book and a good secret were the same thing: both were just waiting for the right person to open them. She had never believed it until now.`,
    ],
    [
      `The library stood at the top of the hill, exactly where libraries should stand, with the town arranged below it like an audience. The doors were open. The reading room was empty except for the light.`,
      `On the third shelf of the third case, where she had not left it, sat the green notebook's twin. She took a breath, the kind you take before the first page of anything, and reached for it.`,
    ],
  ],
  zh: [
    [
      `雨从店门未开时便落着，是一场耐心的、不慌不忙的雨，把窗玻璃洗得像旧年的老玻璃。店里的灯早早点亮，纸页的气息从书架间升起来，就像暖意从面包里升起来一样。`,
      `头一个钟头没有人进来，店主正乐得如此。还有三箱旧宅遗留的书等着整理，而整理这件事，最宜慢慢来，就着一盏茶，听头顶的檐槽滴滴答答，像一只早已不再计较分钟的钟。`,
    ],
    [
      `账簿在柜台上摊开着，一栏一栏的字迹写得极尽小心，仿佛在为每一个数字致歉。售出：地图册一部，有水渍。购入：小说四十一部，书信一箱，还有一部词典——偏偏缺了“遗失”这个词自己的那条释义。`,
      `暖气旁，店里的猫占下了最暖和的那把椅子，守卫它的方式唯有睡觉。窗外，一把把伞从窗前经过，像一列小小的深色行星在巡游。`,
    ],
    [
      `信是星期二到的，夹在一本归还的书页之间，仿佛原本就长在那里。信纸很薄，字迹急切，只写了这么几句：速来。带上绿色笔记本。除了狗，谁也别告诉。`,
      `她站着读了三遍，坐下又读了第四遍。那只狗倒也争气，果真谁都没有告诉。`,
    ],
    [
      `清晨被夜里的风雨洗刷一新，整条街都是石板和面包房炊烟的味道。她走得很快，绿色笔记本夹在腋下，一路默诵着那些问题——她可没打算客客气气地问。`,
      `祖母从前常说，一本好书和一个好秘密原是同一回事：都只是在等那个对的人来翻开。她从来不信，直到此刻。`,
    ],
    [
      `图书馆立在山顶上，正是图书馆该立的地方，小镇在它脚下铺展开来，像一片安静的观众席。门开着。阅览室里空无一人，只剩下光。`,
      `第三排书架的第三层上，摆着那本绿色笔记本的孪生兄弟——她分明不曾把它放在那里。她吸了一口气，是翻开任何东西第一页之前的那种呼吸，然后伸手取了下来。`,
    ],
  ],
};

/** Per-book real texts plug in here (public domain). Empty in v1. */
const BOOK_TEXT: Partial<Record<BookId, PageSpread[]>> = {};

/** Returns the spread for a 1-indexed page of a given book (open-world slugs fall back to PAGES). */
export function getSpread(id: BookRef, pageNumber: number): PageSpread {
  const text = BOOK_TEXT[id as BookId] ?? PAGES[getActiveLang()];
  return text[(pageNumber - 1 + text.length) % text.length];
}
