# tasks/plan.md
lines:20 exports:
---
# Implementation Plan: Auth Popup

## Overview
Replace the old `SignInModal` with a new 2-step `AuthPopup` (Choice Screen -> Method Tabs).

## Architecture Decisions
- Keep the `SessionProvider` pattern and `requireSignIn` API.
- Keep `Modal.tsx` as the base wrapper.
- Use framer-motion for step transitions.

## Dependency Graph
```
Task 1: Create AuthChoiceScreen & AuthMethodTabs UI components
    │
    └── Task 2: Create AuthPopup container component
            │
            └── Task 3: Replace SignInModal in use-session.tsx and delete SignInModal.tsx
                    │
                    └── Task 4: Add Unit Tests & Verify Constraints
```
