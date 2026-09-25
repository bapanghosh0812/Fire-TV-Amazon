'use client';

import dynamic from 'next/dynamic';

// The companion talks to the TV in real time and reads the room code from the URL,
// so it only ever runs in the browser.
const Companion = dynamic(() => import('@/companion/Root'), { ssr: false, loading: () => null });

export function CompanionShell() {
  return <Companion />;
}
