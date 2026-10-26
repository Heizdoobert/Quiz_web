# lib/services/auth/password-reset.ts
lines:221 exports:AuthResult,RESET_EMAIL_RE,PasswordResetRequestResult,PasswordResetVerifyResult,clearUsedResetTokens,createResetToken,verifyResetToken,requestPasswordReset,requestPasswordResetService,verifyPasswordResetCode,verifyPasswordResetCodeService,updatePasswordWithReset,updatePasswordWithResetService
---
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
