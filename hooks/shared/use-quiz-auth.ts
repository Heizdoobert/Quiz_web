'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import type { AuthenticationStatus } from '@rainbow-me/rainbowkit';
import { getSignedInWallet, signOutWallet } from '@/lib/actions/auth-actions';
import { createQuizAuthAdapter } from '@/lib/auth-adapter';
import type { SessionAccount } from '@/hooks/shared/use-session';

export interface QuizAuthOptions {
  onSignIn?: () => void;
  onSignOut?: () => void;
  onSyncSession?: () => Promise<unknown> | void;
  sessionAccount?: SessionAccount | null;
}

export function useQuizAuth(options?: QuizAuthOptions) {
  const { address, isConnected, status: accountStatus } = useAccount();
  const [authStatus, setAuthStatus] = useState<AuthenticationStatus>('loading');
  const prevAddressRef = useRef<string | undefined>(undefined);
  const authStatusRef = useRef<AuthenticationStatus>(authStatus);

  useEffect(() => {
    authStatusRef.current = authStatus;
  }, [authStatus]);

  const onSignIn = options?.onSignIn;
  const onSignOut = options?.onSignOut;
  const onSyncSession = options?.onSyncSession;
  const sessionAccount = options?.sessionAccount;

  const [recheckTrigger, setRecheckTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const statusAtStart = authStatusRef.current;

    async function checkAuth() {
      try {
        if (accountStatus === 'connecting' || accountStatus === 'reconnecting') {
          await Promise.resolve();
          if (!cancelled) setAuthStatus('loading');
          return;
        }

        if (!isConnected || !address) {
          const wasConnected = Boolean(prevAddressRef.current);
          try {
            const signedIn = await getSignedInWallet();
            if (cancelled) return;
            if (signedIn) {
              await signOutWallet();
              if (cancelled) return;
            }
            if (signedIn || wasConnected) {
              onSignOut?.();
              if (onSyncSession) {
                void onSyncSession();
              }
            }
          } catch (err) {
            console.error('signOutWallet error on disconnect:', err);
            if (wasConnected) {
              onSignOut?.();
              if (onSyncSession) {
                void onSyncSession();
              }
            }
          }
          if (cancelled) return;
          prevAddressRef.current = undefined;
          setAuthStatus('unauthenticated');
          return;
        }

        const currentWallet = address.toLowerCase();
        let signedInWallet: string | null = null;
        try {
          signedInWallet = await getSignedInWallet();
        } catch (err) {
          console.error('getSignedInWallet error:', err);
        }

        if (cancelled) return;

        const isMatch = Boolean(signedInWallet && signedInWallet.toLowerCase() === currentWallet);
        const isStaleSession = Boolean(signedInWallet && signedInWallet.toLowerCase() !== currentWallet);
        const isSwitchedAway = Boolean(
          prevAddressRef.current &&
          prevAddressRef.current !== currentWallet &&
          signedInWallet &&
          prevAddressRef.current.toLowerCase() === signedInWallet.toLowerCase()
        );
        const isAddressChanged = Boolean(
          prevAddressRef.current && prevAddressRef.current !== currentWallet
        );

        if (!isMatch && (isStaleSession || isSwitchedAway || isAddressChanged)) {
          if (signedInWallet) {
            try {
              await signOutWallet();
            } catch (err) {
              console.error('signOutWallet error on switch:', err);
            }
          }
          if (cancelled) return;
          onSignOut?.();
          if (onSyncSession) {
            void onSyncSession();
          }
        }

        if (cancelled) return;
        prevAddressRef.current = currentWallet;
        setAuthStatus((prev) => {
          if (
            prev === 'authenticated' &&
            statusAtStart !== 'authenticated' &&
            !isStaleSession &&
            !isSwitchedAway &&
            !isAddressChanged
          ) {
            return prev;
          }
          return isMatch ? 'authenticated' : 'unauthenticated';
        });
      } catch (err) {
        console.error('checkAuth unexpected error:', err);
        if (!cancelled) setAuthStatus('unauthenticated');
      }
    }

    void checkAuth();

    const handleFocus = () => {
      void checkAuth();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
    }

    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, [accountStatus, address, isConnected, onSignOut, onSyncSession, sessionAccount, recheckTrigger]);

  const recheck = useCallback(async () => {
    setRecheckTrigger((prev) => prev + 1);
  }, []);

  const handleSignIn = useCallback(() => {
    if (!isConnected || !address) {
      setAuthStatus('unauthenticated');
      return;
    }
    setAuthStatus('authenticated');
    onSignIn?.();
    if (onSyncSession) {
      void onSyncSession();
    }
  }, [address, isConnected, onSignIn, onSyncSession]);

  const handleSignOut = useCallback(() => {
    setAuthStatus('unauthenticated');
    onSignOut?.();
    if (onSyncSession) {
      void onSyncSession();
    }
  }, [onSignOut, onSyncSession]);

  const adapter = useMemo(() => {
    return createQuizAuthAdapter({
      getExpectedAddress: () => (isConnected ? address : undefined),
      onSignIn: handleSignIn,
      onSignOut: handleSignOut,
    });
  }, [address, isConnected, handleSignIn, handleSignOut]);

  return {
    adapter,
    status: authStatus,
    recheck,
  };
}
