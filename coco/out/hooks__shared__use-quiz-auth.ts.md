# hooks/shared/use-quiz-auth.ts
lines:187 exports:QuizAuthOptions,useQuizAuth
---
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import type { AuthenticationStatus } from '@rainbow-me/rainbowkit';
import { getSignedInWallet, signOutWallet } from '@/lib/actions/auth-actions';
import { createQuizAuthAdapter } from '@/lib/services/auth-adapter';
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
