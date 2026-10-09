# Implementation Plan: Flutter Mobile Companion App

## Overview
Building a native iOS/Android Flutter companion app for the Web3 quiz platform. It will feature offline-capable quiz gameplay and native WalletConnect v2 integration. All communication with the database will be routed through a new Bearer-token authenticated REST API in the existing Next.js application to preserve security.

## Architecture Decisions
- **Monorepo Isolation:** We are placing the app in `mobile/` but heavily ignoring it in Next.js/Vercel configs to prevent CI bloat.
- **REST API:** Bypassing direct Supabase connections in favor of a versioned Next.js API (`/api/mobile/v1`) to maintain business logic and anti-cheat consistency.
- **Offline Security:** Only quiz questions (without correct answers) are cached offline. Answers are queued locally and graded securely on the server upon syncing.
- **Token Auth:** Next.js will issue JWT Bearer tokens to the mobile app, stored in `flutter_secure_storage`.

## Task List

### Phase 1: Foundation & Tooling
- [x] Task 1: Isolate `mobile/` from Next.js CI
- [x] Task 2: Initialize Flutter Project & Dependencies

### Checkpoint: Foundation
- [x] Next.js Vercel builds succeed without trying to parse Dart.
- [x] Flutter app builds to simulator successfully.

### Phase 2: Web3 Authentication
- [x] Task 3: Build Next.js Mobile SIWE API endpoints
- [x] Task 4: Configure WalletConnect v2 & Deep Linking in Flutter
- [x] Task 5: Implement Flutter Auth State & JWT Storage

### Checkpoint: Authentication
- [x] User can tap "Connect Wallet" on simulator, sign via wallet app, and receive a JWT Bearer token from the Next.js API.

### Phase 3: Offline Quiz & Syncing
- [x] Task 6: Build Next.js Mobile Quiz API (GET questions, POST sync)
- [x] Task 7: Flutter local caching & offline queue database schema
- [x] Task 8: Flutter Quiz UI (fetch -> play -> queue answers)
- [x] Task 9: Flutter Background Sync Engine

### Checkpoint: Complete
- [x] User can download questions, go offline, submit answers, reconnect, and see their rewards synced successfully without leaking answers offline.
- [x] Ready for App Store / Play Store review.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Vercel attempts to build Dart | High | Strict `.vercelignore` and Next.js config exclusions |
| WalletConnect deep-link drops | High | Careful OS-level intents setup (Android AppLinks, iOS Universal Links) |
| App Store rejects Crypto rewards | Med | Design the app to function primarily as an educational quiz game, deferring reward claims to the web app if blocked by reviewers. |

## Open Questions
- None at this time.
