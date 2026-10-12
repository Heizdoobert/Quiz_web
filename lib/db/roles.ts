import 'server-only';
import { admin } from './client';
import { unwrap, unwrapOne } from './errors';

// The account's stored role, or null when it has no users row. Secret key only: users.role
// is not in the public-key column grant (21-rbac.sql). The value is not validated here;
// can() in lib/services/rbac.ts denies anything that is not a known role.
export async function roleOf(accountId: string): Promise<string | null> {
  const row: { role: string } | null = unwrapOne(
    'roles.get',
    await admin().from('users').select('role').eq('id', accountId).single()
  );
  return row?.role ?? null;
}

// Sets the account's role; false when no users row matched. users_role_check rejects
// anything but user, moderator or admin, so a bad value throws a DbError.
export async function setRole(accountId: string, role: string): Promise<boolean> {
  const rows: { id: string }[] | null = unwrap(
    'roles.set',
    await admin().from('users').update({ role }).eq('id', accountId).select('id')
  );
  return (rows?.length ?? 0) > 0;
}
