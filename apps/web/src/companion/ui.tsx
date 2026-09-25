import { useMemo } from 'react';
import type { Player } from '@storyloom/protocol';

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="lm" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#B9853A" />
          <stop offset="1" stopColor="#FFDC94" />
        </linearGradient>
      </defs>
      <path d="M8 46c9-5 17-5 24 0V19c-7-6-15-6-24-1z" fill="rgba(245,198,107,0.14)" stroke="url(#lm)" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M56 46c-9-5-17-5-24 0V19c7-6 15-6 24-1z" fill="rgba(245,198,107,0.14)" stroke="url(#lm)" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M5 57c11-3 17-13 22-21s12-16 22-22" stroke="#FF7A6B" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M5 60c13-2 21-11 27-20s11-15 20-19" stroke="#3FD0C9" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.9" />
      <path d="M54 4c.5 3.6 2.4 5.5 6 6-3.6.5-5.5 2.4-6 6-.5-3.6-2.4-5.5-6-6 3.6-.5 5.5-2.4 6-6z" fill="#FFDC94" />
    </svg>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <LogoMark />
      <span>
        Story<em>loom</em>
      </span>
    </div>
  );
}

export function Stars() {
  const stars = useMemo(() => {
    let s = 11;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 60 }, () => ({ x: r() * 100, y: r() * 100, r: 0.4 + r() * 1.2, o: 0.2 + r() * 0.6 }));
  }, []);
  return (
    <svg className="stars" width="100%" height="100%" preserveAspectRatio="none" aria-hidden>
      {stars.map((st, i) => (
        <circle key={i} cx={`${st.x}%`} cy={`${st.y}%`} r={st.r} fill="#FFF6DD" opacity={st.o} />
      ))}
    </svg>
  );
}

export function Avatar({ player, size = 38 }: { player: Pick<Player, 'name' | 'color'>; size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size, borderColor: player.color, background: `${player.color}33`, fontSize: size * 0.4 }}>
      {player.name.slice(0, 1).toUpperCase()}
    </div>
  );
}

type IconName = 'brush' | 'globe' | 'bolt' | 'mic' | 'camera' | 'check' | 'right' | 'left' | 'up' | 'down' | 'sparkle' | 'play' | 'tv' | 'send';

export function Icon({ name, size = 24, color = 'currentColor' }: { name: IconName; size?: number; color?: string }) {
  const p = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const paths: Record<IconName, React.ReactNode> = {
    brush: (
      <>
        <path d="M14.5 4.5l5 5-8.5 8.5-5-5z" {...p} />
        <path d="M6 13c-2 0-3.5 1.6-3.5 3.5 0 1.5-.5 2.5-1 3 3 .5 7-.5 7-3.5" {...p} />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" {...p} />
        <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" {...p} />
      </>
    ),
    bolt: <path d="M13 2.5L4.5 13.5H12l-1 8 8.5-11H12z" {...p} />,
    mic: (
      <>
        <rect x="8.5" y="2.5" width="7" height="12" rx="3.5" {...p} />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" {...p} />
      </>
    ),
    camera: (
      <>
        <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.5-2h6l1.5 2h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" {...p} />
        <circle cx="12" cy="13" r="3.8" {...p} />
      </>
    ),
    check: <path d="M4.5 12.5l5 5 10-11" {...p} />,
    right: <path d="M9 5l7 7-7 7" {...p} />,
    left: <path d="M15 5l-7 7 7 7" {...p} />,
    up: <path d="M5 15l7-7 7 7" {...p} />,
    down: <path d="M5 9l7 7 7-7" {...p} />,
    sparkle: <path d="M12 2.5c.6 4.6 2.9 6.9 7.5 7.5-4.6.6-6.9 2.9-7.5 7.5-.6-4.6-2.9-6.9-7.5-7.5 4.6-.6 6.9-2.9 7.5-7.5z" fill={color} />,
    play: <path d="M7 4.5v15l12.5-7.5z" fill={color} />,
    tv: (
      <>
        <rect x="2.5" y="4.5" width="19" height="13" rx="2.5" {...p} />
        <path d="M8 21h8" {...p} />
      </>
    ),
    send: <path d="M4 12l16-8-6 16-2.5-6.5z" {...p} />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {paths[name]}
    </svg>
  );
}
