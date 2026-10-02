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
    │
    └── Funding UX (balance check, max participants)

Resilient Play State (independent)

Gasless Contest Claims (independent)

Navigation Fix (independent)

All of the above
    │
    └── Mainnet Deployment
            │
            └── End-to-end Smoke Test
```

## Task List

### Phase 1: Fix Critical Bugs (make existing loop reliable)

- [ ] Task 1: Schema migration — lifecycle tracking fields
- [ ] Task 2: Contest status sync — mark contests expired/completed
- [ ] Task 3: Unclaimed contest rewards recovery UI

### Checkpoint: Phase 1
- [ ] A player who completes a contest and leaves can return and claim their reward
- [ ] Expired/drained contests no longer show as "live"
- [ ] `npm run check:fast` passes
- [ ] All existing tests pass

### Phase 2: Complete Creator & Player Experience

- [ ] Task 4: Creator refund flow (UI + server action)
- [ ] Task 5: Max participants config in funding widget
- [ ] Task 6: QUIZ balance pre-flight check during funding
- [ ] Task 7: Pre-play on-chain contest validation

### Checkpoint: Phase 2
- [ ] Creator can reclaim unused tokens after contest expires
- [ ] Creator sees their QUIZ balance and can set max participants
- [ ] Player is warned before starting a contest with insufficient on-chain funds
- [ ] End-to-end contest loop works reliably on Sepolia
- [ ] `npm run check:task` passes

### Phase 3: Resilience & UX Polish

- [ ] Task 8: Persistent play state (survive page reloads)
- [ ] Task 9: Gasless contest claims via EIP-5792
- [ ] Task 10: Navigation and header fixes

### Checkpoint: Phase 3
- [ ] Player can reload mid-contest without losing progress
- [ ] Contest claims work without players needing ETH for gas
- [ ] Trophy/Contests navigation is correct
- [ ] Full regression: `npm run check:full` passes

### Phase 4: Go Live on Mainnet

- [ ] Task 11: Hardhat mainnet config + deployment scripts
- [ ] Task 12: Deploy contracts to Base Mainnet
- [ ] Task 13: Update addresses, env vars, and chain config
- [ ] Task 14: End-to-end smoke test on Base Mainnet

### Checkpoint: Complete
- [ ] Full create → fund → play → claim loop works on Base Mainnet
- [ ] Tokens actually move on a live chain
- [ ] All CI/CD checks green on preview, merged to main
- [ ] Intent confirmed: v1 shipped

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mainnet deployment key management | High | Use hardware wallet or secure vault for deployer + signer keys. Never commit private keys. |
| EIP-5792 paymaster not supporting ContestEscrow | Med | Fall back to standard EOA claims if paymaster rejects the call. Feature-detect capability. |
| Contest pool drain during play | Med | Task 7 adds pre-play on-chain validation. Show warning, don't block. |
| Schema migration on production Supabase | Med | Test migration on Supabase branch first. Use `apply_migration` MCP tool. |
| Gas costs for players claiming on mainnet | Med | Task 9 (gasless via EIP-5792) mitigates. If paymaster unavailable, player pays ~$0.01 on Base. |

## Open Questions

- What is the initial `$QUIZ` token supply for mainnet? (Mint schedule, or fixed supply transferred to escrow?)
- Should the `authorizedSigner` key be the same as the deployer, or a separate hot wallet?
- Is there a specific Base Mainnet RPC provider preference (Alchemy, Infura, public)?
