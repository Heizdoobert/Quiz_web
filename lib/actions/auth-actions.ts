'use server';

import { getSessionAccount, setSessionAccount, clearSessionAccount } from '@/lib/services/session';
import { ensureAccountForAuthUser } from '@/lib/services/users';
import { supabase } from '@/lib/supabase/supabase';
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
    await supabase.auth.signInWithOtp({ email: trimmed, options: { shouldCreateUser: true } });
  }
  return { sent: true };
}

export async function verifyEmailCode(email: string, code: string): Promise<{ ok: boolean; error?: 'RATE_LIMITED' }> {
  try {
    // A 6-digit code lives about an hour; 10 tries per hour makes guessing it hopeless.
    if (!(await allowAttempt('email-verify', email, 10, HOUR))) return { ok: false, error: 'RATE_LIMITED' };
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' });
    if (error || !data.user) return { ok: false };
    const accountId = await ensureAccountForAuthUser(data.user.id);
    return { ok: accountId !== null && (await setSessionAccount({ id: accountId })) };
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

export async function getSessionInfo(): Promise<{ id: string } | null> {
  return getSessionAccount();
}

export async function signOut(): Promise<void> {
  await clearSessionAccount();
}
