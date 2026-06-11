import { useEffect, useState } from 'react';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export interface ClockParts {
  time: string;
  dt: string;
}

function fmt(d: Date): ClockParts {
  const h = d.getHours();
  const h12 = h % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  return {
    time: `${h12}:${mm}`,
    dt: `${DAYS[d.getDay()]}. ${MONS[d.getMonth()]} ${d.getDate()} · ${h12}:${mm} ${ap}`,
  };
}

/** live clock, refreshed every 15s (mockup `tick`) */
export function useClock(): ClockParts {
  const [parts, setParts] = useState<ClockParts>(() => fmt(new Date()));
  useEffect(() => {
    const id = setInterval(() => setParts(fmt(new Date())), 15000);
    return () => clearInterval(id);
  }, []);
  return parts;
}
