# Tasks: Phase B Feature Enhancements

> Plan: [plan.md](./plan.md)

---

## Task 1: Clean up remaining Phase A dependencies
**Description:** Remove unused `@x402/*` packages from `package.json` to complete Phase A pruning.
**Acceptance criteria:**
- [x] `@x402/core`, `@x402/evm`, `@x402/svm` are removed from `package.json`.
**Verification:**
- [ ] Build succeeds: `npm run build`
**Dependencies:** None
**Files likely touched:** `package.json`
**Estimated scope:** XS

## Task 2: Implement Toast Notifications
**Description:** Install `sonner` and add the `Toaster` provider to the global layout.
**Acceptance criteria:**
- [ ] `sonner` is added to dependencies.
- [ ] `<Toaster />` is rendered in `app/layout.tsx` (or a `Providers` component).
**Verification:**
- [ ] Manual check: Add a temporary toast to a component and verify it displays.
**Dependencies:** None
**Files likely touched:** `package.json`, `app/layout.tsx`, `components/Providers.tsx`
**Estimated scope:** S

## Task 3: Implement Offline PWA caching
**Description:** Configure `@ducanh2912/next-pwa` in Next.js config to enable offline support.
**Acceptance criteria:**
- [ ] `next.config.js` uses `withPWA` wrapper.
- [ ] PWA is configured to generate a service worker in the `public` directory.
**Verification:**
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: Run `npm start` and verify service worker is registered in browser devtools.
**Dependencies:** None
**Files likely touched:** `next.config.js`, `next.config.mjs`
**Estimated scope:** S

## Checkpoint: Foundation
- [ ] Clean build and tests pass
- [ ] Application loads without errors

## Task 4: Social Sharing component
**Description:** Create a component allowing users to share their quiz results on X (Twitter) and Farcaster.
**Acceptance criteria:**
- [ ] Component renders X and Farcaster share buttons.
- [ ] Buttons open intent URLs with pre-filled text (e.g., "I scored X points on Quick Quiz!").
- [ ] Copy link button exists and uses Toast on success.
**Verification:**
- [ ] Manual check: Click share buttons and ensure they open appropriate popups/tabs with correct text.
**Dependencies:** Task 2
**Files likely touched:** `components/quiz/SocialShare.tsx`, `app/results/page.tsx`
**Estimated scope:** M

## Task 5: AI Question Generator API
**Description:** Create a Next.js Server Action to generate a crypto trivia question using `@google/genai`.
**Acceptance criteria:**
- [ ] Server action `generateAIQuestion(topic)` exists.
- [ ] Uses Gemini to generate 1 question with 4 options and the correct answer.
- [ ] Includes a call to `moderateContent` (existing in Phase A) to ensure safety.
**Verification:**
- [ ] Tests pass: `npm run test` (if applicable) or manual API check.
**Dependencies:** None
**Files likely touched:** `lib/actions/ai-actions.ts`
**Estimated scope:** M

## Task 6: AI Question Generator UI
**Description:** Create a UI component where users can enter a topic and generate a question.
**Acceptance criteria:**
- [ ] Input field for topic/difficulty.
- [ ] Loading state while waiting for the Server Action.
- [ ] Displays the generated question or shows a toast error on failure.
**Verification:**
- [ ] Manual check: Enter a topic, click generate, verify a valid question is returned and displayed.
**Dependencies:** Task 2, Task 5
**Files likely touched:** `components/quiz/AIGenerator.tsx`, `app/submit/page.tsx`
**Estimated scope:** M

## Checkpoint: Core Features
- [ ] End-to-end AI question generation works
- [ ] Sharing intent URLs work correctly

## Task 7: Analytics integration
**Description:** Integrate `@vercel/analytics` to track page views and basic usage.
**Acceptance criteria:**
- [ ] `@vercel/analytics` is installed.
- [ ] `<Analytics />` component is added to `app/layout.tsx`.
**Verification:**
- [ ] Build succeeds: `npm run build`
**Dependencies:** None
**Files likely touched:** `package.json`, `app/layout.tsx`
**Estimated scope:** S

## Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] Ready for review
