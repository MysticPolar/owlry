/* ============================================================
   owlry — real local weather for the owl's opening greeting.

   The mockup's weather is a fake cycle (tap the glyph). The LIVE
   owl opens by speaking the visitor's *actual* sky, so it needs
   one real reading: geolocation (with the browser's permission)
   → Open-Meteo (free, no API key) → a WeatherKey + a short label.

   Everything here is best-effort: if permission is denied, the
   network is blocked, or anything times out, we resolve to `null`
   and the caller greets on the time of day alone. We never block
   the UI on this.
   ============================================================ */
import type { WeatherKey } from '../content/weather';

export interface LocalWeather {
  /** maps onto the app's five themes (drives both the greeting and data-wx) */
  wxKey: WeatherKey;
  /** short human label for the prompt, e.g. "light rain" */
  conditions: string;
  /** whole degrees Celsius, or null if unavailable */
  tempC: number | null;
}

/** WMO weather-code → our coarse theme + a human label. */
function codeToWeather(code: number, isDay: boolean): { wxKey: WeatherKey; conditions: string } {
  // snow / sleet / ice
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { wxKey: 'snow', conditions: 'snow' };
  // rain / drizzle / showers / thunder
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99))
    return { wxKey: 'rain', conditions: code >= 95 ? 'a thunderstorm' : 'rain' };
  // fog
  if (code === 45 || code === 48) return { wxKey: 'cloud', conditions: 'fog' };
  // clear
  if (code === 0 || code === 1)
    return isDay ? { wxKey: 'sun', conditions: 'clear skies' } : { wxKey: 'night', conditions: 'a clear night' };
  // partly cloudy / overcast (2,3 and anything else)
  return { wxKey: 'cloud', conditions: 'cloud' };
}

function getPosition(timeoutMs: number): Promise<GeolocationPosition | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: GeolocationPosition | null) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    navigator.geolocation.getCurrentPosition(
      (pos) => done(pos),
      () => done(null),
      { timeout: timeoutMs, maximumAge: 30 * 60 * 1000, enableHighAccuracy: false },
    );
    setTimeout(() => done(null), timeoutMs + 200);
  });
}

/**
 * One real weather reading for the greeting, or `null` on any failure
 * (denied permission, blocked network, timeout). Never throws.
 */
export async function getLocalWeather(timeoutMs = 4000): Promise<LocalWeather | null> {
  try {
    const pos = await getPosition(timeoutMs);
    if (!pos) return null;
    const { latitude, longitude } = pos.coords;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(2)}` +
      `&longitude=${longitude.toFixed(2)}&current_weather=true`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
    if (!res.ok) return null;

    const data = (await res.json()) as {
      current_weather?: { temperature?: number; weathercode?: number; is_day?: number };
    };
    const cw = data.current_weather;
    if (!cw || typeof cw.weathercode !== 'number') return null;

    const { wxKey, conditions } = codeToWeather(cw.weathercode, cw.is_day !== 0);
    return {
      wxKey,
      conditions,
      tempC: typeof cw.temperature === 'number' ? Math.round(cw.temperature) : null,
    };
  } catch {
    return null;
  }
}
