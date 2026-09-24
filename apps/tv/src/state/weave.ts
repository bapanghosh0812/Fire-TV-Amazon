import { create } from 'zustand';
import type { StoryPage, WeaveStage } from '@storyloom/protocol';

interface WeaveStore {
  storyId?: string;
  stage: WeaveStage;
  pct: number;
  message: string;
  pages: StoryPage[];
  error?: string;
  begin: (storyId: string) => void;
  progress: (stage: WeaveStage, message: string, pct: number) => void;
  addPage: (page: StoryPage) => void;
  fail: (reason: string) => void;
}

export const useWeave = create<WeaveStore>((set) => ({
  stage: 'plan',
  pct: 0,
  message: '',
  pages: [],
  begin: (storyId) => set({ storyId, stage: 'plan', pct: 0, message: 'Gathering everyone’s threads…', pages: [], error: undefined }),
  progress: (stage, message, pct) => set({ stage, message, pct }),
  addPage: (page) => set((s) => ({ pages: [...s.pages.filter((p) => !(p.index === page.index && p.branch === page.branch)), page] })),
  fail: (error) => set({ error }),
}));
