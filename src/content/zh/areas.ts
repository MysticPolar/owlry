import type { Area } from '../types';
import type { AreaZh } from './types';

/* the six paths, in Chinese; suggestion texts are parallel to the English ones (same council ids) */
export const AREAS_ZH: Partial<Record<Area, AreaZh>> = {
  health: {
    title: '健康',
    tagline: '更健康、更快乐的你',
    suggestions: ['为什么我总是对自己食言？', '自律是天性，还是每天的一个决定？', '怎样才算活得好？'],
  },
  career: {
    title: '事业',
    tagline: '建造真正重要的东西',
    suggestions: ['如果没有人喝彩，我还会做什么工作？', '这次失败想教会我什么？', '为什么我明知该做，却不去做？'],
  },
  investing: {
    title: '投资',
    tagline: '做出更明智的决定',
    suggestions: ['我是在投资，还是在拿希望赌博？', '怎样承受亏损，而不失去自己？', '多少才算够？'],
  },
  relationships: {
    title: '关系',
    tagline: '更深的连接',
    suggestions: ['我是爱别人，还是只是需要他们？', '怎样才算活得好？', '被拒绝时，怎样不看轻自己？'],
  },
  literature: {
    title: '文学',
    tagline: '更丰盈的心灵',
    suggestions: ['怎样读，一本书才会真正改变我？', '多少才算够？', '什么样的工作，值得用一生去做？'],
  },
  other: {
    title: '其他',
    tagline: '告诉我们你在想什么',
    suggestions: ['为什么我明知该做，却不去做？', '如果没有人喝彩，我还会做什么工作？', '这次失败想教会我什么？', '怎样才算活得好？'],
  },
};
