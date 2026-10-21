# lib/services/admin/account-deletion.ts
lines:36 exports:DeleteAccountResult,deleteAccount
---
import { logger } from '@/lib/logger';
import { deleteAuthUser } from '@/lib/db/auth';
import { authUserIdOf, deleteUserRow } from '@/lib/db/users';
import type { SessionAccount } from '../session';

export type DeleteAccountResult =
  | { success: true }
  | { success: false; error: string; code: 'DELETE_FAILED' };

const FAILED: DeleteAccountResult = {
  success: false,
  error: 'Could not delete your account. Try again.',
  code: 'DELETE_FAILED',
};

// Not a server action: callers pass the account from the session, never from a request.
// The auth identity goes first: deleting only the users row would leave the email able to
// sign in and get a fresh empty account. A failure after that point is safe to retry,
// since an already-deleted auth user counts as done and the id is read before it is nulled.
export async function deleteAccount(account: SessionAccount): Promise<DeleteAccountResult> {
  try {
    const authUserId = await authUserIdOf(account.id);
    if (authUserId) {
      const { error } = await deleteAuthUser(authUserId);
      if (error && error.status !== 404 && error.code !== 'user_not_found') {
        logger.error('[deleteAccount:auth]', error);
        return FAILED;
      }
    }
    await deleteUserRow(account.id);
    return { success: true };
  } catch (error: unknown) {
    logger.error('[deleteAccount]', error);
    return FAILED;
  }
}
