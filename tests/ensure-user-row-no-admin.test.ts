import { describe, it, expect, vi } from 'vitest';
import { ensureUserRow } from '../lib/users';

// Isolated from user-persistence.test.ts because it needs supabaseAdmin to be
// null for the whole file, not toggled mid-test.
vi.mock('../lib/supabase-admin', () => ({ supabaseAdmin: null }));

describe('ensureUserRow with no secret key configured', () => {
  it('logs and returns without throwing', async () => {
    await expect(ensureUserRow('0x' + 'a'.repeat(40))).resolves.toBeUndefined();
  });
});
