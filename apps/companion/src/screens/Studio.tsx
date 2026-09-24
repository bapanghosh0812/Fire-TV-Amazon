import { useState } from 'react';
import { languageInfo, type ThreadKind } from '@storyloom/protocol';
import { previewPlay, useSession } from '../lib/session';
import { isPreviewMode } from '../lib/api';
import { t, type Key } from '../i18n';
import { Avatar, Brand, Icon } from '../ui';
import { HeroCapture } from './HeroCapture';
import { IdeaInput } from './IdeaInput';

const TASKS: { kind: ThreadKind; title: Key; ask: Key; icon: 'brush' | 'globe' | 'bolt' }[] = [
  { kind: 'hero', title: 'hero', ask: 'heroAsk', icon: 'brush' },
  { kind: 'world', title: 'world', ask: 'worldAsk', icon: 'globe' },
  { kind: 'spark', title: 'spark', ask: 'sparkAsk', icon: 'bolt' },
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
          <i /> {connected ? t('room', { code: room.code }) : t('reconnecting')}
        </span>
      </div>

      <div>
        <div className="overline">{t('hi', { name: me.name })}</div>
        <h1 className="h1">{t('addThread')}</h1>
        <p className="body">{t('addThreadBody')}</p>
      </div>

      <div className="players" aria-label="Who’s here">
        {room.players.map((p) => (
          <Avatar key={p.id} player={p} size={34} />
        ))}
        <span className="small" style={{ marginInlineStart: 4 }}>
          {t(room.players.length === 1 ? 'weaving1' : 'weavingN', { n: room.players.length })}
        </span>
      </div>

      {room.language ? (
        <span className="small" style={{ color: 'var(--muted)' }}>
          🌐 {t('storyIn', { language: languageInfo(room.language).native })}
        </span>
      ) : null}

      <div className="stack" style={{ marginTop: 6 }}>
        {TASKS.map((task) => {
          const thread = room.threads[task.kind];
          const by = who(thread?.by);
          const value = thread ? (thread.kind === 'hero' ? thread.name : thread.text) : undefined;
          const img = thread?.kind === 'hero' ? (thread.portraitUrl ?? thread.drawingUrl) : undefined;
          return (
            <button
              key={task.kind}
              className={`card task ${thread ? 'done' : ''}`}
              style={{ ['--thread' as string]: by?.color }}
              onClick={() => setOpen(task.kind)}
            >
              <span className="thread" />
              <span className="icon">{img ? <img src={img} alt="" /> : <Icon name={task.icon} size={26} />}</span>
              <span className="label">
                <span className="overline" style={{ color: thread ? 'var(--gold)' : 'var(--dim)' }}>
                  {t(task.title)}
                </span>
                {value ? <div className="value">{value}</div> : <div className="ask">{t(task.ask)}</div>}
                {by ? <div className="small">{t('addedBy', { name: thread?.by === me.id ? t('you') : by.name })}</div> : null}
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
          {t('tvHint')}
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
