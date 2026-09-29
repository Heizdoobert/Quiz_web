import { describe, it, expect, vi } from 'vitest';
import { ensureAccountForWallet } from '../lib/users';

// Isolated from identity-accounts.test.ts because it needs supabaseAdmin to be
// null for the whole file, not toggled mid-test.
vi.mock('../lib/supabase-admin', () => ({ supabaseAdmin: null }));

describe('ensureAccountForWallet with no secret key configured', () => {
  it('logs and returns no account without throwing', async () => {
    await expect(ensureAccountForWallet('0x' + 'a'.repeat(40))).resolves.toBeNull();
  });
});
