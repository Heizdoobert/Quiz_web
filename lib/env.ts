import 'server-only';

// ── Required vars ─────────────────────────────────────────────────
// App will crash at startup if any of these are missing or empty.

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `See .env.example for the full list.`
    );
  }
  return value.trim();
}

function requiredHex(name: string): `0x${string}` {
  const value = required(name);
  if (!/^0x[0-9a-fA-F]+$/.test(value)) {
    throw new Error(
      `Environment variable ${name} must be a hex string starting with 0x. Got: "${value}"`
    );
  }
  return value as `0x${string}`;
}

function requiredInt(name: string): number {
  const value = required(name);
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) {
    throw new Error(
      `Environment variable ${name} must be an integer. Got: "${value}"`
    );
  }
  return n;
}

// ── Supabase ──────────────────────────────────────────────────────
export const SUPABASE_URL = required('SUPABASE_URL');
export const SUPABASE_PUBLISHABLE_KEY = required('SUPABASE_PUBLISHABLE_KEY');
export const SUPABASE_SECRET_KEY = required('SUPABASE_SECRET_KEY');

// ── On-chain ──────────────────────────────────────────────────────
export const REWARD_SIGNER_PRIVATE_KEY = required('REWARD_SIGNER_PRIVATE_KEY');
export const CHAIN_ID = requiredInt('NEXT_PUBLIC_CHAIN_ID');
export const QUIZ_TOKEN_ADDRESS = requiredHex('NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS');
export const QUIZ_BADGE_ADDRESS = requiredHex('NEXT_PUBLIC_QUIZ_BADGE_ADDRESS');
export const CONTEST_ESCROW_ADDRESS = requiredHex('NEXT_PUBLIC_CONTEST_ESCROW_ADDRESS');

// ── Optional vars ─────────────────────────────────────────────────
// These have safe defaults or are truly optional features.
export const TREASURY_WALLET_ADDRESS = process.env.TREASURY_WALLET_ADDRESS?.trim() || null;
export const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL?.trim() || null;
export const SPONSOR_AD_URL = process.env.NEXT_PUBLIC_SPONSOR_AD_URL?.trim() || 'https://coinzilla.com';
