# lib/services/session.ts
lines:80 exports:SessionAccount,shouldUseSecureCookies,setSessionAccount,getSessionAccount,clearSessionAccount
---
import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies, headers } from 'next/headers';

// Proof of who is signed in, set after a verified Sign-In with Ethereum signature
// (lib/actions/auth-actions.ts). Server actions take the account from here,
// never from their arguments.
const SESSION_COOKIE = 'quiz_session';
const SESSION_TTL_SECONDS = 7 * 24 * 3600;
const NO_WALLET = '-';

export interface SessionAccount {
  id: string;
  wallet: string | null;
}

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
