import 'server-only';
import { admin } from './client';
import { unwrap } from './errors';

// Writes one remote_config row, creating it when the key has none. Secret key only: the table
// has no write policy for the public key. The caller has already checked the key and value
// (lib/services/config-admin.ts); the reads stay in sdk/remote_config.
export async function upsertConfigValue(key: string, value: unknown): Promise<void> {
  unwrap(
    'remote_config.upsert',
    await admin().from('remote_config').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  );
}
