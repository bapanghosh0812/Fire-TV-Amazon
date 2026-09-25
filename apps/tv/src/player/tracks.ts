import type { Story, StoryChoice, StoryPage, WordMark } from '@storyloom/protocol';
import { languageInfo } from '@storyloom/protocol';
import { NARRATION } from '../data/narration.generated';
import en from '../data/stories/en.json';
import hi from '../data/stories/hi.json';
import es from '../data/stories/es.json';
import fr from '../data/stories/fr.json';
import de from '../data/stories/de.json';
import pt from '../data/stories/pt.json';
import ja from '../data/stories/ja.json';
import ar from '../data/stories/ar.json';

// Bookshelf stories ship in every language below, each with its own narrator.
type StoryText = { title: string; summary: string; pages: Record<string, string>; choice?: { prompt: string; options: Record<string, string> } };
const TEXT: Record<string, Record<string, StoryText>> = { en, hi, es, fr, de, pt, ja, ar };

/** Track keys (short) → full language codes for voices, fonts and direction. */
export const TRACK_CODE: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  pt: 'pt-BR',
  ja: 'ja-JP',
  ar: 'ar-AE',
};

export function trackLabel(key: string) {
  return languageInfo(TRACK_CODE[key] ?? key).native.replace(/\s*\(.*\)$/, '');
}

export function pageKey(page: Pick<StoryPage, 'index' | 'branch'>) {
  return `${page.index}${page.branch ?? ''}`;
}

/** The track a story was written in ("Original" in the audio menu). */
export function originalTrack(story: Story) {
  if (TEXT.en[story.id]) return 'en';
  return (story.language ?? 'en-US').split('-')[0];
}

/** Audio languages this story can be heard in. */
export function audioTracks(story: Story): string[] {
  const n = NARRATION[story.id];
  if (n) return Object.keys(TRACK_CODE).filter((k) => n[k]);
  return [originalTrack(story)];
}

/** Subtitle languages available for this story. */
export function captionTracks(story: Story): string[] {
  if (TEXT.en[story.id]) return Object.keys(TRACK_CODE).filter((k) => TEXT[k]?.[story.id]);
  return [originalTrack(story)];
}

/** Picks the best track for a preference like 'original', 'hi' or 'hi-IN'. */
export function resolveTrack(pref: string | undefined, available: string[], fallback: string) {
  if (!pref || pref === 'original') return available.includes(fallback) ? fallback : available[0];
  const base = pref.split('-')[0];
  return available.includes(base) ? base : available.includes(fallback) ? fallback : available[0];
}

export function pageText(story: Story, page: StoryPage, track: string): string {
  return TEXT[track]?.[story.id]?.pages[pageKey(page)] ?? page.text;
}

export function storyTitle(story: Story, track: string): string {
  return TEXT[track]?.[story.id]?.title ?? story.title;
}

export function choiceText(story: Story, track: string): StoryChoice | undefined {
  const c = TEXT[track]?.[story.id]?.choice;
  if (!c || !story.choice) return story.choice;
  const [a, b] = story.choice.options;
  return {
    ...story.choice,
    prompt: c.prompt,
    options: [
      { ...a, label: c.options[a.id] ?? a.label },
      { ...b, label: c.options[b.id] ?? b.label },
    ],
  };
}

export interface PageAudio {
  source?: number | string;
  marks?: WordMark[];
  durationMs?: number;
}

/** Narration for one page in one language: bundled for bookshelf stories, streamed for new ones. */
export function pageAudio(story: Story, page: StoryPage, track: string): PageAudio {
  const n = NARRATION[story.id]?.[track]?.[pageKey(page)];
  if (n) return { source: n.audio, durationMs: n.ms, marks: n.marks.map(([t, s, e]) => ({ t, s, e })) };
  if (track === originalTrack(story)) return { source: page.audioUrl, marks: page.marks, durationMs: page.durationMs };
  return {};
}
