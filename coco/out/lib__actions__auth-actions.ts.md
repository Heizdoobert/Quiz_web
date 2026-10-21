# lib/actions/auth-actions.ts
lines:279 exports:VerifyCodeOptions,signUpWithEmail,signInWithEmail,requestVerificationCode,verifyVerificationCode,requestPasswordReset,verifyPasswordResetCode,updatePasswordWithReset,requestEmailCode,verifyEmailCode,signUpWithUsername,signInWithUsername,getSessionInfo,signOut
---
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
