import { SignJWT, jwtVerify } from 'jose';
import { env } from './env';
import { secret } from './secrets';

// Three kinds of short, scoped tokens — no passwords, no personal data:
//  device: identifies a household's TV (long-lived, like a streaming app login)
//  tv:     the TV inside one Story Studio room
//  player: a family member's phone inside one room
export type Claims =
  | { typ: 'device'; sub: string }
  | { typ: 'tv'; sub: string; room: string }
  | { typ: 'player'; sub: string; room: string; hh: string };

const ISSUER = 'storyloom';

async function key() {
  return new TextEncoder().encode(await secret(env.secretArn));
}

export async function sign(claims: Claims, ttl: string) {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(await key());
}

export async function verify(token: string | undefined): Promise<Claims> {
  if (!token) throw new AuthError();
  try {
    const { payload } = await jwtVerify(token, await key(), { issuer: ISSUER, algorithms: ['HS256'] });
    return payload as unknown as Claims;
  } catch {
    throw new AuthError();
  }
}

export class AuthError extends Error {
  status = 401;
  constructor(message = 'Please reconnect to the TV') {
    super(message);
  }
}

export function bearer(headers: Record<string, string | undefined>) {
  const h = headers.authorization ?? headers.Authorization;
  return h?.startsWith('Bearer ') ? h.slice(7) : undefined;
}
