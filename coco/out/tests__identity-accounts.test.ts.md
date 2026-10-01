# tests/identity-accounts.test.ts
lines:307 exports:
---
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { getSessionAccount, setSessionAccount } from '../lib/session';
import { ensureAccountForWallet } from '../lib/users';
import {
  signInWithWallet,
  getSignedInWallet,
  requestEmailCode,
  verifyEmailCode,
  linkWallet,
} from '../lib/actions/auth-actions';
import { supabaseAdmin } from '../lib/supabase-admin';
import { supabase } from '../lib/supabase';

const ACCOUNT_ID = '11111111-2222-4333-8444-555555555555';
const OTHER_ID = '99999999-2222-4333-8444-555555555555';
const WALLET = '0x' + 'a'.repeat(40);
const MIXED_CASE_WALLET = '0x' + 'A'.repeat(40);

const state = vi.hoisted(() => ({ jar: new Map<string, string>(), siweValid: true }));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (state.jar.has(name) ? { value: state.jar.get(name)! } : undefined),
    set: (name: string, value: string) => void state.jar.set(name, value),
    delete: (name: string) => void state.jar.delete(name),
  }),
  headers: async () => ({ get: (k: string) => (k === 'host' ? 'quiz.example.com' : null) }),
}));
vi.mock('../lib/supabase-admin', () => ({ supabaseAdmin: { from: vi.fn() } }));
vi.mock('../lib/supabase', () => ({
  supabase: { auth: { signInWithOtp: vi.fn(), verifyOtp: vi.fn() } },
}));
vi.mock('../lib/chain', () => ({
  publicClientFor: () => ({ verifySiweMessage: async () => state.siweValid }),
}));
vi.mock('viem/siwe', () => ({
  createSiweMessage: vi.fn(),
  generateSiweNonce: () => 'nonce',
  parseSiweMessage: () => ({ address: MIXED_CASE_WALLET, chainId: 84532 }),
}));
