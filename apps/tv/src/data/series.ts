import type { Story } from '@storyloom/protocol';
import type { StringKey } from '../i18n';
import type { IconName } from '../components/Icon';
import en from './stories/en.json';
import { LIBRARY } from './library';

// Storyloom Originals: episodic series that continue the bookshelf's characters.
// Episode text lives in data/stories/<lang>.json like every bookshelf story, so
// the player's audio and subtitle menus work the same way for them.

type StoryText = { title: string; summary: string; pages: Record<string, string> };
const TEXT = en as Record<string, StoryText>;

export interface Series {
  id: string;
  title: StringKey;
  blurb: StringKey;
  icon: IconName;
  learn?: boolean;
  episodes: string[]; // story ids, in order
}

export const SERIES: Series[] = [
  { id: 'luna', title: 'series.luna.title', blurb: 'series.luna.blurb', icon: 'moon', episodes: ['luna-lighthouse', 'luna-sleepy-comet', 'luna-moon-garden'] },
  { id: 'pip', title: 'series.pip.title', blurb: 'series.pip.blurb', icon: 'globe', episodes: ['pip-cloud-whales', 'pip-rainbow-map', 'pip-thunder-drum'] },
  { id: 'beep', title: 'series.beep.title', blurb: 'series.beep.blurb', icon: 'bolt', learn: true, episodes: ['beep-garden', 'beep-moon-faces', 'beep-rainbow-recipe'] },
  { id: 'raja', title: 'series.raja.title', blurb: 'series.raja.blurb', icon: 'sparkle', episodes: ['tiger-roar', 'raja-banana-race'] },
];

// New episodes borrow their series' look and characters from the first episode.
const NEW_EPISODES: [id: string, series: string, createdAt: string][] = [
  ['luna-sleepy-comet', 'luna', '2026-09-24T19:00:00Z'],
  ['luna-moon-garden', 'luna', '2026-09-25T19:00:00Z'],
  ['pip-rainbow-map', 'pip', '2026-09-23T17:00:00Z'],
  ['pip-thunder-drum', 'pip', '2026-09-25T17:00:00Z'],
  ['beep-moon-faces', 'beep', '2026-09-24T18:00:00Z'],
  ['beep-rainbow-recipe', 'beep', '2026-09-25T18:00:00Z'],
  ['raja-banana-race', 'raja', '2026-09-25T16:00:00Z'],
];

function build(id: string, seriesId: string, createdAt: string): Story {
  const first = LIBRARY.find((s) => s.id === SERIES.find((x) => x.id === seriesId)!.episodes[0])!;
  const text = TEXT[id];
  return {
    ...first,
    id,
    title: text.title,
    summary: text.summary,
    createdAt,
    contributors: [],
    choice: undefined,
    chosen: undefined,
    pages: Object.entries(text.pages).map(([k, t]) => ({ index: Number(k), text: t })),
  };
}

export const EPISODES: Story[] = NEW_EPISODES.map(([id, series, at]) => build(id, series, at));

const ALL = new Map<string, Story>([...LIBRARY, ...EPISODES].map((s) => [s.id, s]));

/** Any bookshelf story or series episode by id. */
export function catalogStory(id: string): Story | undefined {
  return ALL.get(id);
}

export function seriesOf(storyId: string): { series: Series; episode: number } | undefined {
  for (const series of SERIES) {
    const i = series.episodes.indexOf(storyId);
    if (i >= 0) return { series, episode: i + 1 };
  }
  return undefined;
}

export function nextEpisode(storyId: string): Story | undefined {
  const found = seriesOf(storyId);
  if (!found) return undefined;
  const next = found.series.episodes[found.episode];
  return next ? catalogStory(next) : undefined;
}

/** The newest episodes across all series, for the "New episodes" row. */
export function newEpisodes(): Story[] {
  return [...EPISODES].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
