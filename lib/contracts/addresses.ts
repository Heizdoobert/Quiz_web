// Contract addresses and chain config - all values come from environment variables.
// See .env.example for the full list. The app will fail at startup if any are missing.

function requiredHexEnv(name: string): `0x${string}` {
  const value = process.env[name];
  if (!value || !/^0x[0-9a-fA-F]+$/.test(value)) {
    throw new Error(`Missing or invalid env var ${name}. Must be a 0x-prefixed hex address. See .env.example.`);
  }
  return value as `0x${string}`;
}

export const QUIZ_TOKEN_ADDRESS = requiredHexEnv('NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS');
export const QUIZ_BADGE_ADDRESS = requiredHexEnv('NEXT_PUBLIC_QUIZ_BADGE_ADDRESS');
export const CONTEST_ESCROW_ADDRESS = requiredHexEnv('NEXT_PUBLIC_CONTEST_ESCROW_ADDRESS');

const chainIdRaw = process.env.NEXT_PUBLIC_CHAIN_ID;
if (!chainIdRaw) throw new Error('Missing required env var NEXT_PUBLIC_CHAIN_ID. See .env.example.');
export const TARGET_CHAIN_ID = parseInt(chainIdRaw, 10);

export const TARGET_CHAIN_NAME = TARGET_CHAIN_ID === 8453 ? 'Base' : 'Base Sepolia';
export const TARGET_EXPLORER_URL = TARGET_CHAIN_ID === 8453 ? 'https://basescan.org' : 'https://sepolia.basescan.org';
