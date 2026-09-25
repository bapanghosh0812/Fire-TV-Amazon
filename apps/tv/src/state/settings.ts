import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AgeBand } from '@storyloom/protocol';
import { DEFAULT_LANGUAGE } from '@storyloom/protocol';
import type { SkyMode } from '../components/sky/phases';

export type Choice<T extends string> = T;

export interface Profile {
  id: string;
  name: string;
  avatar: string; // avatar id (fox, owl, deer, bear, whale, dragon)
  color: string;
  ageBand: AgeBand;
}

/**
 * Every preference in Storyloom. Grouped the way the Settings screen shows them;
 * defaults are chosen so a family can press "Start" and never open Settings.
 */
export interface Settings {
  // Language & region
  language: string; // menus (BCP-47). Everyone starts in English and can change it on the first screen.
  storyLanguage: string; // default language for new stories
  audioLanguage: string; // 'original' or a language key for bookshelf stories
  captionLanguage: string; // 'same' (follows the audio), 'off', or a language key
  clock24h: boolean;

  // Playback & sound
  autoplayNext: boolean;
  autoAdvance: boolean;
  narrationSpeed: number;
  pagePause: number; // seconds between pages
  narrationVolume: number; // 0..1
  music: boolean;
  musicVolume: number;
  sfx: boolean;
  sfxVolume: number;
  focusSounds: boolean;
  soundProfile: 'cinema' | 'clear' | 'night';
  quality: 'auto' | 'best' | 'saver';
  resume: boolean;
  readAlong: boolean;
  highlightStyle: 'glow' | 'underline' | 'box';
  narrator: string;

  // Captions & text
  captions: boolean;
  captionSize: 's' | 'm' | 'l' | 'xl';
  captionFont: 'story' | 'rounded' | 'readable';
  captionColor: 'parchment' | 'white' | 'yellow' | 'cyan';
  captionBackground: 'shadow' | 'box' | 'none';
  captionPosition: 'bottom' | 'top';

  // Display & sky
  skyStyle: 'cinematic' | 'illustrated' | 'calm';
  skyMode: SkyMode;
  comfortDim: 'auto' | 'off' | 'strong';
  reduceMotion: boolean;
  kenBurns: boolean;
  pageTransition: 'fade' | 'slide' | 'dissolve';
  ambientAfterMin: number; // 0 = never
  showClock: boolean;
  accent: 'gold' | 'rose' | 'aqua' | 'lilac';
  highContrast: boolean;
  largeText: boolean;

  // Parental controls
  pinForSettings: boolean;
  pinForCreate: boolean;
  ageBand: AgeBand;
  gentleMode: boolean;
  scaryLevel: 'none' | 'little' | 'spooky';
  avoidTopics: string[];
  safetyLevel: 'standard' | 'strict';
  dailyLimitMin: number; // 0 = no limit
  bedtimeLock: boolean;
  bedtimeFrom: string; // HH:MM
  bedtimeTo: string;
  sleepTimerMin: number; // 0 = off
  bedtimeMode: boolean;
  playersJoin: 'open' | 'approve' | 'off';
  maxPlayers: number;

  // Story creation
  storyLength: 'short' | 'medium' | 'long';
  defaultMood: 'cozy' | 'adventure' | 'silly' | 'curious';
  artStyle: 'watercolor' | 'storybook' | 'papercut' | 'pastel' | 'clay' | 'comic';
  useFamilyNames: boolean;
  choiceMoments: number;
  learningFacts: boolean;
  lessonFocus: 'none' | 'kindness' | 'courage' | 'sharing' | 'patience' | 'honesty' | 'curiosity';
  rhyming: boolean;

  // Privacy & data
  keepDrawings: boolean; // false = drawings deleted after 24h
  familyMemory: boolean;
  voiceIdeas: boolean;
  analytics: boolean;
  crashReports: boolean;

  // Notifications
  bedtimeReminder: boolean;
  reminderTime: string;
  storyReadyAlert: boolean;

  // Accessibility & remote
  screenReaderHints: boolean;
  describePictures: boolean;
  focusStyle: 'glow' | 'outline';
  holdToRepeat: 'normal' | 'slow';
  alexaVoice: boolean;
  exitConfirm: boolean;

  // Family
  profiles: Profile[];
  activeProfileId: string | null;

  // Onboarding
  onboarded: boolean;
  languageChosen: boolean;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
}

export const TERMS_VERSION = '2026-09-25';

export const DEFAULT_SETTINGS: Settings = {
  language: DEFAULT_LANGUAGE,
  storyLanguage: DEFAULT_LANGUAGE,
  audioLanguage: 'original',
  captionLanguage: 'same',
  clock24h: false,

  autoplayNext: true,
  autoAdvance: true,
  narrationSpeed: 1,
  pagePause: 1.2,
  narrationVolume: 1,
  music: true,
  musicVolume: 0.35,
  sfx: true,
  sfxVolume: 0.6,
  focusSounds: true,
  soundProfile: 'cinema',
  quality: 'auto',
  resume: true,
  readAlong: true,
  highlightStyle: 'glow',
  narrator: 'Ruth',

  captions: true,
  captionSize: 'm',
  captionFont: 'story',
  captionColor: 'parchment',
  captionBackground: 'shadow',
  captionPosition: 'bottom',

  skyStyle: 'cinematic',
  skyMode: 'auto',
  comfortDim: 'auto',
  reduceMotion: false,
  kenBurns: true,
  pageTransition: 'fade',
  ambientAfterMin: 10,
  showClock: true,
  accent: 'gold',
  highContrast: false,
  largeText: false,

  pinForSettings: true,
  pinForCreate: false,
  ageBand: 'kid',
  gentleMode: true,
  scaryLevel: 'none',
  avoidTopics: [],
  safetyLevel: 'standard',
  dailyLimitMin: 0,
  bedtimeLock: false,
  bedtimeFrom: '20:30',
  bedtimeTo: '06:30',
  sleepTimerMin: 0,
  bedtimeMode: false,
  playersJoin: 'open',
  maxPlayers: 4,

  storyLength: 'medium',
  defaultMood: 'cozy',
  artStyle: 'storybook',
  useFamilyNames: true,
  choiceMoments: 1,
  learningFacts: true,
  lessonFocus: 'none',
  rhyming: false,

  keepDrawings: false,
  familyMemory: true,
  voiceIdeas: true,
  analytics: false,
  crashReports: true,

  bedtimeReminder: false,
  reminderTime: '19:45',
  storyReadyAlert: true,

  screenReaderHints: true,
  describePictures: false,
  focusStyle: 'glow',
  holdToRepeat: 'normal',
  alexaVoice: true,
  exitConfirm: true,

  profiles: [],
  activeProfileId: null,

  onboarded: false,
  languageChosen: false,
  termsVersion: null,
  termsAcceptedAt: null,
};

interface SettingsStore extends Settings {
  pinSet: boolean;
  hydrated: boolean;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
  hydrate: () => Promise<void>;
  checkPin: (pin: string) => Promise<boolean>;
  setPin: (pin: string | null) => Promise<void>;
}

const KEY = 'storyloom.settings';
const PIN_KEY = 'storyloom.pin';

// SecureStore is native-only; the web preview keeps values in memory.
const memory = new Map<string, string>();
export const secure = {
  get: (k: string) => (Platform.OS === 'web' ? Promise.resolve(memory.get(k) ?? null) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) => (Platform.OS === 'web' ? Promise.resolve(void memory.set(k, v)) : SecureStore.setItemAsync(k, v)),
  del: (k: string) => (Platform.OS === 'web' ? Promise.resolve(void memory.delete(k)) : SecureStore.deleteItemAsync(k)),
};

async function hashPin(pin: string) {
  const Crypto = await import('expo-crypto');
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `storyloom:${pin}`);
}

function pick(state: SettingsStore): Settings {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(DEFAULT_SETTINGS)) out[k] = (state as unknown as Record<string, unknown>)[k];
  return out as unknown as Settings;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(s: Settings) => void>();
/** Called (debounced) after settings change, e.g. to sync them to the family's account. */
export function onSettingsSaved(fn: (s: Settings) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const useSettings = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  pinSet: false,
  hydrated: false,
  update: (patch) => {
    // Gentle mode and the scary level describe the same thing; keep them in step.
    if (patch.scaryLevel) patch.gentleMode = patch.scaryLevel === 'none';
    else if (patch.gentleMode !== undefined) patch.scaryLevel = patch.gentleMode ? 'none' : 'little';
    set(patch);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const snapshot = pick(get());
      secure.set(KEY, JSON.stringify(snapshot)).catch(() => {});
      listeners.forEach((fn) => fn(snapshot));
    }, 250);
  },
  reset: () => {
    const keep = { onboarded: get().onboarded, languageChosen: get().languageChosen, termsVersion: get().termsVersion, termsAcceptedAt: get().termsAcceptedAt, profiles: get().profiles, activeProfileId: get().activeProfileId, language: get().language };
    get().update({ ...DEFAULT_SETTINGS, ...keep });
  },
  hydrate: async () => {
    try {
      const raw = await secure.get(KEY);
      const pin = await secure.get(PIN_KEY);
      const saved = raw ? (JSON.parse(raw) as Partial<Settings>) : {};
      set({ ...DEFAULT_SETTINGS, ...saved, pinSet: !!pin, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
  checkPin: async (pin) => {
    const saved = await secure.get(PIN_KEY);
    return !!saved && saved === (await hashPin(pin));
  },
  setPin: async (pin) => {
    if (pin === null) {
      await secure.del(PIN_KEY);
      set({ pinSet: false });
      return;
    }
    await secure.set(PIN_KEY, await hashPin(pin));
    set({ pinSet: true });
  },
}));

export function activeProfile(): Profile | undefined {
  const { profiles, activeProfileId } = useSettings.getState();
  return profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
}
