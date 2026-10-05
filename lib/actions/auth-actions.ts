'use server';

import { cookies, headers } from 'next/headers';
import { getAddress } from 'viem';
import { createSiweMessage, generateSiweNonce, parseSiweMessage } from 'viem/siwe';
import { publicClientFor } from '@/lib/utils/chain';
import { getSessionAccount, setSessionAccount, clearSessionAccount, shouldUseSecureCookies } from '@/lib/services/session';
import { ensureAccountForWallet, ensureAccountForAuthUser, linkWalletToAccount } from '@/lib/services/users';
import { supabase } from '@/lib/supabase/supabase';
import { supabaseAdmin } from '@/lib/supabase/supabase-admin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function usernameToEmail(username: string): string {
  const trimmed = username.trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : `${trimmed}@player.quiz`;
}

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

    const wallet = address.toLowerCase();
    const accountId = await ensureAccountForWallet(wallet);
    return accountId !== null && (await setSessionAccount({ id: accountId, wallet }));
  } catch (err) {
    console.error('signInWithWallet error:', err);
    return false;
  }
}

// Same { sent: true } whether or not the email has an account, so a caller can't
// use this to enumerate registered emails. shouldCreateUser lets a first-time
// email register itself right here, with no separate registration step.
export async function requestEmailCode(email: string): Promise<{ sent: boolean }> {
  const trimmed = email.trim();
  if (EMAIL_RE.test(trimmed)) {
    await supabase.auth.signInWithOtp({ email: trimmed, options: { shouldCreateUser: true } });
  }
  return { sent: true };
}

export async function verifyEmailCode(email: string, code: string): Promise<{ ok: boolean }> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' });
    if (error || !data.user) return { ok: false };
    const accountId = await ensureAccountForAuthUser(data.user.id);
    return { ok: accountId !== null && (await setSessionAccount({ id: accountId, wallet: null })) };
  } catch (err) {
    console.error('verifyEmailCode error:', err);
    return { ok: false };
  }
}

export async function signUpWithUsername(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const trimmed = username.trim();
    if (!USERNAME_RE.test(trimmed)) {
      return {
        ok: false,
        error: 'Username must be 3-20 characters (letters, numbers, underscores).',
      };
    }
    if (!password || password.length < 6) {
      return {
        ok: false,
        error: 'Password must be at least 6 characters.',
      };
    }

    const email = usernameToEmail(trimmed);
    let authUserId: string | null = null;

    if (supabaseAdmin?.auth?.admin?.createUser) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username: trimmed },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('unique')) {
          return { ok: false, error: 'Username is already taken.' };
        }
      } else if (data?.user) {
        authUserId = data.user.id;
      }
    }

    if (!authUserId) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: trimmed } },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('unique')) {
          return { ok: false, error: 'Username is already taken.' };
        }
        return { ok: false, error: error.message || 'Failed to create account.' };
      }
      if (!data.user) {
        return { ok: false, error: 'Registration failed. Try a different username.' };
      }
      authUserId = data.user.id;
    }

    const accountId = await ensureAccountForAuthUser(authUserId, trimmed);
    if (!accountId) {
      return { ok: false, error: 'Could not create user account.' };
    }

    const ok = await setSessionAccount({ id: accountId, wallet: null });
    return { ok, error: ok ? undefined : 'Failed to establish session.' };
  } catch (err) {
    console.error('signUpWithUsername error:', err);
    return { ok: false, error: 'An unexpected error occurred during registration.' };
  }
}

export async function signInWithUsername(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const trimmed = username.trim();
    if (!trimmed || !password) {
      return { ok: false, error: 'Username and password are required.' };
    }

    const email = usernameToEmail(trimmed);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.user) {
      return { ok: false, error: 'Invalid username or password.' };
    }

    const accountId = await ensureAccountForAuthUser(data.user.id, trimmed);
    if (!accountId) {
      return { ok: false, error: 'Account not found.' };
    }

    let existingWallet: string | null = null;
    if (supabaseAdmin) {
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('wallet_address')
        .eq('id', accountId)
        .maybeSingle();
      existingWallet = userRow?.wallet_address ?? null;
    }

    const ok = await setSessionAccount({ id: accountId, wallet: existingWallet });
    return { ok, error: ok ? undefined : 'Failed to establish session.' };
  } catch (err) {
    console.error('signInWithUsername error:', err);
    return { ok: false, error: 'An unexpected error occurred during sign-in.' };
  }
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
    console.error('linkWallet error:', err);
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
