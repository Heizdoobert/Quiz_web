# Phase 3: On-Chain Rewards — Design Spec

## Overview

Add verifiable on-chain rewards to Quick Quiz: an ERC-20 `$QUIZ` token players earn for correct answers and an ERC-721 Achievement Badge NFT system for milestone accomplishments. Claims are authorized via EIP-712 server-signed vouchers — the Next.js backend verifies eligibility from Supabase, signs a typed data hash with a server private key, and the player's wallet submits the claim transaction on-chain.

## Target Network

- **Primary:** Base Sepolia (chain ID `84532`) — EVM L2 testnet with ultra-low gas.
- **Local fallback:** Anvil (`http://127.0.0.1:8545`) for offline development.

## Smart Contract Framework

- **Hardhat** workspace in `contracts/` directory (separate `package.json` from root).
- Solidity `^0.8.24`, OpenZeppelin v5.x contracts.

---

## Smart Contracts

### QuizToken.sol (ERC-20)

- Inherits `ERC20`, `ERC20Permit`, `Ownable`.
- Mint-on-claim: no pre-minted supply. Tokens minted when a valid voucher is submitted.
- Token metadata: `name: "Quiz Token"`, `symbol: "QUIZ"`, `decimals: 18`.
- State:
  - `address public authorizedSigner` — the address corresponding to `REWARD_SIGNER_PRIVATE_KEY`.
  - `mapping(address => mapping(uint256 => bool)) public usedNonces` — replay protection.
- Functions:
  - `claimTokens(address recipient, uint256 amount, uint256 nonce, uint256 deadline, bytes calldata signature)` — verifies EIP-712 signature, checks nonce unused, checks `block.timestamp <= deadline`, mints `amount` to `recipient`.
  - `setAuthorizedSigner(address newSigner)` — owner-only, for key rotation.
- EIP-712 Domain: `name: "QuizToken"`, `version: "1"`, `chainId`, `verifyingContract`.
- EIP-712 TypeHash: `ClaimTokens(address recipient,uint256 amount,uint256 nonce,uint256 deadline)`.

### QuizBadgeNFT.sol (ERC-721)

- Inherits `ERC721`, `ERC721URIStorage`, `Ownable`.
- Auto-incrementing `_nextTokenId` counter.
- Badge types:
  - `0` = Leaderboard Champion (Top 3 global rank)
  - `1` = Streak Fire (best streak ≥ 10)
  - `2` = Century Quizzer (total answered ≥ 100)
  - `3` = Perfect Round (best streak ≥ 10 — same threshold as Streak Fire for MVP)
- State:
  - `address public authorizedSigner` — same signer as QuizToken.
  - `mapping(address => mapping(uint256 => bool)) public hasBadge` — one badge per type per address.
  - `mapping(address => mapping(uint256 => bool)) public usedNonces` — replay protection.
  - `string public baseTokenURI` — base URI for badge metadata.
  - `uint256 public badgeTypeCount` — number of valid badge types (starts at 4).
- Functions:
  - `mintBadge(address recipient, uint256 badgeType, uint256 nonce, uint256 deadline, bytes calldata signature) returns (uint256 tokenId)` — verifies EIP-712 signature, checks badge not already held, mints NFT.
  - `setAuthorizedSigner(address newSigner)` — owner-only.
  - `setBaseURI(string memory newBaseURI)` — owner-only.
  - `setBadgeTypeCount(uint256 count)` — owner-only, for adding new badge types.
- EIP-712 Domain: `name: "QuizBadgeNFT"`, `version: "1"`, `chainId`, `verifyingContract`.
- EIP-712 TypeHash: `MintBadge(address recipient,uint256 badgeType,uint256 nonce,uint256 deadline)`.

---

## Database Additions

### `reward_claims` table

```sql
CREATE TABLE IF NOT EXISTS reward_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    claim_type TEXT NOT NULL CHECK (claim_type IN ('token', 'badge')),
    amount BIGINT,
    badge_type INTEGER,
    nonce TEXT NOT NULL,
    tx_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wallet_address, nonce)
);
```

With RLS enabled and public read/write policies (consistent with existing tables).

---

## Backend: Server Actions

### `lib/actions/reward-actions.ts`

All functions are `'use server'` Server Actions.

**`getClaimableRewards(walletAddress: string): Promise<ClaimableRewards>`**
- Queries `quiz_results` to compute total correct answers.
- Queries `reward_claims` where `status = 'claimed'` and `claim_type = 'token'` to compute total claimed tokens.
- Claimable = `(totalCorrect * 10e18) - totalClaimed` (10 QUIZ tokens per correct answer, in wei).
- Checks badge eligibility from stats (global rank via `getGlobalLeaderboard`, best streak, total answered).
- Checks `reward_claims` for already-claimed badges.
- Returns `ClaimableRewards` object.

**`generateTokenVoucher(walletAddress: string): Promise<RewardVoucher | { error: string }>`**
- Re-derives claimable amount server-side from Supabase (ignores client input).
- If claimable <= 0, returns `{ error: 'Nothing to claim' }`.
- Generates nonce via `crypto.randomUUID()`.
- Sets deadline to `Math.floor(Date.now() / 1000) + 3600` (1 hour).
- Signs EIP-712 typed data using `viem`'s `signTypedData` with account from `REWARD_SIGNER_PRIVATE_KEY`.
- Inserts `pending` row into `reward_claims`.
- Returns `RewardVoucher`.

**`generateBadgeVoucher(walletAddress: string, badgeType: number): Promise<RewardVoucher | { error: string }>`**
- Re-verifies badge eligibility from Supabase.
- Checks `reward_claims` for existing badge claim.
- Same signing and insertion pattern as token voucher.

**`confirmRewardClaim(walletAddress: string, nonce: string, txHash: string): Promise<{ success: boolean }>`**
- Updates `reward_claims` row from `pending` → `claimed` with tx hash.

### Environment Variables

```
REWARD_SIGNER_PRIVATE_KEY=0x...          # Server-only, signs vouchers
NEXT_PUBLIC_QUIZ_TOKEN_ADDRESS=0x...     # Deployed QuizToken address
NEXT_PUBLIC_QUIZ_BADGE_ADDRESS=0x...     # Deployed QuizBadgeNFT address
NEXT_PUBLIC_CHAIN_ID=84532               # Base Sepolia
```

---

## Frontend

### Types (`lib/types.ts` additions)

```typescript
export interface ClaimableRewards {
  claimableTokens: string;       // bigint as string for serialization
  eligibleBadges: number[];
  alreadyClaimedBadges: number[];
  totalEarned: string;
  totalClaimed: string;
}

export interface RewardVoucher {
  recipient: string;
  amount: string;                // bigint as string
  badgeType?: number;
  nonce: string;
  deadline: string;              // bigint as string
  signature: string;
  contractAddress: string;
}

export const BADGE_NAMES: Record<number, string> = {
  0: 'Leaderboard Champion',
  1: 'Streak Fire',
  2: 'Century Quizzer',
  3: 'Perfect Round',
};

export const BADGE_ICONS: Record<number, string> = {
  0: '🏆',
  1: '🔥',
  2: '💯',
  3: '⭐',
};
```

### Contract ABIs

- `lib/contracts/QuizTokenABI.ts` — typed ABI const for `claimTokens`.
- `lib/contracts/QuizBadgeNFTABI.ts` — typed ABI const for `mintBadge`.
- `lib/contracts/addresses.ts` — deployed contract addresses (reads from env with fallback).

### RewardsModal (`components/modals/RewardsModal.tsx`)

Two tabs using the existing `Modal` component:

**Tab 1: $QUIZ Tokens**
- Shows total earned, already claimed, available to claim.
- "Claim $QUIZ" button triggers: `generateTokenVoucher` → `useWriteContract` → `useWaitForTransactionReceipt` → `confirmRewardClaim`.
- Transaction status: idle → signing → submitting → confirming → done/error.
- On success: confetti + Base Sepolia explorer link.

**Tab 2: Achievement Badges**
- 2×2 grid of badge cards.
- Each card: icon, name, status (🔒 Locked / ✅ Claimed / 🎯 Eligible).
- "Mint Badge" button per eligible badge, same tx flow as tokens.

**Chain validation:** If user is on wrong chain, show "Switch to Base Sepolia" button via `useSwitchChain`.

### Header & StatsPanel Integration

- `Header.tsx`: Add "🎁 Rewards" button (visible when wallet connected). Notification dot when claimable > 0.
- `StatsPanel.tsx`: Add "View Rewards" link at bottom with inline claimable summary.

### Providers.tsx

- Add `baseSepolia` import from `wagmi/chains` to the chains array.

---

## Hardhat Workspace

### Structure

```
contracts/
├── contracts/QuizToken.sol, QuizBadgeNFT.sol
├── test/QuizToken.test.ts, QuizBadgeNFT.test.ts
├── scripts/deploy.ts, sync-abi.ts
├── hardhat.config.ts
├── package.json
└── tsconfig.json
```

### Tests (16 cases)

**QuizToken (8 tests):**
1. Valid voucher mints tokens.
2. Replayed nonce reverts.
3. Expired deadline reverts.
4. Wrong signer reverts.
5. Tampered amount reverts.
6. Owner can rotate signer.
7. Non-owner cannot rotate signer.
8. Zero amount reverts.

**QuizBadgeNFT (8 tests):**
1. Valid voucher mints badge NFT.
2. Duplicate badge for same address reverts.
3. Replayed nonce reverts.
4. Expired deadline reverts.
5. Wrong signer reverts.
6. tokenURI returns correct metadata.
7. Different addresses can hold same badge type.
8. Invalid badge type reverts.

### Deployment

`scripts/deploy.ts`: Deploys both contracts, sets authorized signer, writes addresses to `../lib/contracts/addresses.ts`.

### ABI Sync

`scripts/sync-abi.ts`: Reads Hardhat artifacts, writes TypeScript ABI consts to `../lib/contracts/`.
