# Tasks: Auth Popup

> Plan: [plan.md](./plan.md)

---

## Task 1: Create UI Components
- [ ] Create `components/auth/AuthChoiceScreen.tsx`
- [ ] Create `components/auth/AuthMethodTabs.tsx`

## Task 2: Create Container
- [ ] Create `components/auth/AuthPopup.tsx` wiring up state and animations.

## Task 3: Integration
- [ ] Update `hooks/shared/use-session.tsx` to import `AuthPopup` instead of `SignInModal`.
- [ ] Delete `components/auth/SignInModal.tsx`.

## Task 4: Testing & Verification
- [ ] Create `components/auth/__tests__/AuthPopup.test.tsx`
- [ ] Run tests and checks.
