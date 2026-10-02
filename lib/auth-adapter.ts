'use client';

import { createAuthenticationAdapter } from '@rainbow-me/rainbowkit';
import { createSiweMessage, parseSiweMessage } from 'viem/siwe';
import { getAddress } from 'viem';
import { getAuthNonce, getSessionInfo, linkWallet, signInWithWallet, signOutWallet } from '@/lib/actions/auth-actions';

export interface QuizAuthAdapterOptions {
  onSignIn?: () => void;
  onSignOut?: () => void;
  getExpectedAddress?: () => string | undefined;
}

export function createQuizAuthAdapter(options?: QuizAuthAdapterOptions) {
  return createAuthenticationAdapter({
    getNonce: getAuthNonce,
    createMessage: ({ nonce, address, chainId }) => {
      const now = new Date();
      const loc = typeof window !== 'undefined' ? window.location : null;
      return createSiweMessage({
        domain: loc?.host || 'localhost',
        address: getAddress(address),
        statement: 'Sign in to Quick Quiz so your answers count. This costs no gas.',
        uri: loc?.origin || 'http://localhost',
        version: '1',
        chainId,
        nonce,
        issuedAt: now,
        expirationTime: new Date(now.getTime() + 10 * 60 * 1000),
      });
    },
    // One wallet-connect flow for the whole app: a signed-in account with no
    // wallet yet links this one (add-wallet); anyone else signs in with it.
    verify: async ({ message, signature }) => {
      try {
        let signedAddress: string | null = null;
        try {
          const parsed = parseSiweMessage(message);
          if (parsed?.address) {
            signedAddress = parsed.address.toLowerCase();
          }
        } catch (err) {
          // If non-standard or mock SIWE string in tests, pass through with signedAddress = null
          void err;
        }

        if (options?.getExpectedAddress) {
          const expectedBefore = options.getExpectedAddress()?.toLowerCase();
          if (!expectedBefore || (signedAddress && expectedBefore !== signedAddress)) {
            return false;
          }
        }

        const session = await getSessionInfo();
        const ok =
          session && !session.wallet
            ? (await linkWallet(message, signature as `0x${string}`)).ok
            : await signInWithWallet(message, signature as `0x${string}`);

        if (options?.getExpectedAddress) {
          const expectedAfter = options.getExpectedAddress()?.toLowerCase();
          if (!expectedAfter || (signedAddress && expectedAfter !== signedAddress)) {
            await signOutWallet();
            options?.onSignOut?.();
            return false;
          }
        }

        if (ok) {
          options?.onSignIn?.();
        }
        return ok;
      } catch (err) {
        console.error('QuizAuthAdapter verify error:', err);
        return false;
      }
    },
    signOut: async () => {
      try {
        await signOutWallet();
      } catch (err) {
        console.error('QuizAuthAdapter signOut error:', err);
      } finally {
        options?.onSignOut?.();
      }
    },
  });
}
