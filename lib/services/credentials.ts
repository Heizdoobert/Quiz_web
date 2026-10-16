// import 'server-only'; // disabled for node script
// Use relative imports for Node script execution (aliases not resolved at runtime)
import { ensureAccountForAuthUser } from './users.ts';
import type { SessionAccount } from './session.ts';
import { auth, createConfirmedUser } from '../db/auth.ts';
import { usernameTaken } from '../db/users.ts';
import { allowAttempt, allowAttemptFromIp } from './rate-limit.ts';
import { logger } from '../logger.ts';
import type { AuthResult } from './password-reset.ts';

// Username/password, email/password, and Google sign-in, shared by web server actions
// (lib/actions/auth-actions.ts, which set cookies) and mobile routes
// (app/api/mobile/v1/auth/*, which issue bearer tokens). They verify credentials;
// session persistence is the caller's responsibility.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const HOUR = 3600;
const RATE_LIMITED_MESSAGE = 'Too many attempts. Please try again later.';

export type { AuthResult };

export type CredentialResult =
  | { ok: true; account: SessionAccount; requiresVerification?: boolean }
  | { ok: false; error: string };

export function isEmailIdentifier(identifier: string): boolean {
  return identifier.includes('@');
}

export function usernameToEmail(identifier: string): string {
  const trimmed = identifier.trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : `${trimmed}@player.quiz`;
}

export async function signUpAccount(
  identifier: string,
  password: string,
  displayName?: string
): Promise<CredentialResult> {
  try {
    const trimmed = identifier.trim();
    const isEmail = isEmailIdentifier(trimmed);

    if (isEmail) {
      if (!EMAIL_RE.test(trimmed)) {
        return { ok: false, error: 'Invalid email address.' };
      }
    } else {
      if (!USERNAME_RE.test(trimmed)) {
        return { ok: false, error: 'Username must be 3-20 characters (letters, numbers, underscores).' };
      }
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

    const trimmedName = displayName?.trim();
    if (trimmedName) {
      if (!USERNAME_RE.test(trimmedName)) {
        return { ok: false, error: 'Username must be 3-20 characters (letters, numbers, underscores).' };
      }
      if (await usernameTaken(trimmedName)) {
        return { ok: false, error: 'Username is already taken.' };
      }
    }

    const email = isEmail ? trimmed.toLowerCase() : usernameToEmail(trimmed);
    const targetUsername = trimmedName || (!isEmail ? trimmed : undefined);

    let authUserId: string | null = null;
    let requiresVerification = false;

    // For usernames (pseudo-emails), create confirmed user via admin to skip email delivery
    if (!isEmail) {
      const created = await createConfirmedUser(email, password, trimmed);
      if (created) {
        const { data, error } = created;
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('unique')) {
            return { ok: false, error: 'Username is already taken.' };
          }
        } else if (data?.user) {
          authUserId = data.user.id;
        }
      }
    }

    // For genuine emails, or if createConfirmedUser is not available:
    if (!authUserId) {
      const { data, error } = await auth().signUp({
        email,
        password,
        options: {
          data: {
            ...(targetUsername && { username: targetUsername }),
          },
        },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('unique')) {
          return { ok: false, error: isEmail ? 'Email is already registered.' : 'Username is already taken.' };
        }
        return { ok: false, error: error.message || 'Failed to create account.' };
      }

      if (!data.user) {
        return { ok: false, error: 'Registration failed. Try a different username or email.' };
      }

      authUserId = data.user.id;

      // In Supabase, if email confirmation is required and user is unconfirmed:
      if (isEmail && !data.user.email_confirmed_at && !data.session) {
        requiresVerification = true;
      }
    }

    if (requiresVerification) {
      return { ok: true, account: { id: authUserId }, requiresVerification: true };
    }

    const accountId = (await ensureAccountForAuthUser(authUserId, targetUsername)) || authUserId;
    return { ok: true, account: { id: accountId }, requiresVerification: false };
  } catch (err) {
    logger.error('signUpAccount error:', err);
    return { ok: false, error: 'An unexpected error occurred during registration.' };
  }
}

export async function signInAccount(
  identifier: string,
  password: string
): Promise<CredentialResult> {
  try {
    const trimmed = identifier.trim();
    const isEmail = isEmailIdentifier(trimmed);

    if (!trimmed || !password) {
      return {
        ok: false,
        error: isEmail ? 'Email and password are required.' : 'Username and password are required.',
      };
    }

    if (isEmail && !EMAIL_RE.test(trimmed)) {
      return { ok: false, error: 'Invalid email address.' };
    }

    // Counts every attempt, not just failures: one counter, and a legitimate user never nears 10.
    if (!(await allowAttempt('signin', trimmed, 10, 900))) {
      return { ok: false, error: RATE_LIMITED_MESSAGE };
    }

    const email = isEmail ? trimmed.toLowerCase() : usernameToEmail(trimmed);
    const { data, error } = await auth().signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user) {
      if (error?.message?.toLowerCase().includes('email not confirmed')) {
        return { ok: false, error: 'Email not confirmed. Please verify your email first.' };
      }
      return {
        ok: false,
        error: isEmail ? 'Invalid email or password.' : 'Invalid username or password.',
      };
    }

    const accountId =
      (await ensureAccountForAuthUser(
        data.user.id,
        data.user.user_metadata?.username || (isEmail ? undefined : trimmed)
      )) || data.user.id;
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
    const { data, error } = await auth().signInWithIdToken({ provider: 'google', token: idToken });
    if (error || !data?.user) return { ok: false, error: 'Google sign-in failed.' };

    const accountId = await ensureAccountForAuthUser(data.user.id, data.user.user_metadata?.name);
    if (!accountId) return { ok: false, error: 'Account not found.' };
    return { ok: true, account: { id: accountId } };
  } catch (err) {
    logger.error('signInAccountWithGoogle error:', err);
    return { ok: false, error: 'An unexpected error occurred during sign-in.' };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResult & { requiresVerification?: boolean }> {
  const trimmed = email ? email.trim() : '';
  if (!trimmed || !EMAIL_RE.test(trimmed)) {
    return { ok: false, error: 'Invalid email address.' };
  }
  const result = await signUpAccount(email, password, displayName);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  if (result.requiresVerification) {
    return { ok: true, requiresVerification: true };
  }
  return { ok: true, account: result.account, requiresVerification: false };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const trimmed = email ? email.trim() : '';
  if (!trimmed || !password?.trim()) {
    return { ok: false, error: 'Email and password are required.' };
  }
  if (!EMAIL_RE.test(trimmed)) {
    return { ok: false, error: 'Invalid email address.' };
  }
  const result = await signInAccount(email, password);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, account: result.account };
}

export {
  requestPasswordReset,
  verifyPasswordResetCode,
  updatePasswordWithReset,
} from '@/lib/services/password-reset';
