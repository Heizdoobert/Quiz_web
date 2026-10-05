# tests/auth-adapter.test.ts
lines:715 exports:
---
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createQuizAuthAdapter } from '../lib/services/auth-adapter';
import { useQuizAuth } from '../hooks/shared/use-quiz-auth';
import {
  getAuthNonce,
  signInWithWallet,
  signOutWallet,
  getSignedInWallet,
  getSessionInfo,
  linkWallet,
} from '../lib/actions/auth-actions';
import { useAccount } from 'wagmi';

vi.mock('../lib/actions/auth-actions', () => ({
  getAuthNonce: vi.fn(),
  signInWithWallet: vi.fn(),
  signOutWallet: vi.fn(),
  getSignedInWallet: vi.fn(),
  getSessionInfo: vi.fn(),
  linkWallet: vi.fn(),
}));

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}));

const TEST_WALLET = '0x1234567890123456789012345678901234567890' as const;

describe('RainbowKit SIWE Authentication Adapter (Task 2)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(window, 'location', {
      value: {
        host: 'quickquiz.app',
        origin: 'https://quickquiz.app',
      },
      writable: true,
      configurable: true,
    });
