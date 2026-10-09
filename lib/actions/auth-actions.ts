'use server';

import { cookies, headers } from 'next/headers';
import { getSessionAccount, setSessionAccount, clearSessionAccount, shouldUseSecureCookies } from '@/lib/services/session';
import { ensureAccountForAuthUser } from '@/lib/services/users';
import { supabase } from '@/lib/supabase/supabase';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
import { allowAttempt, allowAttemptFromIp } from '@/lib/services/rate-limit';
import { logger } from '@/lib/logger';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

const HOUR = 3600;
const RATE_LIMITED_MESSAGE = 'Too many attempts. Please try again later.';

function usernameToEmail(username: string): string {
  const trimmed = username.trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : `${trimmed}@player.quiz`;
}

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
    return { ok: accountId !== null && (await setSessionAccount({ id: accountId, wallet: null })) };
  } catch (err) {
    logger.error('verifyEmailCode error:', err);
    return { ok: false };
  }
}

export async function signUpWithUsername(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const trimmed = username.trim();
    if (!USERNAME_RE.test(trimmed)) {
      return {
        ok: false,
        error: 'Username must be 3-20 characters (letters, numbers, underscores).',
      };
    }
    if (!password || password.length < 6) {
      return {
        ok: false,
        error: 'Password must be at least 6 characters.',
      };
    }

    if (
      !(await allowAttempt('signup', trimmed, 5, HOUR)) ||
      !(await allowAttemptFromIp('signup-ip', 10, HOUR))
    ) {
      return { ok: false, error: RATE_LIMITED_MESSAGE };
    }

    const email = usernameToEmail(trimmed);
    let authUserId: string | null = null;

    if (supabaseAdmin?.auth?.admin?.createUser) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username: trimmed },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('unique')) {
          return { ok: false, error: 'Username is already taken.' };
        }
      } else if (data?.user) {
        authUserId = data.user.id;
      }
    }

    if (!authUserId) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: trimmed } },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('unique')) {
          return { ok: false, error: 'Username is already taken.' };
        }
        return { ok: false, error: error.message || 'Failed to create account.' };
      }
      if (!data.user) {
        return { ok: false, error: 'Registration failed. Try a different username.' };
      }
      authUserId = data.user.id;
    }

    const accountId = await ensureAccountForAuthUser(authUserId, trimmed);
    if (!accountId) {
      return { ok: false, error: 'Could not create user account.' };
    }

    const ok = await setSessionAccount({ id: accountId, wallet: null });
    return { ok, error: ok ? undefined : 'Failed to establish session.' };
  } catch (err) {
    logger.error('signUpWithUsername error:', err);
    return { ok: false, error: 'An unexpected error occurred during registration.' };
  }
}

export async function signInWithUsername(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const trimmed = username.trim();
    if (!trimmed || !password) {
      return { ok: false, error: 'Username and password are required.' };
    }
    // Counts every attempt, not just failures: one counter, and a legitimate user never nears 10.
    if (!(await allowAttempt('signin', trimmed, 10, 900))) return { ok: false, error: RATE_LIMITED_MESSAGE };

    const email = usernameToEmail(trimmed);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user) {
      return { ok: false, error: 'Invalid username or password.' };
    }

    const accountId = await ensureAccountForAuthUser(data.user.id, trimmed);
    if (!accountId) {
      return { ok: false, error: 'Account not found.' };
    }

    let existingWallet: string | null = null;

    const ok = await setSessionAccount({ id: accountId, wallet: existingWallet });
    return { ok, error: ok ? undefined : 'Failed to establish session.' };
  } catch (err) {
    logger.error('signInWithUsername error:', err);
    return { ok: false, error: 'An unexpected error occurred during sign-in.' };
  }
}

export async function getSessionInfo(): Promise<{ id: string; wallet: string | null } | null> {
  return getSessionAccount();
}


export async function signOut(): Promise<void> {
  await clearSessionAccount();
}
