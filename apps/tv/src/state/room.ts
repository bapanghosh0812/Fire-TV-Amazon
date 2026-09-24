import { create } from 'zustand';
import { DEFAULT_LANGUAGE, type Mood, type Player, type RoomState, type StoryLength, type Thread, type ThreadKind } from '@storyloom/protocol';

interface RoomStore {
  roomId?: string;
  code?: string;
  joinUrl?: string;
  connected: boolean;
  players: Player[];
  threads: Partial<Record<ThreadKind, Thread>>;
  mood: Mood;
  length: StoryLength;
  language: string;
  votes: Record<string, 'a' | 'b'>;
  heroProcessing?: { by: string; drawingUrl: string };
  setRoom: (room: Partial<RoomState> & { joinUrl?: string }) => void;
  setConnected: (connected: boolean) => void;
  addPlayer: (p: Player) => void;
  removePlayer: (id: string) => void;
  setThread: (t: Thread) => void;
  clearThread: (k: ThreadKind) => void;
  setMood: (m: Mood) => void;
  setLength: (l: StoryLength) => void;
  setLanguage: (code: string) => void;
  castVote: (playerId: string, option: 'a' | 'b') => void;
  resetVotes: () => void;
  setHeroProcessing: (v?: { by: string; drawingUrl: string }) => void;
  reset: () => void;
}

const initial = {
  roomId: undefined,
  code: undefined,
  joinUrl: undefined,
  connected: false,
  players: [] as Player[],
  threads: {},
  mood: 'cozy' as Mood,
  length: 'short' as StoryLength,
  language: DEFAULT_LANGUAGE,
  votes: {},
  heroProcessing: undefined,
};

export const useRoom = create<RoomStore>((set) => ({
  ...initial,
  setRoom: (room) =>
    set((s) => ({
      roomId: room.roomId ?? s.roomId,
      code: room.code ?? s.code,
      joinUrl: room.joinUrl ?? s.joinUrl,
      players: room.players ?? s.players,
      threads: room.threads ?? s.threads,
      mood: room.mood ?? s.mood,
      length: room.length ?? s.length,
      language: room.language ?? s.language,
    })),
  setConnected: (connected) => set({ connected }),
  addPlayer: (p) => set((s) => ({ players: [...s.players.filter((x) => x.id !== p.id), p] })),
  removePlayer: (id) => set((s) => ({ players: s.players.filter((x) => x.id !== id) })),
  setThread: (t) => set((s) => ({ threads: { ...s.threads, [t.kind]: t }, heroProcessing: t.kind === 'hero' ? undefined : s.heroProcessing })),
  clearThread: (k) =>
    set((s) => {
      const next = { ...s.threads };
      delete next[k];
      return { threads: next };
    }),
  setMood: (mood) => set({ mood }),
  setLength: (length) => set({ length }),
  setLanguage: (language) => set({ language }),
  castVote: (playerId, option) => set((s) => ({ votes: { ...s.votes, [playerId]: option } })),
  resetVotes: () => set({ votes: {} }),
  setHeroProcessing: (heroProcessing) => set({ heroProcessing }),
  reset: () => set(initial),
}));
