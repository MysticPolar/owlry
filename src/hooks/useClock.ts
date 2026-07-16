import { useEffect, useState } from 'react';
import type { Lang } from '../i18n';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

export interface ClockParts {
  time: string;
  dt: string;
}

function fmt(d: Date, lang: Lang): ClockParts {
  const h = d.getHours();
  const h12 = h % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  const dt =
    lang === 'zh'
      ? `${DAYS_ZH[d.getDay()]} · ${d.getMonth() + 1}月${d.getDate()}日 · ${h12}:${mm} ${ap}`
      : `${DAYS[d.getDay()]}. ${MONS[d.getMonth()]} ${d.getDate()} · ${h12}:${mm} ${ap}`;
  return { time: `${h12}:${mm}`, dt };
}

/** live clock, refreshed every 15s (mockup `tick`); `lang` localizes the date line */
export function useClock(lang: Lang = 'en'): ClockParts {
  const [parts, setParts] = useState<ClockParts>(() => fmt(new Date(), lang));
  useEffect(() => {
    setParts(fmt(new Date(), lang));
    const id = setInterval(() => setParts(fmt(new Date(), lang)), 15000);
    return () => clearInterval(id);
  }, [lang]);
  return parts;
}
