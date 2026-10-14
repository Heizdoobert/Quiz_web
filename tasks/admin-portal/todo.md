# Task list: Admin module portal

Plan: `plan.md`. Floor from `CONSTRAINTS.md`: no suppressions, no stubs, no skipped tests, changed lines at least 80% covered, project coverage ratchet must not fall, no push to `main`.

## Task 1: Module contract, generator, committed registry (M)

**Description:** Define `AdminModuleManifest`, write the generator, commit its output, and add the drift test.

**Acceptance criteria:**
- [ ] `app/admin/_modules/types.ts` exports `AdminModuleManifest` (`label`, `permission: Permission`, `order?`)
- [ ] `scripts/gen-admin-modules.mjs` exports `generate(rootDir)` returning the file text and writes `registry.generated.ts` when run as a script
- [ ] Generator skips folders starting with `_`, rejects non-kebab-case ids, duplicate ids, missing `manifest.ts` or `page.tsx`, and an id equal to a static `app/admin/*` folder
- [ ] `predev`, `prebuild`, `pretest` and `pretest:coverage` run it
- [ ] Test fails when the committed registry differs from `generate()` output

**Verification:**
- [ ] `npx vitest run tests/admin-modules-registry.test.ts`
- [ ] `npm run type-check` and `npm run lint`
- [ ] Fixture dir with two modules produces both entries, sorted by id; each guard has a failing-input test

**Dependencies:** None
**Files:** `scripts/gen-admin-modules.mjs`, `app/admin/_modules/types.ts`, `app/admin/_modules/registry.generated.ts`, `tests/admin-modules-registry.test.ts`, `package.json`

## Task 2: Catch-all route with central authorization (M)

**Description:** `app/admin/[...module]/page.tsx` resolves the module from the registry, authorizes against its manifest permission, then renders it.

**Acceptance criteria:**
- [ ] Unknown id: `notFound()`
- [ ] Known id, signed out: `AdminDenied` with sign-in wording; role below the manifest permission: `AdminDenied` no access; module page is not loaded or rendered in either case
- [ ] Allowed role: module page renders with `role` and remaining `segments`
- [ ] Existing static admin routes unchanged

**Verification:**
- [ ] `tests/admin-module-route.test.tsx` using a fixture registry mock: guest, user, moderator vs admin-only module, admin, unknown id, segments passed
- [ ] `npm run type-check`, `npm run lint`, `npm run check:architecture`

**Dependencies:** Task 1
**Files:** `app/admin/[...module]/page.tsx`, `tests/admin-module-route.test.tsx`

### Checkpoint: after Tasks 1-2
- [ ] `npm run check:task` green (coverage ratchet holds)
- [ ] Manual: add a throwaway folder under `_modules/`, run `npm run dev`, open `/admin/<id>` as admin and as moderator; delete the folder after
- [ ] Review with owner before T3

## Task 3: Merged nav and redirect (S)

**Description:** One function merges legacy `ADMIN_PAGES` with module manifests; nav and `/admin` redirect use it.

**Acceptance criteria:**
- [ ] `adminNavItems(role)` returns legacy pages then modules sorted by `order`, then label, filtered by `can`
- [ ] `AdminNav` renders from it; `/admin` redirects to its first item
- [ ] Existing `tests/admin-shell.test.tsx` assertions (admin sees five links, moderator sees Quarantine) still pass unchanged
- [ ] A fixture module with an admin-only permission appears for admin, not for moderator

**Verification:**
- [ ] `npx vitest run tests/admin-shell.test.tsx tests/admin-nav.test.ts`
- [ ] `npm run type-check`, `npm run lint`

**Dependencies:** Task 1
**Files:** `app/admin/_modules/nav.ts`, `components/admin/AdminNav.tsx`, `app/admin/page.tsx`, `tests/admin-nav.test.ts`

## Task 4: Template and docs (S)

**Description:** Copy-paste template and the "add a module" steps, so the one-folder claim is documented and type-checked.

**Acceptance criteria:**
- [ ] `app/admin/_modules/_template/` has `manifest.ts`, `page.tsx` and a short `README.md` (copy, rename, set permission, write action through an authorizing service)
- [ ] Generator ignores it (covered by T1 test)
- [ ] `docs/admin-area.md` gains an "Adding a module" section and the not-included line about migrating legacy pages

**Verification:**
- [ ] `npm run type-check` (template compiles)
- [ ] `npm run check:full` green; `npm run build && npm run check:bundle` at or under 360 kB

**Dependencies:** Tasks 2, 3
**Files:** `app/admin/_modules/_template/*`, `docs/admin-area.md`

### Checkpoint: complete
- [ ] All acceptance criteria met, `check:full` green
- [ ] Merged into the agreed branch; no PR until owner says
