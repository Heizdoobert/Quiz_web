import 'server-only';
import { admin, pub } from '../client';
import { FK_VIOLATION, unwrap, UNIQUE_VIOLATION } from '../errors';

// groups and group_members. Writes use the secret key: the public key can no longer write them.

// The new group row, or 'taken' when the name is in use.
export async function insertGroup(row: {
  name: string;
  description: string | null;
  owner_user: string;
}): Promise<unknown | 'taken'> {
  const res = await admin().from('groups').insert(row).select().single();
  if (res.error?.code === UNIQUE_VIOLATION) return 'taken';
  return unwrap('groups.insert', res);
}

export async function addMember(groupId: string, accountId: string): Promise<'added' | 'already-member' | 'no-group'> {
  const res = await admin().from('group_members').insert({ group_id: groupId, user_id: accountId });
  if (res.error?.code === UNIQUE_VIOLATION) return 'already-member';
  if (res.error?.code === FK_VIOLATION) return 'no-group';
  unwrap('groups.addMember', res);
  return 'added';
}

export async function removeMember(groupId: string, accountId: string): Promise<void> {
  unwrap(
    'groups.removeMember',
    await admin().from('group_members').delete().eq('group_id', groupId).eq('user_id', accountId)
  );
}

export async function groupsForAccount(accountId: string): Promise<unknown[]> {
  const rows = unwrap(
    'groups.forAccount',
    await pub.from('group_members').select('group_id, groups(*)').eq('user_id', accountId)
  );
  return (rows ?? []).map((d: { groups: unknown }) => d.groups).filter(Boolean);
}
