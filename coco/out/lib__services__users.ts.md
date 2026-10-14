# lib/services/users.ts
lines:17 exports:ensureAccountForAuthUser
---
import 'server-only';
import { ensureUserForAuthUser } from '@/lib/db/users';
import { logger } from '@/lib/logger';

// The account id for a Supabase Auth user (email sign-in), creating the account
// if this is its first verified code. Never call this without a verified OTP.
export async function ensureAccountForAuthUser(
  authUserId: string,
  displayName?: string
): Promise<string | null> {
  try {
    return await ensureUserForAuthUser(authUserId, displayName || `Player-${authUserId.slice(0, 4)}`);
  } catch (err) {
    logger.error('ensureAccountForAuthUser error:', err);
    return null;
  }
}
