'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PhoneSignIn } from '@/components/PhoneSignIn';
import { ProfileForm, TermsStep } from '@/components/AccountSteps';
import { accountApi, useAccount } from '@/lib/account';

const CODE = /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/;

/** "Sign in your TV": the page behind the QR code on the TV's sign-in screen. */
export function ActivateFlow() {
  const { user, token, ready, restore, signIn, setUser, signOut } = useAccount();
  const [code, setCode] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    restore();
    const q = new URLSearchParams(location.search).get('code');
    if (q) setCode(q.toUpperCase());
  }, [restore]);

  if (!ready) return <p>Loading…</p>;
  if (!user) return <PhoneSignIn title="Sign in your TV" subtitle="Enter your mobile number. Your TV will sign in by itself when you’re done." onSignedIn={signIn} />;
  if (user.needsProfile) {
    return (
      <>
        <div className="eyebrow">Almost there</div>
        <h1>Tell us about your family</h1>
        <p>Only you can see these details.</p>
        <ProfileForm user={user} onSaved={setUser} />
      </>
    );
  }
  if (user.needsTerms) return <TermsStep onAccepted={setUser} />;

  if (done) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div className="success" aria-hidden>
          ✨
        </div>
        <h1>Look at your TV!</h1>
        <p>Your TV is signing in now. You can close this page, or keep it open to join a story.</p>
        <div className="row-actions">
          <Link className="btn block" href="/j/">
            Join a story on the TV
          </Link>
          <Link className="btn ghost block" href="/account/">
            My account
          </Link>
        </div>
      </div>
    );
  }

  const approve = async () => {
    const clean = code.trim().toUpperCase().replace(/\s/g, '');
    if (!CODE.test(clean)) return setError('Enter the 8-character code shown on your TV, like BCDF-2345.');
    const formatted = clean.includes('-') ? clean : `${clean.slice(0, 4)}-${clean.slice(4)}`;
    setBusy(true);
    setError('');
    try {
      await accountApi.approveTv(formatted, token!);
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="eyebrow">Signed in as {user.name || user.phone}</div>
      <h1>Sign in this TV?</h1>
      <p>Check that this code matches the one on your TV screen, then tap the button.</p>
      <input
        className="input tv-code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="BCDF-2345"
        aria-label="TV code"
        autoCapitalize="characters"
        maxLength={9}
      />
      {error ? <div className="error">{error}</div> : null}
      <div className="row-actions">
        <button className="btn block" disabled={busy} onClick={approve}>
          {busy ? 'Signing in…' : 'Yes, sign in my TV'}
        </button>
        <button className="btn ghost block" onClick={signOut}>
          Use a different number
        </button>
      </div>
      <p className="note">Only approve codes shown on your own TV. Storyloom will never ask you for a code by phone or message.</p>
    </div>
  );
}
