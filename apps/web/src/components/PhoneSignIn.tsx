'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRIES, type SessionResponse } from '@storyloom/protocol';
import { accountApi } from '@/lib/account';

function guessCountry() {
  try {
    const region = new Intl.Locale(navigator.language).maximize().region;
    if (region && COUNTRIES.some((c) => c.iso === region)) return region;
  } catch {}
  return 'US';
}

/**
 * Phone number → 6-digit code → signed in. Used by "Sign in your TV" and "My account".
 * The number is sent once to the server, which keeps only a secure fingerprint of it.
 */
export function PhoneSignIn({ onSignedIn, title, subtitle }: { onSignedIn: (s: SessionResponse) => void; title: string; subtitle: string }) {
  const [iso, setIso] = useState('US');
  const [number, setNumber] = useState('');
  const [request, setRequest] = useState<{ id: string; phone: string; full: string } | null>(null);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const country = useMemo(() => COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0], [iso]);

  useEffect(() => setIso(guessCountry()), []);
  useEffect(() => {
    if (!wait) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    const local = number.replace(/\D/g, '').replace(/^0+/, '');
    if (local.length < 6) return setError('Please enter your full mobile number.');
    const full = `+${country.dial}${local}`;
    setBusy(true);
    try {
      const r = await accountApi.startOtp(full, navigator.language);
      setRequest({ id: r.requestId, phone: r.phone, full });
      setWait(r.resendIn);
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => boxes.current[0]?.focus(), 50);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (code: string) => {
    if (!request) return;
    setBusy(true);
    setError('');
    try {
      onSignedIn(await accountApi.verifyOtp(request.id, code));
    } catch (err) {
      setError((err as Error).message);
      setDigits(['', '', '', '', '', '']);
      boxes.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const type = (i: number, v: string) => {
    const clean = v.replace(/\D/g, '');
    if (clean.length > 1) {
      // Pasted or auto-filled code.
      const next = clean.slice(0, 6).split('');
      while (next.length < 6) next.push('');
      setDigits(next);
      if (clean.length >= 6) verify(clean.slice(0, 6));
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) boxes.current[i + 1]?.focus();
    if (next.every((d) => d)) verify(next.join(''));
  };

  if (!request) {
    return (
      <form onSubmit={send}>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <label className="field">
          Mobile number
          <div className="phone-row">
            <select className="input" value={iso} onChange={(e) => setIso(e.target.value)} aria-label="Country code">
              {COUNTRIES.map((c) => (
                <option key={c.iso} value={c.iso}>
                  {c.flag} +{c.dial}
                </option>
              ))}
            </select>
            <input
              className="input"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="Your number"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              aria-label="Mobile number"
            />
          </div>
        </label>
        {error ? <div className="error">{error}</div> : null}
        <div className="row-actions">
          <button className="btn block" disabled={busy}>
            {busy ? 'Sending…' : 'Text me a code'}
          </button>
        </div>
        <p className="note">
          We’ll send one text message with a 6-digit code. Standard rates may apply. Your number is never stored or shown to anyone; we keep only a secure fingerprint of it. Only
          grown-ups (18+) can create an account.
        </p>
      </form>
    );
  }

  return (
    <div>
      <h1>Enter your code</h1>
      <p>We sent a 6-digit code to {request.phone}. It works once and expires in 5 minutes.</p>
      <div className="otp" style={{ marginTop: 18 }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            className="input"
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={i === 0 ? 6 : 1}
            value={d}
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => type(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digits[i] && i > 0) boxes.current[i - 1]?.focus();
            }}
          />
        ))}
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="row-actions">
        <button className="btn ghost block" disabled={wait > 0 || busy} onClick={() => send()}>
          {wait > 0 ? `New code in ${wait}s` : 'Send a new code'}
        </button>
        <button className="btn ghost block" onClick={() => setRequest(null)}>
          Change number
        </button>
      </div>
    </div>
  );
}
