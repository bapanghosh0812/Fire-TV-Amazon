import { TZ_COORDS } from './tzCoords';
import type { SkyPhase } from './phases';

const RAD = Math.PI / 180;

/** Where the family roughly is, from the TV's time zone (no location permission needed). */
export function homeCoords(): { lat: number; lon: number } {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const hit = zone ? TZ_COORDS[zone] : undefined;
    if (hit) return { lat: hit[0], lon: hit[1] };
  } catch {}
  // Fall back to the UTC offset: 15 degrees of longitude per hour.
  return { lat: 25, lon: -new Date().getTimezoneOffset() / 4 };
}

/**
 * Sun elevation in degrees (NOAA solar position equations).
 * Negative values are below the horizon; -6 is the end of civil twilight.
 */
export function sunElevation(date: Date, lat: number, lon: number): { elevation: number; morning: boolean } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = (date.getTime() - start) / 86400000;
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const g = ((2 * Math.PI) / 365) * (Math.floor(day) - 1 + (hour - 12) / 24);
  const eqTime =
    229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const trueSolarMin = hour * 60 + eqTime + 4 * lon;
  const hourAngle = trueSolarMin / 4 - 180;
  const cosZenith = Math.sin(lat * RAD) * Math.sin(decl) + Math.cos(lat * RAD) * Math.cos(decl) * Math.cos(hourAngle * RAD);
  const zenith = Math.acos(Math.min(1, Math.max(-1, cosZenith))) / RAD;
  return { elevation: 90 - zenith, morning: ((hourAngle % 360) + 360) % 360 > 180 };
}

/** The sky follows the real sun: twilight around sunrise and sunset, night below -6 degrees. */
export function solarPhase(date = new Date(), coords = homeCoords()): SkyPhase {
  const { elevation, morning } = sunElevation(date, coords.lat, coords.lon);
  if (elevation < -6) return 'night';
  if (elevation < 10) return morning ? 'sunrise' : 'sunset';
  return 'day';
}
