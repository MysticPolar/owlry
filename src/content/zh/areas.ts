import type { Area } from '../types';
import type { AreaZh } from './types';

/* the six paths, in Chinese; suggestion texts are parallel to the English ones (same council ids) */
export const AREAS_ZH: Partial<Record<Area, AreaZh>> = {
  health: {
    title: '健康',
    tagline: '更健康、更快乐的你',
    suggestions: ['为什么我坚持不了健康的习惯？', '我怎样才能更自律？', '什么是美好的生活？'],
  },
  career: {
    title: '事业',
    tagline: '建造真正重要的东西',
    suggestions: ['有意义的事业是什么样的？', '我该如何面对失败？', '我怎样才能更自律？'],
  },
  investing: {
    title: '投资',
    tagline: '做出更明智的决定',
    suggestions: ['我该怎么开始投资？', '我该如何面对一次重大亏损？', '我怎样才能不再总想要更多？'],
  },
  relationships: {
    title: '关系',
    tagline: '更深的连接',
    suggestions: ['我怎样才能建立更深的关系？', '什么是美好的生活？', '我该如何面对被拒绝？'],
  },
  literature: {
    title: '文学',
    tagline: '更丰盈的心灵',
    suggestions: ['我怎样才能从阅读中得到更多？', '什么是美好的生活？', '有意义的事业是什么样的？'],
  },
  other: {
    title: '其他',
    tagline: '告诉我们你在想什么',
    suggestions: ['我怎样才能更自律？', '有意义的事业是什么样的？', '我该如何面对失败？', '什么是美好的生活？'],
  },
};
