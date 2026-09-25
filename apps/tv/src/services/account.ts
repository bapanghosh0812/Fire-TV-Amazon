import { create } from 'zustand';
import type {
  AccountUser,
  ActivationPollResponse,
  ActivationStartResponse,
  OtpStartResponse,
  SessionResponse,
} from '@storyloom/protocol';
import { config, isOfflineDemo } from './config';
import { secure, onSettingsSaved, useSettings, type Settings } from '../state/settings';

const TOKEN_KEY = 'storyloom.account';

async function call<T>(path: string, init: RequestInit & { token?: string; headers?: Record<string, string> } = {}): Promise<T> {
  if (isOfflineDemo) throw new Error('Sign-in needs an internet connection.');
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.token ? { authorization: `Bearer ${init.token}` } : {}), ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { message?: string }).message ?? `Request failed (${res.status})`);
  return body as T;
}

interface AccountState {
  token: string | null;
  user: AccountUser | null;
  ready: boolean;
  demo: boolean; // exploring without an account
  load: () => Promise<void>;
  setSession: (s: SessionResponse) => Promise<void>;
  setUser: (u: AccountUser) => void;
  exploreDemo: () => void;
  signOut: () => Promise<void>;
}

export const useAccount = create<AccountState>((set, get) => ({
  token: null,
  user: null,
  ready: false,
  demo: false,
  load: async () => {
    try {
      const raw = await secure.get(TOKEN_KEY);
      if (!raw) return set({ ready: true });
      const saved = JSON.parse(raw) as { token: string; user: AccountUser; demo?: boolean };
      if (saved.demo) return set({ demo: true, ready: true });
      set({ token: saved.token, user: saved.user, ready: true });
      // Refresh quietly; a revoked token signs the TV out.
      call<{ user: AccountUser }>('/account', { token: saved.token })
        .then(({ user }) => get().setUser(user))
        .catch((e: Error) => {
          if (/sign in again/i.test(e.message)) get().signOut();
        });
    } catch {
      set({ ready: true });
    }
  },
  setSession: async (s) => {
    if (s.deviceToken) {
      const cloud = await import('./cloud');
      await cloud.adoptHousehold(s.householdId, s.deviceToken);
      cloud.syncBookshelf().catch(() => {});
    }
    set({ token: s.accountToken, user: s.user, demo: false });
    await secure.set(TOKEN_KEY, JSON.stringify({ token: s.accountToken, user: s.user }));
    applyAccountSettings(s.user);
  },
  setUser: (user) => {
    set({ user });
    const token = get().token;
    if (token) secure.set(TOKEN_KEY, JSON.stringify({ token, user })).catch(() => {});
  },
  exploreDemo: () => {
    set({ demo: true });
    secure.set(TOKEN_KEY, JSON.stringify({ demo: true })).catch(() => {});
  },
  signOut: async () => {
    set({ token: null, user: null, demo: false });
    await secure.del(TOKEN_KEY);
  },
}));

/** Settings saved on the account follow the family to every TV. */
function applyAccountSettings(user: AccountUser) {
  const remote = user.settings as Partial<Settings>;
  if (remote && Object.keys(remote).length) useSettings.getState().update(remote);
  if (user.children?.length && !useSettings.getState().profiles.length) {
    useSettings.getState().update({
      profiles: user.children.map((c, i) => ({ id: c.id, name: c.name, avatar: c.avatar, ageBand: c.ageBand, color: ['#FF7A6B', '#3FD0C9', '#B69CFF', '#F5C66B'][i % 4] })),
    });
  }
}

// Push changes up (debounced by the settings store); only a safe subset of keys.
const SYNC_KEYS: (keyof Settings)[] = [
  'language', 'storyLanguage', 'audioLanguage', 'captionLanguage', 'narrationSpeed', 'music', 'musicVolume', 'sfx', 'soundProfile',
  'captions', 'captionSize', 'captionFont', 'captionColor', 'captionBackground', 'skyStyle', 'comfortDim', 'reduceMotion',
  'ageBand', 'scaryLevel', 'avoidTopics', 'safetyLevel', 'dailyLimitMin', 'bedtimeMode', 'storyLength', 'defaultMood', 'artStyle',
  'useFamilyNames', 'choiceMoments', 'learningFacts', 'lessonFocus', 'rhyming', 'keepDrawings', 'familyMemory', 'narrator',
];
onSettingsSaved((s) => {
  const token = useAccount.getState().token;
  if (!token) return;
  const settings = Object.fromEntries(SYNC_KEYS.map((k) => [k, s[k]]));
  call('/account/settings', { method: 'PUT', token, body: JSON.stringify({ settings }) }).catch(() => {});
});

// ---------------------------------------------------------------- API
export const accountApi = {
  startOtp: (phone: string, locale: string) =>
    call<OtpStartResponse>('/auth/otp', { method: 'POST', body: JSON.stringify({ phone, locale }) }),

  verifyOtp: async (requestId: string, code: string) => {
    const cloud = await import('./cloud');
    const deviceToken = await cloud.currentDeviceToken();
    return call<SessionResponse>('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ requestId, code, deviceToken }) });
  },

  startActivation: async () => {
    const cloud = await import('./cloud');
    const deviceToken = await cloud.currentDeviceToken();
    return call<ActivationStartResponse>('/activations', { method: 'POST', body: JSON.stringify({ deviceToken }) });
  },

  pollActivation: (code: string, pollToken: string) =>
    call<ActivationPollResponse>(`/activations/${code}`, { headers: { 'x-poll-token': pollToken } }),

  saveProfile: (profile: Partial<AccountUser>) =>
    call<{ user: AccountUser }>('/account/profile', { method: 'PUT', token: useAccount.getState().token ?? '', body: JSON.stringify(profile) }),

  acceptTerms: (version: string) =>
    call<{ user: AccountUser }>('/account/terms', { method: 'POST', token: useAccount.getState().token ?? '', body: JSON.stringify({ version, guardian: true }) }),

  signOutEverywhere: () => call('/account/signout-all', { method: 'POST', token: useAccount.getState().token ?? '' }),

  deleteAccount: () => call('/account', { method: 'DELETE', token: useAccount.getState().token ?? '' }),
};
