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

export type AccountRow = { id: string; display_name: string | null; role: string; created_at: string };

// Accounts for the admin roles page, newest first, optionally those whose display name contains
// `search`. Secret key only (users.role is not in the public column grant). The wildcards in
// `search` are escaped so a name like "50%" matches literally.
export async function listAccounts(search: string, limit: number, offset: number): Promise<AccountRow[]> {
  let query = admin()
    .from('users')
    .select('id, display_name, role, created_at')
    .order('created_at', { ascending: false })
    .order('id')
    .range(offset, offset + limit - 1);
  if (search) query = query.ilike('display_name', `%${search.replace(/[\\%_]/g, '\\$&')}%`);
  return unwrap<AccountRow[]>('roles.list', await query) ?? [];
}
