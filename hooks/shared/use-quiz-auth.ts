'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useAccount } from 'wagmi';
import type { AuthenticationStatus } from '@rainbow-me/rainbowkit';
import { getSignedInWallet, signOutWallet } from '@/lib/actions/auth-actions';
import { createQuizAuthAdapter } from '@/lib/auth-adapter';

export function useQuizAuth() {
  const { address, isConnected, status: accountStatus } = useAccount();
  const [authStatus, setAuthStatus] = useState<AuthenticationStatus>('loading');
  const prevAddressRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      if (accountStatus === 'connecting' || accountStatus === 'reconnecting') {
        await Promise.resolve();
        if (!cancelled) setAuthStatus('loading');
        return;
      }

      if (!isConnected || !address) {
        if (prevAddressRef.current) {
          await signOutWallet();
          prevAddressRef.current = undefined;
        }
        await Promise.resolve();
        if (!cancelled) setAuthStatus('unauthenticated');
        return;
      }

      const currentWallet = address.toLowerCase();
      const signedInWallet = await getSignedInWallet();

      if (cancelled) return;

      const isMatch = signedInWallet === currentWallet;
      if (!isMatch && prevAddressRef.current && prevAddressRef.current !== currentWallet) {
        await signOutWallet();
      }
      prevAddressRef.current = currentWallet;
      setAuthStatus(isMatch ? 'authenticated' : 'unauthenticated');
    }

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, [accountStatus, address, isConnected]);

  const adapter = useMemo(() => {
    return createQuizAuthAdapter({
      onSignIn: () => {
        setAuthStatus('authenticated');
      },
      onSignOut: () => {
        setAuthStatus('unauthenticated');
      },
    });
  }, []);

  return {
    adapter,
    status: authStatus,
  };
}
