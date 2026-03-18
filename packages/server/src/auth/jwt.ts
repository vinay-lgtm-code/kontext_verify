// ============================================================================
// Kontext Server — JWT Sign / Verify
// ============================================================================
// Uses `jose` (ESM-compatible, zero native deps).
// JWT_SECRET from process.env['JWT_SECRET'] → Secret Manager in production.
// Access token: 15 minutes. Refresh token: 7 days. Algorithm: HS256.

import { randomBytes } from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { Role } from './rbac.js';

export interface JwtPayload {
  sub: string;      // user_id
  orgId: string;
  role: Role;
  jti: string;      // unique token ID (for revocation)
  type: 'access' | 'refresh';
}

export const ACCESS_TTL_SECONDS  = 15 * 60;           // 15 minutes
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;  // 7 days

function getSecret(): Uint8Array {
  const secret = process.env['JWT_SECRET'];
  if (!secret) {
    if (process.env['NODE_ENV'] !== 'production') {
      // Development fallback — never use in production
      return new TextEncoder().encode('kontext-dev-secret-change-in-production');
    }
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  return new TextEncoder().encode(secret);
}

export async function signTokens(
  payload: Omit<JwtPayload, 'jti' | 'type'>,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);
  const accessJti = randomBytes(16).toString('hex');
  const refreshJti = randomBytes(16).toString('hex');

  const accessToken = await new SignJWT({
    orgId: payload.orgId,
    role: payload.role,
    type: 'access',
    jti: accessJti,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TTL_SECONDS)
    .sign(secret);

  const refreshToken = await new SignJWT({
    orgId: payload.orgId,
    role: payload.role,
    type: 'refresh',
    jti: refreshJti,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + REFRESH_TTL_SECONDS)
    .sign(secret);

  return { accessToken, refreshToken, expiresIn: ACCESS_TTL_SECONDS };
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });

    if (
      typeof payload.sub !== 'string' ||
      typeof payload['orgId'] !== 'string' ||
      typeof payload['role'] !== 'string' ||
      typeof payload['jti'] !== 'string' ||
      typeof payload['type'] !== 'string'
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      orgId: payload['orgId'] as string,
      role: payload['role'] as Role,
      jti: payload['jti'] as string,
      type: payload['type'] as 'access' | 'refresh',
    };
  } catch {
    return null;
  }
}
