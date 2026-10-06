/* ============================================================
   Readings, in Chinese — same keys as ../readings.ts. A key missing here
   falls back to the English reading. A tension reads as "甲，还是乙".
   ============================================================ */
import type { Readings } from '../readings';

export const COUNCIL_READINGS_ZH: Partial<Record<string, Readings>> = {
  discipline: [
    { title: '行动，还是心情', detail: '如果心情说了不算，你今天会去做什么？' },
    { title: '努力，还是方向', detail: '你逼自己去做的事，本身值得做吗？' },
    { title: '自己的标准，还是别人的标准', detail: '你想活成的那个自律的样子，是谁定义的？' },
  ],
  career: [
    { title: '觉得充实，还是被人需要', detail: '除了你自己，你的工作究竟是为了谁？' },
    { title: '先有热爱，还是先有本事', detail: '你是不是在等着爱上一份自己还不擅长的工作？' },
    { title: '稳妥的路，还是心里的召唤', detail: '为了一份让你觉得真正活着的工作，你肯冒多大的险？' },
  ],
  failure: [
    { title: '发生的事，还是害怕的事', detail: '你担心的事里，有多少其实还没发生？' },
    { title: '一次挫折，还是一纸判决', detail: '是你失败了，还是你认定自己是个失败者？' },
    { title: '小跟头，还是大跟头', detail: '你能让下一次尝试的代价小到可以一再重来吗？' },
  ],
  'good-life': [
    { title: '好的一天，还是好的一生', detail: '到了最后，你希望自己把什么做好了？' },
    { title: '想要更多，还是需要更少', detail: '有什么你可以不再惦记，并因此轻松一些？' },
    { title: '拥有一切，还是明白为什么', detail: '就算什么都有了，你还会觉得缺什么？' },
  ],
  health: [
    { title: '意志力，还是环境', detail: '你的日常里，是什么让错误的选择最省事？' },
    { title: '惯性，还是觉察', detail: '放弃的那一刻，你心里是什么感觉？' },
    { title: '模糊的目标，还是明确的目标', detail: '八十岁时，你希望自己的身体还能做什么？' },
  ],
  investing: [
    { title: '投资，还是赌博', detail: '买之前，你说得出它值多少钱吗？' },
    { title: '自己选股，还是买下整个市场', detail: '扣掉费用之后，你真觉得自己能跑赢市场吗？' },
    { title: '发财，还是知足', detail: '多少才算够，到了那一步你会停下吗？' },
  ],
  relationships: [
    { title: '被爱，还是学会爱', detail: '除了等着被爱，你在付出什么？' },
    { title: '客气，还是坦诚', detail: '有什么真话，你一直没说出口？' },
    { title: '亲近，还是留白', detail: '这段关系需要留出多少空间，才能保持鲜活？' },
  ],
  literature: [
    { title: '随心去读，还是带着评判去读', detail: '你是先读进去，还是先给它打分？' },
    { title: '情节，还是细节', detail: '你记得书里那些细微之处，还是只记得发生了什么？' },
    { title: '新书，还是耐读的书', detail: '哪本书，十年后你还愿意再读一遍？' },
  ],
};

export const GENERAL_READINGS_ZH: Readings = [
  { title: '想要的，还是害怕的', detail: '真正在发问的，是哪一个？' },
  { title: '眼前，还是长远', detail: '十年后看，这件事是什么样子？' },
  { title: '你自己，还是身边的人', detail: '还有谁在一起承担这件事？' },
];
