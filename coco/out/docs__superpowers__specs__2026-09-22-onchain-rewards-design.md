# docs/superpowers/specs/2026-09-22-onchain-rewards-design.md
lines:239 exports:ClaimableRewards,RewardVoucher,BADGE_NAMES,BADGE_ICONS
---
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
