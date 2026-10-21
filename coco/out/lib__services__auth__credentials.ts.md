# lib/services/auth/credentials.ts
lines:293 exports:EMAIL_RE,USERNAME_RE,CredentialResult,isEmailIdentifier,usernameToEmail,signUpAccount,signInAccount,signInAccountWithGoogle,signUpWithEmail,signInWithEmail
---
// import 'server-only'; // disabled for node script
// Use relative imports for Node script execution (aliases not resolved at runtime)
import { ensureAccountForAuthUser } from '../users';
import type { SessionAccount } from './session';
import { auth, createConfirmedUser } from '../../db/auth';
import { usernameTaken } from '../../db/users';
import { allowAttempt, allowAttemptFromIp } from './rate-limit';
import { logger } from '../../logger';
import type { AuthResult } from './password-reset';
// In-memory user store for test environment
const __testUserStore = new Map<string, { id: string; password: string; username?: string }>();

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
