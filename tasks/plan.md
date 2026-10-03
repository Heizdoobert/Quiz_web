# Implementation Plan: Fix Critical Bugs and Logic Flaws in lib/

## Overview

A comprehensive code audit of the `lib/` directory identified 6 core bugs and regressions spanning on-chain contest identifier derivation, expired voucher lockout, PostgREST permission gaps, missing database records, and mathematical display discrepancies. This plan decomposes the remediation into small, testable, vertically-sliced tasks to restore full reliability and security to the core quiz, rewards, and contest engines.

## Architecture Decisions

- **Source of Truth for On-Chain Contest IDs:** Contests save their on-chain ID at initialization in `question_lists.onchain_contest_id`. Server actions verifying claims (`claimListReward`, `confirmRewardClaim`) must use this stored ID rather than attempting to re-hash with `owner_wallet`, which can be `NULL` for accounts initialized via username/password or email.
- **Strict On-Chain Expiry Alignment:** Blockchain contracts immediately reject vouchers where `block.timestamp > deadline`. Server-side pending voucher settlement must mark claims expired as soon as `deadline <= now` to allow users to generate a fresh, valid voucher immediately rather than locking them into an expired voucher for 5 minutes.
- **Defensive Database Queries:** All PostgREST `.in()` filters must guard against empty arrays to prevent `400 Bad Request` syntax failures. All columns joined in anonymous queries must have explicit Postgres column grants.
- **Consistency in Economics:** Contest reward metadata presented in `attachListMeta` must match the actual payout math enforced in `completeListAttempt` (`reward_pool / max_participants / question_count`).

---

## Dependency Graph

```
Task 1: Contest ID Derivation & Owner Wallet Sync
    │
    ├── Task 2: Voucher Expiry Alignment (Token & Contest)
    │
    ├── Task 3: Postgres Grants & Empty Array PostgREST Guards
    │
    ├── Task 4: Contest Reward Metadata Calculation Alignment
    │
    └── Task 5: 50:50 Lifeline Elimination Fallback Fix
            │
            └── Task 6: Full Regression & Constraints Verification
```

---

## Task List

### Phase 1: On-Chain Contest & Voucher Settlement Fixes
- [ ] Task 1: Fix Contest ID Derivation and Owner Wallet Sync
- [ ] Task 2: Fix Inverted Voucher Expiry Locking (Token & Contest)

### Checkpoint: Phase 1
- [ ] Vouchers generated for contest claims match the on-chain contest ID regardless of auth origin
- [ ] Expired vouchers are immediately marked expired and replaced with fresh vouchers
- [ ] `npm run check:fast` passes

### Phase 2: Query Safety, Database Permissions & Economics Alignment
- [ ] Task 3: Add `created_by_user` Grant & Guard Empty `.in()` Queries
- [ ] Task 4: Align Contest Reward Display Calculation with Settlement Math

### Checkpoint: Phase 2
- [ ] Topic question browsing works anonymously without permission errors
- [ ] Empty contest questions do not throw PostgREST 400 errors
- [ ] Contest cards show correct expected earnings per question

### Phase 3: Lifeline Polish & Full Constraints Verification
- [ ] Task 5: Fix 50:50 Lifeline Fallback
- [ ] Task 6: Full Regression Verification & Constraints Check

### Checkpoint: Complete
- [ ] All unit and integration tests pass
- [ ] Types, linting, and coverage comply with `CONSTRAINTS.md`
- [ ] Ready for review and merge into `preview` branch

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Database column grant missed in Supabase production | High | Write idempotent SQL script in `lib/sql/` and verify with anonymous client queries. |
| Existing pending vouchers invalidated during expiry logic update | Low | The fix only affects vouchers past their on-chain deadline which the contract would have rejected anyway. |
| Breaking changes to `QuestionListWithMeta` consumers | Low | The field `perQuestionReward` remains a string; only the numerical value is corrected to reflect the real per-participant payout. |

## Open Questions
- None. All issues have clear root causes and unambiguous reproduction paths in the codebase.
