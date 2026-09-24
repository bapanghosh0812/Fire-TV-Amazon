// Renders Storyloom's app icon, TV banners and splash mark from SVG sources.
// Usage: npm run render   (outputs into apps/tv/assets and docs/brand)
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const fontsDir = resolve(root, 'apps/tv/node_modules/@expo-google-fonts');
const fontFiles = [
  `${fontsDir}/fraunces/700Bold/Fraunces_700Bold.ttf`,
  `${fontsDir}/fraunces/500Medium_Italic/Fraunces_500Medium_Italic.ttf`,
  `${fontsDir}/fraunces/600SemiBold_Italic/Fraunces_600SemiBold_Italic.ttf`,
  `${fontsDir}/nunito/800ExtraBold/Nunito_800ExtraBold.ttf`,
];

const C = {
  night: '#07061A',
  ink: '#1A1550',
  parchment: '#F7F1E3',
  gold: '#F5C66B',
  goldBright: '#FFDC94',
  goldDeep: '#B9853A',
  coral: '#FF7A6B',
  teal: '#3FD0C9',
};

// The mark on a 64x64 grid (same as src/components/Logo.tsx).
const mark = (x, y, size) => `
  <g transform="translate(${x} ${y}) scale(${size / 64})">
    <path d="M8 46c9-5 17-5 24 0V19c-7-6-15-6-24-1z" fill="rgba(245,198,107,0.14)" stroke="url(#lm)" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M56 46c-9-5-17-5-24 0V19c7-6 15-6 24-1z" fill="rgba(245,198,107,0.14)" stroke="url(#lm)" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M5 57c11-3 17-13 22-21s12-16 22-22" stroke="${C.coral}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M5 60c13-2 21-11 27-20s11-15 20-19" stroke="${C.teal}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.9"/>
    <path d="M54 4c.5 3.6 2.4 5.5 6 6-3.6.5-5.5 2.4-6 6-.5-3.6-2.4-5.5-6-6 3.6-.5 5.5-2.4 6-6z" fill="${C.goldBright}"/>
  </g>`;

const defs = `
  <defs>
    <linearGradient id="lm" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="${C.goldDeep}"/><stop offset="1" stop-color="${C.goldBright}"/>
    </linearGradient>
    <radialGradient id="bg" cx="50%" cy="42%" r="75%">
      <stop offset="0" stop-color="${C.ink}"/><stop offset="1" stop-color="${C.night}"/>
    </radialGradient>
  </defs>`;

function stars(w, h, n, seed = 7) {
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => `<circle cx="${(r() * w).toFixed(1)}" cy="${(r() * h).toFixed(1)}" r="${(0.6 + r() * 2.2) * (w / 1024)}" fill="#FFF6DD" opacity="${(0.2 + r() * 0.6).toFixed(2)}"/>`).join('');
}

const wordmark = (x, y, size, anchor = 'start') => `
  <text x="${x}" y="${y}" font-family="Fraunces" font-weight="700" font-size="${size}" fill="${C.parchment}" text-anchor="${anchor}">Story<tspan font-style="italic" font-weight="500" fill="${C.gold}">loom</tspan></text>`;

const svgs = {
  'apps/tv/assets/icon.png': [1024, 1024, `${defs}<rect width="1024" height="1024" fill="url(#bg)"/>${stars(1024, 1024, 70)}${mark(192, 192, 640)}`],
  'apps/tv/assets/adaptive-icon.png': [1024, 1024, `${defs}${mark(262, 262, 500)}`],
  // Android 12+ masks the splash icon to a circle ~2/3 of its box, so keep the mark well inside it.
  'apps/tv/assets/splash-mark.png': [512, 512, `${defs}${mark(111, 111, 290)}`],
  'apps/tv/assets/tv/banner-320x180.png': [320, 180, `${defs}<rect width="320" height="180" fill="url(#bg)"/>${stars(320, 180, 30)}${mark(18, 52, 76)}${wordmark(104, 108, 44)}`],
  'docs/brand/banner-1280x720.png': [1280, 720, `${defs}<rect width="1280" height="720" fill="url(#bg)"/>${stars(1280, 720, 110)}${mark(120, 230, 260)}${wordmark(410, 400, 150)}<text x="416" y="470" font-family="Nunito" font-weight="800" font-size="30" letter-spacing="8" fill="${C.gold}">FAMILY STORIES, WOVEN TOGETHER</text>`],
  'docs/brand/icon-512.png': [512, 512, `${defs}<rect width="512" height="512" fill="url(#bg)"/>${stars(512, 512, 40)}${mark(96, 96, 320)}`],
  'apps/companion/public/icon-192.png': [192, 192, `${defs}<rect width="192" height="192" fill="url(#bg)"/>${mark(26, 26, 140)}`],
  'apps/companion/public/icon-512.png': [512, 512, `${defs}<rect width="512" height="512" fill="url(#bg)"/>${stars(512, 512, 40)}${mark(76, 76, 360)}`],
  'docs/brand/icon-114.png':[114, 114, `${defs}<rect width="114" height="114" fill="url(#bg)"/>${mark(14, 14, 86)}`],
};

for (const [out, [w, h, body]] of Object.entries(svgs)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: w },
    font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Nunito' },
  })
    .render()
    .asPng();
  const file = resolve(root, out);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, png);
  console.log('wrote', out);
}
