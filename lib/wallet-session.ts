import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies, headers } from 'next/headers';

// Proof that the browser holds a wallet's key, set after a Sign-In with Ethereum
// signature (lib/actions/auth-actions.ts). Server actions take the wallet from
// here, never from their arguments.
const SESSION_COOKIE = 'wallet_session';
const SESSION_TTL_SECONDS = 7 * 24 * 3600;

// Secure cookies are dropped by browsers over plain HTTP, which silently
// kills the session (answers stop counting). Gate on the actual request
// scheme, not NODE_ENV: the docker container runs production over HTTP,
// while Vercel terminates TLS and sends x-forwarded-proto: https.
export async function shouldUseSecureCookies(): Promise<boolean> {
  const h = await headers();
  const proto = h.get('x-forwarded-proto');
  if (proto) return proto === 'https';
  const host = h.get('host') || '';
  return !(
    host.startsWith('localhost') ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

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
    secure: await shouldUseSecureCookies(),
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

export async function clearSessionWallet(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
