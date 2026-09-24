import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AgeBand } from '@storyloom/protocol';
import type { SkyMode } from '../components/sky/phases';

export interface Settings {
  ageBand: AgeBand;
  gentleMode: boolean; // no scary moments or villains
  bedtimeMode: boolean;
  sleepTimerMin: number; // 0 = off
  dailyLimitMin: number; // 0 = no limit
  keepDrawings: boolean; // false = drawings deleted after 24h
  narrator: string;
  onboarded: boolean;
  skyMode: SkyMode;
}

interface SettingsStore extends Settings {
  pinSet: boolean;
  hydrated: boolean;
  update: (patch: Partial<Settings>) => void;
  hydrate: () => Promise<void>;
  checkPin: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
}

const KEY = 'storyloom.settings';
const PIN_KEY = 'storyloom.pin';

const defaults: Settings = {
  ageBand: 'kid',
  gentleMode: true,
  bedtimeMode: false,
  sleepTimerMin: 0,
  dailyLimitMin: 0,
  keepDrawings: false,
  narrator: 'Ruth',
  onboarded: false,
  skyMode: 'auto',
};

// SecureStore is native-only; the web preview keeps values in memory.
const memory = new Map<string, string>();
const store = {
  get: (k: string) => (Platform.OS === 'web' ? Promise.resolve(memory.get(k) ?? null) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (Platform.OS === 'web' ? Promise.resolve(void memory.set(k, v)) : SecureStore.setItemAsync(k, v)),
};

async function hashPin(pin: string) {
  const Crypto = await import('expo-crypto');
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `storyloom:${pin}`);
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...defaults,
  pinSet: false,
  hydrated: false,
  update: (patch) => {
    set(patch);
    const { update, hydrate, checkPin, setPin, pinSet, hydrated, ...rest } = { ...get(), ...patch };
    store.set(KEY, JSON.stringify(rest)).catch(() => {});
  },
  hydrate: async () => {
    try {
      const raw = await store.get(KEY);
      const pin = await store.get(PIN_KEY);
      set({ ...(raw ? JSON.parse(raw) : {}), pinSet: !!pin, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  checkPin: async (pin) => {
    const saved = await store.get(PIN_KEY);
    return !!saved && saved === (await hashPin(pin));
  },
  setPin: async (pin) => {
    await store.set(PIN_KEY, await hashPin(pin));
    set({ pinSet: true });
  },
}));
