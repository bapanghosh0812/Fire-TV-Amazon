import { useCallback } from 'react';
import { useSettings } from '../state/settings';
import { en, type StringKey, type Strings } from './en';
import { hi } from './hi';
import { es } from './es';
import { fr } from './fr';
import { de } from './de';
import { pt } from './pt';
import { ja } from './ja';

const DICTS: Record<string, Strings> = { en, hi, es, fr, de, pt, ja };

/** Languages the menus are fully translated into (story narration covers many more). */
export const UI_LANGUAGES: { code: string; native: string; english: string; story: string }[] = [
  { code: 'en-US', native: 'English', english: 'English', story: 'en-US' },
  { code: 'hi-IN', native: 'हिन्दी', english: 'Hindi', story: 'hi-IN' },
  { code: 'es-ES', native: 'Español', english: 'Spanish', story: 'es-ES' },
  { code: 'fr-FR', native: 'Français', english: 'French', story: 'fr-FR' },
  { code: 'de-DE', native: 'Deutsch', english: 'German', story: 'de-DE' },
  { code: 'pt-BR', native: 'Português', english: 'Portuguese', story: 'pt-BR' },
  { code: 'ja-JP', native: '日本語', english: 'Japanese', story: 'ja-JP' },
].filter((l) => DICTS[l.code.split('-')[0]]);

export function uiDict(language?: string): Strings {
  const base = (language ?? 'en').split('-')[0];
  return DICTS[base] ?? en;
}

export type Translate = (key: StringKey, vars?: Record<string, string | number>) => string;

export function translate(language: string | undefined, key: StringKey, vars?: Record<string, string | number>) {
  let s: string = uiDict(language)[key] ?? en[key];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** `const t = useT(); t('home.read')` — re-renders when the family changes language. */
export function useT(): Translate {
  const language = useSettings((s) => s.language);
  return useCallback((key, vars) => translate(language, key, vars), [language]);
}

export type { StringKey };
