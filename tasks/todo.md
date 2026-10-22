## Task 1: Verify folder structure & moved files
**Description:** Ensure the new `admin`, `seo`, and `moderation` directories exist and contain the correct files.
**Acceptance criteria:**
- [ ] `lib/constants/admin/admin.ts` and `admin-pages.ts` exist.
- [ ] `lib/constants/seo/seo.ts` and `seo-data.ts` exist.
- [ ] `lib/constants/moderation/moderation.ts` exists.
- [ ] No stray files remain in the root `constants` folder (except `index.ts`).
**Verification:** `ls` the directories; run `git status` to see moved files.

## Task 2: Update `index.ts` re‑exports
**Description:** Add re‑exports in `lib/constants/index.ts` so external code can still import from the old path if needed.
**Acceptance criteria:**
- [ ] `export * from './admin/admin';`
- [ ] `export * from './admin/admin-pages';`
- [ ] `export * from './seo/seo';`
- [ ] `export * from './seo/seo-data';`
- [ ] `export * from './moderation/moderation';`
**Verification:** TypeScript compilation succeeds.

## Task 3: Compile TypeScript
**Description:** Run the project's TypeScript build to catch any broken imports.
**Acceptance criteria:**
- [ ] `npm run build` (or equivalent) exits with code 0.
**Verification:** Command output shows no errors.

## Task 4: Update import statements
**Description:** Search the repo for old import paths (e.g., `@/lib/constants/admin.ts`) and replace them with the new sub‑folder paths.
**Acceptance criteria:**
- [ ] All files that previously imported from `lib/constants/*.ts` now import from the new location.
**Verification:** Grep for old paths returns no results.

## Task 5: Run test suite
**Description:** Execute the project's tests to confirm behavior unchanged.
**Acceptance criteria:**
- [ ] All tests pass (`npm test` or `vitest`).
**Verification:** Test command exits with success.

## Task 6: Lint & format
**Description:** Run the linter and formatter.
**Acceptance criteria:**
- [ ] No linting errors.
- [ ] Files are formatted per project standards.
**Verification:** `npm run lint` exits cleanly.

## Task 7: Update documentation
**Description:** Adjust any docs referencing the old constant locations.
**Acceptance criteria:**
- [ ] README / docs reflect new folder layout.
**Verification:** Manual review.

## Task 8: Final build verification
**Description:** Run the full production build.
**Acceptance criteria:**
- [ ] Build succeeds without warnings.
**Verification:** `npm run build` (or appropriate script) completes.
