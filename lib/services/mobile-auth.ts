import { createHmac, timingSafeEqual } from 'crypto';
import { parseSiweMessage } from 'viem/siwe';
import { publicClientFor } from './chain';
import { SessionAccount } from './session';

const MOBILE_SESSION_TTL_SECONDS = 30 * 24 * 3600; // 30 days for mobile
const NO_WALLET = '-';

function getSecretKey(): Buffer | null {
  const secret = process.env.SUPABASE_SECRET_KEY;
  return secret ? createHmac('sha256', secret).update('quiz-mobile-auth').digest() : null;
}

function sign(payload: string, key: Buffer) {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

export function issueMobileNonceToken(nonce: string): string | null {
  const key = getSecretKey();
  if (!key) return null;
  const exp = Math.floor(Date.now() / 1000) + 10 * 60; // 10 minutes
  const payload = `${nonce}.${exp}`;
  return `${payload}.${sign(payload, key)}`;
}

export function verifyMobileNonceToken(token: string): string | null {
  const key = getSecretKey();
  if (!key) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [nonce, exp, mac] = parts;
  const expected = Buffer.from(sign(`${nonce}.${exp}`, key));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return nonce;
}

export type MobileSiweResult = { address: string } | { error: string; status: number };

// Checks a SIWE message the app got signed by a wallet: the nonce must be one we issued
// and the signature must be valid. Returns the proven lowercase wallet address.
export async function verifyMobileSiwe(message: string, signature: `0x${string}`, nonceToken: string): Promise<MobileSiweResult> {
  const validNonce = verifyMobileNonceToken(nonceToken);
  if (!validNonce) return { error: 'Invalid or expired nonce token', status: 401 };

  const { address, chainId, domain, nonce } = parseSiweMessage(message);
  if (nonce !== validNonce) return { error: 'Nonce mismatch', status: 401 };

  const client = chainId ? publicClientFor(chainId) : null;
  if (!address || !client) return { error: 'Invalid SIWE message', status: 400 };

  const valid = await client.verifySiweMessage({ message, signature, domain, nonce });
  if (!valid) return { error: 'Invalid signature', status: 401 };
  return { address: address.toLowerCase() };
}

// Issue a mobile authentication token for a session account, which can be used to authenticate the user on mobile devices. The token is valid for 30 days.
export function issueMobileAuthToken(account: SessionAccount): string | null {
  const key = getSecretKey();
  if (!key) return null;
  const wallet = account.wallet?.toLowerCase() ?? NO_WALLET;
  const payload = `${account.id}.${wallet}.${Math.floor(Date.now() / 1000) + MOBILE_SESSION_TTL_SECONDS}`;
  return `${payload}.${sign(payload, key)}`;
}

// Verify a mobile authentication token and return the associated session account or null if invalid.
export function verifyMobileAuthToken(token: string): SessionAccount | null {
  const key = getSecretKey();
  if (!key) return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [id, wallet, exp, mac] = parts;
  const expected = Buffer.from(sign(`${id}.${wallet}.${exp}`, key));
  const given = Buffer.from(mac);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return { id, wallet: wallet === NO_WALLET ? null : wallet };
}
