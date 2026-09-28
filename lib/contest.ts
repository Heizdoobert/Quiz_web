import { keccak256, toHex } from 'viem';

// Client-safe contest helpers (no 'server-only': imported by client components).
// Must match lib/chain.ts getContestId: bytes32 contestId = keccak256(bytes(listId)).

export function getContestId(listId: string): `0x${string}` {
  return keccak256(toHex(listId));
}

// Default contest window before the creator can refund unclaimed tokens.
export const CONTEST_DURATION_SECONDS = 7 * 24 * 3600;
