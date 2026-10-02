# tasks/todo.md
lines:391 exports:
---
# Tasks: Quick Quiz Ecosystem V1

> Plan: [plan.md](./plan.md) | Intent: [../docs/intent/ecosystem-v1.md](../docs/intent/ecosystem-v1.md)

---

## Phase 1: Fix Critical Bugs

---

## Task 1: Schema Migration — Lifecycle Tracking Fields

**Description:** Add missing lifecycle fields to `question_lists` and `list_entries` so the app can track contest expiration, completion, and on-chain identity without hitting the blockchain for every query.

**Acceptance criteria:**
- [x] `question_lists` gains: `onchain_contest_id TEXT`, `expires_at TIMESTAMPTZ`, `funding_tx_hash TEXT`, `refunded_at TIMESTAMPTZ`, `refund_tx_hash TEXT`
- [ ] `question_lists.status` constraint expanded to include `'completed'`, `'expired'`, `'refunded'`
- [ ] `list_entries` gains: `claim_tx_hash TEXT`
- [ ] `startContest` server action populates `onchain_contest_id` and `expires_at` when transitioning to `'live'`
- [ ] Existing data is not broken (migration is additive — new nullable columns only)

**Verification:**
- [ ] Migration SQL executes without error on Supabase branch
- [ ] `npm run check:fast` passes
- [ ] Existing Hardhat tests still pass: `npm --prefix contracts test`

**Dependencies:** None
**Files likely touched:**
- `lib/sql/ecosystem-v1-migration.sql` (new)
- `lib/schema.sql` (update canonical reference)
- `lib/actions/question-list-actions.ts` (`startContest` to populate new fields)
- `lib/types.ts` (update `QuestionList` type)

**Estimated scope:** Small (3–4 files)

---

## Task 2: Contest Status Sync — Mark Expired/Completed

**Description:** Contests currently stay `'live'` in the database even after the on-chain pool is drained or the expiration passes. Add logic to transition contests to `'completed'` (pool drained) or `'expired'` (past `expires_at`) so `getLiveLists()` returns only genuinely active contests.
