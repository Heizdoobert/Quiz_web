'use server';

import { getSessionAccount, clearSessionAccount, type SessionAccount } from '@/lib/services/auth/session';

export async function getSessionInfo(authAccount?: SessionAccount): Promise<{ id: string; username?: string } | null> {
  if (authAccount) return authAccount;
  return getSessionAccount();
}

export async function signOut(): Promise<void> {
  await clearSessionAccount();
}
