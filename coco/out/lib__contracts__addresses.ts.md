# lib/contracts/addresses.ts
lines:8 exports:QUIZ_TOKEN_ADDRESS,QUIZ_BADGE_ADDRESS,CONTEST_ESCROW_ADDRESS,TARGET_CHAIN_ID,TARGET_CHAIN_NAME,TARGET_EXPLORER_URL
---
// Contract addresses and chain config from environment variables.
export const QUIZ_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS || '') as `0x${string}`;
export const QUIZ_BADGE_ADDRESS = (process.env.NEXT_PUBLIC_QUIZ_BADGE_ADDRESS || '') as `0x${string}`;
export const CONTEST_ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_CONTEST_ESCROW_ADDRESS || '') as `0x${string}`;

export const TARGET_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10);
export const TARGET_CHAIN_NAME = TARGET_CHAIN_ID === 8453 ? 'Base' : 'Base Sepolia';
export const TARGET_EXPLORER_URL = TARGET_CHAIN_ID === 8453 ? 'https://basescan.org' : 'https://sepolia.basescan.org';
