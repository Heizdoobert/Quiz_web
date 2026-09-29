'use client';

import { createAuthenticationAdapter } from '@rainbow-me/rainbowkit';
import { createSiweMessage } from 'viem/siwe';
import { getAddress } from 'viem';
import { getAuthNonce, signInWithWallet, signOutWallet } from '@/lib/actions/auth-actions';

export interface QuizAuthAdapterOptions {
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export function createQuizAuthAdapter(options?: QuizAuthAdapterOptions) {
  return createAuthenticationAdapter({
    getNonce: async () => {
      return await getAuthNonce();
    },
    createMessage: ({ nonce, address, chainId }) => {
      const now = new Date();
      const expirationTime = new Date(now.getTime() + 10 * 60 * 1000);
      return createSiweMessage({
        domain: typeof window !== 'undefined' && window.location ? window.location.host : 'localhost',
        address: getAddress(address),
        statement: 'Sign in to Quick Quiz so your answers count. This costs no gas.',
        uri: typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost',
        version: '1',
        chainId,
        nonce,
        issuedAt: now,
        expirationTime,
      });
    },
    verify: async ({ message, signature }) => {
      const ok = await signInWithWallet(message, signature as `0x${string}`);
      if (ok) {
        options?.onSignIn?.();
      }
      return ok;
    },
    signOut: async () => {
      await signOutWallet();
      options?.onSignOut?.();
    },
  });
}
