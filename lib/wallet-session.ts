import 'server-only';
import { getSessionAccount, clearSessionAccount } from '@/lib/session';

// The signed-in account's wallet (lowercase), or null with no session or no wallet.
export async function getSessionWallet(): Promise<string | null> {
  return (await getSessionAccount())?.wallet ?? null;
}

export async function clearSessionWallet(): Promise<void> {
  await clearSessionAccount();
}
