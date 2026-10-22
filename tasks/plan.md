# Implementation Plan: RCM Page Dashboard

## Overview
Build the **RCM page** – a single‑page Next.js (app router) dashboard that displays real‑time status of web servers, CI/CD pipelines, SEO crawlers, and marketing campaign tools, and lets authorized team members perform control actions. Data, auth, and RBAC are synchronized via Supabase.

## Architecture Decisions
- **Stack**: Next.js 14 (app router), TypeScript, Tailwind CSS.
- **Backend**: Supabase for PostgreSQL, Realtime, and Auth.
- **RBAC**: Supabase Row‑Level Security (RLS) policies based on roles.
- **Realtime**: Use Supabase Realtime channel for status updates.
- **Deployment**: Vercel (or Netlify) with env vars for Supabase.

## Task List

### Phase 1: Foundation
- **Task 1**: Initialize Next.js project with TypeScript & Tailwind.
  - **Acceptance criteria**: Project builds and serves a blank page; Tailwind works.
  - **Verification**: `npm run dev` starts without errors; `tailwind.config.js` applied.
  - **Dependencies**: None.
  - **Files**: `package.json`, `tailwind.config.js`, `next.config.js`, `src/app/layout.tsx`.
  - **Estimated effort**: 2 h.

- **Task 2**: Add Supabase client library, configure env variables.
  - **Acceptance criteria**: Supabase client can connect; simple query returns data.
  - **Verification**: Run a script that fetches `SELECT 1` from Supabase.
  - **Dependencies**: Task 1.
  - **Files**: `lib/supabaseClient.ts`, `.env.local` (example entries).
  - **Estimated effort**: 1 h.

- **Task 3**: Implement Supabase Auth (sign‑up / sign‑in) UI.
  - **Acceptance criteria**: Users can create an account and log in; JWT stored.
  - **Verification**: Manual login flow works; `auth.user()` returns profile.
  - **Dependencies**: Task 2.
  - **Files**: `components/AuthForm.tsx`, `app/login/page.tsx`, `app/register/page.tsx`.
  - **Estimated effort**: 2 h.

- **Task 4**: Define DB schema for `roles`, `user_roles`, `systems`, `actions`, `audit_logs` (SQL from spec).
  - **Acceptance criteria**: Tables exist in Supabase; migrations can be run.
  - **Verification**: Run `supabase db reset` and check tables via Supabase UI.
  - **Dependencies**: Task 2.
  - **Files**: `supabase/migrations/20231022_init.sql`.
  - **Estimated effort**: 2 h.

- **Task 5**: Set up RLS policies for role‑based data visibility.
  - **Acceptance criteria**: Non‑admin users only see rows belonging to their roles.
  - **Verification**: Test with two user accounts (dev and admin) querying `systems`.
  - **Dependencies**: Task 4.
  - **Files**: `supabase/policies/roles.sql`.
  - **Estimated effort**: 2 h.

#### Checkpoint: Foundation
- [ ] All tasks 1‑5 completed.
- [ ] Project builds.
- [ ] Auth works.
- [ ] DB schema and RLS are in place.

### Phase 2: Core Dashboard Features
- **Task 6**: Create `SystemCard` component to display a system's status.
  - **Acceptance criteria**: Shows name, status badge, and action buttons based on role.
  - **Verification**: Component renders correctly with mock data.
  - **Dependencies**: Task 5.
  - **Files**: `components/SystemCard.tsx`.
  - **Estimated effort**: 2 h.

- **Task 7**: Implement API route `GET /api/systems` (Supabase query with RLS).
  - **Acceptance criteria**: Returns JSON array of systems the caller is allowed to see.
  - **Verification**: `curl` request with auth token returns proper data.
  - **Dependencies**: Task 5.
  - **Files**: `app/api/systems/route.ts`.
  - **Estimated effort**: 1 h.

- **Task 8**: Implement control action endpoint `POST /api/systems/:id/action`.
  - **Acceptance criteria**: Validates role, executes action (stub), logs to `actions` and `audit_logs`.
  - **Verification**: POST returns success; DB rows inserted.
  - **Dependencies**: Task 7.
  - **Files**: `app/api/systems/[id]/action/route.ts`.
  - **Estimated effort**: 2 h.

- **Task 9**: Wire up realtime updates on the dashboard using Supabase Realtime.
  - **Acceptance criteria**: When `systems` table updates, UI reflects change instantly.
  - **Verification**: Update a row via Supabase console; UI updates without refresh.
  - **Dependencies**: Task 6, Task 7.
  - **Files**: `hooks/useRealtimeSystems.ts`, updates in `components/SystemCard.tsx`.
  - **Estimated effort**: 2 h.

- **Task 10**: Implement role‑based UI logic (show/hide actions per role).
  - **Acceptance criteria**: DevOps users see start/stop buttons; SEO users see crawl controls, etc.
  - **Verification**: Log in as each role and verify button visibility.
  - **Dependencies**: Task 6, Task 8.
  - **Files**: `components/ActionButtons.tsx`.
  - **Estimated effort**: 2 h.

#### Checkpoint: Core Features
- [ ] Tasks 6‑10 done.
- [ ] Dashboard displays real‑time data and actions work per role.
- [ ] Audit logs recorded.

### Phase 3: Polish & Deploy
- **Task 11**: Add WCAG 2.1 AA accessibility improvements (ARIA labels, focus order).
  - **Acceptance criteria**: Passes axe accessibility audit.
  - **Verification**: Run `npm run lint:accessibility`.
  - **Dependencies**: Task 6‑10.
  - **Files**: Updated component files.
  - **Estimated effort**: 1 h.

- **Task 12**: Write unit and integration tests for API routes and UI components.
  - **Acceptance criteria**: Coverage ≥ 80%; all tests pass.
  - **Verification**: `npm test` succeeds.
  - **Dependencies**: Tasks 6‑10.
  - **Files**: `__tests__/api/systems.test.ts`, `__tests__/components/SystemCard.test.ts`.
  - **Estimated effort**: 3 h.

- **Task 13**: CI pipeline setup (GitHub Actions) to run lint, tests, and build on PR.
  - **Acceptance criteria**: CI runs on push; fails on lint/test errors.
  - **Verification**: Push a branch, see CI results.
  - **Dependencies**: Task 12.
  - **Files**: `.github/workflows/ci.yml`.
  - **Estimated effort**: 1 h.

- **Task 14**: Deploy to Vercel (or Netlify) and verify environment variables.
  - **Acceptance criteria**: Live site accessible; auth works; dashboard updates.
  - **Verification**: Manual smoke test on production URL.
  - **Dependencies**: Task 13.
  - **Files**: Deployment config (optional).
  - **Estimated effort**: 1 h.

#### Final Checkpoint: Complete
- [ ] All tasks 11‑14 done.
- [ ] Project passes CI, meets success criteria, ready for review.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Supabase RLS misconfiguration | Unauthorized data exposure | Write integration tests for each role; manual audit. |
| Real‑time latency > 200 ms | Poor UX | Use Supabase Realtime best practices; monitor latency. |
| Missing role definitions | Users cannot see anything | Seed default roles in DB migration. |

## Open Questions
- Do you need dark‑mode support?
- Should audit logs be viewable only by admin or also by DevOps?
- Any preferred naming conventions for system types?
