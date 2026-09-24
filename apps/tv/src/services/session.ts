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
  room.reset();
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
    [900, ['plan', 'Planning the adventure…', 0.12]],
    [2200, ['write', 'Writing page by page…', 0.3]],
    [3600, ['paint', 'Painting the pictures…', 0.55]],
    [5200, ['voice', 'Recording the narrator…', 0.78]],
    [6400, ['safety', 'Checking it’s just right for little ears…', 0.92]],
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
