'use client';

import { useEffect, useState } from 'react';
import { PhoneSignIn } from '@/components/PhoneSignIn';
import { ProfileForm, TermsStep } from '@/components/AccountSteps';
import { accountApi, useAccount } from '@/lib/account';

/** The family's account on the phone: details, children, data download and deletion. */
export function AccountFlow() {
  const { user, token, ready, restore, signIn, setUser, signOut } = useAccount();
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => restore(), [restore]);

  if (!ready) return <p>Loading…</p>;
  if (!user) return <PhoneSignIn title="My account" subtitle="Sign in with your mobile number to manage your family’s Storyloom." onSignedIn={signIn} />;
  if (user.needsTerms && !user.needsProfile) return <TermsStep onAccepted={setUser} />;

  const download = async () => {
    setBusy(true);
    try {
      const data = await accountApi.exportData(token!);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'storyloom-my-data.json';
      a.click();
      URL.revokeObjectURL(a.href);
      setMessage('Your data has been downloaded.');
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const everywhere = async () => {
    setBusy(true);
    try {
      await accountApi.signOutAll(token!);
      signOut();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await accountApi.deleteAccount(token!);
      signOut();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="eyebrow">Signed in with {user.phone}</div>
      <h1>{user.name ? `Hello, ${user.name}` : 'Your family'}</h1>
      <p>Changes here appear on your TVs the next time they open Storyloom.</p>
      <ProfileForm user={user} onSaved={(u) => { setUser(u); setMessage('Saved.'); }} submitLabel="Save changes" />
      {message ? <p className="note">{message}</p> : null}
      <hr className="soft" />
      <div className="eyebrow">Your data</div>
      <div className="row-actions">
        <button className="btn ghost block" disabled={busy} onClick={download}>
          Download my data
        </button>
        <button className="btn ghost block" disabled={busy} onClick={everywhere}>
          Sign out of all devices
        </button>
        <button className="btn ghost block" onClick={signOut}>
          Sign out of this phone
        </button>
        {confirmDelete ? (
          <>
            <p className="error" style={{ margin: 0 }}>
              This permanently deletes your account, stories, pictures and profiles. It can’t be undone.
            </p>
            <button className="btn danger block" disabled={busy} onClick={remove}>
              Yes, delete everything
            </button>
            <button className="btn ghost block" onClick={() => setConfirmDelete(false)}>
              Keep my account
            </button>
          </>
        ) : (
          <button className="btn danger block" onClick={() => setConfirmDelete(true)}>
            Delete account
          </button>
        )}
      </div>
    </div>
  );
}
