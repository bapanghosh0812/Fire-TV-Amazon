import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { LANGUAGES } from '@storyloom/protocol';
import { bearer, pepper, sign, verify, type Claims } from '../lib/auth';
import {
  bumpTokenVersion,
  countAttempt,
  deleteOtp,
  deleteUser,
  findOrCreateUser,
  getActivation,
  getOtp,
  getUser,
  putActivation,
  putOtp,
  setActivation,
  updateUser,
  type Child,
  type Role,
  type UserItem,
} from '../lib/accounts';
import { getHousehold, listStories, putHousehold, rateLimit } from '../lib/db';
import { env } from '../lib/env';
import { HttpError, clientIp, cleanText, json, parseBody } from '../lib/http';
import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_SECONDS,
  RESEND_SECONDS,
  codeHash,
  isDemoPhone,
  maskPhone,
  newCode,
  normalizePhone,
  otpMessage,
  phoneHash,
  sameHash,
} from '../lib/otp';
import { sendSms } from '../lib/sms';

type Event = APIGatewayProxyEventV2;

export const TERMS_VERSION = '2026-09-25';
const ROLES: Role[] = ['parent', 'guardian', 'grandparent', 'teacher', 'other'];
const AGE_BANDS: Child['ageBand'][] = ['little', 'kid', 'big-kid'];
const AVATARS = ['fox', 'owl', 'deer', 'bear', 'whale', 'dragon', 'cat', 'rabbit'];
const EMAIL = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[a-z]{2,24}$/i;

/** What the apps see about an account (no phone number, no hashes). */
function publicUser(u: UserItem) {
  return {
    id: u.userId,
    phone: u.phoneMasked,
    name: u.name ?? '',
    email: u.email ?? '',
    role: u.role ?? 'parent',
    country: u.country ?? '',
    language: u.language ?? '',
    children: u.children ?? [],
    householdId: u.householdId,
    termsVersion: u.termsVersion ?? null,
    termsAcceptedAt: u.termsAcceptedAt ?? null,
    needsProfile: !u.name,
    needsTerms: u.termsVersion !== TERMS_VERSION,
    settings: u.settings ?? {},
    createdAt: u.createdAt,
  };
}

async function accountClaims(event: Event) {
  const c = await verify(bearer(event.headers as Record<string, string>));
  if (c.typ !== 'account') throw new HttpError(403, 'Please sign in again');
  const user = await getUser(c.sub);
  // Tokens from before "sign out everywhere" stop working immediately.
  if (!user || user.tokenVersion !== c.ver) throw new HttpError(401, 'Please sign in again');
  return { claims: c, user };
}

/**
 * Links a signed-in account to a TV. The first TV becomes the family's household; any other TV
 * (or the phone) joins that same household, so everyone sees the same bookshelf.
 */
async function bindHousehold(user: UserItem, tvHousehold?: string) {
  let householdId = user.householdId;
  if (!householdId) {
    householdId = tvHousehold && (await getHousehold(tvHousehold)) ? tvHousehold : randomUUID();
    if (householdId !== tvHousehold) await putHousehold(householdId);
    await updateUser(user.userId, { householdId });
  }
  const deviceToken = householdId !== tvHousehold ? await sign({ typ: 'device', sub: householdId }, '400d') : undefined;
  return { householdId, deviceToken };
}

async function tvHouseholdFrom(token: unknown) {
  if (typeof token !== 'string' || !token) return undefined;
  try {
    const c = await verify(token);
    return c.typ === 'device' ? c.sub : undefined;
  } catch {
    return undefined;
  }
}

async function session(user: UserItem, tvHousehold?: string) {
  const { householdId, deviceToken } = await bindHousehold(user, tvHousehold);
  const accountToken = await sign({ typ: 'account', sub: user.userId, ver: user.tokenVersion }, '30d');
  const fresh = (await getUser(user.userId)) ?? user;
  return { accountToken, deviceToken, householdId, user: publicUser(fresh) };
}

// ---------------------------------------------------------------- phone + code

export async function startOtp(event: Event) {
  const body = parseBody<{ phone?: string; locale?: string }>(event);
  const phone = normalizePhone(body.phone);
  if (!phone) throw new HttpError(400, 'Please enter your mobile number with the country code.');
  const ip = clientIp(event);
  const pep = await pepper();
  const hash = phoneHash(phone, pep);
  const demo = isDemoPhone(phone);

  if (!(await rateLimit('otp-ip', ip, 15, 3600))) throw new HttpError(429, 'Too many codes requested. Please wait a while and try again.');
  if (!(await rateLimit('otp-wait', hash, 1, RESEND_SECONDS))) throw new HttpError(429, `Please wait ${RESEND_SECONDS} seconds before asking for a new code.`);
  if (!(await rateLimit('otp-day', hash, 8, 86400))) throw new HttpError(429, 'That number has asked for too many codes today. Try again tomorrow.');

  const requestId = randomUUID();
  const code = demo ? env.demoOtpCode : newCode();
  await putOtp({
    requestId,
    phoneHash: hash,
    phoneMasked: maskPhone(phone),
    codeHash: codeHash(requestId, code, pep).toString('base64'),
    attempts: 0,
    demo,
    expiresAt: Math.floor(Date.now() / 1000) + OTP_TTL_SECONDS,
  });
  if (!demo) await sendSms(phone, otpMessage(code, body.locale));
  return json(200, { requestId, phone: maskPhone(phone), expiresIn: OTP_TTL_SECONDS, resendIn: RESEND_SECONDS });
}

export async function verifyOtp(event: Event) {
  const body = parseBody<{ requestId?: string; code?: string; deviceToken?: string }>(event);
  const requestId = String(body.requestId ?? '');
  const code = String(body.code ?? '').replace(/\D/g, '');
  if (!requestId || code.length !== 6) throw new HttpError(400, 'Enter the 6-digit code we sent you.');
  if (!(await rateLimit('otp-verify', clientIp(event), 40, 3600))) throw new HttpError(429, 'Too many tries. Please wait a while.');

  const otp = await getOtp(requestId);
  if (!otp || otp.expiresAt < Date.now() / 1000) throw new HttpError(410, 'That code has expired. Ask for a new one.');
  if (!(await countAttempt(requestId, OTP_MAX_ATTEMPTS))) {
    await deleteOtp(requestId);
    throw new HttpError(429, 'Too many wrong codes. Ask for a new one.');
  }
  const pep = await pepper();
  if (!sameHash(codeHash(requestId, code, pep), Buffer.from(otp.codeHash, 'base64'))) {
    const left = OTP_MAX_ATTEMPTS - otp.attempts - 1;
    throw new HttpError(400, left > 0 ? `That code isn’t right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'That code isn’t right.');
  }
  await deleteOtp(requestId); // codes work once
  const { user } = await findOrCreateUser(otp.phoneHash, otp.phoneMasked);
  return json(200, await session(user, await tvHouseholdFrom(body.deviceToken)));
}

// ---------------------------------------------------------------- account

export async function getAccount(event: Event) {
  const { user } = await accountClaims(event);
  return json(200, { user: publicUser(user) });
}

export async function saveProfile(event: Event) {
  const { user } = await accountClaims(event);
  const body = parseBody<{ name?: string; email?: string; role?: string; country?: string; language?: string; children?: Partial<Child>[] }>(event);
  const name = cleanText(body.name, 40);
  if (!name) throw new HttpError(400, 'Please tell us your name.');
  const email = cleanText(body.email, 254);
  if (email && !EMAIL.test(email)) throw new HttpError(400, 'That email address doesn’t look right.');
  const children = (Array.isArray(body.children) ? body.children : []).slice(0, 8).map((c) => ({
    id: typeof c.id === 'string' && c.id.length <= 40 ? c.id : randomUUID(),
    name: cleanText(c.name, 20) || 'Little one',
    ageBand: AGE_BANDS.includes(c.ageBand as Child['ageBand']) ? (c.ageBand as Child['ageBand']) : 'kid',
    avatar: AVATARS.includes(String(c.avatar)) ? String(c.avatar) : 'fox',
  }));
  await updateUser(user.userId, {
    name,
    email: email || undefined,
    role: ROLES.includes(body.role as Role) ? (body.role as Role) : 'parent',
    country: /^[A-Z]{2}$/.test(String(body.country)) ? String(body.country) : undefined,
    language: LANGUAGES.some((l) => l.code === body.language) || /^[a-z]{2}(-[A-Z]{2})?$/.test(String(body.language)) ? String(body.language) : undefined,
    children,
  });
  return json(200, { user: publicUser((await getUser(user.userId))!) });
}

export async function acceptTerms(event: Event) {
  const { user } = await accountClaims(event);
  const body = parseBody<{ version?: string; guardian?: boolean }>(event);
  if (body.version !== TERMS_VERSION) throw new HttpError(409, 'Our terms were updated. Please read the latest version.');
  if (body.guardian !== true) throw new HttpError(400, 'A parent or legal guardian needs to accept the terms.');
  await updateUser(user.userId, { termsVersion: TERMS_VERSION, termsAcceptedAt: new Date().toISOString() });
  return json(200, { user: publicUser((await getUser(user.userId))!) });
}

/** Settings sync between the family's TVs and phones (small, primitive values only). */
export async function saveAccountSettings(event: Event) {
  const { user } = await accountClaims(event);
  const body = parseBody<{ settings?: Record<string, unknown> }>(event, 12_000);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body.settings ?? {}).slice(0, 150)) {
    if (!/^[a-zA-Z0-9]{1,40}$/.test(k)) continue;
    if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) out[k] = v;
    else if (typeof v === 'string') out[k] = cleanText(v, 60);
    else if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === 'string').slice(0, 20).map((x) => cleanText(x, 40));
  }
  await updateUser(user.userId, { settings: out });
  return json(200, { ok: true });
}

export async function signOutEverywhere(event: Event) {
  const { user } = await accountClaims(event);
  await bumpTokenVersion(user.userId);
  return json(200, { ok: true });
}

/** A copy of everything we hold about the account (data portability). */
export async function exportAccount(event: Event) {
  const { user } = await accountClaims(event);
  const stories = user.householdId ? await listStories(user.householdId) : [];
  const { phoneHash: _hash, tokenVersion: _ver, ...rest } = user as UserItem & { pk?: string; sk?: string };
  delete (rest as Record<string, unknown>).pk;
  delete (rest as Record<string, unknown>).sk;
  return json(200, {
    exportedAt: new Date().toISOString(),
    account: rest,
    stories: stories.map((s) => ({ id: s.id, title: s.title, createdAt: s.createdAt, language: (s as { language?: string }).language })),
  });
}

export async function deleteAccount(event: Event, deleteHouseholdData: (householdId: string) => Promise<void>) {
  const { user } = await accountClaims(event);
  if (user.householdId) await deleteHouseholdData(user.householdId);
  await deleteUser(user);
  return json(200, { ok: true });
}

// ---------------------------------------------------------------- "sign in on your phone" for TVs

const ALPHABET = 'BCDFGHJKLMNPQRSTVWXZ23456789'; // no vowels (no words), no 0/O or 1/I

function activationCode() {
  const bytes = randomBytes(8);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return `${chars.slice(0, 4).join('')}-${chars.slice(4).join('')}`;
}

const hashPoll = (t: string) => createHash('sha256').update(t).digest('base64url');

export async function startActivation(event: Event) {
  if (!(await rateLimit('act', clientIp(event), 20, 3600))) throw new HttpError(429, 'Too many sign-in codes. Please wait a while.');
  const body = parseBody<{ deviceToken?: string }>(event);
  const householdId = await tvHouseholdFrom(body.deviceToken);
  const pollToken = randomBytes(24).toString('base64url');
  let code = activationCode();
  const expiresAt = Math.floor(Date.now() / 1000) + 600;
  for (let i = 0; i < 5 && !(await putActivation({ code, pollHash: hashPoll(pollToken), householdId, status: 'pending', expiresAt })); i++) {
    code = activationCode();
  }
  return json(201, { code, pollToken, expiresIn: 600, url: `${env.companionUrl}/activate?code=${code}` });
}

export async function pollActivation(event: Event, code: string) {
  const act = await getActivation(code.toUpperCase());
  const token = String((event.headers as Record<string, string>)['x-poll-token'] ?? '');
  if (!act || hashPoll(token) !== act.pollHash) return json(200, { status: 'expired' });
  if (act.status === 'pending') return json(200, { status: 'pending' });
  if (act.status !== 'approved' || !act.userId) return json(200, { status: 'expired' });
  // Hand the session to the TV exactly once.
  if (!(await setActivation(act.code, 'approved', { status: 'consumed' }))) return json(200, { status: 'expired' });
  const user = await getUser(act.userId);
  if (!user) return json(200, { status: 'expired' });
  return json(200, { status: 'approved', ...(await session(user, act.householdId)) });
}

export async function approveActivation(event: Event, code: string) {
  const { user } = await accountClaims(event);
  const act = await getActivation(code.toUpperCase());
  if (!act || act.status !== 'pending') throw new HttpError(404, 'That TV code has expired. Check the TV for a new one.');
  if (!(await setActivation(act.code, 'pending', { status: 'approved', userId: user.userId }))) throw new HttpError(409, 'That TV is already signed in.');
  return json(200, { ok: true });
}

export type { Claims };

// ---------------------------------------------------------------- help & contact

const TOPICS = ['question', 'problem', 'safety', 'privacy', 'feedback', 'other'];

/** Messages from "Help & contact" land in the table for the team (never shown to other families). */
export async function contactUs(event: Event) {
  if (!(await rateLimit('support', clientIp(event), 5, 3600))) throw new HttpError(429, 'Thanks! You’ve sent a few messages already. Please try again later.');
  const body = parseBody<{ topic?: string; message?: string; reply?: string; storyId?: string }>(event, 8_000);
  const message = cleanText(body.message, 2000);
  if (message.length < 5) throw new HttpError(400, 'Please tell us a little more.');
  let userId: string | undefined;
  try {
    const c = await verify(bearer(event.headers as Record<string, string>));
    if (c.typ === 'account') userId = c.sub;
  } catch {}
  const ticketId = randomUUID();
  const { ddb } = await import('../lib/db');
  const { PutCommand } = await import('@aws-sdk/lib-dynamodb');
  await ddb.send(
    new PutCommand({
      TableName: env.table,
      Item: {
        pk: `SUPPORT#${ticketId}`,
        sk: 'TICKET',
        ticketId,
        topic: TOPICS.includes(String(body.topic)) ? body.topic : 'other',
        message,
        reply: cleanText(body.reply, 254) || undefined,
        storyId: typeof body.storyId === 'string' ? body.storyId.slice(0, 40) : undefined,
        userId,
        createdAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 365 * 86400,
      },
    }),
  );
  return json(201, { ticketId });
}
