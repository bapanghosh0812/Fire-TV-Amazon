import type { ClientAction, Story } from '@storyloom/protocol';
import { config, isOfflineDemo } from './config';
import { useRoom } from '../state/room';
import { useWeave } from '../state/weave';
import { useLibrary } from '../state/library';
import { LIBRARY } from '../data/library';

// Room lifecycle for the Story Studio. With a cloud configured this talks to
// the Storyloom API + realtime channel; without one it runs a local demo.

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O to avoid confusion

function localCode() {
  return Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
}

export async function openRoom() {
  const room = useRoom.getState();
  const { mood, length, language } = room; // chosen before the room opens (starter card, family language)
  room.reset();
  room.setRoom({ mood, length, language });
  if (isOfflineDemo) {
    const code = localCode();
    room.setRoom({ roomId: `local-${code}`, code, joinUrl: `${config.companionBaseUrl}/j/${code}` });
    return;
  }
  // Cloud implementation is wired in services/cloud.ts
  const { openCloudRoom } = await import('./cloud');
  await openCloudRoom();
}

export function closeRoom() {
  if (!isOfflineDemo) {
    import('./cloud').then((m) => m.closeCloudRoom()).catch(() => {});
  }
}

/** Mirrors a TV-side change to the phones (no-op in offline demo mode). */
export function syncToRoom(action: ClientAction) {
  if (isOfflineDemo) return;
  import('./cloud').then((m) => m.sendAction(action)).catch(() => {});
}

export async function startWeave(): Promise<string> {
  if (!isOfflineDemo) {
    const { startCloudWeave } = await import('./cloud');
    return startCloudWeave();
  }
  return startLocalWeave();
}

// ---- Offline demo engine -------------------------------------------------

const MOOD_TEMPLATE: Record<string, string> = {
  cozy: 'luna-lighthouse',
  silly: 'tiger-roar',
  adventure: 'pip-cloud-whales',
  curious: 'beep-garden',
};

function startLocalWeave(): string {
  const room = useRoom.getState();
  const weave = useWeave.getState();
  const base = LIBRARY.find((s) => s.id === MOOD_TEMPLATE[room.mood]) ?? LIBRARY[0];
  const storyId = `demo-${Date.now().toString(36)}`;
  weave.begin(storyId);

  const steps: [number, Parameters<typeof weave.progress>][] = [
    [900, ['plan', 'plan', 0.12]],
    [2000, ['safety', 'safety', 0.24]],
    [3000, ['write', 'write', 0.38]],
    [4300, ['paint', 'paint', 0.62]],
    [5900, ['voice', 'voice', 0.86]],
  ];
  steps.forEach(([ms, args]) => setTimeout(() => useWeave.getState().progress(...args), ms));

  setTimeout(() => {
    const story: Story = {
      ...base,
      id: storyId,
      createdAt: new Date().toISOString(),
      contributors: room.players.length ? room.players : base.contributors,
      status: 'ready',
      chosen: undefined,
    };
    useLibrary.getState().upsert(story);
    story.pages.forEach((p) => useWeave.getState().addPage(p));
    useWeave.getState().progress('done', 'Your story is ready', 1);
  }, 7600);

  return storyId;
}
