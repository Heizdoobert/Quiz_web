## Task 1: Create Profile Server Actions

**Description:** Create a new file for server actions (`profile-actions.ts`) to fetch a user's created quizzes and export their quiz data as a secure backup, filtering by their wallet address.

**Acceptance criteria:**
- [x] `getUserQuizzes` action exists and returns questions filtered by `created_by`
- [x] `exportUserData` action exists and returns combined JSON data of questions and results filtered by wallet address

**Verification:**
- [x] Build succeeds
- [x] Manual check: verify the returned JSON structure is valid

**Dependencies:** None

**Files likely touched:**
- `lib/actions/profile-actions.ts`

**Estimated scope:** Small

---

## Task 2: Build the Profile Page UI (`/profile`)

**Description:** Build the Next.js App Router page that displays the dashboard. It must enforce connection via `useAccount` and show a grid of the user's quizzes along with an export button.

**Acceptance criteria:**
- [x] Shows "Access Denied" or connect prompt if wallet is not connected
- [x] Lists user's quizzes using the dark theme matching existing `QuizCard` styles
- [x] Includes a "Backup Data" button that triggers a JSON download

**Verification:**
- [x] Build succeeds
- [x] Manual check: Visit `/profile` disconnected, then connected

**Dependencies:** Task 1

**Files likely touched:**
- `app/profile/page.tsx`

**Estimated scope:** Medium

---

## Task 3: Link to the Profile Page

**Description:** Add a navigational link so users can discover the new `/profile` page. The best place is inside the existing `ProfileModal.tsx` near the rewards section.

**Acceptance criteria:**
- [x] Link to `/profile` is added in `components/modals/ProfileModal.tsx`
- [x] Link matches existing UI styles

**Verification:**
- [x] Build succeeds
- [x] Manual check: Open Profile Modal, click the new link to ensure it navigates to `/profile`

**Dependencies:** Task 2

**Files likely touched:**
- `components/modals/ProfileModal.tsx`

**Estimated scope:** XS

---

## Checkpoint: Complete
- [x] All tests pass
- [x] Application builds without errors
- [x] Core user flow works end-to-end
- [x] Review with human before proceeding
