'use server';

import { setSessionAccount } from '@/lib/services/auth/session';
import {
  signInAccount,
  signUpAccount,
  USERNAME_RE,
} from '@/lib/services/auth/credentials';

export async function signUpWithUsername(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = username.trim();
  if (!USERNAME_RE.test(trimmed)) {
    return { ok: false, error: 'Username must be 3-20 characters (letters, numbers, underscores).' };
  }
  const result = await signUpAccount(trimmed, password);
  if (!result.ok) return result;
  if (!result.account) return { ok: false, error: 'Registration incomplete.' };
  const ok = await setSessionAccount(result.account);
  return { ok, error: ok ? undefined : 'Failed to establish session.' };
}

export async function signInWithUsername(
  username: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await signInAccount(username, password);
  if (!result.ok) return result;
  if (!result.account) return { ok: false, error: 'Account not found.' };
  const ok = await setSessionAccount(result.account);
  return { ok, error: ok ? undefined : 'Failed to establish session.' };
}
