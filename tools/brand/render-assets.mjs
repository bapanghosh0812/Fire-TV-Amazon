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

// The mark on a 64x64 grid (same as src/components/Logo.tsx): a golden crescent moon holding an
// open storybook, with a single thread weaving up from its pages to a star.
export const MARK_BODY = `
    <path d="M25.4 9.1 A24 24 0 1 0 49.8 40.5 A20 20 0 1 1 25.4 9.1 Z" fill="url(#moon)"/>
    <ellipse cx="36" cy="30.5" rx="15" ry="10" fill="url(#pageGlow)"/>
    <path d="M22 37.5 C27 34.2 31.6 34.2 36 37.5 L36 24.5 C31.6 21.2 27 21.2 22 24.5 Z" fill="url(#page)" stroke="#FFE7AE" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M50 37.5 C45 34.2 40.4 34.2 36 37.5 L36 24.5 C40.4 21.2 45 21.2 50 24.5 Z" fill="url(#page)" stroke="#FFE7AE" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M25.3 27.6 C28 26.4 30.4 26.4 32.8 27.6 M25.3 31 C28 29.8 30.4 29.8 32.8 31 M39.2 27.6 C41.6 26.4 44 26.4 46.7 27.6 M39.2 31 C41.6 29.8 44 29.8 46.7 31" stroke="#FFE7AE" stroke-opacity="0.55" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path d="M36 24 C35.5 17.5 41 17.8 42 13.5 C42.8 10.2 46 8.8 48.5 9.4" fill="none" stroke="url(#thread)" stroke-width="2" stroke-linecap="round"/>
    <circle cx="51" cy="8" r="7.5" fill="url(#starGlow)"/>
    <path d="M51 2.5 C51.5 6 52.7 7.4 56 8 C52.7 8.6 51.5 10 51 13.5 C50.5 10 49.3 8.6 46 8 C49.3 7.4 50.5 6 51 2.5 Z" fill="#FFF3D1"/>
    <circle cx="58.5" cy="19" r="0.9" fill="#FFF3D1" opacity="0.8"/>
    <circle cx="44" cy="4.5" r="0.7" fill="#FFF3D1" opacity="0.7"/>
    <circle cx="57" cy="29" r="0.6" fill="#FFF3D1" opacity="0.6"/>`;

const mark = (x, y, size) => `<g transform="translate(${x} ${y}) scale(${size / 64})">${MARK_BODY}</g>`;

const defs = `
  <defs>
    <linearGradient id="moon" x1="0.1" y1="0.1" x2="0.9" y2="0.95">
      <stop offset="0" stop-color="#FFE7AE"/><stop offset="0.55" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.goldDeep}"/>
    </linearGradient>
    <linearGradient id="page" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFF3D1" stop-opacity="0.34"/><stop offset="1" stop-color="#FFF3D1" stop-opacity="0.12"/>
    </linearGradient>
    <linearGradient id="thread" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="${C.coral}"/><stop offset="1" stop-color="${C.goldBright}"/>
    </linearGradient>
    <radialGradient id="pageGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFDC94" stop-opacity="0.35"/><stop offset="1" stop-color="#FFDC94" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="starGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFDC94" stop-opacity="0.9"/><stop offset="1" stop-color="#FFDC94" stop-opacity="0"/>
    </radialGradient>
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
  'apps/web/public/icon-192.png': [192, 192, `${defs}<rect width="192" height="192" fill="url(#bg)"/>${mark(26, 26, 140)}`],
  'apps/web/public/icon-512.png': [512, 512, `${defs}<rect width="512" height="512" fill="url(#bg)"/>${stars(512, 512, 40)}${mark(76, 76, 360)}`],
  'apps/web/public/og-image.png': [1200, 630, `${defs}<rect width="1200" height="630" fill="url(#bg)"/>${stars(1200, 630, 110)}${mark(110, 185, 250)}${wordmark(390, 350, 140)}<text x="396" y="418" font-family="Nunito" font-weight="800" font-size="28" letter-spacing="7" fill="${C.gold}">FAMILY STORIES, WOVEN TOGETHER</text>`],
  'docs/brand/icon-114.png':[114, 114, `${defs}<rect width="114" height="114" fill="url(#bg)"/>${mark(14, 14, 86)}`],
};

// Vector logo for the website.
writeFileSync(resolve(root, 'apps/web/public/logo-mark.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${defs}${MARK_BODY}</svg>`);

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
