# tests/auth-signin-page.test.tsx
lines:163 exports:
---
// tests/auth-signin-page.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import SignInContainer from '@/components/auth/SignInContainer';
import * as authActions from '@/lib/actions/auth-actions';
import { sanitizeRedirectUrl } from '@/lib/utils/redirect';

// Mocks
const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/hooks/shared/use-session', () => ({
  useSession: () => ({
    account: null,
    refresh: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock('@/lib/actions/auth-actions', () => ({
  signInWithEmail: vi.fn(),
  requestVerificationCode: vi.fn(),
  verifyVerificationCode: vi.fn(),
  requestPasswordReset: vi.fn(),
  verifyPasswordResetCode: vi.fn(),
  updatePasswordWithReset: vi.fn(),
}));

describe('Sign-In Page (R2 / F6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TC-SIP-01: Happy Path Sign-In & Redirect Preservation', () => {
