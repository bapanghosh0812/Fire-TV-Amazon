import { randomUUID } from 'node:crypto';
import { DeleteCommand, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, now, ttlIn } from './db';
import { env } from './env';

// More items in the single table:
//   USER#{user}       META     account: profile, terms acceptance, household, settings
//   PHONE#{hash}      USER     keyed phone hash -> user (the number itself is never stored)
//   OTP#{request}     OTP      pending sign-in code (hashed, TTL 5 min)
//   ACT#{code}        ACT      "sign in on your phone" activation for a TV (TTL 10 min)

export type Role = 'parent' | 'guardian' | 'grandparent' | 'teacher' | 'other';
export interface Child {
  id: string;
  name: string;
  ageBand: 'little' | 'kid' | 'big-kid';
  avatar: string;
}

export interface UserItem {
  userId: string;
  phoneHash: string;
  phoneMasked: string;
  name?: string;
  email?: string;
  role?: Role;
  country?: string;
  language?: string;
  children?: Child[];
  householdId?: string;
  termsVersion?: string;
  termsAcceptedAt?: string;
  tokenVersion: number;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

const T = () => env.table;

export async function getUser(userId: string) {
  const r = await ddb.send(new GetCommand({ TableName: T(), Key: { pk: `USER#${userId}`, sk: 'META' } }));
  return r.Item as (UserItem & { pk: string; sk: string }) | undefined;
}

export async function userForPhone(hash: string) {
  const r = await ddb.send(new GetCommand({ TableName: T(), Key: { pk: `PHONE#${hash}`, sk: 'USER' } }));
  return (r.Item as { userId: string } | undefined)?.userId;
}

/** Finds the account for this phone, or creates it (race-safe: the phone mapping is written first). */
export async function findOrCreateUser(hash: string, masked: string): Promise<{ user: UserItem; created: boolean }> {
  const existing = await userForPhone(hash);
  if (existing) {
    const user = await getUser(existing);
    if (user) return { user, created: false };
  }
  const userId = randomUUID();
  try {
    await ddb.send(
      new PutCommand({
        TableName: T(),
        Item: { pk: `PHONE#${hash}`, sk: 'USER', userId },
        ConditionExpression: 'attribute_not_exists(pk)',
      }),
    );
  } catch (e) {
    if ((e as Error).name === 'ConditionalCheckFailedException') {
      const again = await userForPhone(hash);
      const user = again ? await getUser(again) : undefined;
      if (user) return { user, created: false };
    }
    throw e;
  }
  const user: UserItem = { userId, phoneHash: hash, phoneMasked: masked, tokenVersion: 1, createdAt: now() };
  await ddb.send(new PutCommand({ TableName: T(), Item: { pk: `USER#${userId}`, sk: 'META', ...user } }));
  return { user, created: true };
}

export async function updateUser(userId: string, patch: Partial<UserItem>) {
  const entries = Object.entries({ ...patch, updatedAt: now() }).filter(([, v]) => v !== undefined);
  if (!entries.length) return;
  await ddb.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: `USER#${userId}`, sk: 'META' },
      UpdateExpression: 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', '),
      ExpressionAttributeNames: Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k])),
      ExpressionAttributeValues: Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v])),
      ConditionExpression: 'attribute_exists(pk)',
    }),
  );
}

export async function bumpTokenVersion(userId: string) {
  const r = await ddb.send(
    new UpdateCommand({
      TableName: T(),
      Key: { pk: `USER#${userId}`, sk: 'META' },
      UpdateExpression: 'ADD tokenVersion :one',
      ExpressionAttributeValues: { ':one': 1 },
      ReturnValues: 'UPDATED_NEW',
    }),
  );
  return (r.Attributes?.tokenVersion as number) ?? 1;
}

export async function deleteUser(user: UserItem) {
  await ddb.send(new DeleteCommand({ TableName: T(), Key: { pk: `PHONE#${user.phoneHash}`, sk: 'USER' } }));
  await ddb.send(new DeleteCommand({ TableName: T(), Key: { pk: `USER#${user.userId}`, sk: 'META' } }));
}

// ---------------------------------------------------------------- one-time codes
export interface OtpItem {
  requestId: string;
  phoneHash: string;
  phoneMasked: string;
  codeHash: string; // base64
  attempts: number;
  demo: boolean;
  expiresAt: number;
}

export async function putOtp(item: OtpItem) {
  await ddb.send(new PutCommand({ TableName: T(), Item: { pk: `OTP#${item.requestId}`, sk: 'OTP', ...item, ttl: item.expiresAt + 60 } }));
}

export async function getOtp(requestId: string) {
  const r = await ddb.send(new GetCommand({ TableName: T(), Key: { pk: `OTP#${requestId}`, sk: 'OTP' } }));
  return r.Item as OtpItem | undefined;
}

/** Counts a guess; fails when the code has used up its attempts (checked atomically). */
export async function countAttempt(requestId: string, max: number) {
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: `OTP#${requestId}`, sk: 'OTP' },
        UpdateExpression: 'ADD attempts :one',
        ConditionExpression: 'attribute_exists(pk) AND attempts < :max',
        ExpressionAttributeValues: { ':one': 1, ':max': max },
      }),
    );
    return true;
  } catch (e) {
    if ((e as Error).name === 'ConditionalCheckFailedException') return false;
    throw e;
  }
}

export async function deleteOtp(requestId: string) {
  await ddb.send(new DeleteCommand({ TableName: T(), Key: { pk: `OTP#${requestId}`, sk: 'OTP' } }));
}

// ---------------------------------------------------------------- TV activation
export interface ActivationItem {
  code: string;
  pollHash: string;
  householdId?: string; // the TV's household, if it already had one
  status: 'pending' | 'approved' | 'consumed';
  userId?: string;
  expiresAt: number;
}

export async function putActivation(item: ActivationItem) {
  try {
    await ddb.send(
      new PutCommand({
        TableName: T(),
        Item: { pk: `ACT#${item.code}`, sk: 'ACT', ...item, ttl: item.expiresAt + 60 },
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

export async function getActivation(code: string) {
  const r = await ddb.send(new GetCommand({ TableName: T(), Key: { pk: `ACT#${code}`, sk: 'ACT' } }));
  const item = r.Item as ActivationItem | undefined;
  if (!item || item.expiresAt < Date.now() / 1000) return undefined;
  return item;
}

export async function setActivation(code: string, from: ActivationItem['status'], patch: Partial<ActivationItem>) {
  const entries = Object.entries(patch);
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: T(),
        Key: { pk: `ACT#${code}`, sk: 'ACT' },
        UpdateExpression: 'SET ' + entries.map((_, i) => `#k${i} = :v${i}`).join(', '),
        ConditionExpression: '#status = :from',
        ExpressionAttributeNames: { '#status': 'status', ...Object.fromEntries(entries.map(([k], i) => [`#k${i}`, k])) },
        ExpressionAttributeValues: { ':from': from, ...Object.fromEntries(entries.map(([, v], i) => [`:v${i}`, v])) },
      }),
    );
    return true;
  } catch (e) {
    if ((e as Error).name === 'ConditionalCheckFailedException') return false;
    throw e;
  }
}

export { ttlIn };
