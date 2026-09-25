import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LEGAL_DOCUMENTS, LEGAL_UPDATED, LEGAL_VERSION } from '@storyloom/protocol';
import { Footer, Nav } from '@/components/Chrome';

type Params = { doc: 'terms' | 'privacy' | 'children' };

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCUMENTS).map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { doc } = await params;
  return { title: LEGAL_DOCUMENTS[doc]?.title ?? 'Legal' };
}

function Paragraph({ text }: { text: string }) {
  return <p>{text}</p>;
}

export default async function LegalPage({ params }: { params: Promise<Params> }) {
  const { doc } = await params;
  const d = LEGAL_DOCUMENTS[doc];
  if (!d) notFound();
  return (
    <div className="site">
      <Nav />
      <main className="legal">
        <div className="eyebrow">Legal · version {LEGAL_VERSION}</div>
        <h1>{d.title}</h1>
        <p style={{ color: 'var(--dim)' }}>Last updated {LEGAL_UPDATED}</p>
        <nav className="tabs" aria-label="Documents">
          {Object.values(LEGAL_DOCUMENTS).map((x) => (
            <Link key={x.id} href={`/legal/${x.id}/`} aria-current={x.id === d.id ? 'page' : undefined}>
              {x.title}
            </Link>
          ))}
        </nav>
        <section className="card summary">
          <div className="eyebrow">The short version</div>
          <ul className="checks">
            {d.summary.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
        {d.sections.map((s) => {
          const bullets = s.body.filter((p) => p.startsWith('• '));
          return (
            <section key={s.heading}>
              <h2>{s.heading}</h2>
              {s.body.map((p, i) =>
                p.startsWith('• ') ? (
                  i === s.body.findIndex((x) => x.startsWith('• ')) ? (
                    <ul key={i}>
                      {bullets.map((b) => (
                        <li key={b}>{b.slice(2)}</li>
                      ))}
                    </ul>
                  ) : null
                ) : (
                  <Paragraph key={i} text={p} />
                ),
              )}
            </section>
          );
        })}
      </main>
      <Footer />
    </div>
  );
}
