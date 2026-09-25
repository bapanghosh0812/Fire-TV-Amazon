import { solarPhase } from './solar';

export type SkyPhase = 'sunrise' | 'day' | 'sunset' | 'night';
export type SkyMode = 'auto' | SkyPhase;

export interface SkyTheme {
  sky: [string, string, string, string]; // top → horizon
  haze: string; // glow near the horizon
  body: 'sun' | 'moon';
  bodyY: number; // 0 = top, 1 = horizon (fraction of screen height)
  stars: number; // 0..1 visibility
  clouds: number; // 0..1 visibility
  cloudTint: [string, string]; // lit side, shadow side
  mountains: [string, string, string]; // far, mid, near
  ground: string;
}

export const THEMES: Record<SkyPhase, SkyTheme> = {
  night: {
    sky: ['#03040F', '#080B26', '#141844', '#241F55'],
    haze: 'rgba(98, 88, 180, 0.35)',
    body: 'moon',
    bodyY: 0.27,
    stars: 1,
    clouds: 0.18,
    cloudTint: ['#3A3F6E', '#1A1C3C'],
    mountains: ['#1A2150', '#11163A', '#0A0C24'],
    ground: '#06061A',
  },
  sunrise: {
    sky: ['#1A2658', '#5A4A8C', '#E58B7B', '#FFC98D'],
    haze: 'rgba(255, 196, 140, 0.55)',
    body: 'sun',
    bodyY: 0.52,
    stars: 0.18,
    clouds: 0.8,
    cloudTint: ['#FFD1B8', '#8D6A95'],
    mountains: ['#B98AAE', '#6E5687', '#342C4E'],
    ground: '#171330',
  },
  day: {
    sky: ['#17498F', '#2A6FBE', '#5CA1DA', '#A8D5F1'],
    haze: 'rgba(255, 246, 214, 0.45)',
    body: 'sun',
    bodyY: 0.3,
    stars: 0,
    clouds: 1,
    cloudTint: ['#FFFFFF', '#A9BFD8'],
    mountains: ['#86ACD6', '#4F7FA6', '#2B5465'],
    ground: '#0E2230',
  },
  sunset: {
    sky: ['#171A4A', '#693A77', '#DE6E58', '#FFB26A'],
    haze: 'rgba(255, 170, 110, 0.55)',
    body: 'sun',
    bodyY: 0.55,
    stars: 0.22,
    clouds: 0.85,
    cloudTint: ['#FFC49A', '#7A4666'],
    mountains: ['#D07F6E', '#86496A', '#381F40'],
    ground: '#150D26',
  },
};

/** Phase from the real sun position for the TV's time zone (falls back to the clock). */
export function phaseAt(date = new Date()): SkyPhase {
  try {
    return solarPhase(date);
  } catch {
    const h = date.getHours() + date.getMinutes() / 60;
    if (h >= 5.5 && h < 7.5) return 'sunrise';
    if (h >= 7.5 && h < 17.25) return 'day';
    if (h >= 17.25 && h < 19) return 'sunset';
    return 'night';
  }
}

export function resolvePhase(mode: SkyMode, date = new Date()): SkyPhase {
  return mode === 'auto' ? phaseAt(date) : mode;
}
