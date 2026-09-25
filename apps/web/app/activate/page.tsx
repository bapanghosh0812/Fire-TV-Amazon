import type { Metadata } from 'next';
import { Footer, Nav } from '@/components/Chrome';
import { ActivateFlow } from './ActivateFlow';

export const metadata: Metadata = { title: 'Sign in your TV' };

export default function ActivatePage() {
  return (
    <div className="site">
      <Nav />
      <main className="panel-page">
        <div className="panel">
          <ActivateFlow />
        </div>
      </main>
      <Footer />
    </div>
  );
}
