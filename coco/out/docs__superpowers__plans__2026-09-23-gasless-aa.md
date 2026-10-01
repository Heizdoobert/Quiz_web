# docs/superpowers/plans/2026-09-23-gasless-aa.md
lines:157 exports:
---
# Gasless Transactions (Account Abstraction) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable players to claim `$QUIZ` tokens and mint `QBADGE` NFTs completely free of gas fees using Coinbase Smart Wallet and a Paymaster.

**Architecture:** Update Wagmi configuration to support Coinbase Smart Wallet. Refactor the rewards claiming logic in `use-rewards-modal.ts` to utilize EIP-5792 `useWriteContracts` with a `capabilities` parameter pointing to our Paymaster URL, falling back to standard transactions for traditional EOAs.

**Tech Stack:** Next.js 14, React, Wagmi v2, Viem, Coinbase Smart Wallet, EIP-5792.

**Spec:** `docs/superpowers/specs/2026-09-23-gasless-aa-design.md`

## Global Constraints

- Must not break existing traditional wallet connections (MetaMask/Rainbow).
- Must gracefully handle users rejecting the passkey/wallet creation.

---

### Task 1: Environment Variables Setup

**Files:**
- Modify: `.env.example`
- Modify: `.env`

**Interfaces:**
- Produces: `NEXT_PUBLIC_PAYMASTER_URL` environment variable accessible to the frontend.

- [ ] **Step 1: Add to `.env.example`**
Add the following line to the end of the file:
```env
# Coinbase Developer Platform Paymaster URL for Gasless Transactions
NEXT_PUBLIC_PAYMASTER_URL=
```

- [ ] **Step 2: Add to `.env`**
Add the following line to the end of the file (using a placeholder for testing):
```env
# Coinbase Developer Platform Paymaster URL for Gasless Transactions
NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base-sepolia/mock-paymaster-key
