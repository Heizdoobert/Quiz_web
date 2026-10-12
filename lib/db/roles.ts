import 'server-only';
import { admin } from './client';
import { unwrapOne } from './errors';

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
