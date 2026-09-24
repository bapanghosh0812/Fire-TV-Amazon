import { useState } from 'react';
import type { ThreadKind } from '@storyloom/protocol';
import { previewPlay, useSession } from '../lib/session';
import { isPreviewMode } from '../lib/api';
import { Avatar, Brand, Icon } from '../ui';
import { HeroCapture } from './HeroCapture';
import { IdeaInput } from './IdeaInput';

const TASKS: { kind: ThreadKind; title: string; ask: string; icon: 'brush' | 'globe' | 'bolt' }[] = [
  { kind: 'hero', title: 'The hero', ask: 'Draw a hero on paper and snap it', icon: 'brush' },
  { kind: 'world', title: 'The world', ask: 'Where does the story happen?', icon: 'globe' },
  { kind: 'spark', title: 'The spark', ask: 'A problem, a wish or a surprise', icon: 'bolt' },
];

export function Studio() {
  const { room, me, connected } = useSession();
  const [open, setOpen] = useState<ThreadKind | null>(null);

  if (!room || !me) return null;
  if (open === 'hero') return <HeroCapture onDone={() => setOpen(null)} />;
  if (open === 'world' || open === 'spark') return <IdeaInput kind={open} onDone={() => setOpen(null)} />;

  const who = (id?: string) => (id === 'tv' ? { name: 'TV', color: '#F5C66B' } : room.players.find((p) => p.id === id));

  return (
    <div className="stack fade-in" style={{ flex: 1 }}>
      <div className="topbar">
        <Brand />
        <span className={`status ${connected ? '' : 'off'}`}>
          <i /> {connected ? `ROOM ${room.code}` : 'RECONNECTING'}
        </span>
      </div>

      <div>
        <div className="overline">Hi {me.name}</div>
        <h1 className="h1">Add your thread</h1>
        <p className="body">Pick anything below. Everyone’s ideas appear on the TV straight away.</p>
      </div>

      <div className="players" aria-label="Who’s here">
        {room.players.map((p) => (
          <Avatar key={p.id} player={p} size={34} />
        ))}
        <span className="small" style={{ marginLeft: 4 }}>
          {room.players.length} {room.players.length === 1 ? 'person' : 'people'} weaving
        </span>
      </div>

      <div className="stack" style={{ marginTop: 6 }}>
        {TASKS.map((t) => {
          const thread = room.threads[t.kind];
          const by = who(thread?.by);
          const value = thread ? (thread.kind === 'hero' ? thread.name : thread.text) : undefined;
          const img = thread?.kind === 'hero' ? (thread.portraitUrl ?? thread.drawingUrl) : undefined;
          return (
            <button
              key={t.kind}
              className={`card task ${thread ? 'done' : ''}`}
              style={{ ['--thread' as string]: by?.color }}
              onClick={() => setOpen(t.kind)}
            >
              <span className="thread" />
              <span className="icon">{img ? <img src={img} alt="" /> : <Icon name={t.icon} size={26} />}</span>
              <span className="label">
                <span className="overline" style={{ color: thread ? 'var(--gold)' : 'var(--dim)' }}>
                  {t.title}
                </span>
                {value ? <div className="value">{value}</div> : <div className="ask">{t.ask}</div>}
                {by ? <div className="small">added by {thread?.by === me.id ? 'you' : by.name}</div> : null}
              </span>
              <span className="chev">
                <Icon name={thread ? 'check' : 'right'} size={22} color={thread ? 'var(--teal)' : undefined} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="spacer" />
      <div className="card row" style={{ gap: 12 }}>
        <Icon name="tv" size={26} color="var(--gold)" />
        <p className="small" style={{ margin: 0, color: 'var(--muted)' }}>
          When the hero and world are set, press <b style={{ color: 'var(--parchment)' }}>Start weaving</b> on the TV.
        </p>
      </div>
      {isPreviewMode() ? (
        <button className="btn ghost small" style={{ alignSelf: 'center' }} onClick={previewPlay}>
          Preview: simulate the TV
        </button>
      ) : null}
    </div>
  );
}
