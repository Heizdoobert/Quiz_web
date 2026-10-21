# Organize and Modularize `lib/actions` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `lib/actions/` into domain-aligned directories (`admin/`, `ads/`, `auth/`, `community/`, `quiz/`, `users/`), decompose oversized actions files (>9KB: `auth`, `community`, `question`) into focused functional modules, update all consumers across `app/`, `components/`, and `tests/`, and purge legacy flat `*-actions.ts` files.

**Architecture:** Split server actions into domain-focused subdirectories mirroring `lib/services/`. Each domain folder contains granular sub-action modules marked with `'use server'` for specific concerns, and an `index.ts` barrel that re-exports all actions and public types. A root `lib/actions/index.ts` re-exports everything for clean top-level imports.

**Tech Stack:** Next.js 16 (App Router Server Actions), TypeScript, Vitest, Dependency Cruiser.

**Spec:** User selected Option 3: "Gom Domain + Module hóa sâu: Gom theo Domain và bẻ nhỏ các file lớn (>9KB như question, community, auth) thành các sub-actions theo chức năng".

## Global Constraints

- Zero type errors (`npm run type-check`).
- Zero architecture/circular dependency violations (`npm run check:architecture`).
- Zero suppression comments (`@ts-ignore`, `eslint-disable`).
- Preserve all existing Server Action function signatures and return types.
- Ensure all exported action functions are `async` and valid for Next.js Server Actions.

---

## Tasks

### Task 1: Scaffold and Implement Domains: `admin/`, `ads/`, and `users/`

**Files:**
- Create: `lib/actions/admin/admin.ts`
- Create: `lib/actions/admin/index.ts`
- Create: `lib/actions/ads/ads.ts`
- Create: `lib/actions/ads/index.ts`
- Create: `lib/actions/users/profile.ts`
- Create: `lib/actions/users/index.ts`

**Interfaces:**
- `admin`: `updateConfigAction`, `listAccountsAction`, `setRoleAction`, `listQuarantineAction`, `resolveQuarantineAction`, `triggerReportAction`
- `ads`: `fetchRandomSponsor`, `Sponsor` interface
- `users`: `getUserQuizzes`, `exportUserData`, `getQuestionAnalytics`, `deleteMyAccount`, `QuestionAnalytics`, `DeleteMyAccountResult`

- [ ] **Step 1:** Create `lib/actions/admin/admin.ts` and `lib/actions/admin/index.ts` from `admin-actions.ts`.
- [ ] **Step 2:** Create `lib/actions/ads/ads.ts` and `lib/actions/ads/index.ts` from `ads-actions.ts`.
- [ ] **Step 3:** Create `lib/actions/users/profile.ts` and `lib/actions/users/index.ts` from `profile-actions.ts`.
- [ ] **Step 4:** Run `npm run type-check` to verify correct types and imports.

---

### Task 2: Modularize `auth/` Domain

**Files:**
- Create: `lib/actions/auth/types.ts`
- Create: `lib/actions/auth/email.ts`
- Create: `lib/actions/auth/password.ts`
- Create: `lib/actions/auth/username.ts`
- Create: `lib/actions/auth/session.ts`
- Create: `lib/actions/auth/index.ts`

**Interfaces:**
- `types.ts`: `AuthResult`, `VerifyCodeOptions`
- `email.ts`: `signUpWithEmail`, `signInWithEmail`, `requestVerificationCode`, `verifyVerificationCode`, `requestEmailCode`, `verifyEmailCode`
- `password.ts`: `requestPasswordReset`, `verifyPasswordResetCode`, `updatePasswordWithReset`
- `username.ts`: `signUpWithUsername`, `signInWithUsername`
- `session.ts`: `getSessionInfo`, `signOut`
- `index.ts`: Re-exports all of the above

- [ ] **Step 1:** Create `lib/actions/auth/types.ts` with types extracted from `auth-actions.ts`.
- [ ] **Step 2:** Create `lib/actions/auth/email.ts` containing email signup, signin, OTP, and backward-compatible email code functions.
- [ ] **Step 3:** Create `lib/actions/auth/password.ts` containing password reset request, verify, and update functions.
- [ ] **Step 4:** Create `lib/actions/auth/username.ts` containing username signup and signin functions.
- [ ] **Step 5:** Create `lib/actions/auth/session.ts` containing `getSessionInfo` and `signOut`.
- [ ] **Step 6:** Create `lib/actions/auth/index.ts` re-exporting all auth actions and types.
- [ ] **Step 7:** Run `npm run type-check`.

---

### Task 3: Modularize `community/` Domain

**Files:**
- Create: `lib/actions/community/types.ts`
- Create: `lib/actions/community/gate.ts`
- Create: `lib/actions/community/ratings.ts`
- Create: `lib/actions/community/comments.ts`
- Create: `lib/actions/community/suggestions.ts`
- Create: `lib/actions/community/groups.ts`
- Create: `lib/actions/community/index.ts`

**Interfaces:**
- `types.ts`: `CommunityResult`, `RatingSummary`, `CommentView`, `SuggestionView`
- `gate.ts`: `checkCanDiscuss`
- `ratings.ts`: `rateQuestion`
- `comments.ts`: `addComment`, `deleteComment`, `getQuestionDiscussion`
- `suggestions.ts`: `resolveSuggestion`, `getSuggestionsForAuthor`
- `groups.ts`: `createGroup`, `joinGroup`, `leaveGroup`, `getUserGroups` (from `group-actions.ts`)
- `index.ts`: Re-exports all community actions and types

- [ ] **Step 1:** Create `lib/actions/community/types.ts` and `lib/actions/community/gate.ts`.
- [ ] **Step 2:** Create `lib/actions/community/ratings.ts`, `comments.ts`, and `suggestions.ts`.
- [ ] **Step 3:** Create `lib/actions/community/groups.ts` from `group-actions.ts`.
- [ ] **Step 4:** Create `lib/actions/community/index.ts` re-exporting all.
- [ ] **Step 5:** Run `npm run type-check`.

---

### Task 4: Modularize `quiz/` Domain

**Files:**
- Create: `lib/actions/quiz/quiz.ts`
- Create: `lib/actions/quiz/leaderboard.ts`
- Create: `lib/actions/quiz/discovery.ts`
- Create: `lib/actions/quiz/questions/authoring.ts`
- Create: `lib/actions/quiz/questions/query.ts`
- Create: `lib/actions/quiz/questions/dispute.ts`
- Create: `lib/actions/quiz/questions/gameplay.ts`
- Create: `lib/actions/quiz/questions/index.ts`
- Create: `lib/actions/quiz/index.ts`

**Interfaces:**
- `quiz.ts`: `submitAnswer`, `getAnswerHistory`, `getUserStats`
- `leaderboard.ts`: `getGlobalLeaderboard`, `getGroupLeaderboard`
- `discovery.ts`: `searchQuestions`, `getTopicQuestions`
- `questions/authoring.ts`: `createQuestion`, `generateQuestion`
- `questions/query.ts`: `fetchRandomQuestion`, `getPublicQuestion`, `getTopics`, `getQuestionCount`
- `questions/dispute.ts`: `disputeQuestion`
- `questions/gameplay.ts`: `get5050EliminatedIndices`
- `questions/index.ts`: Re-exports all question actions
- `index.ts`: Re-exports quiz, leaderboard, discovery, and questions

- [ ] **Step 1:** Create `lib/actions/quiz/questions/authoring.ts`, `query.ts`, `dispute.ts`, `gameplay.ts`, and `questions/index.ts`.
- [ ] **Step 2:** Create `lib/actions/quiz/quiz.ts` from `quiz-actions.ts`.
- [ ] **Step 3:** Create `lib/actions/quiz/leaderboard.ts` from `leaderboard-actions.ts`.
- [ ] **Step 4:** Create `lib/actions/quiz/discovery.ts` from `discovery-actions.ts`.
- [ ] **Step 5:** Create `lib/actions/quiz/index.ts` re-exporting quiz, leaderboard, discovery, and questions.
- [ ] **Step 6:** Run `npm run type-check`.

---

### Task 5: Root `lib/actions/index.ts` & Compatibility Proxies

**Files:**
- Create: `lib/actions/index.ts`
- Modify: `lib/actions/admin-actions.ts` (redirect to `@/lib/actions/admin`)
- Modify: `lib/actions/ads-actions.ts` (redirect to `@/lib/actions/ads`)
- Modify: `lib/actions/auth-actions.ts` (redirect to `@/lib/actions/auth`)
- Modify: `lib/actions/community-actions.ts` (redirect to `@/lib/actions/community`)
- Modify: `lib/actions/group-actions.ts` (redirect to `@/lib/actions/community/groups`)
- Modify: `lib/actions/discovery-actions.ts` (redirect to `@/lib/actions/quiz/discovery`)
- Modify: `lib/actions/leaderboard-actions.ts` (redirect to `@/lib/actions/quiz/leaderboard`)
- Modify: `lib/actions/profile-actions.ts` (redirect to `@/lib/actions/users/profile`)
- Modify: `lib/actions/question-actions.ts` (redirect to `@/lib/actions/quiz/questions`)
- Modify: `lib/actions/quiz-actions.ts` (redirect to `@/lib/actions/quiz/quiz`)

- [ ] **Step 1:** Create `lib/actions/index.ts` re-exporting all domains.
- [ ] **Step 2:** Convert existing 10 `*-actions.ts` files into forwarders to ensure zero downtime during caller migration.
- [ ] **Step 3:** Run `npm run type-check` and `npm run check:architecture`.

---

### Task 6: Migrate Caller Imports in `app/` and `components/`

**Files:**
- Modify: `app/api/**/*.ts`
- Modify: `app/**/*.tsx`
- Modify: `components/**/*.tsx`

- [ ] **Step 1:** Migrate `auth-actions` imports in `app/` and `components/` to `@/lib/actions/auth`.
- [ ] **Step 2:** Migrate `admin-actions` imports in `app/` and `components/` to `@/lib/actions/admin`.
- [ ] **Step 3:** Migrate `community-actions` and `group-actions` imports to `@/lib/actions/community`.
- [ ] **Step 4:** Migrate `quiz-actions`, `question-actions`, `leaderboard-actions`, and `discovery-actions` imports to `@/lib/actions/quiz` (or subpaths).
- [ ] **Step 5:** Migrate `profile-actions` imports to `@/lib/actions/users`.
- [ ] **Step 6:** Run `npm run type-check`.

---

### Task 7: Migrate Imports in `tests/`

**Files:**
- Modify: `tests/**/*.ts`
- Modify: `tests/**/*.tsx`

- [ ] **Step 1:** Update all action imports and `vi.mock()` paths in `tests/` to target new domain paths.
- [ ] **Step 2:** Run targeted tests: `npx vitest -c vitest.config.ts run tests/answer-guards.test.ts tests/profile-actions.test.ts`.
- [ ] **Step 3:** Run `npm run type-check`.

---

### Task 8: Remove Legacy Flat `*-actions.ts` Files and Run Final Verification

**Files:**
- Delete: `lib/actions/*-actions.ts` (all 10 flat files)

- [ ] **Step 1:** Delete the 10 legacy `lib/actions/*-actions.ts` files.
- [ ] **Step 2:** Run `npm run type-check` (zero errors).
- [ ] **Step 3:** Run `npm run check:architecture` (zero violations).
- [ ] **Step 4:** Run action tests with `npx vitest -c vitest.config.ts run tests/answer-guards.test.ts tests/profile-actions.test.ts`.
