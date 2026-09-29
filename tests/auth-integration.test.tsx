import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWalletSession } from '../hooks/shared/use-wallet-session';
import { getSignedInWallet, requestSignIn, signInWithWallet } from '../lib/actions/auth-actions';
import { useAccount, useSignMessage } from 'wagmi';

vi.mock('../lib/actions/auth-actions', () => ({
  getSignedInWallet: vi.fn(),
  requestSignIn: vi.fn(),
  signInWithWallet: vi.fn(),
}));

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useSignMessage: vi.fn(),
}));

const TEST_WALLET = '0x1234567890123456789012345678901234567890';

describe('Auth Integration & Session Fallback (Task 3)', () => {
  const signMessageAsyncMock = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    (useSignMessage as ReturnType<typeof vi.fn>).mockReturnValue({
      signMessageAsync: signMessageAsyncMock,
    });
  });

  it('useWalletSession returns false if not connected', async () => {
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      address: undefined,
      chainId: undefined,
    });

    const { result } = renderHook(() => useWalletSession());
    let ok = false;
    await act(async () => {
      ok = await result.current();
    });

    expect(ok).toBe(false);
    expect(requestSignIn).not.toHaveBeenCalled();
  });

  it('useWalletSession reuses active server session without prompting for signature', async () => {
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      address: TEST_WALLET,
      chainId: 84532,
    });
    (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_WALLET.toLowerCase());

    const { result } = renderHook(() => useWalletSession());
    let ok = false;
    await act(async () => {
      ok = await result.current();
    });

    expect(ok).toBe(true);
    // Because already signed in, no new sign-in request or message signing is triggered
    expect(requestSignIn).not.toHaveBeenCalled();
    expect(signMessageAsyncMock).not.toHaveBeenCalled();
  });

  it('useWalletSession prompts for signature and completes sign-in when not already authenticated', async () => {
    (useAccount as ReturnType<typeof vi.fn>).mockReturnValue({
      address: TEST_WALLET,
      chainId: 84532,
    });
    (getSignedInWallet as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (requestSignIn as ReturnType<typeof vi.fn>).mockResolvedValue('siwe-message');
    signMessageAsyncMock.mockResolvedValue('0xvalidsig');
    (signInWithWallet as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const { result } = renderHook(() => useWalletSession());
    let ok = false;
    await act(async () => {
      ok = await result.current();
    });

    expect(ok).toBe(true);
    expect(requestSignIn).toHaveBeenCalledWith(TEST_WALLET, 84532);
    expect(signMessageAsyncMock).toHaveBeenCalledWith({ message: 'siwe-message' });
    expect(signInWithWallet).toHaveBeenCalledWith('siwe-message', '0xvalidsig');
  });
});
