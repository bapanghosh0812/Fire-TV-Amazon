import { useEffect, useRef, useState } from 'react';
import { useSession } from '../lib/session';
import { Icon } from '../ui';

export function HeroCapture({ onDone }: { onDone: () => void }) {
  const { sendDrawing, heroBusy, flash } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>();
  const [name, setName] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function send() {
    if (!file) return;
    try {
      await sendDrawing(file, name.trim());
      flash('Look at the TV! ✨');
      onDone();
    } catch (e) {
      flash(e instanceof Error ? e.message : 'Upload failed');
    }
  }

  return (
    <div className="stack fade-in" style={{ flex: 1 }}>
      <button className="back" onClick={onDone}>
        <Icon name="left" size={18} /> Back
      </button>
      <div>
        <div className="overline">The hero</div>
        <h1 className="h1">Draw your hero</h1>
        <p className="body">Use paper and crayons. Any creature, person or thing. Then take a photo from above in good light.</p>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {preview ? (
        <img className="photo" src={preview} alt="Your drawing" />
      ) : (
        <button className="dropzone" onClick={() => input.current?.click()}>
          <div>
            <Icon name="camera" size={44} color="var(--gold)" />
            <p className="h2" style={{ marginTop: 10 }}>
              Snap the drawing
            </p>
            <p className="small">Tip: fill the frame with the paper</p>
          </div>
        </button>
      )}

      <input className="field" placeholder="Hero’s name (optional)" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />

      <div className="spacer" />
      {preview ? (
        <div className="stack">
          <button className="btn" onClick={send} disabled={heroBusy}>
            {heroBusy ? 'Sending to the TV…' : 'Bring it to life'} <Icon name="sparkle" size={18} />
          </button>
          <button className="btn ghost" onClick={() => input.current?.click()} disabled={heroBusy}>
            Take another photo
          </button>
        </div>
      ) : (
        <button className="btn" onClick={() => input.current?.click()}>
          <Icon name="camera" size={20} /> Open camera
        </button>
      )}
      <p className="small center">Photos of real people are rejected automatically. Drawings are deleted within 24 hours unless a parent keeps them.</p>
    </div>
  );
}
