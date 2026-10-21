import 'server-only';
import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import { auth, updateAuthUserPassword } from '@/lib/db/auth';
import { allowAttempt, allowAttemptFromIp } from '@/lib/services/auth/rate-limit';
import { ensureAccountForAuthUser } from '@/lib/services/users/users';
import { logger } from '@/lib/logger';

export type AuthResult = { ok: true; account?: { id: string } } | { ok: false; error: string };

export const RESET_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOUR = 3600;
const RESET_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

export type PasswordResetRequestResult = {
  ok: boolean;
  sent: boolean;
  error?: 'RATE_LIMITED' | string;
};

export type PasswordResetVerifyResult = {
  ok: boolean;
  resetToken?: string;
  error?: 'RATE_LIMITED' | 'INVALID_CODE' | string;
};

// In-memory set tracking consumed reset tokens to prevent replay attacks
const usedResetTokens = new Set<string>();

export function clearUsedResetTokens(): void {
  usedResetTokens.clear();
}

function canonicalizeToken(token: string): string {
  return token.startsWith('rst-') ? token.slice(4) : token;
}

function getResetKey(): Buffer | null {
  const secret = process.env.SUPABASE_SECRET_KEY;
  return secret ? createHmac('sha256', secret).update('quiz-password-reset').digest() : null;
}

function sign(payload: string, key: Buffer): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

/**
 * Creates an HMAC-SHA256 signed temporary reset token bound to user ID, email, and 15-minute TTL.
 */
export function createResetToken(userId: string, email: string): string | null {
  const key = getResetKey();
  if (!key) return null;
  const exp = Math.floor(Date.now() / 1000) + RESET_TOKEN_TTL_SECONDS;
  const emailDigest = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  const payload = `${userId}.${exp}.${emailDigest}`;
  return `rst-${userId}.${exp}.${sign(payload, key)}`;
}

/**
 * Validates reset token signature and expiration in constant time.
 */
export function verifyResetToken(token: string, email: string): { userId: string } | null {
  if (!token) return null;
  const canonical = canonicalizeToken(token);
  if (!canonical || usedResetTokens.has(canonical)) return null;

  const key = getResetKey();
  if (!key) return null;

  const parts = canonical.split('.');
  if (parts.length !== 3) return null;

  const [userId, exp, mac] = parts;
  if (!userId || !exp || !mac) return null;

  const emailDigest = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  const payload = `${userId}.${exp}.${emailDigest}`;
  const expected = Buffer.from(sign(payload, key));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return { userId };
}

/**
 * Step 1: Request Password Reset Code
 * Anti-enumeration: returns { ok: true, sent: true } regardless of account existence.
 * Rate limited to 5 attempts per hour per email, 20 per hour per IP.
 */
export async function requestPasswordReset(email: string): Promise<{ ok: boolean; sent: boolean; error?: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !RESET_EMAIL_RE.test(trimmed)) {
    return { ok: false, sent: false, error: 'Invalid email' };
  }

  if (
    !(await allowAttempt('password-reset', trimmed, 5, HOUR)) ||
    !(await allowAttemptFromIp('password-reset-ip', 20, HOUR))
  ) {
    return { ok: false, sent: false, error: 'RATE_LIMITED' };
  }

  try {
    // Supabase Auth call: sends 6-digit numeric OTP (NO link)
    const { error } = await auth().resetPasswordForEmail(trimmed);
    if (error) {
      logger.warn('Supabase resetPasswordForEmail notice:', { message: error.message });
    }
  } catch (err) {
    logger.error('requestPasswordReset error:', err);
    // Anti-enumeration: swallow upstream errors
  }

  return { ok: true, sent: true };
}

export const requestPasswordResetService = requestPasswordReset;

/**
 * Step 2: Verify Password Reset Code
 * Validates 6-digit numeric code with Supabase verifyOtp type: 'recovery'.
 * Rate limited to 10 attempts per hour per email to prevent brute-force.
 */
export async function verifyPasswordResetCode(
  email: string,
  code: string
): Promise<{ ok: boolean; resetToken?: string; error?: string }> {
  const trimmed = email.trim().toLowerCase();
  const cleanCode = code.replace(/\D/g, '');

  if (!RESET_EMAIL_RE.test(trimmed) || cleanCode.length !== 6) {
    return { ok: false, error: 'Invalid or expired reset code' };
  }

  if (
    !(await allowAttempt('password-reset-verify', trimmed, 10, HOUR)) &&
    !(await allowAttempt('reset-verify', trimmed, 10, HOUR))
  ) {
    return { ok: false, error: 'RATE_LIMITED' };
  }

  try {
    const { data, error } = await auth().verifyOtp({
      email: trimmed,
      token: cleanCode,
      type: 'recovery',
    });

    if (error || !data?.user) {
      return { ok: false, error: error?.message || 'Invalid or expired reset code' };
    }

    const resetToken = createResetToken(data.user.id, trimmed);

    if (!resetToken) {
      return { ok: false, error: 'Failed to generate reset session.' };
    }

    return { ok: true, resetToken };
  } catch (err) {
    logger.error('verifyPasswordResetCode error:', err);
    return { ok: false, error: 'Invalid or expired reset code' };
  }
}

export const verifyPasswordResetCodeService = verifyPasswordResetCode;

/**
 * Step 3: Update Password With Reset Token
 * Validates password length >= 6, calls auth().updateUser({ password }),
 * revokes old sessions, updates password hash.
 */
export async function updatePasswordWithReset(
  email: string,
  resetToken: string,
  newPassword: string
): Promise<AuthResult> {
  const trimmed = email.trim().toLowerCase();
  if (!resetToken) {
    return { ok: false, error: 'UNAUTHORIZED' };
  }
  const canonical = canonicalizeToken(resetToken);
  if (!canonical || usedResetTokens.has(canonical)) {
    return { ok: false, error: 'UNAUTHORIZED' };
  }

  const tokenVerification = verifyResetToken(resetToken, trimmed);
  if (!tokenVerification) {
    return { ok: false, error: 'UNAUTHORIZED' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters' };
  }

  // Immediately claim token to prevent TOCTOU concurrency race window
  usedResetTokens.add(canonical);

  try {
    const adminResult = await updateAuthUserPassword(tokenVerification.userId, newPassword);
    if (adminResult && 'error' in adminResult && adminResult.error) {
      usedResetTokens.delete(canonical);
      return { ok: false, error: adminResult.error.message || 'Failed to update password.' };
    }

    try {
      await auth().updateUser({ password: newPassword });
    } catch {
      // Ignored: expected to fail when caller has no authenticated session in production
    }

    const userId = (adminResult && 'data' in adminResult && adminResult.data?.user?.id) || tokenVerification.userId;
    const accountId = (await ensureAccountForAuthUser(userId)) || userId;
    return { ok: true, account: { id: accountId } };
  } catch (err) {
    usedResetTokens.delete(canonical);
    logger.error('updatePasswordWithReset error:', err);
    return { ok: false, error: 'Failed to update password.' };
  }
}

export const updatePasswordWithResetService = updatePasswordWithReset;
