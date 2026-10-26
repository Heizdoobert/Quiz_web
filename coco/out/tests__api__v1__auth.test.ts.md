# tests/api/v1/auth.test.ts
lines:559 exports:
---
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as signup } from '@/app/api/v1/auth/signup/route';
import { POST as signin } from '@/app/api/v1/auth/signin/route';
import { POST as googleSignin } from '@/app/api/v1/auth/signin/google/route';
import { POST as requestEmail } from '@/app/api/v1/auth/email/request/route';
import { POST as verifyEmail } from '@/app/api/v1/auth/email/verify/route';
import { GET as session } from '@/app/api/v1/auth/session/route';
import { POST as signout } from '@/app/api/v1/auth/signout/route';
import { POST as requestPassword } from '@/app/api/v1/auth/password/request/route';
import { POST as verifyPassword } from '@/app/api/v1/auth/password/verify/route';
import { POST as updatePassword } from '@/app/api/v1/auth/password/update/route';

import { signUpAccount, signInAccount, signInAccountWithGoogle } from '@/lib/services/auth/credentials';
import { issueMobileAuthToken, verifyMobileAuthToken } from '@/lib/services/auth/mobile-auth';
import { requestEmailCode, verifyEmailCode, getSessionInfo, signOut } from '@/lib/actions/auth-actions';
import {
  requestPasswordReset,
  verifyPasswordResetCode,
  updatePasswordWithReset,
} from '@/lib/services/auth/password-reset';

vi.mock('@/lib/services/auth/credentials');
vi.mock('@/lib/services/auth/password-reset');
vi.mock('@/lib/actions/auth-actions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/actions/auth-actions')>();
  return {
    ...actual,
    requestEmailCode: vi.fn(),
    verifyEmailCode: vi.fn(),
    signOut: vi.fn(),
  };
});

function post(url: string, body: unknown, bearer?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`;
  return new NextRequest(url, {
    method: 'POST',
    headers,
