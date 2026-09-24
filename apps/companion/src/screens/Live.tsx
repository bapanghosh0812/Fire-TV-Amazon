import { useEffect, useState } from 'react';
import type { RemoteKeyName } from '@storyloom/protocol';
import { useSession } from '../lib/session';
import { Brand, Icon } from '../ui';

export function Weaving() {
  const { weave } = useSession();
  return (
    <div className="stack fade-in" style={{ flex: 1, justifyContent: 'center', textAlign: 'center' }}>
      <div className="topbar" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <Brand />
      </div>
      <Loom />
      <div className="overline">Weaving your story</div>
      <h1 className="h1">{weave.message || 'Gathering everyone’s threads…'}</h1>
      <div className="progress" style={{ margin: '18px 12px 0' }}>
        <i style={{ width: `${Math.round(weave.pct * 100)}%` }} />
      </div>
      <p className="small" style={{ marginTop: 14 }}>
        Watch the TV. It’ll be ready in a moment.
      </p>
    </div>
  );
}

function Loom() {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = (ms: number) => {
      setT(ms / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const colors = ['#FF7A6B', '#3FD0C9', '#B69CFF'];
  return (
    <svg viewBox="0 0 320 120" width="100%" height="120" aria-hidden style={{ marginBottom: 12 }}>
      {colors.map((c, i) => {
        let d = '';
        for (let x = 0; x <= 320; x += 6) {
          const y = 60 + Math.sin(x / 34 + t * 2 + i * 1.3) * (18 + i * 6);
          d += `${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)} `;
        }
        return <path key={c} d={d} stroke={c} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.9" />;
      })}
    </svg>
  );
}

export function Reading() {
  const { send, room, playback } = useSession();
  const press = (key: RemoteKeyName) => {
    send({ action: 'remote', key });
    if ('vibrate' in navigator) navigator.vibrate?.(12);
  };
  return (
    <div className="stack fade-in" style={{ flex: 1 }}>
      <div className="topbar">
        <Brand />
        <span className="status">
          <i /> ROOM {room?.code}
        </span>
      </div>
      <div className="center">
        <div className="overline">{playback ? `Page ${playback.page} of ${playback.total} on the TV` : 'Now reading on the TV'}</div>
        <h1 className="h1">Snuggle up and listen</h1>
        {playback ? (
          <div className="progress" style={{ margin: '14px 24px 0' }}>
            <i style={{ width: `${Math.round((playback.page / Math.max(1, playback.total)) * 100)}%` }} />
          </div>
        ) : null}
        <p className="body">You can turn pages from here too. When the story asks a question, you’ll vote right here.</p>
      </div>
      <div className="dpad" role="group" aria-label="TV remote">
        <span />
        <button aria-label="Up" onClick={() => press('up')}>
          <Icon name="up" />
        </button>
        <span />
        <button aria-label="Previous page" onClick={() => press('left')}>
          <Icon name="left" />
        </button>
        <button className="ok" aria-label="Play or pause" onClick={() => press('select')}>
          OK
        </button>
        <button aria-label="Next page" onClick={() => press('right')}>
          <Icon name="right" />
        </button>
        <span />
        <button aria-label="Down" onClick={() => press('down')}>
          <Icon name="down" />
        </button>
        <span />
      </div>
      <div className="spacer" />
      <button className="btn ghost" onClick={() => press('back')}>
        Back on TV
      </button>
    </div>
  );
}

export function Vote() {
  const { choice, myVote, winner, vote } = useSession();
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!choice) return;
    const tick = () => setLeft(Math.max(0, Math.ceil((choice.closesAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [choice]);

  if (!choice) return null;
  const { prompt, options } = choice.choice;

  return (
    <div className="stack fade-in" style={{ flex: 1 }}>
      <div className="topbar">
        <Brand />
        {!winner ? <span className="status">{left}s</span> : null}
      </div>
      <div>
        <div className="overline">{winner ? 'The family decided' : 'Your vote'}</div>
        <h1 className="h1">{prompt}</h1>
      </div>
      <div className="vote">
        {options.map((o) => (
          <button
            key={o.id}
            aria-pressed={myVote === o.id || winner === o.id}
            disabled={!!winner}
            onClick={() => vote(o.id)}
            style={winner && winner !== o.id ? { opacity: 0.4 } : undefined}
          >
            <div className="art">{o.imageUrl ? <img src={o.imageUrl} alt="" /> : null}</div>
            <div className="txt">
              <span className="letter">{o.id.toUpperCase()}</span>
              <span className="h2" style={{ fontSize: 20 }}>
                {o.label}
              </span>
            </div>
          </button>
        ))}
      </div>
      <p className="small center">{winner ? 'The story continues on the TV…' : myVote ? 'Voted! You can still change your mind.' : 'Tap your favourite'}</p>
    </div>
  );
}
