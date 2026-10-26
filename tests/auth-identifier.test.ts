// @vitest-environment node
// Tests for authentication using either email or username as identifier
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

const users = new Map<string, { id: string; email: string; password: string; username?: string }>();

vi.mock('@/lib/services/auth/rate-limit', () => ({
  allowAttempt: vi.fn().mockResolvedValue(true),
  allowAttemptFromIp: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/services/users/users', () => ({
  ensureAccountForAuthUser: vi.fn(async (id: string) => id),
}));

vi.mock('@/lib/db/users', () => ({
  usernameTaken: vi.fn(async (name: string) => {
    for (const u of users.values()) {
      if (u.username?.toLowerCase() === name.toLowerCase()) return true;
    }
    return false;
  }),
}));

vi.mock('@/lib/sdk/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(async ({ email, password }: { email: string; password: string }) => {
        const lower = email.toLowerCase();
        if (users.has(lower)) {
          return { data: { user: null }, error: { message: 'User already registered' } };
        }
        const id = `auth-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        users.set(lower, { id, email: lower, password });
        return {
          data: {
            user: { id, email: lower, email_confirmed_at: '2026-10-01T00:00:00Z' },
            session: { access_token: 'fake-session-token' },
          },
          error: null,
        };
      }),
      signInWithPassword: vi.fn(async ({ email, password }: { email: string; password: string }) => {
        const lower = email.toLowerCase();
        const user = users.get(lower);
        if (!user || user.password !== password) {
          return { data: { user: null }, error: { message: 'Invalid login credentials' } };
        }
        return {
          data: {
            user: { id: user.id, email: user.email },
            session: { access_token: 'fake-session-token' },
          },
          error: null,
        };
      }),
    },
  },
}));

vi.mock('@/lib/sdk/supabase-admin', () => ({
  supabaseAdmin: {
    auth: {
      admin: {
        createUser: vi.fn(async ({ email, password, user_metadata }: { email: string; password: string; user_metadata?: { username?: string } }) => {
          const lower = email.toLowerCase();
          if (users.has(lower)) {
            return { data: { user: null }, error: { message: 'User already registered' } };
          }
          const id = `auth-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          users.set(lower, { id, email: lower, password, username: user_metadata?.username });
          return {
            data: {
              user: { id, email: lower, user_metadata },
            },
            error: null,
          };
        }),
      },
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'account-id' }, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })),
  },
}));

import { supabaseAdmin } from '@/lib/sdk/supabase-admin';
import { signUpAccount, signInAccount } from '@/lib/services/auth/credentials';

// Helper to clean up created users
async function deleteUser(userId: string) {
  await supabaseAdmin.from('auth.users').delete().eq('id', userId);
  await supabaseAdmin.from('public.usernames').delete().eq('user_id', userId);
}

describe('Auth identifier flow', () => {
  let emailUserId: string | null = null;
  let usernameUserId: string | null = null;

  beforeEach(() => {
    // Preserve state across sequence
  });

  afterAll(async () => {
    if (emailUserId) await deleteUser(emailUserId);
    if (usernameUserId) await deleteUser(usernameUserId);
  });

  it('signs up with email', async () => {
    const res = await signUpAccount('testemail@example.com', 'Password1');
    expect(res.ok).toBe(true);
    if (res.ok) emailUserId = res.account.id;
  });

  it('signs up with username', async () => {
    const res = await signUpAccount('testuser123', 'Password1');
    expect(res.ok).toBe(true);
    if (res.ok) usernameUserId = res.account.id;
  });

  it('prevents duplicate username', async () => {
    const res = await signUpAccount('testuser123', 'Password1');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('already taken');
  });

  it('signs in with email', async () => {
    const res = await signInAccount('testemail@example.com', 'Password1');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.account.id).toBe(emailUserId);
  });

  it('signs in with username', async () => {
    const res = await signInAccount('testuser123', 'Password1');
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.account.id).toBe(usernameUserId);
  });
});
