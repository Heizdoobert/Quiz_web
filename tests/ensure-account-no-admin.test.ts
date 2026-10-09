import { describe, it, expect, vi } from 'vitest';
import { ensureAccountForAuthUser } from '../lib/services/users';

// Isolated from identity-accounts.test.ts because it needs supabaseAdmin to be
// null for the whole file, not toggled mid-test.
vi.mock('../lib/supabase/supabase-admin', () => ({ supabaseAdmin: null }));

describe('ensureAccountForAuthUser with no secret key configured', () => {
  it('logs and returns no account without throwing', async () => {
    await expect(ensureAccountForAuthUser('00000000-0000-4000-8000-0000000000a1')).resolves.toBeNull();
  });
});
