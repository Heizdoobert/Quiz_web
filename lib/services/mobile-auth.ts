import { createHmac, timingSafeEqual } from 'crypto';
import { SessionAccount } from './session';

const MOBILE_SESSION_TTL_SECONDS = 30 * 24 * 3600; // 30 days for mobile

function getSecretKey(): Buffer | null {
  const secret = process.env.SUPABASE_SECRET_KEY;
  return secret ? createHmac('sha256', secret).update('quiz-mobile-auth').digest() : null;
}

function sign(payload: string, key: Buffer) {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

// Issue a mobile authentication token for a session account, which can be used to authenticate the user on mobile devices. The token is valid for 30 days.
export function issueMobileAuthToken(account: SessionAccount): string | null {
  const key = getSecretKey();
  if (!key) return null;
  const payload = `${account.id}.${Math.floor(Date.now() / 1000) + MOBILE_SESSION_TTL_SECONDS}`;
  return `${payload}.${sign(payload, key)}`;
}

// Verify a mobile authentication token and return the associated session account or null if invalid.
export function verifyMobileAuthToken(token: string): SessionAccount | null {
  const key = getSecretKey();
  if (!key) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [id, exp, mac] = parts;
  const expected = Buffer.from(sign(`${id}.${exp}`, key));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return { id };
}
