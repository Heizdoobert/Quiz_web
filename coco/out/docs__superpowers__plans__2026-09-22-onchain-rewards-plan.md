# docs/superpowers/plans/2026-09-22-onchain-rewards-plan.md
lines:1893 exports:QuizTokenABI,QuizBadgeNFTABI,QUIZ_TOKEN_ADDRESS,QUIZ_BADGE_ADDRESS,QUIZ_TOKEN_ADDRESS,QUIZ_BADGE_ADDRESS,QUIZ_TOKEN_ADDRESS,QUIZ_BADGE_ADDRESS,ClaimableRewards,RewardVoucher,BADGE_NAMES,BADGE_ICONS,getClaimableRewards,generateTokenVoucher,generateBadgeVoucher,confirmRewardClaim,default
---
# Phase 3: On-Chain Rewards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add verifiable on-chain ERC-20 token rewards and ERC-721 achievement badge NFTs to Quick Quiz, authorized via EIP-712 server-signed vouchers on Base Sepolia.

**Architecture:** A Hardhat workspace (`contracts/`) compiles and tests two Solidity contracts (QuizToken ERC-20, QuizBadgeNFT ERC-721). Next.js Server Actions sign EIP-712 vouchers after verifying player eligibility from Supabase. The frontend uses Wagmi hooks to submit claim transactions from the player's wallet. A deployment script syncs ABIs and addresses into the Next.js `lib/contracts/` directory.

**Tech Stack:** Solidity ^0.8.24, OpenZeppelin v5.x, Hardhat, viem, wagmi, Base Sepolia (chain ID 84532), Supabase, Next.js 16 App Router, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-09-22-onchain-rewards-design.md`

## Global Constraints

- Solidity `^0.8.24` with OpenZeppelin `@openzeppelin/contracts` v5.x.
- Hardhat workspace isolated in `contracts/` with its own `package.json`.
- All styling uses Tailwind CSS v4 and the existing dark palette (`#0f172a` bg, `#1e293b` cards, `#3b82f6` accents).
- `REWARD_SIGNER_PRIVATE_KEY` is server-only — never prefixed with `NEXT_PUBLIC_`.
- `bigint` values crossing the server action boundary are serialized as strings (Server Actions cannot serialize `bigint`).
- Run `npm run lint` and `npm run build` in the root after each task to verify zero errors.
- Run `npx hardhat test` in `contracts/` after each contracts task.
- Use `BypassSandbox: true` for all shell commands (NTFS mount constraint).

---

## File Map

### New Files — Hardhat Workspace

| File | Responsibility |
|------|---------------|
| `contracts/package.json` | Hardhat dev dependencies, scripts |
| `contracts/tsconfig.json` | TypeScript config for Hardhat |
| `contracts/hardhat.config.ts` | Solidity compiler, network configs |
| `contracts/contracts/QuizToken.sol` | ERC-20 $QUIZ token with EIP-712 claim |
| `contracts/contracts/QuizBadgeNFT.sol` | ERC-721 badge NFT with EIP-712 mint |
| `contracts/test/QuizToken.test.ts` | 8 test cases for QuizToken |
| `contracts/test/QuizBadgeNFT.test.ts` | 8 test cases for QuizBadgeNFT |
| `contracts/scripts/deploy.ts` | Deploy both contracts, write addresses |
| `contracts/scripts/sync-abi.ts` | Extract ABIs to Next.js lib/contracts/ |
