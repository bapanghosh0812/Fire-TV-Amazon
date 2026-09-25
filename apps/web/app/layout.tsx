import type { Metadata, Viewport } from 'next';
import { Fraunces, Nunito } from 'next/font/google';
import './globals.css';

const display = Fraunces({ subsets: ['latin'], weight: ['500', '600', '700'], style: ['normal', 'italic'], variable: '--font-display', display: 'swap' });
const body = Nunito({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://d3afvstjv2yoqq.cloudfront.net'),
  title: { default: 'Storyloom · Family stories, woven together', template: '%s · Storyloom' },
  description:
    'Storyloom turns your family’s drawings and ideas into illustrated, narrated bedtime stories on Fire TV, in dozens of languages, with kid-safe AI.',
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' },
  manifest: '/manifest.webmanifest',
  openGraph: { title: 'Storyloom', description: 'Family stories, woven together.', images: ['/og-image.png'] },
};

export const viewport: Viewport = { themeColor: '#07061A', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
