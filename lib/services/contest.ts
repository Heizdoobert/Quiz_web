import { keccak256, toHex } from 'viem';

// Client-safe contest helpers (no 'server-only': imported by client components).
// lib/utils/chain.ts re-exports this. bytes32 contestId = keccak256(utf8 "<listId>:<creator>"), both lowercased;
// with no creator it is keccak256 of the lowercased listId alone.

export function getContestId(listId: string, creatorAddress?: string): `0x${string}` {
  const normalized = creatorAddress
    ? `${listId.toLowerCase()}:${creatorAddress.toLowerCase()}`
    : listId.toLowerCase();
  return keccak256(toHex(normalized));
}

// Default contest window before the creator can refund unclaimed tokens.
export const CONTEST_DURATION_SECONDS = 7 * 24 * 3600;
