import type { Metadata } from 'next';
import { CompanionShell } from './CompanionShell';

export const metadata: Metadata = { title: 'Join the story' };

/** The phone companion: joins a story room with the code on the TV (/j/ABCD). */
export default function JoinPage() {
  return <CompanionShell />;
}
