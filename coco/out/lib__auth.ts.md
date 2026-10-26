# lib/auth.ts
lines:36 exports:signJwt,signRefresh,verifyRefresh,createJwtCookie,createRefreshCookie
---
// Authentication utilities
import { signToken, verifyToken } from './api/auth/jwt';
import { NextResponse } from 'next/server';

/** Sign JWT for authentication */
export function signJwt(payload: object, expiresIn: string = '1h'): string {
  return signToken(payload, expiresIn);
}
/** Sign refresh token */
export function signRefresh(payload: object, expiresIn: string = '7d'): string {
  return signToken(payload, expiresIn);
}
/** Verify refresh token */
export function verifyRefresh(token: string): object | null {
  return verifyToken(token);
}
/** Set JWT cookie on response */
export function createJwtCookie(res: NextResponse, token: string): void {
  res.cookies.set('jwt', token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24, // 1 day
  });
}
/** Set refresh cookie on response */
export function createRefreshCookie(res: NextResponse, token: string): void {
  res.cookies.set('refresh', token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}
