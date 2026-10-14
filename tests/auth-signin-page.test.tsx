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
    it('signs in with valid email/password and redirects to return URL', async () => {
      vi.mocked(authActions.signInWithEmail).mockResolvedValue({
        ok: true,
        account: { id: 'usr-123' },
      });

      render(<SignInContainer initialRedirect="/profile?tab=history" />);

      fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'alice@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'ValidPass123!' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

      await waitFor(() => {
        expect(authActions.signInWithEmail).toHaveBeenCalledWith('alice@example.com', 'ValidPass123!');
        expect(mockReplace).toHaveBeenCalledWith('/profile?tab=history');
      });
    });
  });

  describe('TC-SIP-02: Open Redirect Defense', () => {
    it('sanitizes external redirect URLs to safe /profile default', () => {
      expect(sanitizeRedirectUrl('https://evil.com/phish')).toBe('/profile');
      expect(sanitizeRedirectUrl('//evil.com')).toBe('/profile');
      expect(sanitizeRedirectUrl('javascript:alert(1)')).toBe('/profile');
      expect(sanitizeRedirectUrl('/admin/dashboard')).toBe('/admin/dashboard');
    });
  });

  describe('TC-SIP-03: Unverified Email -> 6-Digit OTP Flow', () => {
    it('transitions to 6-digit OTP verification when email is unconfirmed', async () => {
      vi.mocked(authActions.signInWithEmail).mockResolvedValue({
        ok: false,
        error: 'Email not confirmed. Please verify your email first.',
      });

      render(<SignInContainer />);

      fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'unverified@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'ValidPass123!' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/verify your email/i)).toBeDefined();
      });

      // Click verify with 6-digit code
      fireEvent.click(screen.getByRole('button', { name: /Verify with code/i }));

      // Asserts 6-digit input is displayed and contains NO link
      expect(screen.getByLabelText(/6-digit/i)).toBeDefined();
      expect(screen.queryByRole('link', { name: /confirm/i })).toBeNull();
    });
  });

  describe('TC-SIP-04: STRICT NO LINK Verification Submission', () => {
    it('verifies 6-digit OTP code and establishes session without magic links', async () => {
      vi.mocked(authActions.verifyVerificationCode).mockResolvedValue({
        ok: true,
        account: { id: 'usr-verified' },
      });

      render(<SignInContainer initialRedirect="/profile" />);
      fireEvent.click(screen.getByRole('button', { name: /Verify an email code/i }));

      fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'bob@example.com' } });
      fireEvent.change(screen.getByLabelText(/6-digit/i), { target: { value: '482910' } });
      fireEvent.click(screen.getByRole('button', { name: /Verify/i }));

      await waitFor(() => {
        expect(authActions.verifyVerificationCode).toHaveBeenCalledWith('bob@example.com', '482910');
        expect(mockReplace).toHaveBeenCalledWith('/profile');
      });
    });
  });

  describe('TC-SIP-05: 3-Step Password Reset Flow', () => {
    it('completes request -> verify -> new password recovery flow', async () => {
      vi.mocked(authActions.requestPasswordReset).mockResolvedValue({ sent: true });
      vi.mocked(authActions.verifyPasswordResetCode).mockResolvedValue({ ok: true, resetToken: 'rst-abc' });
      vi.mocked(authActions.updatePasswordWithReset).mockResolvedValue({ ok: true, account: { id: 'usr-123' } });

      render(<SignInContainer initialRedirect="/profile" />);
      fireEvent.click(screen.getByRole('button', { name: /Forgot password/i }));

      // Step 1: Request
      fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'alice@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /Send reset code/i }));

      // Step 2: Verify Code
      await waitFor(() => expect(screen.getByLabelText(/Recovery code/i)).toBeDefined());
      fireEvent.change(screen.getByLabelText(/Recovery code/i), { target: { value: '654321' } });
      fireEvent.click(screen.getByRole('button', { name: /Verify code/i }));

      // Step 3: Set Password
      await waitFor(() => expect(screen.getByLabelText(/New password/i)).toBeDefined());
      fireEvent.change(screen.getByLabelText(/New password/i), { target: { value: 'NewSecret123!' } });
      fireEvent.click(screen.getByRole('button', { name: /Update password/i }));

      await waitFor(() => {
        expect(authActions.updatePasswordWithReset).toHaveBeenCalledWith('alice@example.com', 'rst-abc', 'NewSecret123!');
        expect(mockReplace).toHaveBeenCalledWith('/profile');
      });
    });
  });

  describe('TC-SIP-06: Anti-Abuse Rate Limit Notice', () => {
    it('displays rate limit notice when brute-force threshold is reached', async () => {
      vi.mocked(authActions.signInWithEmail).mockResolvedValue({
        ok: false,
        error: 'Too many attempts. Please try again later.',
      });

      render(<SignInContainer />);
      fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'target@example.com' } });
      fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'Guess123!' } });
      fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/Too many attempts/i)).toBeDefined();
      });
    });
  });
});
