import { roleOf } from '@/lib/db/roles';
import { logger } from '@/lib/logger';
import { ActionResult } from '@/lib/types';
import { can, isRole, Permission, Role } from './rbac';
import { getSessionAccount, SessionAccount } from './session';

// The one check every gated action and route goes through. Identity comes from the
// account the caller verified (bearer token) or else the session cookie; the role is
// read from the database on every call, so a revoked role stops working on the next
// request. Any failure to read it denies: it never falls back to allowing.
export async function authorize(
  permission: Permission,
  authAccount?: SessionAccount
): Promise<ActionResult<{ account: SessionAccount; role: Role }>> {
  const account = authAccount ?? (await getSessionAccount());
  if (!account) return { success: false, error: { code: 'UNAUTHORIZED', message: 'Sign in required.' } };

  let role: string | null;
  try {
    role = await roleOf(account.id);
  } catch (err) {
    logger.error('authorize_role_read_failed', err, { userId: account.id, permission });
    return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to check permissions.' } };
  }

  if (!isRole(role) || !can(role, permission)) {
    logger.warn('authorize_denied', { userId: account.id, role, permission });
    return { success: false, error: { code: 'NOT_ALLOWED', message: 'You do not have permission to do that.' } };
  }
  return { success: true, data: { account, role } };
}
