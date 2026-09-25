import { create } from 'zustand';
import type {
  ClientAction,
  Player,
  RoomEvent,
  RoomState,
  StoryChoice,
  StoryPage,
  WeaveStage,
} from '@storyloom/protocol';
import { isPreviewMode, loadConfig, joinRoom, requestUpload, submitHero, uploadDrawing } from './api';
import { prepareDrawing } from './image';
import { RoomSocket } from './transport';
import { t } from '../i18n';

export type Phase = 'join' | 'studio' | 'weaving' | 'reading' | 'vote' | 'end';

interface Session {
  phase: Phase;
  connected: boolean;
  me?: Player;
  token?: string;
  room?: RoomState;
  storyId?: string;
  weave: { stage: WeaveStage; message: string; pct: number };
  pages: StoryPage[];
  choice?: { storyId: string; choice: StoryChoice; closesAt: number };
  myVote?: 'a' | 'b';
  winner?: 'a' | 'b';
  heroBusy: boolean;
  toast?: string;
  playback?: { page: number; total: number };
  join: (code: string, name: string, color: string) => Promise<void>;
  send: (action: ClientAction) => void;
  sendDrawing: (file: File, heroName: string) => Promise<void>;
  vote: (option: 'a' | 'b') => void;
  flash: (msg: string) => void;
  leave: () => void;
}

let socket: RoomSocket | undefined;
const SAVED = 'storyloom.session';

export const useSession = create<Session>((set, get) => ({
  phase: 'join',
  connected: false,
  weave: { stage: 'plan', message: '', pct: 0 },
  pages: [],
  heroBusy: false,

  join: async (code, name, color) => {
    await loadConfig();
    if (isPreviewMode()) {
      startPreview(code, name, color);
      return;
    }
    const res = await joinRoom(code, name, color);
    sessionStorage.setItem(SAVED, JSON.stringify({ code, name, color }));
    set({ me: res.player, token: res.token, room: res.state, phase: 'studio' });
    socket?.close();
    socket = new RoomSocket(`${res.socketUrl}?token=${encodeURIComponent(res.token)}`);
    socket.onStatus((connected) => set({ connected }));
    socket.on(handleEvent);
  },

  send: (action) => {
    if (isPreviewMode()) return previewAction(action);
    socket?.send(action);
  },

  sendDrawing: async (file, heroName) => {
    const { room, token } = get();
    set({ heroBusy: true });
    try {
      const blob = await prepareDrawing(file);
      if (isPreviewMode()) {
        await new Promise((r) => setTimeout(r, 900));
        const url = URL.createObjectURL(blob);
        applyEvent({ type: 'hero.processing', by: get().me!.id, drawingUrl: url });
        setTimeout(
          () =>
            applyEvent({
              type: 'thread.set',
              thread: { kind: 'hero', by: get().me!.id, name: heroName || 'Our hero', description: 'a hero drawn by hand', drawingUrl: url },
            }),
          1800,
        );
        return;
      }
      const ticket = await requestUpload(room!.roomId, token!);
      await uploadDrawing(ticket, blob);
      await submitHero(room!.roomId, token!, ticket.key, heroName);
      if ('vibrate' in navigator) navigator.vibrate?.(30);
    } finally {
      set({ heroBusy: false });
    }
  },

  vote: (option) => {
    const { choice } = get();
    if (!choice) return;
    set({ myVote: option });
    if ('vibrate' in navigator) navigator.vibrate?.(25);
    get().send({ action: 'vote', storyId: choice.storyId, option });
  },

  flash: (toast) => {
    set({ toast });
    setTimeout(() => set((s) => (s.toast === toast ? { toast: undefined } : s)), 2600);
  },

  leave: () => {
    socket?.close();
    socket = undefined;
    sessionStorage.removeItem(SAVED);
    set({ phase: 'join', me: undefined, token: undefined, room: undefined, connected: false });
  },
}));

function handleEvent(e: RoomEvent) {
  applyEvent(e);
}

function applyEvent(e: RoomEvent) {
  const set = useSession.setState;
  const get = useSession.getState;
  const room = get().room;
  switch (e.type) {
    case 'room.state':
      set({ room: e.room });
      break;
    case 'player.joined':
      if (room) set({ room: { ...room, players: [...room.players.filter((p) => p.id !== e.player.id), e.player] } });
      break;
    case 'player.left':
      if (room) set({ room: { ...room, players: room.players.filter((p) => p.id !== e.playerId) } });
      break;
    case 'thread.set':
      if (room) set({ room: { ...room, threads: { ...room.threads, [e.thread.kind]: e.thread } } });
      break;
    case 'thread.clear':
      if (room) {
        const threads = { ...room.threads };
        delete threads[e.kind];
        set({ room: { ...room, threads } });
      }
      break;
    case 'weave.started':
      set({ phase: 'weaving', storyId: e.storyId, pages: [], myVote: undefined, winner: undefined, weave: { stage: 'plan', message: 'Gathering everyone’s threads…', pct: 0.02 } });
      break;
    case 'weave.progress':
      set({ weave: { stage: e.stage, message: e.message, pct: e.pct } });
      break;
    case 'page.ready':
      set((s) => ({ pages: [...s.pages, e.page] }));
      break;
    case 'story.ready':
      set({ phase: 'reading' });
      break;
    case 'choice.open':
      set({ phase: 'vote', choice: { storyId: e.storyId, choice: e.choice, closesAt: e.closesAt }, myVote: undefined, winner: undefined });
      break;
    case 'choice.closed':
      set({ winner: e.winner });
      setTimeout(() => set({ phase: 'reading' }), 2200);
      break;
    case 'playback':
      set({ playback: { page: e.page, total: e.total } });
      break;
    case 'room.closed':
      socket?.close();
      socket = undefined;
      set({ phase: 'join', room: undefined, me: undefined, token: undefined, connected: false });
      get().flash(t('roomClosed'));
      break;
    case 'story.failed':
      set({ phase: 'studio' });
      get().flash(t('tangled'));
      break;
    case 'error':
      get().flash(e.message);
      break;
  }
}

// ---- Preview mode: a pretend TV so the phone UI can be tried without the cloud.

function startPreview(code: string, name: string, color: string) {
  const me: Player = { id: 'me', name, color, avatar: 'fox' };
  useSession.setState({
    me,
    token: 'preview',
    connected: true,
    phase: 'studio',
    room: {
      roomId: 'preview',
      code: code.toUpperCase(),
      players: [{ id: 'mom', name: 'Mom', color: '#B69CFF', avatar: 'deer' }, me],
      threads: {},
      mood: 'cozy',
      length: 'short',
      ageBand: 'kid',
    },
  });
}

function previewAction(action: ClientAction) {
  const me = useSession.getState().me!;
  if (action.action === 'thread.set') {
    applyEvent({ type: 'thread.set', thread: { ...action.thread, by: me.id } as never });
  }
  if (action.action === 'vote') {
    setTimeout(() => applyEvent({ type: 'choice.closed', storyId: action.storyId, winner: action.option, tally: { a: action.option === 'a' ? 2 : 1, b: action.option === 'b' ? 2 : 1 } }), 1200);
  }
}

export function previewPlay() {
  const steps: [number, RoomEvent][] = [
    [0, { type: 'weave.started', storyId: 'preview-story' }],
    [900, { type: 'weave.progress', storyId: 'preview-story', stage: 'write', message: 'Writing page by page…', pct: 0.3 }],
    [2000, { type: 'weave.progress', storyId: 'preview-story', stage: 'paint', message: 'Painting the pictures…', pct: 0.6 }],
    [3200, { type: 'weave.progress', storyId: 'preview-story', stage: 'voice', message: 'Recording the narrator…', pct: 0.85 }],
    [4200, { type: 'story.ready', story: {} as never }],
    [6500, {
      type: 'choice.open',
      storyId: 'preview-story',
      closesAt: Date.now() + 26000,
      choice: {
        afterPage: 3,
        prompt: 'How should Luna bring the light back?',
        options: [
          { id: 'a', label: 'Ask the comets for help' },
          { id: 'b', label: 'Use her own dragon fire' },
        ],
      },
    }],
  ];
  steps.forEach(([ms, e]) => setTimeout(() => applyEvent(e), ms));
}
