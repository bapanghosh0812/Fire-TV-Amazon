import { randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import {
  THREAD_COLORS,
  type CreateRoomResponse,
  type HouseholdResponse,
  type JoinResponse,
  type Mood,
  type Player,
  type RoomState,
  type Story,
  type StoryLength,
  type StorySummary,
} from '@storyloom/protocol';
import { bearer, sign, verify, type Claims } from '../lib/auth';
import { broadcast } from '../lib/broadcast';
import { newRoomCode, isValidCode } from '../lib/codes';
import {
  DEFAULT_SETTINGS,
  addPlayer,
  claimCode,
  deleteStory,
  getHousehold,
  getRoom,
  getStory,
  listStories,
  now,
  putHousehold,
  putRoom,
  putStory,
  rateLimit,
  releaseCode,
  roomForCode,
  takeStoryQuota,
  updateRoom,
  updateSettings,
  ddb,
  type HouseholdSettings,
  type RoomItem,
} from '../lib/db';
import { env } from '../lib/env';
import { isKidSafe } from '../lib/guard';
import { HttpError, clientIp, cleanText, handler, json, parseBody } from '../lib/http';
import { drawingUploadTicket, objectExists, s3, signedMediaUrl, withSignedUrls } from '../lib/media';
import { runAgent } from '../lib/agent';
import { QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const MAX_PLAYERS = 8;
const STORIES_PER_DAY = 12;
const MOODS: Mood[] = ['cozy', 'adventure', 'silly', 'curious'];
const LENGTHS: StoryLength[] = ['short', 'medium'];

type Event = APIGatewayProxyEventV2;

async function claims(event: Event) {
  return verify(bearer(event.headers as Record<string, string>));
}

function need<T extends Claims['typ']>(c: Claims, ...types: T[]): Extract<Claims, { typ: T }> {
  if (!types.includes(c.typ as T)) throw new HttpError(403, 'Not allowed');
  return c as Extract<Claims, { typ: T }>;
}

function roomState(r: RoomItem): RoomState {
  return {
    roomId: r.roomId,
    code: r.code,
    players: r.players,
    threads: r.threads,
    mood: r.mood,
    length: r.length,
    ageBand: r.ageBand,
    storyId: r.storyId,
  };
}

async function roomFor(c: Claims, roomId: string) {
  if ((c.typ === 'tv' || c.typ === 'player') && c.room !== roomId) throw new HttpError(403, 'Not your room');
  const room = await getRoom(roomId);
  if (!room) throw new HttpError(404, 'This story room has closed. Scan the TV again.');
  return room;
}

// ---------------------------------------------------------------------------

async function createHousehold(event: Event) {
  if (!(await rateLimit('hh', clientIp(event), 10, 3600))) throw new HttpError(429, 'Too many new devices. Try again later.');
  const householdId = randomUUID();
  await putHousehold(householdId);
  const deviceToken = await sign({ typ: 'device', sub: householdId }, '400d');
  return json(201, { householdId, deviceToken } satisfies HouseholdResponse);
}

async function household(event: Event) {
  const c = need(await claims(event), 'device');
  const hh = await getHousehold(c.sub);
  if (!hh) throw new HttpError(404, 'Household not found');
  return json(200, { householdId: hh.householdId, settings: { ...DEFAULT_SETTINGS, ...hh.settings }, storiesToday: hh.storiesToday ?? 0 });
}

async function saveSettings(event: Event) {
  const c = need(await claims(event), 'device');
  const body = parseBody<Partial<HouseholdSettings>>(event);
  const hh = await getHousehold(c.sub);
  if (!hh) throw new HttpError(404, 'Household not found');
  const next: HouseholdSettings = {
    ageBand: ['little', 'kid', 'big-kid'].includes(body.ageBand as string) ? body.ageBand! : hh.settings.ageBand,
    gentleMode: typeof body.gentleMode === 'boolean' ? body.gentleMode : hh.settings.gentleMode,
    narrator: typeof body.narrator === 'string' ? cleanText(body.narrator, 20) : hh.settings.narrator,
    keepDrawings: typeof body.keepDrawings === 'boolean' ? body.keepDrawings : hh.settings.keepDrawings,
  };
  await updateSettings(c.sub, next);
  return json(200, { settings: next });
}

async function createRoom(event: Event) {
  const c = need(await claims(event), 'device');
  const hh = await getHousehold(c.sub);
  if (!hh) throw new HttpError(404, 'Household not found');
  const body = parseBody<{ mood?: Mood; length?: StoryLength }>(event);

  const roomId = randomUUID();
  let code = newRoomCode();
  for (let i = 0; i < 6 && !(await claimCode(code, roomId)); i++) code = newRoomCode();

  const room: RoomItem = {
    roomId,
    code,
    householdId: c.sub,
    players: [],
    threads: {},
    mood: MOODS.includes(body.mood!) ? body.mood! : 'cozy',
    length: LENGTHS.includes(body.length!) ? body.length! : 'short',
    ageBand: hh.settings.ageBand,
    createdAt: now(),
  };
  await putRoom(room);
  const token = await sign({ typ: 'tv', sub: c.sub, room: roomId }, '6h');
  return json(201, {
    roomId,
    code,
    joinUrl: `${env.companionUrl}/j/${code}`,
    token,
    socketUrl: env.wsUrl,
    state: roomState(room),
  } satisfies CreateRoomResponse);
}

async function joinRoom(event: Event, codeParam: string) {
  const ip = clientIp(event);
  if (!(await rateLimit('join', ip, 30, 600))) throw new HttpError(429, 'Too many tries. Wait a few minutes and try again.');
  const code = codeParam.toUpperCase();
  if (!isValidCode(code)) throw new HttpError(400, 'That code doesn’t look right. It’s 4 letters on the TV.');
  const roomId = await roomForCode(code);
  if (!roomId) throw new HttpError(404, 'We couldn’t find that code. Check the TV and try again.');
  const room = await getRoom(roomId);
  if (!room) throw new HttpError(404, 'This story room has closed.');

  const body = parseBody<{ name?: string; color?: string }>(event);
  const name = cleanText(body.name, 16) || 'Friend';
  if (!(await isKidSafe(name))) throw new HttpError(400, 'Let’s pick a different name.');
  const taken = new Set(room.players.map((p) => p.color));
  const color = THREAD_COLORS.includes(body.color as never) && !taken.has(body.color!) ? body.color! : THREAD_COLORS.find((c) => !taken.has(c)) ?? THREAD_COLORS[0];

  const player: Player = { id: randomUUID(), name, color, avatar: 'initial' };
  try {
    await addPlayer(roomId, player, MAX_PLAYERS);
  } catch (e) {
    if ((e as Error).name === 'ConditionalCheckFailedException') throw new HttpError(409, 'This story is full (8 people).');
    throw e;
  }
  await broadcast(roomId, { type: 'player.joined', player });
  const token = await sign({ typ: 'player', sub: player.id, room: roomId, hh: room.householdId }, '6h');
  const state = roomState({ ...room, players: [...room.players, player] });
  return json(200, { roomId, code, player, token, socketUrl: env.wsUrl, state } satisfies JoinResponse);
}

async function drawingTicket(event: Event, roomId: string) {
  const c = need(await claims(event), 'player', 'tv');
  await roomFor(c, roomId);
  if (!(await rateLimit('draw', c.sub, 20, 3600))) throw new HttpError(429, 'That’s a lot of drawings! Try again a bit later.');
  return json(200, await drawingUploadTicket(roomId, randomUUID()));
}

async function submitHero(event: Event, roomId: string) {
  const c = need(await claims(event), 'player', 'tv');
  const room = await roomFor(c, roomId);
  const body = parseBody<{ key?: string; name?: string }>(event);
  const key = String(body.key ?? '');
  if (!key.startsWith(`drawings/${roomId}/`) || !key.endsWith('.jpg') || key.includes('..')) throw new HttpError(400, 'Invalid drawing');
  if (!(await objectExists(key))) throw new HttpError(400, 'The photo didn’t arrive. Please try again.');
  const name = cleanText(body.name, 24);
  if (name && !(await isKidSafe(name))) throw new HttpError(400, 'Let’s give the hero a different name.');

  await broadcast(roomId, { type: 'hero.processing', by: c.sub, drawingUrl: (await signedMediaUrl(key, 1))! });
  await runAgent({ task: 'hero', roomId, householdId: room.householdId, playerId: c.sub, drawingKey: key, name, ageBand: room.ageBand });
  return json(202, { ok: true });
}

async function weave(event: Event, roomId: string) {
  const c = need(await claims(event), 'tv');
  const room = await roomFor(c, roomId);
  if (!room.threads.hero || !room.threads.world) throw new HttpError(400, 'Add a hero and a world first.');
  if (!(await takeStoryQuota(room.householdId, STORIES_PER_DAY)))
    throw new HttpError(429, 'That’s all the new stories for today. Your bookshelf is full of favourites to re-read!');
  const hh = await getHousehold(room.householdId);
  const settings = { ...DEFAULT_SETTINGS, ...hh?.settings };

  const storyId = randomUUID();
  const skeleton: Story = {
    id: storyId,
    title: 'A new story',
    summary: '',
    mood: room.mood,
    ageBand: settings.ageBand,
    hero: room.threads.hero as Story['hero'],
    world: room.threads.world as Story['world'],
    spark: (room.threads.spark as Story['spark']) ?? { kind: 'spark', by: 'tv', text: '' },
    pages: [],
    createdAt: now(),
    contributors: room.players,
    narrator: settings.narrator,
    status: 'weaving',
  };
  await putStory(room.householdId, skeleton);
  await updateRoom(roomId, { storyId });
  await broadcast(roomId, { type: 'weave.started', storyId });
  await runAgent({
    task: 'weave',
    storyId,
    roomId,
    householdId: room.householdId,
    settings: settings as unknown as Record<string, unknown>,
    room: roomState(room) as unknown as Record<string, unknown>,
  });
  return json(202, { storyId });
}

async function closeRoom(event: Event, roomId: string) {
  const c = need(await claims(event), 'tv');
  const room = await roomFor(c, roomId);
  await releaseCode(room.code);
  await broadcast(roomId, { type: 'room.closed' });
  return json(200, { ok: true });
}

async function stories(event: Event) {
  const c = need(await claims(event), 'device');
  const items = await listStories(c.sub);
  const out: StorySummary[] = await Promise.all(
    items.map(async ({ coverKey, pk, sk, ...rest }) => ({ ...(rest as unknown as StorySummary), coverUrl: await signedMediaUrl(coverKey) })),
  );
  return json(200, { stories: out });
}

async function story(event: Event, id: string) {
  const c = need(await claims(event), 'device');
  const s = await getStory(id);
  if (!s || s.householdId !== c.sub) throw new HttpError(404, 'Story not found');
  const { householdId, ...rest } = s as typeof s & { pk?: string; sk?: string };
  delete (rest as Record<string, unknown>).pk;
  delete (rest as Record<string, unknown>).sk;
  return json(200, { story: await withSignedUrls(rest as never) });
}

async function removeStory(event: Event, id: string) {
  const c = need(await claims(event), 'device');
  const s = await getStory(id);
  if (!s || s.householdId !== c.sub) throw new HttpError(404, 'Story not found');
  await deleteStory(c.sub, id, s.createdAt);
  await deletePrefix(`stories/${id}/`);
  return json(200, { ok: true });
}

/** "Delete everything": the household, every story and every picture. */
async function deleteHousehold(event: Event) {
  const c = need(await claims(event), 'device');
  const items = await ddb.send(
    new QueryCommand({ TableName: env.table, KeyConditionExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': `HH#${c.sub}` } }),
  );
  for (const it of items.Items ?? []) {
    if (typeof it.id === 'string') {
      await deleteStory(c.sub, it.id, it.createdAt as string);
      await deletePrefix(`stories/${it.id}/`);
    }
  }
  await deletePrefix(`heroes/${c.sub}/`);
  await ddb.send(new BatchWriteCommand({ RequestItems: { [env.table]: [{ DeleteRequest: { Key: { pk: `HH#${c.sub}`, sk: 'META' } } }] } }));
  return json(200, { ok: true });
}

async function deletePrefix(prefix: string) {
  let token: string | undefined;
  do {
    const list = await s3.send(new ListObjectsV2Command({ Bucket: env.mediaBucket, Prefix: prefix, ContinuationToken: token }));
    const keys = (list.Contents ?? []).map((o) => ({ Key: o.Key! }));
    if (keys.length) await s3.send(new DeleteObjectsCommand({ Bucket: env.mediaBucket, Delete: { Objects: keys, Quiet: true } }));
    token = list.NextContinuationToken;
  } while (token);
}

// ---------------------------------------------------------------------------

export const main = handler(async (event) => {
  const id = event.pathParameters?.id ?? '';
  switch (event.routeKey) {
    case 'POST /households':
      return createHousehold(event);
    case 'GET /household':
      return household(event);
    case 'PUT /household/settings':
      return saveSettings(event);
    case 'DELETE /household':
      return deleteHousehold(event);
    case 'POST /rooms':
      return createRoom(event);
    case 'POST /rooms/{id}/join':
      return joinRoom(event, id);
    case 'POST /rooms/{id}/drawings':
      return drawingTicket(event, id);
    case 'POST /rooms/{id}/hero':
      return submitHero(event, id);
    case 'POST /rooms/{id}/weave':
      return weave(event, id);
    case 'POST /rooms/{id}/close':
      return closeRoom(event, id);
    case 'GET /stories':
      return stories(event);
    case 'GET /stories/{id}':
      return story(event, id);
    case 'DELETE /stories/{id}':
      return removeStory(event, id);
    case 'GET /health':
      return json(200, { ok: true, time: now() });
    default:
      throw new HttpError(404, 'Not found');
  }
});
