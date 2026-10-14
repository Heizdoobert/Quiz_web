# lib/services/role-admin.ts
lines:48 exports:setAccountRole
---
import { roleOf, setRole } from '@/lib/db/roles';
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
