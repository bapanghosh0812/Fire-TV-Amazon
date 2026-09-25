import type { Metadata } from 'next';
import { Footer, Nav } from '@/components/Chrome';
import { AccountFlow } from './AccountFlow';

export const metadata: Metadata = { title: 'My account' };

export default function AccountPage() {
  return (
    <div className="site">
      <Nav current="/account/" />
      <main className="panel-page">
        <div className="panel">
          <AccountFlow />
        </div>
      </main>
      <Footer />
    </div>
  );
}
