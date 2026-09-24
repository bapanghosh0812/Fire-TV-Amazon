import {
  ApiGatewayManagementApiClient,
  GoneException,
  PostToConnectionCommand,
} from '@aws-sdk/client-apigatewaymanagementapi';
import type { RoomEvent } from '@storyloom/protocol';
import { deleteConnection, roomConnections, type ConnItem } from './db';
import { env } from './env';

let client: ApiGatewayManagementApiClient | undefined;
const api = () => (client ??= new ApiGatewayManagementApiClient({ endpoint: env.wsEndpoint }));

export async function sendTo(conn: Pick<ConnItem, 'connectionId' | 'roomId'>, event: RoomEvent) {
  try {
    await api().send(new PostToConnectionCommand({ ConnectionId: conn.connectionId, Data: Buffer.from(JSON.stringify(event)) }));
  } catch (e) {
    if (e instanceof GoneException || (e as Error).name === 'GoneException') await deleteConnection(conn);
    else throw e;
  }
}

/** Sends an event to everyone in the room (optionally filtered by role). */
export async function broadcast(roomId: string, event: RoomEvent, opts: { only?: 'tv' | 'player'; except?: string } = {}) {
  const conns = await roomConnections(roomId);
  await Promise.all(
    conns
      .filter((c) => (!opts.only || c.role === opts.only) && c.connectionId !== opts.except)
      .map((c) => sendTo(c, event).catch((err) => console.warn('broadcast failed', c.connectionId, (err as Error).message))),
  );
}
