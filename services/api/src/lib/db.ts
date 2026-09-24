import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Player, RoomState, Story, Thread } from '@storyloom/protocol';
import { env } from './env';

// Single-table design:
//   HH#{household}      META                 household + parent settings
//   HH#{household}      STORY#{ts}#{id}      bookshelf entry (summary)
//   STORY#{id}          META                 full story document
//   ROOM#{room}         META                 room state (TTL 6h)
//   ROOM#{room}         CONN#{connection}    live sockets in the room
//   CODE#{code}         CODE                 4-letter join code -> room (TTL)
//   CONN#{connection}   CONN                 socket -> room/player (TTL)
//   RATE#{scope}#{ip}   RATE                 rolling request counter (TTL)

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const T = () => env.table;
export const now = () => new Date().toISOString();
export const ttlIn = (seconds: number) => Math.floor(Date.now() / 1000) + seconds;

export interface RoomItem {
  roomId: string;
  code: string;
  householdId: string;
  players: Player[];
  threads: RoomState['threads'];
  mood: RoomState['mood'];
  length: RoomState['length'];
  ageBand: RoomState['ageBand'];
  language?: string;
  storyId?: string;
  votes?: Record<string, 'a' | 'b'>;
  createdAt: string;
}

export async function getRoom(roomId: string) {
  const r = await ddb.send(new GetCommand({ TableName: T(), Key: { pk: `ROOM#${roomId}`, sk: 'META' } }));
  return r.Item as (RoomItem & { pk: string }) | undefined;
}

export async function putRoom(room: RoomItem) {
  await ddb.send(new PutCommand({ TableName: T(), Item: { pk: `ROOM#${room.roomId}`, sk: 'META', ...room, ttl: ttlIn(6 * 3600) } }));
}

export async function claimCode(code: string, roomId: string) {
  try {
    await ddb.send(
      new PutCommand({
        TableName: T(),
        Item: { pk: `CODE#${code}`, sk: 'CODE', roomId, ttl: ttlIn(6 * 3600) },
        ConditionExpression: 'attribute_not_exists(pk) OR #ttl < :now',
        ExpressionAttributeNames: { '#ttl': 'ttl' },
        ExpressionAttributeValues: { ':now': Math.floor(Date.now() / 1000) },
      }),
    );
    return true;
  } catch (e) {
    if ((e as Error).name === 'ConditionalCheckFailedException') return false;
    throw e;
  }
}

export async function roomForCode(code: string) {
  const r = await ddb.send(new GetCommand({ TableName: T(), Key: { pk: `CODE#${code}`, sk: 'CODE' } }));
  const item = r.Item as { roomId: string; ttl: number } | undefined;
  if (!item || item.ttl < Date.now() / 1000) return undefined;
  return item.roomId;
}

export async function releaseCode(code: string) {
  await ddb.send(new DeleteCommand({ TableName: T(), Key: { pk: `CODE#${code}`, sk: 'CODE' } }));
}

export async function addPlayer(roomId: string, player: Player, maxPlayers: number) {
  await ddb.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: `ROOM#${roomId}`, sk: 'META' },
      UpdateExpression: 'SET players = list_append(players, :p)',
      ConditionExpression: 'attribute_exists(pk) AND size(players) < :max',
      ExpressionAttributeValues: { ':p': [player], ':max': maxPlayers },
    }),
  );
}

export async function setThread(roomId: string, thread: Thread) {
  await ddb.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: `ROOM#${roomId}`, sk: 'META' },
      UpdateExpression: 'SET threads.#k = :t',
      ConditionExpression: 'attribute_exists(pk)',
      ExpressionAttributeNames: { '#k': thread.kind },
      ExpressionAttributeValues: { ':t': thread },
    }),
  );
}

export async function updateRoom(roomId: string, patch: Partial<RoomItem>) {
  const keys = Object.keys(patch) as (keyof RoomItem)[];
  if (!keys.length) return;
  await ddb.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: `ROOM#${roomId}`, sk: 'META' },
      UpdateExpression: 'SET ' + keys.map((k, i) => `#k${i} = :v${i}`).join(', '),
      ConditionExpression: 'attribute_exists(pk)',
      ExpressionAttributeNames: Object.fromEntries(keys.map((k, i) => [`#k${i}`, k])),
      ExpressionAttributeValues: Object.fromEntries(keys.map((k, i) => [`:v${i}`, patch[k]])),
    }),
  );
}

// ---- connections ----

export interface ConnItem {
  connectionId: string;
  roomId: string;
  role: 'tv' | 'player';
  playerId: string;
}

export async function putConnection(c: ConnItem) {
  const ttl = ttlIn(6 * 3600);
  await ddb.send(
    new BatchWriteCommand({
      RequestItems: {
        [T()]: [
          { PutRequest: { Item: { pk: `CONN#${c.connectionId}`, sk: 'CONN', ...c, ttl } } },
          { PutRequest: { Item: { pk: `ROOM#${c.roomId}`, sk: `CONN#${c.connectionId}`, ...c, ttl } } },
        ],
      },
    }),
  );
}

export async function getConnection(connectionId: string) {
  const r = await ddb.send(new GetCommand({ TableName: T(), Key: { pk: `CONN#${connectionId}`, sk: 'CONN' } }));
  return r.Item as ConnItem | undefined;
}

export async function deleteConnection(c: Pick<ConnItem, 'connectionId' | 'roomId'>) {
  await ddb.send(
    new BatchWriteCommand({
      RequestItems: {
        [T()]: [
          { DeleteRequest: { Key: { pk: `CONN#${c.connectionId}`, sk: 'CONN' } } },
          { DeleteRequest: { Key: { pk: `ROOM#${c.roomId}`, sk: `CONN#${c.connectionId}` } } },
        ],
      },
    }),
  );
}

export async function roomConnections(roomId: string) {
  const r = await ddb.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :c)',
      ExpressionAttributeValues: { ':pk': `ROOM#${roomId}`, ':c': 'CONN#' },
    }),
  );
  return (r.Items ?? []) as ConnItem[];
}

// ---- households & stories ----

export interface HouseholdSettings {
  ageBand: RoomState['ageBand'];
  gentleMode: boolean;
  narrator: string;
  keepDrawings: boolean;
  language?: string;
}

export const DEFAULT_SETTINGS: HouseholdSettings = { ageBand: 'kid', gentleMode: true, narrator: 'Ruth', keepDrawings: false, language: 'en-US' };

export async function putHousehold(householdId: string) {
  await ddb.send(
    new PutCommand({
      TableName: T(),
      Item: { pk: `HH#${householdId}`, sk: 'META', householdId, settings: DEFAULT_SETTINGS, createdAt: now(), storiesToday: 0 },
      ConditionExpression: 'attribute_not_exists(pk)',
    }),
  );
}

export async function getHousehold(householdId: string) {
  const r = await ddb.send(new GetCommand({ TableName: T(), Key: { pk: `HH#${householdId}`, sk: 'META' } }));
  return r.Item as { householdId: string; settings: HouseholdSettings; quotaDay?: string; storiesToday?: number } | undefined;
}

export async function updateSettings(householdId: string, settings: HouseholdSettings) {
  await ddb.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: `HH#${householdId}`, sk: 'META' },
      UpdateExpression: 'SET settings = :s',
      ConditionExpression: 'attribute_exists(pk)',
      ExpressionAttributeValues: { ':s': settings },
    }),
  );
}

/** Daily story quota per household: protects families' screen time and our AI budget. */
export async function takeStoryQuota(householdId: string, limit: number) {
  const day = new Date().toISOString().slice(0, 10);
  const key = { pk: `HH#${householdId}`, sk: 'META' };
  const failed = (e: unknown) => {
    if ((e as Error).name === 'ConditionalCheckFailedException') return false;
    throw e;
  };
  // Same day: increment while under the limit.
  const sameDay = await ddb
    .send(
      new UpdateCommand({
        TableName: T(),
        Key: key,
        UpdateExpression: 'SET storiesToday = storiesToday + :one',
        ConditionExpression: 'quotaDay = :d AND storiesToday < :lim',
        ExpressionAttributeValues: { ':d': day, ':one': 1, ':lim': limit },
      }),
    )
    .then(() => true, failed);
  if (sameDay) return true;
  // First story of a new day: start the counter at 1.
  return ddb
    .send(
      new UpdateCommand({
        TableName: T(),
        Key: key,
        UpdateExpression: 'SET quotaDay = :d, storiesToday = :one',
        ConditionExpression: 'attribute_exists(pk) AND (attribute_not_exists(quotaDay) OR quotaDay <> :d)',
        ExpressionAttributeValues: { ':d': day, ':one': 1 },
      }),
    )
    .then(() => true, failed);
}

export async function putStory(householdId: string, story: Story) {
  const summary = {
    id: story.id,
    title: story.title,
    summary: story.summary,
    coverKey: (story as Story & { coverKey?: string }).coverKey,
    palette: story.palette,
    mood: story.mood,
    createdAt: story.createdAt,
    status: story.status,
    heroName: story.hero.name,
    contributors: story.contributors,
  };
  await ddb.send(
    new BatchWriteCommand({
      RequestItems: {
        [T()]: [
          { PutRequest: { Item: { pk: `STORY#${story.id}`, sk: 'META', householdId, ...story } } },
          { PutRequest: { Item: { pk: `HH#${householdId}`, sk: `STORY#${story.createdAt}#${story.id}`, ...summary } } },
        ],
      },
    }),
  );
}

export async function getStory(storyId: string) {
  const r = await ddb.send(new GetCommand({ TableName: T(), Key: { pk: `STORY#${storyId}`, sk: 'META' } }));
  return r.Item as (Story & { householdId: string }) | undefined;
}

export async function listStories(householdId: string, limit = 60) {
  const r = await ddb.send(
    new QueryCommand({
      TableName: T(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :s)',
      ExpressionAttributeValues: { ':pk': `HH#${householdId}`, ':s': 'STORY#' },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (r.Items ?? []) as Array<Record<string, unknown> & { id: string; createdAt: string; coverKey?: string }>;
}

export async function deleteStory(householdId: string, storyId: string, createdAt: string) {
  await ddb.send(
    new BatchWriteCommand({
      RequestItems: {
        [T()]: [
          { DeleteRequest: { Key: { pk: `STORY#${storyId}`, sk: 'META' } } },
          { DeleteRequest: { Key: { pk: `HH#${householdId}`, sk: `STORY#${createdAt}#${storyId}` } } },
        ],
      },
    }),
  );
}

export async function setChosen(storyId: string, winner: 'a' | 'b') {
  await ddb.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: `STORY#${storyId}`, sk: 'META' },
      UpdateExpression: 'SET chosen = :w',
      ConditionExpression: 'attribute_exists(pk)',
      ExpressionAttributeValues: { ':w': winner },
    }),
  );
}

// ---- rate limiting ----

/** Fixed-window counter per IP; returns false once the window's limit is hit. */
export async function rateLimit(scope: string, ip: string, limit: number, windowSeconds: number) {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: `RATE#${scope}#${ip}`, sk: `W#${window}` },
        UpdateExpression: 'SET #ttl = :ttl ADD hits :one',
        ConditionExpression: 'attribute_not_exists(hits) OR hits < :lim',
        ExpressionAttributeNames: { '#ttl': 'ttl' },
        ExpressionAttributeValues: { ':one': 1, ':lim': limit, ':ttl': ttlIn(windowSeconds * 2) },
      }),
    );
    return true;
  } catch (e) {
    if ((e as Error).name === 'ConditionalCheckFailedException') return false;
    throw e;
  }
}
