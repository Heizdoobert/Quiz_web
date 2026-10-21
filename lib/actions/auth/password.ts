'use server';

import {
  requestPasswordResetService,
  verifyPasswordResetCodeService,
  updatePasswordWithResetService,
} from '@/lib/services/auth/password-reset';
import { clearSessionAccount, setSessionAccount } from '@/lib/services/auth/session';
import { logger } from '@/lib/logger';
import type { AuthResult } from './types';

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
