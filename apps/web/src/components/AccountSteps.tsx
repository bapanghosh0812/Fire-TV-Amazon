'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LEGAL_VERSION, type AccountUser, type ChildProfile } from '@storyloom/protocol';
import { accountApi, useAccount } from '@/lib/account';

const AGES: { value: ChildProfile['ageBand']; label: string }[] = [
  { value: 'little', label: '3–5 years' },
  { value: 'kid', label: '6–8 years' },
  { value: 'big-kid', label: '9–11 years' },
];
const AVATARS = ['fox', 'owl', 'deer', 'bear', 'whale', 'dragon', 'cat', 'rabbit'];

/** Name, role and child profiles. Shown once after the first sign-in, and on "My account". */
export function ProfileForm({ user, onSaved, submitLabel = 'Continue' }: { user: AccountUser; onSaved: (u: AccountUser) => void; submitLabel?: string }) {
  const token = useAccount((s) => s.token);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [kids, setKids] = useState<ChildProfile[]>(user.children);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Please add your name.');
    setBusy(true);
    setError('');
    try {
      const { user: saved } = await accountApi.saveProfile(token!, {
        name: name.trim(),
        email: email.trim(),
        role,
        language: navigator.language,
        children: kids.filter((k) => k.name.trim()).map((k) => ({ ...k, name: k.name.trim() })),
      });
      onSaved(saved);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save}>
      <label className="field">
        Your name
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="given-name" placeholder="e.g. Priya" />
      </label>
      <label className="field">
        Email (optional)
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" placeholder="name@example.com" />
      </label>
      <label className="field">
        You are
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as AccountUser['role'])}>
          <option value="parent">A parent</option>
          <option value="guardian">A guardian</option>
          <option value="grandparent">A grandparent</option>
          <option value="teacher">A teacher</option>
          <option value="other">Other</option>
        </select>
      </label>
      <div className="eyebrow" style={{ marginTop: 22 }}>
        Little listeners
      </div>
      <p className="note" style={{ marginTop: 6 }}>
        Just a first name or nickname and an age range. No birthdays, photos or schools.
      </p>
      <div className="kid-list">
        {kids.map((k, i) => (
          <div className="kid" key={k.id}>
            <input
              className="input"
              value={k.name}
              maxLength={20}
              placeholder="First name"
              aria-label="Child’s first name"
              onChange={(e) => setKids(kids.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <select
              className="input"
              value={k.ageBand}
              aria-label="Age range"
              onChange={(e) => setKids(kids.map((x, j) => (j === i ? { ...x, ageBand: e.target.value as ChildProfile['ageBand'] } : x)))}
            >
              {AGES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
            <button type="button" className="icon-btn" aria-label="Remove child" onClick={() => setKids(kids.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        ))}
        {kids.length < 6 ? (
          <button
            type="button"
            className="btn ghost"
            onClick={() => setKids([...kids, { id: `c-${Date.now().toString(36)}`, name: '', ageBand: 'kid', avatar: AVATARS[kids.length % AVATARS.length] }])}
          >
            + Add a child
          </button>
        ) : null}
      </div>
      {error ? <div className="error">{error}</div> : null}
      <div className="row-actions">
        <button className="btn block" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

/** The two promises every account makes before a family starts. */
export function TermsStep({ onAccepted }: { onAccepted: (u: AccountUser) => void }) {
  const token = useAccount((s) => s.token);
  const [agree, setAgree] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const accept = async () => {
    setBusy(true);
    setError('');
    try {
      const { user } = await accountApi.acceptTerms(token!, LEGAL_VERSION);
      onAccepted(user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="eyebrow">Our promise to your family</div>
      <h1>Before we begin</h1>
      <ul className="checks">
        <li>A grown-up holds the account and watches together.</li>
        <li>Stories are made with AI and checked by kid-safe filters in every language.</li>
        <li>Your drawings, ideas and stories stay yours. No ads, no selling data.</li>
        <li>You can download or delete everything at any time.</li>
      </ul>
      <label className="check-row">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          I have read and agree to the{' '}
          <Link href="/legal/terms/" target="_blank">
            Terms of Service
          </Link>{' '}
          and the{' '}
          <Link href="/legal/privacy/" target="_blank">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <label className="check-row">
        <input type="checkbox" checked={guardian} onChange={(e) => setGuardian(e.target.checked)} />
        <span>
          I am 18 or older and a parent or legal guardian, and I agree to my children using Storyloom as described in the{' '}
          <Link href="/legal/children/" target="_blank">
            Children’s Privacy Notice
          </Link>
          .
        </span>
      </label>
      {error ? <div className="error">{error}</div> : null}
      <div className="row-actions">
        <button className="btn block" disabled={!agree || !guardian || busy} onClick={accept}>
          {busy ? 'Saving…' : 'Agree and continue'}
        </button>
      </div>
    </div>
  );
}
