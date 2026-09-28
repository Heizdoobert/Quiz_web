'use client';

import { useCallback, useRef } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { getSignedInWallet, requestSignIn, signInWithWallet } from '@/lib/actions/auth-actions';

// Returns ensureSession(): resolves true once the connected wallet has a server
// session, asking for a one-time Sign-In with Ethereum signature if it doesn't.
export function useWalletSession() {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const signedIn = useRef<string | null>(null);

  return useCallback(async () => {
    if (!address || !chainId) return false;
    const wallet = address.toLowerCase();
    if (signedIn.current === wallet) return true;
    try {
      if ((await getSignedInWallet()) !== wallet) {
        const message = await requestSignIn(address, chainId);
        const signature = await signMessageAsync({ message });
        if (!(await signInWithWallet(message, signature))) return false;
      }
      signedIn.current = wallet;
      return true;
    } catch {
      return false; // signature rejected in the wallet
    }
  }, [address, chainId, signMessageAsync]);
}
