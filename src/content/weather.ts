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
}

export const WX: WeatherMode[] = [
  { k: 'rain', i: 'ti-cloud-rain', l: 'rainy day reads' },
  { k: 'cloud', i: 'ti-cloud', l: 'overcast & cozy' },
  { k: 'sun', i: 'ti-sun', l: 'clear-sky pages' },
  { k: 'snow', i: 'ti-snowflake', l: 'snow-day stack' },
  { k: 'night', i: 'ti-moon-stars', l: 'night owl hours' },
];
