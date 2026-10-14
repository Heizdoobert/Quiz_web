# lib/db/users.ts
lines:20 exports:ensureUserForAuthUser
---
import 'server-only';
import { admin } from './client';
import { DbError, unwrap } from './errors';

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
