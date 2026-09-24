import type { APIGatewayProxyWebsocketEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import type { ClientAction, RoomEvent, Thread } from '@storyloom/protocol';
import { verify } from '../lib/auth';
import { broadcast, sendTo } from '../lib/broadcast';
import {
  deleteConnection,
  getConnection,
  getRoom,
  getStory,
  putConnection,
  setChosen,
  setThread,
  updateRoom,
  type ConnItem,
} from '../lib/db';
import { isKidSafe } from '../lib/guard';
import { cleanText } from '../lib/http';

type WsEvent = APIGatewayProxyWebsocketEventV2 & { queryStringParameters?: Record<string, string> };

const ok: APIGatewayProxyResultV2 = { statusCode: 200, body: '' };

export async function main(event: WsEvent): Promise<APIGatewayProxyResultV2> {
  const { routeKey, connectionId } = event.requestContext;
  try {
    if (routeKey === '$connect') return await connect(event, connectionId);
    if (routeKey === '$disconnect') {
      const c = await getConnection(connectionId);
      if (c) await deleteConnection(c);
      return ok;
    }
    const conn = await getConnection(connectionId);
    if (!conn) return { statusCode: 403, body: 'Unknown connection' };
    const raw = event.body ?? '';
    if (raw.length > 8192) return ok;
    let action: ClientAction;
    try {
      action = JSON.parse(raw);
    } catch {
      return ok;
    }
    await handle(conn, action);
    return ok;
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', routeKey, message: (err as Error).message }));
    return { statusCode: 500, body: 'error' };
  }
}

async function connect(event: WsEvent, connectionId: string) {
  let claims;
  try {
    claims = await verify(event.queryStringParameters?.token);
  } catch {
    return { statusCode: 401, body: 'Unauthorized' };
  }
  if (claims.typ !== 'tv' && claims.typ !== 'player') return { statusCode: 403, body: 'Forbidden' };
  const room = await getRoom(claims.room);
  if (!room) return { statusCode: 404, body: 'Room closed' };
  await putConnection({
    connectionId,
    roomId: claims.room,
    role: claims.typ === 'tv' ? 'tv' : 'player',
    playerId: claims.typ === 'tv' ? 'tv' : claims.sub,
  });
  return ok;
}

const reply = (conn: ConnItem, event: RoomEvent) => sendTo(conn, event);

async function handle(conn: ConnItem, action: ClientAction) {
  const isTv = conn.role === 'tv';

  switch (action.action) {
    case 'ping':
      return;

    case 'sync': {
      const room = await getRoom(conn.roomId);
      if (!room) return reply(conn, { type: 'room.closed' });
      const { roomId, code, players, threads, mood, length, ageBand, storyId } = room;
      return reply(conn, { type: 'room.state', room: { roomId, code, players, threads, mood, length, ageBand, storyId } });
    }

    case 'thread.set': {
      const t = action.thread as Partial<Thread>;
      if (t.kind === 'hero') {
        // Drawn heroes arrive via the drawing pipeline; the TV may pick a preset hero.
        const h = t as { name?: string; description?: string; presetId?: string };
        if (!isTv || !h.presetId) return;
        const hero: Thread = {
          kind: 'hero',
          by: 'tv',
          name: cleanText(h.name, 24),
          description: cleanText(h.description, 120),
          presetId: cleanText(h.presetId, 20),
        };
        if (!(await isKidSafe(`${hero.name} ${hero.description}`))) return;
        await setThread(conn.roomId, hero);
        return broadcast(conn.roomId, { type: 'thread.set', thread: hero });
      }
      if (t.kind !== 'world' && t.kind !== 'spark') return;
      const text = cleanText((t as { text?: string }).text, 140);
      if (!text) return;
      if (!(await isKidSafe(text))) {
        return reply(conn, { type: 'error', message: 'Hmm, let’s try a different idea for a family story.' });
      }
      const thread: Thread = { kind: t.kind, by: conn.playerId, text, presetId: cleanText((t as { presetId?: string }).presetId, 20) || undefined };
      await setThread(conn.roomId, thread);
      return broadcast(conn.roomId, { type: 'thread.set', thread });
    }

    case 'thread.clear': {
      if (!isTv) return;
      const room = await getRoom(conn.roomId);
      if (!room) return;
      const threads = { ...room.threads };
      delete threads[action.kind];
      await updateRoom(conn.roomId, { threads });
      return broadcast(conn.roomId, { type: 'thread.clear', kind: action.kind });
    }

    case 'settings': {
      if (!isTv) return;
      const patch: Record<string, string> = {};
      if (action.mood && ['cozy', 'adventure', 'silly', 'curious'].includes(action.mood)) patch.mood = action.mood;
      if (action.length && ['short', 'medium'].includes(action.length)) patch.length = action.length;
      await updateRoom(conn.roomId, patch);
      const room = await getRoom(conn.roomId);
      if (!room) return;
      const { roomId, code, players, threads, mood, length, ageBand, storyId } = room;
      return broadcast(conn.roomId, { type: 'room.state', room: { roomId, code, players, threads, mood, length, ageBand, storyId } });
    }

    case 'vote': {
      if (action.option !== 'a' && action.option !== 'b') return;
      return broadcast(conn.roomId, { type: 'vote.cast', storyId: action.storyId, playerId: conn.playerId, option: action.option });
    }

    case 'remote': {
      const keys = ['up', 'down', 'left', 'right', 'select', 'back', 'playpause'];
      if (isTv || !keys.includes(action.key)) return;
      return broadcast(conn.roomId, { type: 'remote.key', key: action.key }, { only: 'tv' });
    }

    case 'choice.open': {
      if (!isTv) return;
      const story = await getStory(action.storyId);
      if (!story?.choice) return;
      const closesAt = Math.min(Number(action.closesAt) || Date.now() + 20000, Date.now() + 60000);
      // Phones get the options with the same signed images the TV shows.
      const { withSignedUrls } = await import('../lib/media');
      const signed = await withSignedUrls(story as never);
      return broadcast(conn.roomId, { type: 'choice.open', storyId: story.id, choice: signed.choice!, closesAt }, { only: 'player' });
    }

    case 'choice.decided': {
      if (!isTv || (action.winner !== 'a' && action.winner !== 'b')) return;
      await setChosen(action.storyId, action.winner).catch(() => {});
      return broadcast(conn.roomId, { type: 'choice.closed', storyId: action.storyId, winner: action.winner, tally: { a: 0, b: 0 } }, { only: 'player' });
    }

    case 'playback': {
      if (!isTv) return;
      return broadcast(conn.roomId, { type: 'playback', storyId: action.storyId, page: action.page, total: action.total }, { only: 'player' });
    }
  }
}
