# Ghost‑Duel + Remix (Quick Quiz)

## Problem Statement
**How might we** let casual players create a tiny trivia pack, set a personal benchmark, and share a single link that lets friends asynchronously race that benchmark—and optionally remix the pack for a new round—without any sign‑up friction?

## Recommended Direction
We will build **Ghost‑Duel** as the primary product hook:
1. **Pack creation** – a simple 5‑question form (title + Q/A + 3 distractors).  
2. **Ghost record** – after the creator plays, we store `score`, `duration_ms`, and per‑question timestamps in a new `quiz_attempts` table (no auth, just a nickname).  
3. **Shareable PIN / link** – a 6‑digit code or short URL that opens the same pack in “Challenge Mode”, showing the ghost’s split‑time bar.

On the **results screen** we add a **“Remix & Challenge Back”** button:
- Copies the original 5 questions into a new editable pack.
- Allows up to 2 quick edits (question text, one distractor).
- Generates a fresh PIN for the challenger to send back.

### Why this works
- **User value:** Immediate bragging rights; async competition fits friends’ schedules.  
- **Feasibility:** Leverages existing `quizzes`/`quiz_questions` schema, adds only `quiz_attempts` and a nullable `parent_quiz_id`. No real‑time infrastructure required.  
- **Differentiation:** First quiz app to combine asynchronous ghost racing with a lightweight remix loop, giving a viral “challenge‑and‑remix” chain.

## Key Assumptions to Validate
- **[Deal‑breaker]** Casual creators can type 5 questions in ≤ 2 minutes.  
- **[Deal‑breaker]** Friends will click a shared PIN/link instead of sending a screenshot.  
- **[Important]** Ghost replay UI (split‑time bar) is instantly understandable.  
- **[Nice‑to‑have]** Users will engage with the remix flow for at least 20 % of challenges.

## MVP Scope
- **Core features** (must‑have):
  1. 5‑question creation UI (Web & Flutter).
  2. `quiz_attempts` table + API endpoint to save & retrieve ghost data.
  3. PIN generation & shareable link handling (no auth).
  4. Ghost‑race page with split‑time bar and final score.
  5. “Remix & Challenge Back” button (copies questions, allows ≤ 2 edits, creates new PIN).
- **Out of scope** (won’t be built now):
  - AI‑generated question suggestions.
  - Full public quiz marketplace.
  - Real‑time multiplayer rooms.
  - Advanced analytics or achievement system.

## Not Doing (and Why)
| Not Doing | Reason |
|-----------|--------|
| AI‑generated question suggestions | Keeps MVP lightweight; we can add later if typing proves too painful. |
| Full public quiz marketplace | Early viral loop relies on private sharing; a marketplace adds moderation overhead. |
| Real‑time multiplayer rooms | Ghost duels already give competitive tension with lower infrastructure cost. |
| Complex scoring (points, streaks, etc.) | MVP focuses on *time* as the primary metric; other gamification can be layered later. |

## Open Questions
1. **Exact PIN format** – 6‑digit numeric vs. short alphanumeric slug?
2. **How to prevent abuse** – rate‑limit pack creation per IP/device?
3. **UI for Remix** – Should we pre‑fill the two editable slots with the creator’s original distractors or blank fields?
4. **Analytics** – What minimal server‑side logging is needed to measure adoption without over‑engineering?
