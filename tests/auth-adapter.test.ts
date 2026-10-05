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
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      address: undefined,
      isConnected: false,
      status: 'disconnected',
    });
    (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue(null);
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

    it('verify delegates to linkWallet when the session has no wallet yet', async () => {
      (getSessionInfo as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'acc-1', wallet: null });
      (linkWallet as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
      const onSignIn = vi.fn();
      const adapter = createQuizAuthAdapter({ onSignIn });

      const result = await adapter.verify({ message: 'test-siwe-message', signature: '0xsignature' });

      expect(result).toBe(true);
      expect(linkWallet).toHaveBeenCalledWith('test-siwe-message', '0xsignature');
      expect(signInWithWallet).not.toHaveBeenCalled();
      expect(onSignIn).toHaveBeenCalledTimes(1);
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

    it('signs out and calls callbacks when disconnected after having been connected', async () => {
      const onSignOut = vi.fn();
      const onSyncSession = vi.fn();

      const accountMock = vi.fn();
      (useAccount as ReturnType<typeof vi.fn>).mockImplementation(accountMock);

      // 1. Initially connected with a matching wallet session
      accountMock.mockReturnValue({
        address: TEST_WALLET,
        isConnected: true,
        status: 'connected',
      });
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_WALLET.toLowerCase());

      const { result, rerender } = renderHook(() =>
        useQuizAuth({ onSignOut, onSyncSession })
      );

      await waitFor(() => {
        expect(result.current.status).toBe('authenticated');
      });

      // 2. Disconnect wallet
      accountMock.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });
      rerender();

      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });

      expect(signOutWallet).toHaveBeenCalled();
      expect(onSignOut).toHaveBeenCalled();
      expect(onSyncSession).toHaveBeenCalled();
    });

    it('signs out and notifies when switching to a different wallet account', async () => {
      const onSignOut = vi.fn();
      const onSyncSession = vi.fn();

      const accountMock = vi.fn();
      (useAccount as ReturnType<typeof vi.fn>).mockImplementation(accountMock);

      // Initially connected with wallet A
      accountMock.mockReturnValue({
        address: TEST_WALLET,
        isConnected: true,
        status: 'connected',
      });
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_WALLET.toLowerCase());

      const { result, rerender } = renderHook(() =>
        useQuizAuth({ onSignOut, onSyncSession })
      );

      await waitFor(() => {
        expect(result.current.status).toBe('authenticated');
      });

      // Switch to wallet B
      const WALLET_B = '0x9999999999999999999999999999999999999999';
      accountMock.mockReturnValue({
        address: WALLET_B,
        isConnected: true,
        status: 'connected',
      });
      // Session in cookie is still wallet A until signed out
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_WALLET.toLowerCase());

      rerender();

      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });

      expect(signOutWallet).toHaveBeenCalled();
      expect(onSignOut).toHaveBeenCalled();
      expect(onSyncSession).toHaveBeenCalled();
    });

    it('does not call signOutWallet on disconnect if the session was an email session', async () => {
      const accountMock = vi.fn();
      (useAccount as ReturnType<typeof vi.fn>).mockImplementation(accountMock);

      // Connected with a wallet, but session is email-only (no wallet linked yet)
      accountMock.mockReturnValue({
        address: TEST_WALLET,
        isConnected: true,
        status: 'connected',
      });
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { result, rerender } = renderHook(() => useQuizAuth());

      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });

      (signOutWallet as ReturnType<typeof vi.fn>).mockClear();

      // Disconnect the unlinked wallet
      accountMock.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });
      rerender();

      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });

      // Should NOT have cleared the email session
      expect(signOutWallet).not.toHaveBeenCalled();
    });

    it('handles unexpected errors gracefully without unhandled rejections', async () => {
      (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        address: TEST_WALLET,
        isConnected: true,
        status: 'connected',
      });
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network failure'));

      const { result } = renderHook(() => useQuizAuth());

      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });
    });

    it('cleans up stale wallet session when mounted in disconnected state', async () => {
      const onSignOut = vi.fn();
      const onSyncSession = vi.fn();

      (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_WALLET.toLowerCase());

      const { result } = renderHook(() =>
        useQuizAuth({ onSignOut, onSyncSession })
      );

      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });

      expect(signOutWallet).toHaveBeenCalledTimes(1);
      expect(onSignOut).toHaveBeenCalledTimes(1);
      expect(onSyncSession).toHaveBeenCalledTimes(1);
    });

    it('rejects SIWE verification when signed address does not match active connected wallet', async () => {
      const accountMock = vi.fn();
      (useAccount as ReturnType<typeof vi.fn>).mockImplementation(accountMock);

      // Connected with Wallet A
      accountMock.mockReturnValue({
        address: TEST_WALLET,
        isConnected: true,
        status: 'connected',
      });

      const { result, rerender } = renderHook(() => useQuizAuth());
      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });

      // Prepare SIWE message for Wallet A
      const msgForA = await result.current.adapter.createMessage({
        nonce: 'nonce12345678',
        address: TEST_WALLET,
        chainId: 84532,
      });

      // User switches to Wallet B before signing
      const WALLET_B = '0x9999999999999999999999999999999999999999';
      accountMock.mockReturnValue({
        address: WALLET_B,
        isConnected: true,
        status: 'connected',
      });
      act(() => {
        rerender();
      });
      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });

      (signInWithWallet as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      let verifyResult: boolean | undefined;
      await act(async () => {
        verifyResult = await result.current.adapter.verify({
          message: msgForA,
          signature: '0xsigA',
        });
      });

      // Verification must be rejected because active wallet is B, but message is for A
      expect(verifyResult).toBe(false);
      expect(signInWithWallet).not.toHaveBeenCalled();
      expect(result.current.status).not.toBe('authenticated');
    });

    it('aborts, revokes session, and calls onSignOut if wallet switches while verification is in-flight', async () => {
      let activeWallet: string | undefined = TEST_WALLET;
      const onSignOut = vi.fn();
      const adapter = createQuizAuthAdapter({
        getExpectedAddress: () => activeWallet,
        onSignOut,
      });

      const msgForA = await adapter.createMessage({
        nonce: 'nonce12345678',
        address: TEST_WALLET,
        chainId: 84532,
      });

      // When signInWithWallet runs, simulate that active wallet switched to Wallet B while waiting
      const WALLET_B = '0x9999999999999999999999999999999999999999';
      (signInWithWallet as ReturnType<typeof vi.fn>).mockImplementation(async () => {
        activeWallet = WALLET_B;
        return true;
      });

      const verifyResult = await adapter.verify({
        message: msgForA,
        signature: '0xsigA',
      });

      // Must be rejected and cleaned up
      expect(verifyResult).toBe(false);
      expect(signOutWallet).toHaveBeenCalled();
      expect(onSignOut).toHaveBeenCalled();
    });

    it('rejects SIWE verification if user disconnected before verification completes', async () => {
      const accountMock = vi.fn();
      (useAccount as ReturnType<typeof vi.fn>).mockImplementation(accountMock);

      accountMock.mockReturnValue({
        address: TEST_WALLET,
        isConnected: true,
        status: 'connected',
      });

      const { result, rerender } = renderHook(() => useQuizAuth());
      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });

      const msgForA = await result.current.adapter.createMessage({
        nonce: 'nonce12345678',
        address: TEST_WALLET,
        chainId: 84532,
      });

      // User disconnects while modal/prompt was open
      accountMock.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });
      act(() => {
        rerender();
      });
      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });

      let verifyResult: boolean | undefined;
      await act(async () => {
        verifyResult = await result.current.adapter.verify({
          message: msgForA,
          signature: '0xsigA',
        });
      });

      expect(verifyResult).toBe(false);
      expect(signInWithWallet).not.toHaveBeenCalled();
      expect(result.current.status).toBe('unauthenticated');
    });

    it('in-flight checkAuth does not overwrite status if user signs in before checkAuth completes', async () => {
      let resolveGetWallet!: (val: string | null) => void;
      const slowGetWalletPromise = new Promise<string | null>((resolve) => {
        resolveGetWallet = resolve;
      });
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockReturnValue(slowGetWalletPromise);

      (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
        address: TEST_WALLET,
        isConnected: true,
        status: 'connected',
      });

      const { result } = renderHook(() => useQuizAuth());

      // While checkAuth is waiting on slowGetWalletPromise, user explicitly signs in
      (signInWithWallet as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      await act(async () => {
        await result.current.adapter.verify({ message: 'msg', signature: '0xsig' });
      });

      expect(result.current.status).toBe('authenticated');

      // Now the pre-sign-in checkAuth resolves with null (pre-signin cookie state)
      await act(async () => {
        resolveGetWallet(null);
        await slowGetWalletPromise;
      });

      // Status must REMAIN authenticated and not be clobbered by stale in-flight checkAuth
      expect(result.current.status).toBe('authenticated');
    });

    it('disconnecting wallet when getSignedInWallet throws still cleans up local session if previously connected', async () => {
      const onSignOut = vi.fn();
      const accountMock = vi.fn();
      (useAccount as ReturnType<typeof vi.fn>).mockImplementation(accountMock);

      accountMock.mockReturnValue({
        address: TEST_WALLET,
        isConnected: true,
        status: 'connected',
      });
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_WALLET.toLowerCase());

      const { result, rerender } = renderHook(() => useQuizAuth({ onSignOut }));

      await waitFor(() => {
        expect(result.current.status).toBe('authenticated');
      });

      // Disconnect, but server action getSignedInWallet fails
      accountMock.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network failure'));

      rerender();

      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });

      // onSignOut MUST be called to ensure UI does not retain stale profile
      expect(onSignOut).toHaveBeenCalled();
    });

    it('calls adapter.signOut on useQuizAuth and invokes callbacks', async () => {
      const onSignOut = vi.fn();
      const onSyncSession = vi.fn();
      const { result } = renderHook(() =>
        useQuizAuth({ onSignOut, onSyncSession })
      );

      await act(async () => {
        await result.current.adapter.signOut();
      });

      expect(signOutWallet).toHaveBeenCalled();
      expect(result.current.status).toBe('unauthenticated');
      expect(onSignOut).toHaveBeenCalled();
      expect(onSyncSession).toHaveBeenCalled();
    });

    it('transitions status to unauthenticated when backend session expires', async () => {
      const accountMock = vi.fn();
      (useAccount as ReturnType<typeof vi.fn>).mockImplementation(accountMock);

      accountMock.mockReturnValue({
        address: TEST_WALLET,
        isConnected: true,
        status: 'connected',
      });
      // Initially authenticated
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_WALLET.toLowerCase());

      const { result } = renderHook(() => useQuizAuth());

      await waitFor(() => {
        expect(result.current.status).toBe('authenticated');
      });

      // Session expires on backend (cookie deleted/expired -> returns null)
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // Explicit re-check triggered (or window focus)
      await act(async () => {
        await result.current.recheck();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });
    });

    it('disconnecting wallet when session cookie was already null/expired still calls onSignOut if previously connected', async () => {
      const onSignOut = vi.fn();
      const onSyncSession = vi.fn();
      const accountMock = vi.fn();
      (useAccount as ReturnType<typeof vi.fn>).mockImplementation(accountMock);

      // 1. Initially connected with active session
      accountMock.mockReturnValue({
        address: TEST_WALLET,
        isConnected: true,
        status: 'connected',
      });
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_WALLET.toLowerCase());

      const { result, rerender } = renderHook(() =>
        useQuizAuth({ onSignOut, onSyncSession })
      );

      await waitFor(() => {
        expect(result.current.status).toBe('authenticated');
      });

      // 2. Cookie expired on server (getSignedInWallet returns null)
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // 3. User disconnects wallet in Wagmi
      accountMock.mockReturnValue({
        address: undefined,
        isConnected: false,
        status: 'disconnected',
      });

      rerender();

      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });

      // onSignOut and onSyncSession must STILL be called to reset local state
      expect(onSignOut).toHaveBeenCalledTimes(1);
      expect(onSyncSession).toHaveBeenCalledTimes(1);
    });

    it('clears previous session via onSignOut when switching to an unauthenticated account', async () => {
      const onSignOut = vi.fn();
      const onSyncSession = vi.fn();
      const accountMock = vi.fn();
      (useAccount as ReturnType<typeof vi.fn>).mockImplementation(accountMock);

      // 1. Initially connected with Wallet A
      accountMock.mockReturnValue({
        address: TEST_WALLET,
        isConnected: true,
        status: 'connected',
      });
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_WALLET.toLowerCase());

      const { result, rerender } = renderHook(() =>
        useQuizAuth({ onSignOut, onSyncSession })
      );

      await waitFor(() => {
        expect(result.current.status).toBe('authenticated');
      });

      // 2. User switches to Wallet B, but backend session is not authenticated for B (returns null)
      const WALLET_B = '0x9999999999999999999999999999999999999999';
      accountMock.mockReturnValue({
        address: WALLET_B,
        isConnected: true,
        status: 'connected',
      });
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      rerender();

      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });

      // onSignOut must be called to ensure Wallet A's session is cleared from UI
      expect(onSignOut).toHaveBeenCalled();
      expect(onSyncSession).toHaveBeenCalled();
    });

    it('synchronizes status to unauthenticated when sessionAccount transitions to null', async () => {
      const accountMock = vi.fn();
      (useAccount as ReturnType<typeof vi.fn>).mockImplementation(accountMock);

      accountMock.mockReturnValue({
        address: TEST_WALLET,
        isConnected: true,
        status: 'connected',
      });
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_WALLET.toLowerCase());

      let currentSession: { id: string; wallet: string | null } | null = {
        id: 'acc-1',
        wallet: TEST_WALLET,
      };

      const { result, rerender } = renderHook(
        ({ session }: { session: { id: string; wallet: string | null } | null }) =>
          useQuizAuth({ sessionAccount: session }),
        { initialProps: { session: currentSession as { id: string; wallet: string | null } | null } }
      );

      await waitFor(() => {
        expect(result.current.status).toBe('authenticated');
      });

      // Session expires in SessionProvider (e.g. refresh detected expired session)
      currentSession = null;
      (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      rerender({ session: currentSession });

      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
      });
    });
  });
});
