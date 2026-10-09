import 'server-only';
import { ensureAccountForAuthUser } from '@/lib/services/users';
import type { SessionAccount } from '@/lib/services/session';
import { supabase } from '@/lib/supabase/supabase';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';
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
    if (!accountId) return { ok: false, error: 'Could not create user account.' };
    return { ok: true, account: { id: accountId } };
  } catch (err) {
    logger.error('signUpAccount error:', err);
    return { ok: false, error: 'An unexpected error occurred during registration.' };
  }
}

export async function signInAccount(username: string, password: string): Promise<CredentialResult> {
  try {
    const trimmed = username.trim();
    if (!trimmed || !password) {
      return { ok: false, error: 'Username and password are required.' };
    }
    // Counts every attempt, not just failures: one counter, and a legitimate user never nears 10.
    if (!(await allowAttempt('signin', trimmed, 10, 900))) return { ok: false, error: RATE_LIMITED_MESSAGE };

    const { data, error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(trimmed),
      password,
    });
    if (error || !data?.user) return { ok: false, error: 'Invalid username or password.' };

    const accountId = await ensureAccountForAuthUser(data.user.id, trimmed);
    if (!accountId) return { ok: false, error: 'Account not found.' };
    return { ok: true, account: { id: accountId } };
  } catch (err) {
    logger.error('signInAccount error:', err);
    return { ok: false, error: 'An unexpected error occurred during sign-in.' };
  }
}

// Google sign-in for the mobile app: the app gets a Google ID token from the OS and
// Supabase Auth checks it (the Google provider must be enabled there, with the app's
// client ids). Nothing is trusted until Supabase has verified the token.
export async function signInAccountWithGoogle(idToken: string): Promise<CredentialResult> {
  try {
    if (!(await allowAttemptFromIp('google-ip', 30, 600))) return { ok: false, error: RATE_LIMITED_MESSAGE };
    const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
    if (error || !data?.user) return { ok: false, error: 'Google sign-in failed.' };

    const accountId = await ensureAccountForAuthUser(data.user.id, data.user.user_metadata?.name);
    if (!accountId) return { ok: false, error: 'Account not found.' };
    return { ok: true, account: { id: accountId } };
  } catch (err) {
    logger.error('signInAccountWithGoogle error:', err);
    return { ok: false, error: 'An unexpected error occurred during sign-in.' };
  }
}
