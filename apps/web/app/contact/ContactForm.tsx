'use client';

import { useEffect, useState } from 'react';
import { accountApi, useAccount } from '@/lib/account';

const TOPICS = [
  { value: 'question', label: 'A question' },
  { value: 'problem', label: 'Something isn’t working' },
  { value: 'safety', label: 'A safety concern (we look at these first)' },
  { value: 'privacy', label: 'Privacy or my data' },
  { value: 'feedback', label: 'An idea or feedback' },
  { value: 'other', label: 'Something else' },
];

/** Messages go straight to the Storyloom team. */
export function ContactForm() {
  const { token, restore } = useAccount();
  const [topic, setTopic] = useState('question');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => restore(), [restore]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { ticketId } = await accountApi.contact(topic, message, reply, token);
      setSent(ticketId.slice(0, 8).toUpperCase());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div className="success" aria-hidden>
          💌
        </div>
        <h1>Thank you!</h1>
        <p>Your message reached the Storyloom team. Reference: {sent}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={send}>
      <div className="eyebrow">Help &amp; contact</div>
      <h1>How can we help?</h1>
      <p>Write to the people who make Storyloom. For privacy requests, tell us what you need; we reply within 30 days.</p>
      <label className="field">
        Topic
        <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Your message
        <textarea className="input" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} required />
      </label>
      <label className="field">
        How can we reply? (optional)
        <input className="input" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={254} placeholder="Email address" />
      </label>
      {error ? <div className="error">{error}</div> : null}
      <div className="row-actions">
        <button className="btn block" disabled={busy || message.trim().length < 5}>
          {busy ? 'Sending…' : 'Send message'}
        </button>
      </div>
      <p className="note">Please don’t include children’s personal details. If you think a child is in danger, contact your local emergency services first.</p>
    </form>
  );
}
