import Link from 'next/link';

const LINKS = [
  { href: '/#how', label: 'How it works', wide: true },
  { href: '/#safety', label: 'Safety', wide: true },
  { href: '/account/', label: 'My account' },
  { href: '/contact/', label: 'Help' },
];

export function Nav({ current }: { current?: string }) {
  return (
    <header className="nav">
      <Link href="/" className="brand" aria-label="Storyloom home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-mark.svg" alt="" width={38} height={38} />
        <span>
          Story<em>loom</em>
        </span>
      </Link>
      <nav className="nav-links" aria-label="Main">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={l.wide ? 'wide-only' : undefined} aria-current={current === l.href ? 'page' : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <span>© 2026 Storyloom · Made with care by Bapan Ghosh &amp; Jayashree Mondal</span>
      <nav aria-label="Legal">
        <Link href="/legal/terms/">Terms</Link>
        <Link href="/legal/privacy/">Privacy</Link>
        <Link href="/legal/children/">Children’s privacy</Link>
        <Link href="/contact/">Contact</Link>
      </nav>
    </footer>
  );
}
