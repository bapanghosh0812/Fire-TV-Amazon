import { useEffect, useRef, useState } from 'react';
import { useSession } from '../lib/session';
import { listen, speechSupported } from '../lib/speech';
import { ideas, t } from '../i18n';
import { Icon } from '../ui';

export function IdeaInput({ kind, onDone }: { kind: 'world' | 'spark'; onDone: () => void }) {
  const { send, flash } = useSession();
  const [text, setText] = useState('');
  const [live, setLive] = useState(false);
  const stop = useRef<() => void>(undefined);
  const canSpeak = speechSupported();

  useEffect(() => () => stop.current?.(), []);

  function toggleMic() {
    if (live) {
      stop.current?.();
      return;
    }
    setLive(true);
    stop.current = listen(
      (said) => setText(said),
      (err) => {
        setLive(false);
        if (err && err !== 'no-speech' && err !== 'aborted') flash(t('cantHear'));
      },
    );
  }

  function submit(value = text) {
    const v = value.trim();
    if (!v) return;
    send({ action: 'thread.set', thread: { kind, by: '', text: v.slice(0, 140) } });
    if ('vibrate' in navigator) navigator.vibrate?.(20);
    flash(t('sent'));
    onDone();
  }

  return (
    <div className="stack fade-in" style={{ flex: 1 }}>
      <button className="back" onClick={onDone}>
        <Icon name="left" size={18} /> {t('back')}
      </button>
      <div>
        <div className="overline">{t(kind)}</div>
        <h1 className="h1">{t(kind === 'world' ? 'worldTitle' : 'sparkTitle')}</h1>
        <p className="body">{t(kind === 'world' ? 'worldBody' : 'sparkBody')}</p>
      </div>

      {canSpeak ? (
        <>
          <button className={`mic ${live ? 'live' : ''}`} onClick={toggleMic} aria-label={live ? t('listening') : t('tapSpeak')}>
            <Icon name="mic" size={40} />
          </button>
          <p className="small center" style={{ marginTop: -4 }}>
            {live ? t('listening') : t('tapSpeak')}
          </p>
        </>
      ) : null}

      <textarea
        className="field"
        placeholder={t(kind === 'world' ? 'worldPlaceholder' : 'sparkPlaceholder')}
        value={text}
        maxLength={140}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="chips">
        {ideas(kind).map((idea) => (
          <button key={idea} className="chip" onClick={() => submit(idea)}>
            {idea}
          </button>
        ))}
      </div>

      <div className="spacer" />
      <button className="btn" disabled={!text.trim()} onClick={() => submit()}>
        {t('send')} <Icon name="send" size={18} />
      </button>
    </div>
  );
}
