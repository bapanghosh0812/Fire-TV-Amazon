import { Dimensions } from 'react-native';

// Everything is designed on a 1920x1080 canvas and scaled to the real screen,
// so layouts look identical on a 720p stick, a 1080p emulator and a 4K TV.
const DESIGN_WIDTH = 1920;
const { width } = Dimensions.get('window');
const ratio = width / DESIGN_WIDTH;

export const px = (value: number) => Math.round(value * ratio);

export const colors = {
  night: '#07061A',
  ink: '#0E0C24',
  surface: '#17143A',
  surfaceHigh: '#221E4B',
  line: 'rgba(247, 241, 227, 0.12)',
  parchment: '#F7F1E3',
  muted: '#BDB6D6',
  dim: '#7F789C',
  gold: '#F5C66B',
  goldBright: '#FFDC94',
  goldDeep: '#B9853A',
  coral: '#FF7A6B',
  teal: '#3FD0C9',
  lilac: '#B69CFF',
  danger: '#FF6B6B',
  scrim: 'rgba(7, 6, 26, 0.72)',
} as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_500Medium_Italic',
  displayBold: 'Fraunces_700Bold',
  body: 'Nunito_500Medium',
  bodyBold: 'Nunito_700Bold',
  bodyBlack: 'Nunito_800ExtraBold',
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: px(88), lineHeight: px(96), letterSpacing: px(-1) },
  h1: { fontFamily: fonts.display, fontSize: px(60), lineHeight: px(70) },
  h2: { fontFamily: fonts.display, fontSize: px(42), lineHeight: px(52) },
  h3: { fontFamily: fonts.bodyBold, fontSize: px(32), lineHeight: px(40) },
  body: { fontFamily: fonts.body, fontSize: px(28), lineHeight: px(40) },
  bodyStrong: { fontFamily: fonts.bodyBold, fontSize: px(28), lineHeight: px(40) },
  caption: { fontFamily: fonts.bodyBold, fontSize: px(22), lineHeight: px(30), letterSpacing: px(1) },
  overline: { fontFamily: fonts.bodyBlack, fontSize: px(20), lineHeight: px(26), letterSpacing: px(4) },
  story: { fontFamily: fonts.body, fontSize: px(44), lineHeight: px(64) },
} as const;

// TV "title-safe" margins (5% of 1920x1080), per Fire TV design guidance.
export const safe = {
  x: px(96),
  y: px(54),
};

export const radius = {
  sm: px(10),
  md: px(18),
  lg: px(28),
  pill: px(999),
};

export const motion = {
  focusScale: 1.07,
  fast: 160,
  base: 280,
  slow: 600,
};
