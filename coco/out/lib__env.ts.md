# lib/env.ts
lines:54 exports:SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,SUPABASE_SECRET_KEY,REWARD_SIGNER_PRIVATE_KEY,CHAIN_ID,QUIZ_TOKEN_ADDRESS,QUIZ_BADGE_ADDRESS,CONTEST_ESCROW_ADDRESS,TREASURY_WALLET_ADDRESS,PAYMASTER_URL,SPONSOR_AD_URL
---
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
