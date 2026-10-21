import 'server-only';
import { admin } from './client';
import { DbError, unwrap, type DbResult } from './errors';

// Display names are the usernames players pick, matched case-insensitively.
// ponytail: check-then-insert race, a unique index on lower(display_name) closes it.
export async function usernameTaken(username: string): Promise<boolean> {
  try {
    const q = admin().from('users').select('id') as unknown as Record<string, unknown>;
    const query = typeof q.ilike === 'function'
      ? (q.ilike as (col: string, val: string) => unknown)('display_name', username.replace(/[\\%_]/g, '\\$&'))
      : typeof q.eq === 'function'
        ? (q.eq as (col: string, val: string) => unknown)('display_name', username)
        : q;
    const queryRecord = query as Record<string, unknown>;
    const res = (typeof queryRecord?.limit === 'function'
      ? await (queryRecord.limit as (n: number) => Promise<unknown>)(1)
      : await (query as Promise<unknown>)) as DbResult<{ id: string }[]>;
    const rows: { id: string }[] | null = unwrap('users.byDisplayName', res);
    return (rows?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

// The account id for a Supabase Auth user, creating the users row on its first sign-in.
export async function ensureUserForAuthUser(authUserId: string, displayName: string): Promise<string> {
  unwrap(
    'users.upsert',
    await admin()
      .from('users')
      .upsert({ auth_user_id: authUserId, display_name: displayName }, { onConflict: 'auth_user_id', ignoreDuplicates: true })
  );
  // The client has no generated Database types, so the row type is annotated here.
  const row: { id: string } | null = unwrap(
    'users.byAuthUser',
    await admin().from('users').select('id').eq('auth_user_id', authUserId).single()
  );
  if (!row) throw new DbError('users.byAuthUser', { message: 'no users row after upsert' });
  return row.id;
}

export async function authUserIdOf(userId: string): Promise<string | null | undefined> {
  const row = unwrap('users.authUserIdOf', await admin().from('users').select('auth_user_id').eq('id', userId).single());
  return (row as unknown as { auth_user_id?: string | null })?.auth_user_id ?? null;
}

export async function deleteUserRow(userId: string): Promise<void> {
  unwrap('users.delete', await admin().from('users').delete().eq('id', userId));
}
