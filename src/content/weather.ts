/* ============================================================
   owlry — weather modes for the masthead (mockup `WX`).
   ============================================================ */

export type WeatherKey = 'rain' | 'cloud' | 'sun' | 'snow' | 'night';

export interface WeatherMode {
  /** weather key (drives the data-wx animation hooks) */
  k: WeatherKey;
  /** tabler icon name */
  i: string;
  /** label shown in the toast / aria */
  l: string;
  /** the same label, 简体中文 */
  lZh: string;
}

export const WX: WeatherMode[] = [
  { k: 'rain', i: 'ti-cloud-rain', l: 'rainy day reads', lZh: '雨天书单' },
  { k: 'cloud', i: 'ti-cloud', l: 'overcast & cozy', lZh: '阴天，宜窝读' },
  { k: 'sun', i: 'ti-sun', l: 'clear-sky pages', lZh: '晴空翻页天' },
  { k: 'snow', i: 'ti-snowflake', l: 'snow-day stack', lZh: '落雪读书日' },
  { k: 'night', i: 'ti-moon-stars', l: 'night owl hours', lZh: '夜猫子时间' },
];

/** the toast/aria label in the given language */
export const wxLabel = (w: WeatherMode, lang: 'en' | 'zh'): string => (lang === 'zh' ? w.lZh : w.l);
