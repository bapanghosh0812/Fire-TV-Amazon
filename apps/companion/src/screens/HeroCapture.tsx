import { useEffect, useRef, useState } from 'react';
import { useSession } from '../lib/session';
import { t } from '../i18n';
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
      flash(t('lookTv'));
      onDone();
    } catch (e) {
      flash(e instanceof Error ? e.message : t('tangled'));
    }
  }

  return (
    <div className="stack fade-in" style={{ flex: 1 }}>
      <button className="back" onClick={onDone}>
        <Icon name="left" size={18} /> {t('back')}
      </button>
      <div>
        <div className="overline">{t('hero')}</div>
        <h1 className="h1">{t('drawTitle')}</h1>
        <p className="body">{t('drawBody')}</p>
      </div>

      <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

      {preview ? (
        <img className="photo" src={preview} alt="" />
      ) : (
        <button className="dropzone" onClick={() => input.current?.click()}>
          <div>
            <Icon name="camera" size={44} color="var(--gold)" />
            <p className="h2" style={{ marginTop: 10 }}>
              {t('snap')}
            </p>
            <p className="small">{t('snapTip')}</p>
          </div>
        </button>
      )}

      <input className="field" placeholder={t('heroName')} value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />

      <div className="spacer" />
      {preview ? (
        <div className="stack">
          <button className="btn" onClick={send} disabled={heroBusy}>
            {heroBusy ? t('sending') : t('bringAlive')} <Icon name="sparkle" size={18} />
          </button>
          <button className="btn ghost" onClick={() => input.current?.click()} disabled={heroBusy}>
            {t('another')}
          </button>
        </div>
      ) : (
        <button className="btn" onClick={() => input.current?.click()}>
          <Icon name="camera" size={20} /> {t('openCamera')}
        </button>
      )}
      <p className="small center">{t('photoNote')}</p>
    </div>
  );
}
