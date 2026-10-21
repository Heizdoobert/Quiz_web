// Logout endpoint - clears authentication cookies
import { NextRequest, NextResponse } from 'next/server';
import { createJwtCookie, createRefreshCookie } from '@/lib/auth';
import { apiOk } from '@/lib/services/api-response';

export async function POST(_req?: NextRequest) {
  const res = NextResponse.json({});
  // Clear JWT cookie
  res.cookies.set('jwt', '', {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });
  // Clear refresh cookie
  res.cookies.set('refresh', '', {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });
  return res;
}
