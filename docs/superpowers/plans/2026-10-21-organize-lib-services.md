# Organize `lib/services` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up and modularize `lib/services/` by migrating all consumer imports in `app/`, `lib/actions/`, `lib/constants/`, `components/`, and `tests/` directly to their respective domain subdirectories, deleting all 19 flat proxy/re-export files at `lib/services/*.ts`, and removing empty vestigial directories in `lib/`.

**Architecture & Domain Mapping:**
- `admin/`: `account-deletion`, `config-admin`, `report-admin`, `role-admin`
- `api/`: `api-response`, `error-issues`, `sendgrid`
- `auth/`: `api-auth`, `authorize`, `credentials`, `cron-auth`, `mobile-auth`, `password-reset`, `rate-limit`, `session`
- `moderation/`: `ai-moderation`, `moderation`
- `rbac/`: `rbac`
- `reporting/`: `system-report`
- `users/`: `user-quizzes`, `users`

---

## Tasks

### Task 1: Consolidate `rate-limit.ts` into `lib/services/auth/rate-limit.ts`

**Files:**
- Move: `lib/services/moderation/rate-limit.ts` -> `lib/services/auth/rate-limit.ts` (replace the trampoline)
- Remove: `lib/services/moderation/rate-limit.ts`

- [x] **Step 1:** Replace the proxy in `lib/services/auth/rate-limit.ts` with the actual implementation from `lib/services/moderation/rate-limit.ts`.
- [x] **Step 2:** Remove `lib/services/moderation/rate-limit.ts`.
- [x] **Step 3:** Verify with `npm run type-check`.

---

### Task 2: Migrate Imports in `app/api/` and `app/admin/`

**Files:**
- Modify: `app/admin/**/*.tsx`, `app/admin/**/*.ts`
- Modify: `app/api/**/*.ts`

- [x] **Step 1:** Update all `from '@/lib/services/authorize'` -> `from '@/lib/services/auth/authorize'`.
- [x] **Step 2:** Update all `from '@/lib/services/api-response'` -> `from '@/lib/services/api/api-response'`.
- [x] **Step 3:** Update all `from '@/lib/services/api-auth'` -> `from '@/lib/services/auth/api-auth'`.
- [x] **Step 4:** Update all `from '@/lib/services/credentials'` -> `from '@/lib/services/auth/credentials'`.
- [x] **Step 5:** Update all `from '@/lib/services/mobile-auth'` -> `from '@/lib/services/auth/mobile-auth'`.
- [x] **Step 6:** Update all `from '@/lib/services/password-reset'` -> `from '@/lib/services/auth/password-reset'`.
- [x] **Step 7:** Update all `from '@/lib/services/cron-auth'` -> `from '@/lib/services/auth/cron-auth'`.
- [x] **Step 8:** Update all `from '@/lib/services/system-report'` -> `from '@/lib/services/reporting/system-report'`.
- [x] **Step 9:** Update all `from '@/lib/services/role-admin'` -> `from '@/lib/services/admin/role-admin'`.
- [x] **Step 10:** Update all `from '@/lib/services/report-admin'` -> `from '@/lib/services/admin/report-admin'`.
- [x] **Step 11:** Update all `from '@/lib/services/error-issues'` -> `from '@/lib/services/api/error-issues'`.
- [x] **Step 12:** Update all `from '@/lib/services/account-deletion'` -> `from '@/lib/services/admin/account-deletion'`.
- [x] **Step 13:** Update all `from '@/lib/services/user-quizzes'` -> `from '@/lib/services/users/user-quizzes'`.
- [x] **Step 14:** Update all `from '@/lib/services/rbac'` -> `from '@/lib/services/rbac/rbac'`.
- [x] **Step 15:** Update all `from '@/lib/services/moderation'` -> `from '@/lib/services/moderation/moderation'`.
- [x] **Step 16:** Verify `npm run type-check`.

---

### Task 3: Migrate Imports in `lib/actions/`, `lib/constants/`, `components/`

**Files:**
- Modify: `lib/actions/*.ts`
- Modify: `lib/constants/admin-pages.ts`
- Modify: `components/admin/*.tsx`

- [x] **Step 1:** Update `lib/actions/auth-actions.ts` (`@/lib/services/auth/credentials`, `@/lib/services/auth/password-reset`, `@/lib/services/auth/rate-limit`).
- [x] **Step 2:** Update `lib/actions/community-actions.ts`, `group-actions.ts`, `leaderboard-actions.ts`, `question-actions.ts`, `quiz-actions.ts` (`@/lib/services/auth/session`, `@/lib/services/auth/rate-limit`).
- [x] **Step 3:** Update `lib/constants/admin-pages.ts` (`@/lib/services/rbac/rbac`).
- [x] **Step 4:** Update `components/admin/IssueList.tsx` (`@/lib/services/api/error-issues`), `components/admin/ReportDashboard.tsx` (`@/lib/services/admin/report-admin`), `components/admin/RoleRow.tsx` (`@/lib/services/rbac/rbac`).
- [x] **Step 5:** Verify with `npm run type-check`.

---

### Task 4: Migrate Imports in `tests/`

**Files:**
- Modify: `tests/**/*.ts`, `tests/**/*.tsx`

- [x] **Step 1:** Search and replace all `@/lib/services/<proxy>` imports and `vi.mock('@/lib/services/<proxy>')` calls to point to their domain subfolders (`auth/`, `admin/`, `api/`, `moderation/`, `rbac/`, `reporting/`, `users/`).
- [x] **Step 2:** Verify with `npm run type-check`.

---

### Task 5: Delete 19 Proxy Files in `lib/services/` and Empty Vestigial Folders

**Files:**
- Remove: 19 flat files in `lib/services/*.ts`
- Remove: empty directories `lib/data/`, `lib/features/`, `lib/ui/`

- [x] **Step 1:** Remove all 19 flat files in `lib/services/*.ts`.
- [x] **Step 2:** Remove empty directories `lib/data/`, `lib/features/`, `lib/ui/`.
- [x] **Step 3:** Run `npm run type-check` to verify 0 missing module errors.
- [x] **Step 4:** Run `npm run check:architecture` to verify dependency rules.
- [x] **Step 5:** Run `npm test` to verify test suite passes.
