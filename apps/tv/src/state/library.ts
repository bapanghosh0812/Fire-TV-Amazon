import { create } from 'zustand';
import type { Story } from '@storyloom/protocol';
import { LIBRARY } from '../data/library';

interface LibraryState {
  stories: Story[];
  upsert: (story: Story) => void;
  remove: (id: string) => void;
  get: (id: string) => Story | undefined;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  stories: LIBRARY,
  upsert: (story) =>
    set((s) => {
      const rest = s.stories.filter((x) => x.id !== story.id);
      return { stories: [story, ...rest] };
    }),
  remove: (id) => set((s) => ({ stories: s.stories.filter((x) => x.id !== id) })),
  get: (id) => get().stories.find((x) => x.id === id),
}));
