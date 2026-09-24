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
