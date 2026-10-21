import { upsertConfigValue } from '@/lib/db/remote-config';
import { logger } from '@/lib/logger';
import { ActionResult } from '@/lib/types';
import { KEYS } from '@/sdk/remote_config/keys';
import { authorize } from '../authorize';
import { SessionAccount } from '../session';

// Not in lib/actions for the reason given in role-admin.ts: the account is never an argument
// a caller controls. A web page wraps this in a server action that takes none.
export async function setConfigValue(
  params: { key: unknown; value: unknown },
  authAccount?: SessionAccount
): Promise<ActionResult<{ key: string; value: unknown }>> {
  // Before validating, so a caller without the permission learns nothing from the errors.
  const auth = await authorize('config.write', authAccount);
  if (!auth.success) return auth;
  const actor = auth.data.account;

  const { key, value } = params;
  // hasOwn, not `in`: 'constructor' and '__proto__' are not registered keys.
  if (typeof key !== 'string' || !Object.hasOwn(KEYS, key)) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: 'That is not a registered config key.' } };
  }
  if (KEYS[key as keyof typeof KEYS].parse(value) === undefined) {
    return { success: false, error: { code: 'VALIDATION_ERROR', message: `The value is not valid for ${key}.` } };
  }

  try {
    await upsertConfigValue(key, value);
    logger.info('config_changed', { actorId: actor.id, key, value });
    return { success: true, data: { key, value } };
  } catch (err) {
    logger.error('config_change_failed', err, { actorId: actor.id, key });
    return { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to save the config.' } };
  }
}
