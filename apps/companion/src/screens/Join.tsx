import { useEffect, useRef, useState } from 'react';
import { THREAD_COLORS } from '@storyloom/protocol';
import { useSession } from '../lib/session';
import { Brand, Icon } from '../ui';
import { t } from '../i18n';

function codeFromUrl() {
  const m = location.pathname.match(/\/j\/([A-Za-z]{4})/);
  const q = new URLSearchParams(location.search).get('code');
  return (m?.[1] ?? q ?? '').toUpperCase().slice(0, 4);
}

export function Join() {
  const join = useSession((s) => s.join);
  const [code, setCode] = useState(codeFromUrl().padEnd(4, ' ').split('').map((c) => c.trim()));
  const [name, setName] = useState(() => localStorage.getItem('storyloom.name') ?? '');
  const [color, setColor] = useState<string>(() => localStorage.getItem('storyloom.color') ?? THREAD_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);

  const full = code.join('');
  const ready = full.length === 4 && name.trim().length > 0;

  useEffect(() => {
    if (full.length === 4) nameRef.current?.focus();
    else inputs.current[code.findIndex((c) => !c)]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setChar(i: number, v: string) {
    const ch = v.replace(/[^a-z]/gi, '').slice(-1).toUpperCase();
    const next = [...code];
    next[i] = ch;
    setCode(next);
    if (ch && i < 3) inputs.current[i + 1]?.focus();
    if (ch && i === 3) nameRef.current?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError('');
    try {
      localStorage.setItem('storyloom.name', name.trim());
      localStorage.setItem('storyloom.color', color);
      await join(full, name.trim().slice(0, 16), color);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('joinError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack fade-in" onSubmit={submit} style={{ flex: 1 }}>
      <div className="topbar">
        <Brand />
      </div>
      <div>
        <div className="overline">{t('invited')}</div>
        <h1 className="h1">{t('joinTitle')}</h1>
        <p className="body">{t('joinBody')}</p>
      </div>

      <div className="card stack" style={{ gap: 18, marginTop: 8 }}>
        <label className="small center" htmlFor="c0">
          {t('roomCode')}
        </label>
        <div className="code" dir="ltr">
          {code.map((c, i) => (
            <input
              key={i}
              id={`c${i}`}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={c}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={2}
              aria-label={`Code letter ${i + 1}`}
              onChange={(e) => setChar(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !code[i] && i > 0) inputs.current[i - 1]?.focus();
              }}
            />
          ))}
        </div>

        <label className="small" htmlFor="name">
          {t('yourName')}
        </label>
        <input
          id="name"
          ref={nameRef}
          className="field"
          placeholder={t('namePlaceholder')}
          value={name}
          maxLength={16}
          autoComplete="given-name"
          onChange={(e) => setName(e.target.value)}
        />

        <label className="small">{t('yourColour')}</label>
        <div className="swatches">
          {THREAD_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              className="swatch"
              aria-label={`Colour ${c}`}
              aria-pressed={color === c}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      {error ? (
        <p className="body center" style={{ color: 'var(--danger)' }} role="alert">
          {error}
        </p>
      ) : null}

      <div className="spacer" />
      <button className="btn" disabled={!ready || busy}>
        {busy ? t('joining') : t('join')}
        <Icon name="sparkle" size={18} />
      </button>
      <p className="small center">{t('joinNote')}</p>
    </form>
  );
}
