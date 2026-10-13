import { AccountRow, listAccounts, roleOf, setRole } from '@/lib/db/roles';
import { logger } from '@/lib/logger';
import { ActionResult } from '@/lib/types';
import { isUuid } from '@/lib/utils/validation';
import { authorize } from './authorize';
import { isRole, Role } from './rbac';
import { SessionAccount } from './session';

// Deliberately not in lib/actions: every export of a 'use server' file is a public endpoint
// whose arguments the caller controls, so a function taking an account there lets anyone
// claim to be an admin. This module is only reachable from route handlers, which pass the
// account they verified from the bearer token. A web page must wrap it in a server action
// that takes no account argument and lets authorize() read the session cookie.
export async function setAccountRole(
  params: { accountId: unknown; role: unknown },
  authAccount?: SessionAccount
): Promise<ActionResult<{ accountId: string; role: Role }>> {
  // Before validating, so a caller without the permission learns nothing from the errors.
  const auth = await authorize('roles.grant', authAccount);
  if (!auth.success) return auth;
  const actor = auth.data.account;

  const { role } = params;
  if (!isUuid(params.accountId) || !isRole(role)) {
    return {
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'A valid account id and a role (user, moderator or admin) are required.' },
    };
  }
  const targetId = params.accountId.toLowerCase();
  if (targetId === actor.id.toLowerCase()) {
    return { success: false, error: { code: 'CONFLICT', message: 'You cannot change your own role.' } };
  }

  const notFound = { success: false, error: { code: 'NOT_FOUND', message: 'Account not found.' } } as const;
  try {
    const previous = await roleOf(targetId);
    if (previous === null) return notFound;
    if (previous !== role) {
      if (!(await setRole(targetId, role))) return notFound;
      logger.info('role_changed', { actorId: actor.id, targetId, from: previous, to: role });
    }
    return { success: true, data: { accountId: targetId, role } };
  } catch (err) {
    logger.error('role_change_failed', err, { actorId: actor.id, targetId });
    return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to change the role.' } };
  }
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_SEARCH_LENGTH = 50;

// The roles page's account list. Same permission as setAccountRole.
export async function listAccountsForAdmin(
  params: { search: unknown; limit: unknown; offset: unknown },
  authAccount?: SessionAccount
): Promise<ActionResult<{ accounts: AccountRow[]; limit: number; offset: number }>> {
  const auth = await authorize('roles.grant', authAccount);
  if (!auth.success) return auth;

  const search = typeof params.search === 'string' ? params.search.trim().slice(0, MAX_SEARCH_LENGTH) : '';
  const { limit: rawLimit, offset: rawOffset } = params;
  const limit = typeof rawLimit === 'number' && Number.isInteger(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, MAX_LIMIT) : DEFAULT_LIMIT;
  const offset = typeof rawOffset === 'number' && Number.isInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
  try {
    return { success: true, data: { accounts: await listAccounts(search, limit, offset), limit, offset } };
  } catch (err) {
    logger.error('role_list_failed', err, { actorId: auth.data.account.id });
    return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load the accounts.' } };
  }
}
