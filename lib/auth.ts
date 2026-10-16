// Authentication utilities for JWT and Refresh tokens
import { createHmac } from 'crypto';

const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || (process.env.NODE_ENV === 'test' ? 'test-secret' : undefined);
if (!SECRET_KEY) {
  console.warn('SUPABASE_SECRET_KEY is not set; auth token functions will not work');
}

function getKey(): Buffer | null {
  return SECRET_KEY ? createHmac('sha256', SECRET_KEY).update('quiz-auth').digest() : null;
}

function base64urlEncode(obj: any): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function sign(payload: object, ttlSeconds: number): string | null {
  const key = getKey();
  if (!key) return null;
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64urlEncode(header);
  const payloadB64 = base64urlEncode(fullPayload);
  const signature = createHmac('sha256', key).update(`${headerB64}.${payloadB64}`).digest('base64url');
  return `${headerB64}.${payloadB64}.${signature}`;
}

export function signJwt(payload: object): string | null {
  // JWT valid for 30 minutes
  return sign(payload, 30 * 60);
}

export function signRefresh(payload: object): string | null {
  // Refresh token valid for 30 days
  return sign(payload, 30 * 24 * 60 * 60);
}

function verify(token: string): object | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signature] = parts;
  const key = getKey();
  if (!key) return null;
  const expectedSig = createHmac('sha256', key).update(`${headerB64}.${payloadB64}`).digest('base64url');
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;
  const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
  try {
    const payload = JSON.parse(payloadJson);
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyJwt(token: string): object | null {
  return verify(token);
}

export function verifyRefresh(token: string): object | null {
  return verify(token);
}

// Helper to compare buffers in constant time
function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return createHmac('sha256', Buffer.alloc(0)).update(a).digest().equals(createHmac('sha256', Buffer.alloc(0)).update(b).digest());
}

import { NextResponse } from 'next/server';

/** Set JWT cookie (30 min) */
export function createJwtCookie(res: NextResponse, token: string) {
  res.cookies.set('jwt', token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 60,
  });
}

/** Set Refresh cookie (30 days) */
export function createRefreshCookie(res: NextResponse, token: string) {
  res.cookies.set('refresh', token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60,
  });
}
