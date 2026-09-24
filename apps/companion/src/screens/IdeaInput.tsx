import { useEffect, useRef, useState } from 'react';
import { useSession } from '../lib/session';
import { listen, speechSupported } from '../lib/speech';
import { Icon } from '../ui';

const COPY = {
  world: {
    title: 'Where does it happen?',
    body: 'Say it out loud or type it. Anywhere at all!',
    placeholder: 'A lighthouse on the moon…',
    ideas: ['an underwater bakery', 'a castle made of clouds', 'a jungle of giant flowers', 'a train that travels to the stars', 'grandma’s garden at night'],
  },
  spark: {
    title: 'What sparks the story?',
    body: 'A problem, a wish or a big surprise.',
    placeholder: 'The moon lost its glow…',
    ideas: ['a lost treasure map', 'a new friend who is very different', 'a storm is coming', 'a surprise birthday party', 'a door that wasn’t there yesterday'],
  },
} as const;

export function IdeaInput({ kind, onDone }: { kind: 'world' | 'spark'; onDone: () => void }) {
  const { send, flash } = useSession();
  const [text, setText] = useState('');
  const [live, setLive] = useState(false);
  const stop = useRef<() => void>(undefined);
  const copy = COPY[kind];
  const canSpeak = speechSupported();

  useEffect(() => () => stop.current?.(), []);

  function toggleMic() {
    if (live) {
      stop.current?.();
      return;
    }
    setLive(true);
    stop.current = listen(
      (t) => setText(t),
      (err) => {
        setLive(false);
        if (err && err !== 'no-speech' && err !== 'aborted') flash('Couldn’t hear that. You can type instead.');
      },
    );
  }

  function submit(value = text) {
    const v = value.trim();
    if (!v) return;
    send({ action: 'thread.set', thread: { kind, by: '', text: v.slice(0, 140) } });
    if ('vibrate' in navigator) navigator.vibrate?.(20);
    flash('Sent to the TV ✨');
    onDone();
  }

  return (
    <div className="stack fade-in" style={{ flex: 1 }}>
      <button className="back" onClick={onDone}>
        <Icon name="left" size={18} /> Back
      </button>
      <div>
        <div className="overline">The {kind}</div>
        <h1 className="h1">{copy.title}</h1>
        <p className="body">{copy.body}</p>
      </div>

      {canSpeak ? (
        <>
          <button className={`mic ${live ? 'live' : ''}`} onClick={toggleMic} aria-label={live ? 'Stop listening' : 'Speak your idea'}>
            <Icon name="mic" size={40} />
          </button>
          <p className="small center" style={{ marginTop: -4 }}>
            {live ? 'Listening… tap to stop' : 'Tap and speak'}
          </p>
        </>
      ) : null}

      <textarea className="field" placeholder={copy.placeholder} value={text} maxLength={140} onChange={(e) => setText(e.target.value)} />

      <div className="chips">
        {copy.ideas.map((idea) => (
          <button key={idea} className="chip" onClick={() => submit(idea)}>
            {idea}
          </button>
        ))}
      </div>

      <div className="spacer" />
      <button className="btn" disabled={!text.trim()} onClick={() => submit()}>
        Send to the TV <Icon name="send" size={18} />
      </button>
    </div>
  );
}
