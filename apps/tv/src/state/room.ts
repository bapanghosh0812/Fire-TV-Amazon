import { create } from 'zustand';
import type { Mood, Player, RoomState, StoryLength, Thread, ThreadKind } from '@storyloom/protocol';

interface RoomStore {
  roomId?: string;
  code?: string;
  joinUrl?: string;
  connected: boolean;
  players: Player[];
  threads: Partial<Record<ThreadKind, Thread>>;
  mood: Mood;
  length: StoryLength;
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
  castVote: (playerId, option) => set((s) => ({ votes: { ...s.votes, [playerId]: option } })),
  resetVotes: () => set({ votes: {} }),
  setHeroProcessing: (heroProcessing) => set({ heroProcessing }),
  reset: () => set(initial),
}));
