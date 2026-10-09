'use server';

import { cookies, headers } from 'next/headers';
import { getAddress } from 'viem';
import { createSiweMessage, generateSiweNonce, parseSiweMessage } from 'viem/siwe';
import { publicClientFor } from '@/lib/services/chain';
import { getSessionAccount, setSessionAccount, clearSessionAccount, shouldUseSecureCookies } from '@/lib/services/session';
import { ensureAccountForWallet, ensureAccountForAuthUser, linkWalletToAccount } from '@/lib/services/users';
import { supabase } from '@/lib/supabase/supabase';
import { signInAccount, signUpAccount } from '@/lib/services/credentials';
import { allowAttempt, allowAttemptFromIp } from '@/lib/services/rate-limit';
import { logger } from '@/lib/logger';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HOUR = 3600;

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
    // Verifying can cost an on-chain call for smart wallets, so cap it per caller IP.
    if (!(await allowAttemptFromIp('wallet-ip', 30, 600))) return false;
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

    const wallet = address.toLowerCase();
    const accountId = await ensureAccountForWallet(wallet);
    return accountId !== null && (await setSessionAccount({ id: accountId, wallet }));
  } catch (err) {
    logger.error('signInWithWallet error:', err);
    return false;
  }
}

// Same { sent: true } whether or not the email has an account, so a caller can't
// use this to enumerate registered emails. shouldCreateUser lets a first-time
// email register itself right here, with no separate registration step.
export async function requestEmailCode(email: string): Promise<{ sent: boolean; error?: 'RATE_LIMITED' }> {
  const trimmed = email.trim();
  if (EMAIL_RE.test(trimmed)) {
    // Limits apply to every address alike, so hitting one reveals nothing about an account.
    if (
      !(await allowAttempt('email-code', trimmed, 5, HOUR)) ||
      !(await allowAttemptFromIp('email-code-ip', 20, HOUR))
    ) {
      return { sent: false, error: 'RATE_LIMITED' };
    }
    await supabase.auth.signInWithOtp({ email: trimmed, options: { shouldCreateUser: true } });
  }
  return { sent: true };
}

export async function verifyEmailCode(email: string, code: string): Promise<{ ok: boolean; error?: 'RATE_LIMITED' }> {
  try {
    // A 6-digit code lives about an hour; 10 tries per hour makes guessing it hopeless.
    if (!(await allowAttempt('email-verify', email, 10, HOUR))) return { ok: false, error: 'RATE_LIMITED' };
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' });
    if (error || !data.user) return { ok: false };
    const accountId = await ensureAccountForAuthUser(data.user.id);
    return { ok: accountId !== null && (await setSessionAccount({ id: accountId, wallet: null })) };
  } catch (err) {
    logger.error('verifyEmailCode error:', err);
    return { ok: false };
  }
}


export async function signUpWithUsername(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await signUpAccount(username, password);
  if (!result.ok) return result;
  const ok = await setSessionAccount(result.account);
  return { ok, error: ok ? undefined : 'Failed to establish session.' };
}

export async function signInWithUsername(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await signInAccount(username, password);
  if (!result.ok) return result;
  const ok = await setSessionAccount(result.account);
  return { ok, error: ok ? undefined : 'Failed to establish session.' };
}

// Adds a wallet to the signed-in account (it must not have one yet). Same SIWE
// challenge/verify as signInWithWallet, but updates the existing account instead
// of finding or creating one.
export async function linkWallet(
  message: string,
  signature: `0x${string}`
): Promise<{ ok: boolean; code?: 'WALLET_IN_USE' }> {
  try {
    const account = await getSessionAccount();
    if (!account || account.wallet) return { ok: false };
    if (!(await allowAttemptFromIp('wallet-ip', 30, 600))) return { ok: false };

    const store = await cookies();
    const nonce = store.get(CHALLENGE_COOKIE)?.value;
    store.delete(CHALLENGE_COOKIE); // one attempt per challenge
    if (!nonce) return { ok: false };

    const { address, chainId } = parseSiweMessage(message);
    const client = chainId ? publicClientFor(chainId) : null;
    if (!address || !client) return { ok: false };

    const valid = await client.verifySiweMessage({
      message,
      signature,
      domain: (await requestOrigin()).host,
      nonce,
    });
    if (!valid) return { ok: false };

    const wallet = address.toLowerCase();
    const result = await linkWalletToAccount(account.id, wallet);
    if (result === 'in_use') return { ok: false, code: 'WALLET_IN_USE' };
    if (result !== 'ok') return { ok: false };

    return { ok: await setSessionAccount({ id: account.id, wallet }) };
  } catch (err) {
    logger.error('linkWallet error:', err);
    return { ok: false };
  }
}

export async function getSignedInWallet(): Promise<string | null> {
  return (await getSessionAccount())?.wallet ?? null;
}

export async function getSessionInfo(): Promise<{ id: string; wallet: string | null } | null> {
  return getSessionAccount();
}

export async function signOutWallet(): Promise<void> {
  await clearSessionAccount();
}
