'use client';

import { create } from 'zustand';
import type { AccountUser, OtpStartResponse, SessionResponse } from '@storyloom/protocol';

// Same runtime config as the story companion: /config.json is written at deploy time.
let apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';
let loading: Promise<void> | null = null;

export function loadConfig() {
  if (apiBase) return Promise.resolve();
  loading ??= fetch('/config.json', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : {}))
    .then((cfg: { apiBaseUrl?: string }) => {
      apiBase = cfg.apiBaseUrl?.replace(/\/$/, '') ?? '';
    })
    .catch(() => {});
  return loading;
}

export async function api<T>(path: string, init: RequestInit & { token?: string | null } = {}): Promise<T> {
  await loadConfig();
  if (!apiBase) throw new Error('Storyloom’s servers aren’t connected in this preview.');
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.token ? { authorization: `Bearer ${init.token}` } : {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { message?: string }).message ?? `Something went wrong (${res.status})`);
  return body as T;
}

const KEY = 'storyloom.account';

interface AccountState {
  token: string | null;
  user: AccountUser | null;
  ready: boolean;
  restore: () => void;
  signIn: (s: SessionResponse) => void;
  setUser: (u: AccountUser) => void;
  signOut: () => void;
}

/** The grown-up's session on this phone (kept in this browser only). */
export const useAccount = create<AccountState>((set, get) => ({
  token: null,
  user: null,
  ready: false,
  restore: () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { token: string; user: AccountUser };
        set({ token: saved.token, user: saved.user });
        api<{ user: AccountUser }>('/account', { token: saved.token })
          .then(({ user }) => get().setUser(user))
          .catch(() => get().signOut());
      }
    } catch {}
    set({ ready: true });
  },
  signIn: (s) => {
    set({ token: s.accountToken, user: s.user });
    try {
      localStorage.setItem(KEY, JSON.stringify({ token: s.accountToken, user: s.user }));
    } catch {}
  },
  setUser: (user) => {
    set({ user });
    try {
      localStorage.setItem(KEY, JSON.stringify({ token: get().token, user }));
    } catch {}
  },
  signOut: () => {
    set({ token: null, user: null });
    try {
      localStorage.removeItem(KEY);
    } catch {}
  },
}));

export const accountApi = {
  startOtp: (phone: string, locale: string) => api<OtpStartResponse>('/auth/otp', { method: 'POST', body: JSON.stringify({ phone, locale }) }),
  verifyOtp: (requestId: string, code: string) => api<SessionResponse>('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ requestId, code }) }),
  approveTv: (code: string, token: string) => api<{ ok: true }>(`/activations/${encodeURIComponent(code)}/approve`, { method: 'POST', token, body: '{}' }),
  saveProfile: (token: string, profile: Partial<AccountUser>) => api<{ user: AccountUser }>('/account/profile', { method: 'PUT', token, body: JSON.stringify(profile) }),
  acceptTerms: (token: string, version: string) => api<{ user: AccountUser }>('/account/terms', { method: 'POST', token, body: JSON.stringify({ version, guardian: true }) }),
  exportData: (token: string) => api<Record<string, unknown>>('/account/export', { token }),
  signOutAll: (token: string) => api('/account/signout-all', { method: 'POST', token }),
  deleteAccount: (token: string) => api('/account', { method: 'DELETE', token }),
  contact: (topic: string, message: string, reply: string, token?: string | null) =>
    api<{ ticketId: string }>('/support', { method: 'POST', token, body: JSON.stringify({ topic, message, reply }) }),
};
