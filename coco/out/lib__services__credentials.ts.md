# lib/services/credentials.ts
lines:125 exports:CredentialResult,signUpAccount,signInAccount,signInAccountWithGoogle
---
import 'server-only';
import { ensureAccountForAuthUser } from '@/lib/services/users';
import type { SessionAccount } from '@/lib/services/session';
import { auth, createConfirmedUser } from '@/lib/db/auth';
import { allowAttempt, allowAttemptFromIp } from '@/lib/services/rate-limit';
import { logger } from '@/lib/logger';

// Username/password and Google sign-in, shared by the web server actions
// (lib/actions/auth-actions.ts, which set the cookie) and the mobile routes
// (app/api/mobile/v1/auth/*, which issue a bearer token). They only prove who
// the caller is; the session is the caller's job.

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const HOUR = 3600;
const RATE_LIMITED_MESSAGE = 'Too many attempts. Please try again later.';

export type CredentialResult = { ok: true; account: SessionAccount } | { ok: false; error: string };

function usernameToEmail(username: string): string {
  const trimmed = username.trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : `${trimmed}@player.quiz`;
}

export async function signUpAccount(username: string, password: string): Promise<CredentialResult> {
  try {
    const trimmed = username.trim();
    if (!USERNAME_RE.test(trimmed)) {
      return { ok: false, error: 'Username must be 3-20 characters (letters, numbers, underscores).' };
    }
    if (!password || password.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }

    if (
      !(await allowAttempt('signup', trimmed, 5, HOUR)) ||
      !(await allowAttemptFromIp('signup-ip', 10, HOUR))
    ) {
      return { ok: false, error: RATE_LIMITED_MESSAGE };
    }

