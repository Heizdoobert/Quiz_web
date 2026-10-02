# tasks/plan.md
lines:124 exports:
---
# Implementation Plan: Quick Quiz Ecosystem V1

> Intent: [docs/intent/ecosystem-v1.md](../docs/intent/ecosystem-v1.md)
> Task Log: [docs/intent/ecosystem-v1-log.md](../docs/intent/ecosystem-v1-log.md)

## Overview

Ship the end-to-end token-powered contest loop on a live chain: a creator creates a quiz contest, funds it with `$QUIZ` tokens via on-chain escrow, a player takes the quiz, scores well, and claims their reward on-chain. Tokens actually move. This is the v1 demo moment that proves the ecosystem is real.

## What Already Exists

| Layer | Status | Details |
|-------|--------|---------|
| Smart Contract | ✅ Deployed (Base Sepolia) | `ContestEscrow.sol` with create, claim, refund. 30 Hardhat tests passing. |
| Token | ✅ Deployed (Base Sepolia) | `QuizToken.sol` ERC-20 with EIP-712 gasless claims. |
| Database | ✅ Running | `question_lists`, `list_entries`, `reward_claims` tables with RLS. |
| Auth | ✅ Working | SIWE wallet login + Email OTP, HMAC session cookies. |
| Backend | ✅ Working | Full contest lifecycle server actions (create → review → fund → play → claim). |
| Frontend | ⚠️ Partial | Contest flow exists but has critical bugs blocking reliable end-to-end use. |
| Mainnet | ❌ Not configured | Contracts only on Base Sepolia. Hardhat config missing mainnet network. |

## Architecture Decisions

- **Fix before extend:** The existing contest loop has 8 identified bugs/gaps. Fixing these is cheaper and faster than building new features on a broken foundation.
- **Schema-first:** Add lifecycle tracking fields (`expires_at`, `onchain_contest_id`, expanded status enum) before building features that depend on them.
- **Vertical slices:** Each task delivers a testable improvement to the end-to-end loop.
- **Mainnet last:** Deploy to Base Mainnet only after the full loop is reliable on Sepolia.

## Dependency Graph

```
Schema Migration (lifecycle fields)
    │
    ├── Contest Status Sync (mark expired/completed)
    │       │
    │       └── Unclaimed Rewards Recovery UI
    │
    ├── Creator Refund Flow
    │
    ├── Pre-play On-chain Validation
