import type { Metadata } from 'next';
import { Footer, Nav } from '@/components/Chrome';
import { ContactForm } from './ContactForm';

export const metadata: Metadata = { title: 'Help & contact' };

export default function ContactPage() {
  return (
    <div className="site">
      <Nav current="/contact/" />
      <main className="panel-page">
        <div className="panel">
          <ContactForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
