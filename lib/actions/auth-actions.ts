'use server';

import { getSessionAccount, setSessionAccount, clearSessionAccount, type SessionAccount } from '@/lib/services/session';
import { issueMobileAuthToken } from '@/lib/services/mobile-auth';
import { ensureAccountForAuthUser } from '@/lib/services/users';
import { auth } from '@/lib/db/auth';
import { usernameTaken } from '@/lib/db/users';
import {
  signInAccount,
  signUpAccount,
  USERNAME_RE,
  EMAIL_RE,
  type AuthResult,
} from '@/lib/services/credentials';
import {
  requestPasswordResetService,
  verifyPasswordResetCodeService,
  updatePasswordWithResetService,
} from '@/lib/services/password-reset';
import { allowAttempt, allowAttemptFromIp } from '@/lib/services/rate-limit';
import { logger } from '@/lib/logger';

export type { AuthResult };

export interface VerifyCodeOptions {
  issueToken?: boolean;
  type?: 'email' | 'signup';
}

const HOUR = 3600;

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
    return { ok: true, account: result.account, requiresVerification: true };
  }
  if (result.account) {
    try {
      await setSessionAccount(result.account);
    } catch (err) {
      logger.warn('Session cookie set notice:', { error: String(err) });
    }
    return { ok: true, account: result.account, requiresVerification: false };
  }
  return { ok: true, requiresVerification: true };
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
  if (result.account) {
    try {
      await setSessionAccount(result.account);
    } catch (err) {
      logger.warn('Session cookie set notice:', { error: String(err) });
    }
    return { ok: true, account: result.account };
  }
  return { ok: false, error: 'Failed to establish session.' };
}

export async function requestVerificationCode(
  email: string,
  username?: string
): Promise<{ sent: boolean; error?: string }> {
  const trimmed = email.trim().toLowerCase();
  const name = username?.trim();
  if (name !== undefined && !USERNAME_RE.test(name)) return { sent: false, error: 'INVALID_USERNAME' };
  if (EMAIL_RE.test(trimmed)) {
    if (
      !(await allowAttempt('email-code', trimmed, 5, HOUR)) ||
      !(await allowAttemptFromIp('email-code-ip', 20, HOUR))
    ) {
      return { sent: false, error: 'RATE_LIMITED' };
    }
    await auth().signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true, ...(name && { data: { username: name } }) },
    });
  }
  return { sent: true };
}

export async function verifyVerificationCode(
  email: string,
  code: string,
  options?: VerifyCodeOptions | boolean
): Promise<AuthResult & { token?: string; accountId?: string }> {
  try {
    const trimmedEmail = email.trim().toLowerCase();
    const cleanCode = code.replace(/\D/g, '');

    if (!EMAIL_RE.test(trimmedEmail) || cleanCode.length !== 6) {
      return { ok: false, error: 'Verification code must be 6 digits.' };
    }

    if (!(await allowAttempt('email-verify', trimmedEmail, 10, HOUR))) {
      return { ok: false, error: 'RATE_LIMITED' };
    }

    const opts: VerifyCodeOptions = typeof options === 'boolean' ? { issueToken: options } : options || {};
    const preferredType = opts.type ?? 'email';

    let { data, error } = await auth().verifyOtp({
      email: trimmedEmail,
      token: cleanCode,
      type: preferredType,
    });

    if (error && !opts.type) {
      const fallback = await auth().verifyOtp({
        email: trimmedEmail,
        token: cleanCode,
        type: 'signup',
      });
      if (!fallback.error && fallback.data?.user) {
        data = fallback.data;
        error = null;
      }
    }

    if (error || !data?.user) {
      return { ok: false, error: 'Wrong or expired code. Try again.' };
    }

    const accountId = await ensureAccountForAuthUser(data.user.id, data.user.user_metadata?.username);

    if (!accountId) {
      return { ok: false, error: 'Failed to provision account.' };
    }

    const ok = await setSessionAccount({ id: accountId });
    if (!ok) {
      return { ok: false, error: 'Failed to establish session.' };
    }

    if (opts.issueToken) {
      const token = issueMobileAuthToken({ id: accountId }) ?? undefined;
      return { ok: true, account: { id: accountId }, accountId, token };
    }

    return { ok: true, account: { id: accountId }, accountId };
  } catch (err) {
    logger.error('verifyVerificationCode error:', err);
    return { ok: false, error: 'An unexpected error occurred during verification.' };
  }
}

export async function requestPasswordReset(
  email: string
): Promise<{ sent: boolean; error?: string }> {
  const res = await requestPasswordResetService(email);
  return { sent: res.sent, error: res.error };
}

export async function verifyPasswordResetCode(
  email: string,
  code: string
): Promise<{ ok: boolean; resetToken?: string; error?: string }> {
  return await verifyPasswordResetCodeService(email, code);
}

export async function updatePasswordWithReset(
  email: string,
  resetToken: string,
  newPassword: string
): Promise<AuthResult> {
  const result = await updatePasswordWithResetService(email, resetToken, newPassword);
  if (!result.ok) return result;

  try {
    await clearSessionAccount();
    if (result.account) {
      await setSessionAccount(result.account);
    }
  } catch (err) {
    logger.warn('Session cookie update notice:', { error: String(err) });
  }

  return result;
}

// Backward-compatible exports
export async function requestEmailCode(
  email: string,
  username?: string
): Promise<{ sent: boolean; error?: 'RATE_LIMITED' | 'INVALID_USERNAME' | 'USERNAME_TAKEN' }> {
  const trimmed = email.trim();
  const name = username?.trim();
  if (name !== undefined && !USERNAME_RE.test(name)) return { sent: false, error: 'INVALID_USERNAME' };
  if (EMAIL_RE.test(trimmed)) {
    if (
      !(await allowAttempt('email-code', trimmed, 5, HOUR)) ||
      !(await allowAttemptFromIp('email-code-ip', 20, HOUR))
    ) {
      return { sent: false, error: 'RATE_LIMITED' };
    }
    if (name && (await usernameTaken(name))) return { sent: false, error: 'USERNAME_TAKEN' };
    await auth().signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true, ...(name && { data: { username: name } }) },
    });
  }
  return { sent: true };
}

export async function verifyEmailCode(
  email: string,
  code: string,
  options?: { issueToken?: boolean } | boolean
): Promise<{ ok: boolean; error?: 'RATE_LIMITED'; token?: string; accountId?: string }> {
  const res = await verifyVerificationCode(email, code, options);
  if (!res.ok) {
    return { ok: false, error: res.error === 'RATE_LIMITED' ? 'RATE_LIMITED' : undefined };
  }
  const shouldIssue = typeof options === 'boolean' ? options : options?.issueToken;
  if (shouldIssue) {
    return { ok: true, token: res.token, accountId: res.accountId };
  }
  return { ok: true };
}

export async function signUpWithUsername(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = username.trim();
  if (!USERNAME_RE.test(trimmed)) {
    return { ok: false, error: 'Username must be 3-20 characters (letters, numbers, underscores).' };
  }
  const result = await signUpAccount(trimmed, password);
  if (!result.ok) return result;
  if (!result.account) return { ok: false, error: 'Registration incomplete.' };
  const ok = await setSessionAccount(result.account);
  return { ok, error: ok ? undefined : 'Failed to establish session.' };
}

export async function signInWithUsername(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await signInAccount(username, password);
  if (!result.ok) return result;
  if (!result.account) return { ok: false, error: 'Account not found.' };
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
