# lib/services/api-auth.ts
lines:35 exports:extractBearerToken,AuthRequirementResult,requireAuth,optionalAuth
---
import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileAuthToken } from '@/lib/services/mobile-auth';
import { SessionAccount } from '@/lib/services/session';
import { apiError } from './api-response';

export function extractBearerToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

export type AuthRequirementResult =
  | { ok: true; account: SessionAccount }
  | { ok: false; response: NextResponse };

export function requireAuth(req: NextRequest): AuthRequirementResult {
  const token = extractBearerToken(req);
  if (!token) {
    return { ok: false, response: apiError('UNAUTHORIZED', 'Authentication token required', undefined, 401) };
  }

  const account = verifyMobileAuthToken(token);
  if (!account) {
    return { ok: false, response: apiError('UNAUTHORIZED', 'Invalid or expired token', undefined, 401) };
  }

  return { ok: true, account };
}

export function optionalAuth(req: NextRequest): SessionAccount | null {
  const token = extractBearerToken(req);
  if (!token) return null;
  return verifyMobileAuthToken(token);
}
