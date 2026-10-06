# docs/specs/v050-feature-roadmap.md
lines:172 exports:
---
# Spec: v0.5.0 Feature Roadmap — Next-Level Quick Quiz

Module: cross-cutting (new modules + enhancements to existing).
Status: Draft 2026-10-05 — pending owner review.

## Objective

Evolve Quick Quiz from a testnet demo into a production-grade, live-chain product with analytics, real-time features, and AI-powered gameplay enhancements. This spec covers the work between v0.4.0 (current) and v0.5.0.

## Pre-requisites (must be done before v0.5.0 feature work)

- [ ] Task 24: Production SQL migration rollout (manual)
- [ ] Task 25: Legacy wallet column drop (1 week after Task 24)
- [ ] Base Mainnet contract deployment (QuizToken, QuizBadgeNFT, ContestEscrow)

## Workstreams

| Id | Module | Responsibility | Depends on | Size |
|---|---|---|---|---|
| analytics | profile | Creator question analytics: per-question accuracy, play count, skip rate, avg time | pre-requisites | M |
| contest-analytics | lists | Contest analytics: participation, completion rate, avg score | pre-requisites | M |
| realtime-leaderboard | rankings | Live leaderboard updates via Supabase Realtime subscriptions | pre-requisites | S |
| toast-notifications | cross-cutting | In-app toast system for events (question approved, reward available, review needed) | — | S |
| ai-question-gen | trivia | AI question generation from topic/URL via Gemini for creators | — | M |
| ai-difficulty | trivia | Auto-classify question difficulty (Easy/Medium/Hard) on creation | ai-question-gen | S |
| pwa-offline | cross-cutting | Service worker for offline question caching and install prompt | — | M |
| social-sharing | community | Share quiz results to Twitter/Farcaster with OG images and referral | — | S |

Build order: toast-notifications and ai-question-gen have no dependencies and can start immediately. The rest depends on production data or prior workstreams.

## Workstream Details

### `analytics` — Creator Question Analytics

**Problem:** Creators have no visibility into how their questions perform. They can see ratings/comments but not quantitative data.

**Solution:** Add a stats panel to `/profile` showing per-question:
- Play count (total times answered)
- Accuracy rate (% correct)
- Skip rate (% skipped via lifeline)
