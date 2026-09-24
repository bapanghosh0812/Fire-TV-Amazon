import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type {
  ClientAction,
  CreateRoomResponse,
  HouseholdResponse,
  RoomEvent,
  Story,
  StorySummary,
  Thread,
} from '@storyloom/protocol';
import { config } from './config';
import { RoomSocket } from './socket';
import { useRoom } from '../state/room';
import { useWeave } from '../state/weave';
import { useLibrary } from '../state/library';
import { useToast } from '../state/toast';
import { useSettings } from '../state/settings';
import { translate } from '../i18n';
import RemoteControl from '../remote/RemoteControl';
import { RemoteKey } from '../remote/keys';

const DEVICE_KEY = 'storyloom.device';
let device: HouseholdResponse | undefined;
let socket: RoomSocket | undefined;
let tvToken: string | undefined;

const memory = new Map<string, string>();
const kv = {
  get: (k: string) => (Platform.OS === 'web' ? Promise.resolve(globalThis.localStorage?.getItem(k) ?? memory.get(k) ?? null) : SecureStore.getItemAsync(k)),
  set: (k: string, v: string) =>
    Platform.OS === 'web' ? Promise.resolve(void (globalThis.localStorage?.setItem(k, v) ?? memory.set(k, v))) : SecureStore.setItemAsync(k, v),
};

async function api<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { message?: string }).message ?? `Request failed (${res.status})`);
  return body as T;
}

/** Each TV is a household. The device token lives in the Android keystore. */
export async function ensureDevice(): Promise<HouseholdResponse> {
  if (device) return device;
  const saved = await kv.get(DEVICE_KEY);
  if (saved) return (device = JSON.parse(saved));
  device = await api<HouseholdResponse>('/households', { method: 'POST', body: '{}' });
  await kv.set(DEVICE_KEY, JSON.stringify(device));
  return device;
}

export async function syncBookshelf() {
  const d = await ensureDevice();
  const { stories } = await api<{ stories: StorySummary[] }>('/stories', { token: d.deviceToken });
  const lib = useLibrary.getState();
  for (const s of stories.reverse()) {
    const existing = lib.get(s.id);
    if (existing?.pages.length) continue;
    lib.upsert({
      id: s.id,
      title: s.title,
      summary: s.summary,
      coverUrl: s.coverUrl,
      palette: s.palette,
      mood: s.mood,
      ageBand: 'kid',
      hero: { kind: 'hero', by: 'tv', name: s.heroName, description: '' },
      world: { kind: 'world', by: 'tv', text: '' },
      spark: { kind: 'spark', by: 'tv', text: '' },
      pages: [],
      createdAt: s.createdAt,
      contributors: s.contributors ?? [],
      narrator: 'Ruth',
      status: s.status,
    });
  }
}

/** Fetches the full story (fresh signed URLs) when a bookshelf item is opened. */
export async function loadStory(id: string): Promise<Story> {
  const d = await ensureDevice();
  const { story } = await api<{ story: Story }>(`/stories/${id}`, { token: d.deviceToken });
  useLibrary.getState().upsert(story);
  return story;
}

export async function openCloudRoom(): Promise<void> {
  const d = await ensureDevice();
  const room = useRoom.getState();
  const res = await api<CreateRoomResponse>('/rooms', {
    method: 'POST',
    token: d.deviceToken,
    body: JSON.stringify({ mood: room.mood, length: room.length, language: room.language }),
  });
  tvToken = res.token;
  room.setRoom({ ...res.state, joinUrl: res.joinUrl });
  socket?.close();
  socket = new RoomSocket(`${res.socketUrl}?token=${encodeURIComponent(res.token)}`);
  socket.onStatus((up) => useRoom.getState().setConnected(up));
  socket.on(onEvent);
}

export function closeCloudRoom() {
  const { roomId } = useRoom.getState();
  if (roomId && tvToken) api(`/rooms/${roomId}/close`, { method: 'POST', token: tvToken, body: '{}' }).catch(() => {});
  socket?.close();
  socket = undefined;
  tvToken = undefined;
}

export async function startCloudWeave(): Promise<string> {
  const { roomId } = useRoom.getState();
  if (!roomId || !tvToken) throw new Error('Room is not ready');
  const { storyId } = await api<{ storyId: string }>(`/rooms/${roomId}/weave`, { method: 'POST', token: tvToken, body: '{}' });
  useWeave.getState().begin(storyId);
  return storyId;
}

export function sendAction(action: ClientAction) {
  socket?.send(action);
}

export function isRoomLive() {
  return !!socket;
}

const REMOTE: Record<string, RemoteKey> = {
  up: RemoteKey.Up,
  down: RemoteKey.Down,
  left: RemoteKey.Left,
  right: RemoteKey.Right,
  select: RemoteKey.Select,
  back: RemoteKey.Back,
  playpause: RemoteKey.PlayPause,
};

function onEvent(e: RoomEvent) {
  const room = useRoom.getState();
  switch (e.type) {
    case 'room.state':
      room.setRoom(e.room);
      break;
    case 'player.joined':
      room.addPlayer(e.player);
      useToast.getState().show(translate(useSettings.getState().language, 'toast.joined', { name: e.player.name }), e.player.color);
      break;
    case 'player.left':
      room.removePlayer(e.playerId);
      break;
    case 'thread.set':
      room.setThread(e.thread as Thread);
      break;
    case 'thread.clear':
      room.clearThread(e.kind);
      room.setHeroProcessing(undefined);
      break;
    case 'hero.processing':
      room.setHeroProcessing({ by: e.by, drawingUrl: e.drawingUrl });
      break;
    case 'weave.started':
      if (useWeave.getState().storyId !== e.storyId) useWeave.getState().begin(e.storyId);
      break;
    case 'weave.progress':
      useWeave.getState().progress(e.stage, e.message, e.pct);
      break;
    case 'page.ready':
      useWeave.getState().addPage(e.page);
      break;
    case 'story.ready':
      useLibrary.getState().upsert(e.story);
      useWeave.getState().progress('done', 'Your story is ready', 1);
      break;
    case 'story.failed':
      useWeave.getState().fail(translate(useSettings.getState().language, 'weave.failed'));
      break;
    case 'vote.cast':
      room.castVote(e.playerId, e.option);
      break;
    case 'remote.key':
      if (REMOTE[e.key]) RemoteControl.emit(REMOTE[e.key]);
      break;
    case 'error':
      useToast.getState().show(e.message);
      break;
  }
}
