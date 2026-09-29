import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { createQuizAuthAdapter } from '../lib/auth-adapter';
import { useQuizAuth } from '../hooks/shared/use-quiz-auth';
import { getAuthNonce, signInWithWallet, signOutWallet, getSignedInWallet } from '../lib/actions/auth-actions';
import { useAccount } from 'wagmi';

vi.mock('../lib/actions/auth-actions', () => ({
  getAuthNonce: vi.fn(),
  signInWithWallet: vi.fn(),
  signOutWallet: vi.fn(),
  getSignedInWallet: vi.fn(),
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
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      address: undefined,
      isConnected: false,
      status: 'disconnected',
    });
    (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  describe('createQuizAuthAdapter', () => {
    it('getNonce delegates to getAuthNonce server action', async () => {
      (getAuthNonce as ReturnType<typeof vi.fn>).mockResolvedValue('nonce123456');
      const adapter = createQuizAuthAdapter();

      const nonce = await adapter.getNonce();
      expect(nonce).toBe('nonce123456');
      expect(getAuthNonce).toHaveBeenCalledTimes(1);
    });

    it('createMessage formats a valid SIWE message', () => {
      const adapter = createQuizAuthAdapter();
      const msg = adapter.createMessage({
        nonce: 'nonce12345678',
        address: TEST_WALLET,
        chainId: 84532,
      });

      expect(typeof msg).toBe('string');
      expect(msg).toContain('quickquiz.app');
      expect(msg).toContain(TEST_WALLET);
      expect(msg).toContain('nonce12345678');
      expect(msg).toContain('Sign in to Quick Quiz so your answers count. This costs no gas.');
    });

    it('verify delegates to signInWithWallet and triggers onSignIn on success', async () => {
      (signInWithWallet as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      const onSignIn = vi.fn();
      const adapter = createQuizAuthAdapter({ onSignIn });

      const result = await adapter.verify({
        message: 'test-siwe-message',
        signature: '0xsignature',
      });

      expect(result).toBe(true);
      expect(signInWithWallet).toHaveBeenCalledWith('test-siwe-message', '0xsignature');
      expect(onSignIn).toHaveBeenCalledTimes(1);
    });

    it('verify returns false and does not trigger onSignIn on failure', async () => {
      (signInWithWallet as ReturnType<typeof vi.fn>).mockResolvedValue(false);
      const onSignIn = vi.fn();
      const adapter = createQuizAuthAdapter({ onSignIn });

      const result = await adapter.verify({
        message: 'test-siwe-message',
        signature: '0xinvalid',
      });

      expect(result).toBe(false);
      expect(onSignIn).not.toHaveBeenCalled();
    });

    it('signOut delegates to signOutWallet and triggers onSignOut', async () => {
      const onSignOut = vi.fn();
      const adapter = createQuizAuthAdapter({ onSignOut });

      await adapter.signOut();
      expect(signOutWallet).toHaveBeenCalledTimes(1);
      expect(onSignOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('useQuizAuth hook', () => {
    it('starts with unauthenticated status when not connected', async () => {
      (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      const { result } = renderHook(() => useQuizAuth());
      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });
    });

    it('sets status to authenticated when signed-in wallet matches connected address', async () => {
      (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        address: TEST_WALLET,
        isConnected: true,
        status: 'connected',
      });
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_WALLET.toLowerCase());

      const { result } = renderHook(() => useQuizAuth());
      await waitFor(() => {
        expect(result.current.status).toBe('authenticated');
      });
    });

    it('sets status to unauthenticated when signed-in wallet does not match connected address', async () => {
      (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        address: TEST_WALLET,
        isConnected: true,
        status: 'connected',
      });
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue('0xotherwallet');

      const { result } = renderHook(() => useQuizAuth());
      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });
    });

    it('updates status to authenticated when adapter onSignIn is triggered', async () => {
      (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        address: TEST_WALLET,
        isConnected: true,
        status: 'connected',
      });
      (signInWithWallet as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const { result } = renderHook(() => useQuizAuth());
      await act(async () => {
        await result.current.adapter.verify({ message: 'msg', signature: '0xsig' });
      });

      expect(result.current.status).toBe('authenticated');
    });
  });
});
