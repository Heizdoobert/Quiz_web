'use server';

import { cookies, headers } from 'next/headers';
import { getAddress } from 'viem';
import { createSiweMessage, generateSiweNonce, parseSiweMessage } from 'viem/siwe';
import { publicClientFor } from '@/lib/chain';
import { getSessionWallet, setSessionWallet, clearSessionWallet, shouldUseSecureCookies } from '@/lib/wallet-session';
import { getOrCreateUser } from '@/lib/actions/user-actions';

// Sign-In with Ethereum (EIP-4361): the wallet signs a message bound to this
// domain and a one-time nonce, which proves the player owns the address.
const CHALLENGE_COOKIE = 'wallet_challenge';
const CHALLENGE_TTL_SECONDS = 10 * 60;

async function requestOrigin() {
  const h = await headers();
  const host = h.get('host') || 'localhost';
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return { host, uri: `${proto}://${host}` };
}

export async function getAuthNonce(): Promise<string> {
  const nonce = generateSiweNonce();
  (await cookies()).set(CHALLENGE_COOKIE, nonce, {
    httpOnly: true,
    secure: await shouldUseSecureCookies(),
    sameSite: 'strict',
    path: '/',
    maxAge: CHALLENGE_TTL_SECONDS,
  });
  return nonce;
}

export async function requestSignIn(address: string, chainId: number): Promise<string> {
  const { host, uri } = await requestOrigin();
  const nonce = await getAuthNonce();
  const now = new Date();
  return createSiweMessage({
    address: getAddress(address),
    chainId,
    domain: host,
    nonce,
    uri,
    version: '1',
    statement: 'Sign in to Quick Quiz so your answers count. This costs no gas.',
    issuedAt: now,
    expirationTime: new Date(now.getTime() + CHALLENGE_TTL_SECONDS * 1000),
  });
}

export async function signInWithWallet(message: string, signature: `0x${string}`): Promise<boolean> {
  try {
    const store = await cookies();
    const nonce = store.get(CHALLENGE_COOKIE)?.value;
    store.delete(CHALLENGE_COOKIE); // one attempt per challenge
    if (!nonce) return false;

    const { address, chainId } = parseSiweMessage(message);
    const client = chainId ? publicClientFor(chainId) : null;
    if (!address || !client) return false;

    // Checks domain, nonce and expiry, and the signature (EOAs and smart wallets).
    const valid = await client.verifySiweMessage({
      message,
      signature,
      domain: (await requestOrigin()).host,
      nonce,
    });
    if (!valid) return false;

    const sessionOk = await setSessionWallet(address);
    if (sessionOk) {
      await getOrCreateUser(address);
    }
    return sessionOk;
  } catch (err) {
    console.error('signInWithWallet error:', err);
    return false;
  }
}

export async function getSignedInWallet(): Promise<string | null> {
  return getSessionWallet();
}

export async function signOutWallet(): Promise<void> {
  await clearSessionWallet();
}
