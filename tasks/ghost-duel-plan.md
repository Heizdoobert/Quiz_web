# Implementation Plan: Ghost‑Duel + Remix (Quick Quiz)

## Overview
Create a lightweight, asynchronous competitive trivia experience where a user builds a 5‑question pack, plays it to record a **ghost benchmark**, shares a short PIN/link, and friends can race that ghost. The results screen offers a one‑tap **Remix & Challenge Back** flow that copies the original pack, permits up to two quick edits, and generates a fresh PIN for the next duel.

## Architecture Decisions
- **Database:** Add a `quiz_attempts` table (quiz_id, nickname, score, duration_ms, per‑question timestamps). Add a nullable `parent_quiz_id` column to `quizzes` for remix lineage.
- **API:** New endpoints:
  - `POST /api/quizzes` (create pack)
  - `POST /api/quizzes/:id/attempt` (store ghost record)
  - `GET /api/quizzes/:id/ghost` (fetch ghost data)
  - `POST /api/quizzes/:id/remix` (clone pack, optional edits)
- **Web & Flutter UI:**
  - Pack creation wizard (5‑question form).
  - Ghost‑race view with split‑time bar.
  - Result screen with **Remix & Challenge Back** button.
  - PIN generation/sharing component.
- **No auth for ghost races:** Use a nickname field; store attempts anonymously to keep friction low.
- **Feature flag:** `ghost_duel_enabled` to toggle the whole flow for A/B testing.

## Task List

### Phase 1: Foundations (Database + Core API)
- **Task 1:** Add `quiz_attempts` table migration.
- **Task 2:** Add `parent_quiz_id` column to `quizzes` migration.
- **Task 3:** Implement API endpoint `POST /api/quizzes/:id/attempt` to persist ghost data.
- **Task 4:** Implement API endpoint `GET /api/quizzes/:id/ghost` to retrieve ghost data.

#### Checkpoint: Foundations
- [ ] All migration files run cleanly and `supabase db push` succeeds.
- [ ] API endpoints return correct JSON schema and status codes.
- [ ] Unit tests for new endpoints pass.

### Phase 2: Pack Creation & Ghost Race UI
- **Task 5:** Build web & Flutter **Pack Creation Wizard** (5‑question form, PIN generation).
- **Task 6:** Add front‑end logic to call `POST /api/quizzes` and store the resulting quiz ID.
- **Task 7:** Implement **Ghost‑Race Page** with split‑time bar using retrieved ghost data.
- **Task 8:** Wire up **Result Screen** to show score, ghost comparison, and **Remix** button.

#### Checkpoint: UI Core
- [ ] Pack creation saves a quiz and generates a PIN.
- [ ] Ghost‑race view displays a moving bar that matches the stored timestamps.
- [ ] Result screen shows both player score and ghost time, and the Remix button is visible.

### Phase 3: Remix Flow & Polishing
- **Task 9:** Implement `POST /api/quizzes/:id/remix` endpoint (clone pack, set `parent_quiz_id`).
- **Task 10:** Front‑end **Remix Dialog** – pre‑populate two editable fields, allow save, generate new PIN.
- **Task 11:** Add validation to ensure at most 2 edits are made.
- **Task 12:** End‑to‑end integration test: create pack → record attempt → share PIN → race ghost → remix → new pack.

#### Checkpoint: Complete Feature
- [ ] All end‑to‑end flows work without auth.
- [ ] Tests (unit + integration) all pass.
- [ ] Manual QA: share a PIN between web and mobile, race ghost, remix, and play back.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Creator fatigue typing 5 questions | Medium – may deter usage | Provide a small library of pre‑written question templates; allow copy‑paste from clipboard. |
| Abuse via PIN spam or mass pack creation | Low–Medium | Rate‑limit pack creation per IP/device; cap max packs per day. |
| Ghost data not loading quickly on mobile | Medium | Cache ghost JSON locally after first fetch; keep payload < 5 KB. |
| Remix UI confusing | Low | Show clear “You can edit up to 2 items” tooltip; limit edits to one line each. |

## Open Questions
1. PIN format: numeric 6‑digit vs. short alphanumeric slug? (numeric easier for manual entry.)
2. Should we expose a public endpoint to list recent public packs for discovery, or keep everything private? (Initial MVP: private only.)
3. How long should ghost attempts be retained? (e.g., 30 days, then purge.)
4. UI branding for the ghost bar – simple progress bar vs. animated avatar? (Start simple.)
