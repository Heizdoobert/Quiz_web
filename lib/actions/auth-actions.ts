'use server';

import { getSessionAccount, setSessionAccount, clearSessionAccount, type SessionAccount } from '@/lib/services/session';
import { issueMobileAuthToken } from '@/lib/services/mobile-auth';
import { ensureAccountForAuthUser } from '@/lib/services/users';
import { auth } from '@/lib/db/auth';
import { signInAccount, signUpAccount } from '@/lib/services/credentials';
import { allowAttempt, allowAttemptFromIp } from '@/lib/services/rate-limit';
import { logger } from '@/lib/logger';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HOUR = 3600;

// Same { sent: true } whether or not the email has an account, so a caller can't
// use this to enumerate registered emails. shouldCreateUser lets a first-time
// email register itself right here, with no separate registration step.
export async function requestEmailCode(email: string): Promise<{ sent: boolean; error?: 'RATE_LIMITED' }> {
  const trimmed = email.trim();
  if (EMAIL_RE.test(trimmed)) {
    // Limits apply to every address alike, so hitting one reveals nothing about an account.
    if (
      !(await allowAttempt('email-code', trimmed, 5, HOUR)) ||
      !(await allowAttemptFromIp('email-code-ip', 20, HOUR))
    ) {
      return { sent: false, error: 'RATE_LIMITED' };
    }
    await auth().signInWithOtp({ email: trimmed, options: { shouldCreateUser: true } });
  }
  return { sent: true };
}

export async function verifyEmailCode(
  email: string,
  code: string,
  options?: { issueToken?: boolean } | boolean
): Promise<{ ok: boolean; error?: 'RATE_LIMITED'; token?: string; accountId?: string }> {
  try {
    // A 6-digit code lives about an hour; 10 tries per hour makes guessing it hopeless.
    if (!(await allowAttempt('email-verify', email, 10, HOUR))) return { ok: false, error: 'RATE_LIMITED' };
    const { data, error } = await auth().verifyOtp({ email: email.trim(), token: code, type: 'email' });
    if (error || !data.user) return { ok: false };
    const accountId = await ensureAccountForAuthUser(data.user.id);
    if (!accountId) return { ok: false };
    const ok = await setSessionAccount({ id: accountId });
    const shouldIssue = typeof options === 'boolean' ? options : options?.issueToken;
    if (shouldIssue) {
      const token = issueMobileAuthToken({ id: accountId }) ?? undefined;
      return { ok, token, accountId };
    }
    return { ok };
  } catch (err) {
    logger.error('verifyEmailCode error:', err);
    return { ok: false };
  }
}


export async function signUpWithUsername(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await signUpAccount(username, password);
  if (!result.ok) return result;
  const ok = await setSessionAccount(result.account);
  return { ok, error: ok ? undefined : 'Failed to establish session.' };
}

export async function signInWithUsername(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await signInAccount(username, password);
  if (!result.ok) return result;
  const ok = await setSessionAccount(result.account);
  return { ok, error: ok ? undefined : 'Failed to establish session.' };
}

export async function getSessionInfo(authAccount?: SessionAccount): Promise<{ id: string; username?: string } | null> {
  if (authAccount) return authAccount;
  return getSessionAccount();
}

export async function signOut(): Promise<void> {
  await clearSessionAccount();
}
