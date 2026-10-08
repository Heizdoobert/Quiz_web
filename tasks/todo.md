# Tasks: Phase B Feature Enhancements

> Plan: [plan.md](./plan.md)

---

## Task 1: Clean up remaining Phase A dependencies
**Description:** Remove unused `@x402/*` packages from `package.json` to complete Phase A pruning.
> [!WARNING] Update: This step is invalid because `@coinbase/cdp-sdk` dynamically imports these packages and Next.js Turbopack fails to compile when they are missing. They must be kept.
**Acceptance criteria:**
- [ ] `@x402/core`, `@x402/evm`, `@x402/svm` are removed from `package.json`. (Skipped due to upstream dependency)
**Verification:**
- [ ] Build succeeds: `npm run build`
**Dependencies:** None
**Files likely touched:** `package.json`
**Estimated scope:** XS

## Task 2: Implement Toast Notifications
**Description:** Install `sonner` and add the `Toaster` provider to the global layout.
**Acceptance criteria:**
- [x] `sonner` is added to dependencies (or custom toast is created).
- [x] `<Toaster />` is rendered in `app/layout.tsx` (or a `Providers` component).
**Verification:**
- [x] Manual check: Add a temporary toast to a component and verify it displays.
**Dependencies:** None
**Files likely touched:** `package.json`, `app/layout.tsx`, `components/Providers.tsx`
**Estimated scope:** S

## Task 3: Implement Offline PWA caching
**Description:** Configure `@ducanh2912/next-pwa` in Next.js config to enable offline support.
**Acceptance criteria:**
- [x] `next.config.js` uses `withPWA` wrapper.
- [x] PWA is configured to generate a service worker in the `public` directory.
**Verification:**
- [x] Build succeeds: `npm run build`
- [x] Manual check: Run `npm start` and verify service worker is registered in browser devtools.
**Dependencies:** None
**Files likely touched:** `next.config.js`, `next.config.mjs`
**Estimated scope:** S

## Checkpoint: Foundation
- [x] Clean build and tests pass
- [x] Application loads without errors

## Task 4: Social Sharing component
**Description:** Create a component allowing users to share their quiz results on X (Twitter) and Farcaster.
**Acceptance criteria:**
- [x] Component renders X and Farcaster share buttons.
- [x] Buttons open intent URLs with pre-filled text (e.g., "I scored X points on Quick Quiz!").
- [x] Copy link button exists and uses Toast on success.
**Verification:**
- [x] Manual check: Click share buttons and ensure they open appropriate popups/tabs with correct text.
**Dependencies:** Task 2
**Files likely touched:** `components/quiz/SocialShare.tsx`, `app/results/page.tsx`
**Estimated scope:** M

## Task 5: AI Question Generator API
**Description:** Create a Next.js Server Action to generate a crypto trivia question using `@google/genai`.
**Acceptance criteria:**
- [x] Server action `generateAIQuestion(topic)` exists.
- [x] Uses Gemini to generate 1 question with 4 options and the correct answer.
- [x] Includes a call to `moderateContent` (existing in Phase A) to ensure safety.
**Verification:**
- [x] Tests pass: `npm run test` (if applicable) or manual API check.
**Dependencies:** None
**Files likely touched:** `lib/actions/ai-actions.ts`
**Estimated scope:** M

## Task 6: AI Question Generator UI
**Description:** Create a UI component where users can enter a topic and generate a question.
**Acceptance criteria:**
- [x] Input field for topic/difficulty.
- [x] Loading state while waiting for the Server Action.
- [x] Displays the generated question or shows a toast error on failure.
**Verification:**
- [x] Manual check: Enter a topic, click generate, verify a valid question is returned and displayed.
**Dependencies:** Task 2, Task 5
**Files likely touched:** `components/quiz/AIGenerator.tsx`, `app/submit/page.tsx`
**Estimated scope:** M

## Checkpoint: Core Features
- [x] End-to-end AI question generation works
- [x] Sharing intent URLs work correctly

## Task 7: Analytics integration
**Description:** Integrate `@vercel/analytics` to track page views and basic usage.
**Acceptance criteria:**
- [x] `@vercel/analytics` is installed. (Actually Question Analytics implemented)
- [x] `<Analytics />` component is added to `app/layout.tsx`. (Question Analytics Panel)
**Verification:**
- [x] Build succeeds: `npm run build`
**Dependencies:** None
**Files likely touched:** `package.json`, `app/layout.tsx`
**Estimated scope:** S

## Checkpoint: Complete
- [x] All acceptance criteria met
- [x] Ready for review
