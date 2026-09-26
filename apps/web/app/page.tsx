import Link from 'next/link';
import { Footer, Nav } from '@/components/Chrome';

const STEPS = [
  { n: 1, title: 'Everyone joins', body: 'Scan the code on the TV with any phone. No app to install, no account needed to play along.' },
  { n: 2, title: 'Draw, speak, choose', body: 'A child’s drawing becomes the hero. Say where the story happens and what goes wrong. Vote on what’s next.' },
  { n: 3, title: 'Watch it come alive', body: 'An illustrated, narrated story appears on the big screen, with every word lighting up as it’s read.' },
];

const FEATURES = [
  { icon: '🌅', title: 'A living sky', body: 'A cinematic sunrise, day, sunset and moonlit night that follow the real sun where you live.' },
  { icon: '🗣️', title: 'Narrators in dozens of languages', body: 'Natural voices tell each story. Listen in one language and read the subtitles in another.' },
  { icon: '✨', title: 'Read-along magic', body: 'Each word glows as it’s spoken, a gentle way for early readers to follow along.' },
  { icon: '🎵', title: 'Original music', body: 'A soft score that follows each story’s mood and quietly steps back when the narrator speaks.' },
  { icon: '🌙', title: 'Made for bedtime', body: 'Bedtime mode, a sleep timer and a goodnight screen that dims the room with the story.' },
  { icon: '🛡️', title: 'Grown-ups in charge', body: 'More than 80 settings: age range, gentle stories, topics to avoid, daily limits and a parent PIN.' },
  { icon: '🎙️', title: 'Hands-free with Alexa', body: '“Alexa, next page.” “Alexa, pause.” The story listens when little hands are full of blankets.' },
  { icon: '📺', title: 'Built for Fire TV', body: 'Designed for the remote from the first pixel, with big text, calm focus and no dead ends.' },
];

const LANGS = ['English', 'हिन्दी', 'বাংলা', 'Español', 'Français', 'Deutsch', 'Italiano', 'Português', '日本語', '한국어', '中文', 'العربية', 'Nederlands', 'Polski', 'Svenska', 'Türkçe', 'Русский', 'Română', 'Dansk', 'Norsk', 'Suomi', 'Català', 'Cymraeg', 'Íslenska'];

export default function Home() {
  return (
    <div className="site">
      <Nav />
      <section className="hero">
        <div className="hero-bg" style={{ backgroundImage: 'url(/sky-night.jpg)' }} aria-hidden />
        <div className="hero-inner">
          <div className="eyebrow">For Amazon Fire TV · Made for families</div>
          <h1>
            Your family’s ideas, <em>woven into bedtime stories.</em>
          </h1>
          <p className="lead">
            Storyloom turns a child’s drawing and a few words from everyone on the sofa into an illustrated, narrated story, told on the TV in the language your family loves.
          </p>
          <div className="cta-row">
            <Link className="btn" href="/j/">
              Join a story
            </Link>
            <Link className="btn ghost" href="/activate/">
              Sign in your TV
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="eyebrow">How it works</div>
        <h2>
          Three minutes from <em>“once upon a time”</em> to the end.
        </h2>
        <div className="grid">
          {STEPS.map((s) => (
            <article className="card" key={s.n}>
              <div className="step-num">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="split">
          <div>
            <div className="eyebrow">The living sky</div>
            <h2>
              Sunrise, sunset and a <em>real moon</em> behind every screen.
            </h2>
            <p className="lead" style={{ margin: 0 }}>
              Storyloom’s sky is rendered frame by frame with its own light-scattering engine: drifting clouds, a lake that mirrors the sun, twinkling stars, fireflies and the
              occasional shooting star. It follows the real sun in your time zone and dims itself gently for dark rooms.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="shot" src="/sky-sunset.jpg" alt="A giant full moon rising over a mountain lake in the pink twilight, Storyloom’s background at dusk" />
        </div>
      </section>

      <section className="section">
        <div className="eyebrow">Everything a family needs</div>
        <h2>
          Premium from the <em>first page</em> to goodnight.
        </h2>
        <div className="grid">
          {FEATURES.map((f) => (
            <article className="card" key={f.title}>
              <div className="icon-badge" aria-hidden>
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="eyebrow">For the whole world</div>
        <h2>
          Stories in the language of <em>home.</em>
        </h2>
        <p className="lead" style={{ margin: 0 }}>
          Menus in seven languages today, stories written in many more, and narrators with native voices. Switch the audio and subtitles independently, just like a movie.
        </p>
        <div className="chips">
          {LANGS.map((l) => (
            <span className="chip" key={l}>
              {l}
            </span>
          ))}
        </div>
      </section>

      <section className="section" id="safety">
        <div className="split">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="shot" src="/sky-day.jpg" alt="A pale daytime moon in a blue sky over a mountain lake" />
          <div>
            <div className="eyebrow">Safety and privacy</div>
            <h2>
              Kid-safe by design, <em>private by default.</em>
            </h2>
            <ul className="checks">
              <li>Every idea and every story passes AI safety filters built for children, in every language.</li>
              <li>Gentle mode, topics to avoid, age ranges and a parent PIN, all on the TV.</li>
              <li>Only verified grown-ups can create accounts. Your phone number is never stored.</li>
              <li>Drawings are deleted within 24 hours unless you choose to keep them.</li>
              <li>No ads, no tracking, no selling of data, no chat with strangers. Ever.</li>
              <li>Download or delete everything, any time, from the TV or your phone.</li>
            </ul>
            <div className="cta-row" style={{ justifyContent: 'flex-start' }}>
              <Link className="btn ghost" href="/legal/privacy/">
                Read our privacy promise
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card" style={{ textAlign: 'center', padding: 'clamp(28px, 6vw, 56px)' }}>
          <div className="eyebrow">Made by a family-sized team</div>
          <h2 style={{ marginTop: 12 }}>Bapan Ghosh &amp; Jayashree Mondal</h2>
          <p className="lead" style={{ marginTop: 12 }}>
            Bapan built the story engine, backend, AI and cloud. Jayashree designed the TV and phone experience. Together we wanted bedtime to feel a little more magical.
          </p>
          <div className="cta-row">
            <Link className="btn" href="/j/">
              Join a story
            </Link>
            <Link className="btn ghost" href="/contact/">
              Say hello
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
