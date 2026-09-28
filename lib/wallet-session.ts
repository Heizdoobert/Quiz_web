import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

// Proof that the browser holds a wallet's key, set after a Sign-In with Ethereum
// signature (lib/actions/auth-actions.ts). Server actions take the wallet from
// here, never from their arguments.
const SESSION_COOKIE = 'wallet_session';
const SESSION_TTL_SECONDS = 7 * 24 * 3600;

// ponytail: key derived from the Supabase secret so there's no extra env var;
// rotating that key signs everyone out. Give it its own secret if that matters.
function sessionKey(): Buffer | null {
  const secret = process.env.SUPABASE_SECRET_KEY;
  return secret ? createHmac('sha256', secret).update('quiz-wallet-session').digest() : null;
}

function sign(payload: string, key: Buffer) {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

export async function setSessionWallet(address: string): Promise<boolean> {
  const key = sessionKey();
  if (!key) return false;
  const payload = `${address.toLowerCase()}.${Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS}`;
  (await cookies()).set(SESSION_COOKIE, `${payload}.${sign(payload, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return true;
}

// The signed-in wallet (lowercase), or null when there is no valid session.
export async function getSessionWallet(): Promise<string | null> {
  const key = sessionKey();
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!key || !value) return null;
  const [address, exp, mac] = value.split('.');
  if (!address || !exp || !mac) return null;
  const expected = Buffer.from(sign(`${address}.${exp}`, key));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return address;
}
