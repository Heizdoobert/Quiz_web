# Implementation Plan: Phase B Feature Enhancements

## Overview
This plan covers the implementation of Phase B from `project-improvements.md`, which includes Offline PWA caching, Toast Notifications, Social Sharing (X & Farcaster), an AI Question Generator, and Analytics integration. We also include a quick cleanup step for leftover Phase A dependencies.

## Architecture Decisions
- **Toast Library**: Use `sonner` for lightweight, modern toast notifications.
- **PWA**: Use `@ducanh2912/next-pwa` since it is already in `dependencies`.
- **AI Generator**: Use `@google/genai` (already in `dependencies`) within a Next.js Server Action to keep keys secure.
- **Analytics**: Use `@vercel/analytics` for zero-configuration Next.js analytics.
- **Social Sharing**: Simple intent URLs for X (`twitter.com/intent/tweet`) and Farcaster (`warpcast.com/~/compose`).

## Task List

### Phase 1: Foundation & Cleanup
- [~] Task 1: Clean up remaining Phase A dependencies (Skipped: @x402 is required by @coinbase/cdp-sdk)
- [x] Task 2: Implement Toast Notifications
- [x] Task 3: Implement Offline PWA caching

### Checkpoint: Foundation
- [x] Clean build and tests pass
- [x] Toasts can be triggered

### Phase 2: Core Features
- [x] Task 4: Social Sharing component (X & Farcaster)
- [x] Task 5: AI Question Generator API (Server Action)
- [x] Task 6: AI Question Generator UI

### Checkpoint: Core Features
- [x] End-to-end AI question generation works
- [x] Sharing intent URLs work correctly

### Phase 3: Polish
- [x] Task 7: Analytics integration

### Checkpoint: Complete
- [x] All acceptance criteria met
- [x] Ready for review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| AI Generator rate limits | Med | Implement simple rate limiting or fail gracefully with a toast |
| PWA Service Worker caching old assets | Low | Ensure `next-pwa` is configured with `reloadOnOnline` and proper caching strategies |
| Vercel Analytics breaking local dev | Low | Analytics only tracks in production by default |

## Open Questions
- Is there a specific Analytics provider preferred over Vercel Analytics?
