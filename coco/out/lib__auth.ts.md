# lib/auth.ts
lines:93 exports:signJwt,signRefresh,verifyJwt,verifyRefresh,createJwtCookie,createRefreshCookie
---
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
