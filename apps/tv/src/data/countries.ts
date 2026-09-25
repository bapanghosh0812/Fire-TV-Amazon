import { COUNTRIES, type Country } from '@storyloom/protocol';
import { TZ_COUNTRY } from './tzCountry';

export { COUNTRIES, type Country };

/** The TV's own country from its time zone (no location permission). */
export function homeCountry(): Country {
  let iso = 'US';
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    iso = (zone && TZ_COUNTRY[zone]) || iso;
  } catch {}
  return COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES.find((c) => c.iso === 'US')!;
}
