# Gamification, User Profile & Category Taxonomy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Web Audio synthesizer sound effects, Crypto Category taxonomy & filtering, a Web3 User Profile modal with NFT trophy showcase, and Leaderboard pagination.

**Architecture:** 
1. `lib/audio.ts` provides a zero-dependency Web Audio API synthesizer for retro cyberpunk sound effects with mute toggle and `localStorage` persistence.
2. `lib/actions/question-actions.ts` extends `fetchRandomQuestion` to accept category filtering, coupled with a responsive `CategoryBar.tsx` selector.
3. `components/modals/ProfileModal.tsx` provides a gamified Web3 player profile with stats, tier levels, category mastery, and an on-chain NFT badge trophy showcase.
4. `GlobalLeaderboard.tsx` and `GroupLeaderboard.tsx` add responsive pagination without layout shifts.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Web Audio API, Wagmi, Viem, Lucide React.

**Spec:** `docs/superpowers/specs/2026-09-23-gamification-profile-category-design.md`

## Global Constraints
- Theme: Dark space-tech aesthetic strictly using Gen Z Crypto Quiz palette:
  - `#0A1128` (Deep Space background)
  - `#1A1B35` (Cyber Violet card surface)
  - `#00FFCC` (Neo Mint primary CTA/success)
  - `#6C5CE7` (Electric Indigo transition/progress)
  - `#FFD166` (Crypto Gold rewards/trophy)
  - `#FF4757` (Pop Coral danger/timer)
  - Category accents: `#8A2BE2` (DeFi), `#FF007F` (NFT & Gaming), `#3071FF` (Layer 1)
- Micro-interactions: `:hover`, `:active:scale-95`, `:focus-visible:ring-2 focus-visible:ring-[#00FFCC]` on all interactive elements.
- Zero audio assets: Pure browser Web Audio API synthesis.
- Zero errors on `npm run lint` and `npm run build`.
- Local Docker container `quick-quiz-web` kept running on `http://localhost:3000`.
- All completed work pushed to BOTH `origin/main` and `origin/preview`.

---

### Task 1: Synthesizer Audio Engine & Sound Toggle

**Files:**
- Create: `lib/audio.ts`
- Modify: `components/Header.tsx`
- Modify: `components/QuizLayout.tsx`

**Interfaces:**
- Produces: `soundEngine` from `lib/audio.ts` with `playCorrect()`, `playWrong()`, `playTick()`, `playReward()`, `playPowerup()`, `playFlip()`, `isMuted()`, `toggleMute()`.
- Consumes: `soundEngine` in `QuizLayout.tsx` during answer submission, timer countdown ($\le 5$s), powerup use, and card flip.

- [ ] **Step 1: Create `lib/audio.ts`**
Implement the Web Audio API sound synthesizer engine with lazy `AudioContext` initialization, mute persistence in `localStorage`, and the 6 sound effect profiles.

- [ ] **Step 2: Add Sound Toggle Button in `components/Header.tsx`**
Add a sound toggle button (`Volume2` / `VolumeX` from `lucide-react`) next to the Rewards button, with `:focus-visible` ring and hover tooltip.

- [ ] **Step 3: Integrate `soundEngine` in `components/QuizLayout.tsx`**
Trigger:
- `soundEngine.playCorrect()` on `res.isCorrect === true`.
- `soundEngine.playWrong()` on `res.isCorrect === false` or timeout.
- `soundEngine.playTick()` inside countdown timer effect when `timeLeft <= 5 && timeLeft > 0`.
- `soundEngine.playPowerup()` when using `50:50` or `Skip`.
- `soundEngine.playFlip()` when card flips.

- [ ] **Step 4: Verify build and lint**
Run `npm run lint` and `npm run build` to verify 0 errors.

- [ ] **Step 5: Commit**
```bash
git add lib/audio.ts components/Header.tsx components/QuizLayout.tsx
git commit -m "feat(audio): add Web Audio API sound synthesizer engine and header sound toggle"
```

---

### Task 2: Category Taxonomy & Filter Bar

**Files:**
- Modify: `lib/actions/question-actions.ts`
- Create: `components/CategoryBar.tsx`
- Modify: `components/QuestionFront.tsx`
- Modify: `components/QuizLayout.tsx`

**Interfaces:**
- Consumes: `fetchRandomQuestion(excludeIds?: string[], category?: string)` in `lib/actions/question-actions.ts`.
- Produces: `CategoryBar.tsx` with categories `All`, `DeFi`, `NFT & Gaming`, `Layer 1 & Infra`.

- [ ] **Step 1: Update `fetchRandomQuestion` in `lib/actions/question-actions.ts`**
Add optional `category?: string` parameter. If provided and `category !== 'All'`, filter questions by `.eq('category', category)`. If no matching questions found, gracefully fallback without category filter.

- [ ] **Step 2: Create `components/CategoryBar.tsx`**
Create the category selector pill bar with category icons and color badges:
- `All`: `#00FFCC`
- `DeFi`: `#8A2BE2`
- `NFT & Gaming`: `#FF007F`
- `Layer 1 & Infra`: `#3071FF`
Includes `:active:scale-95`, `:focus-visible` styling, and horizontal scroll on mobile.

- [ ] **Step 3: Update `components/QuestionFront.tsx`**
Display dynamic category badge on the top left of the question card styled with the category's specific theme color.

- [ ] **Step 4: Integrate `CategoryBar` in `components/QuizLayout.tsx`**
Place `CategoryBar` directly above the `QuizCard`. Selecting a category switches the active category state and immediately fetches a question from that category.

- [ ] **Step 5: Verify build and lint**
Run `npm run lint` and `npm run build`.

- [ ] **Step 6: Commit**
```bash
git add lib/actions/question-actions.ts components/CategoryBar.tsx components/QuestionFront.tsx components/QuizLayout.tsx
git commit -m "feat(categories): add category taxonomy, CategoryBar selector, and category-filtered question retrieval"
```

---

### Task 3: Web3 User Profile Modal (`ProfileModal.tsx`)

**Files:**
- Create: `components/modals/ProfileModal.tsx`
- Modify: `components/Header.tsx`
- Modify: `components/QuizLayout.tsx`

**Interfaces:**
- Consumes: `UserStats`, `ClaimableRewards`, `address`, `history`.
- Produces: `<ProfileModal>` dialog opened via "Profile" button in Header.

- [ ] **Step 1: Create `components/modals/ProfileModal.tsx`**
Implement the Profile modal using `Modal.tsx`:
- Header: Formatted wallet address (`0x12...34`), copy button with copied toast/check icon, BaseScan link.
- Player Tier Badge (e.g. *Crypto Novice*, *DeFi Explorer*, *Web3 Champion*).
- 4 Stat Cards: Score, Accuracy %, Current Streak, Best Streak.
- NFT Trophy Case: 4 badges (`Leaderboard Champion`, `Streak Fire`, `Century Quizzer`, `Perfect Round`) with Minted (Gold), Eligible (Green pulse), and Locked states.
- Category mastery breakdown: summary of performance across categories.

- [ ] **Step 2: Add "Profile" button to `components/Header.tsx`**
Render "Profile" button with `User` icon when `isConnected` is true.

- [ ] **Step 3: Wire `ProfileModal` in `components/QuizLayout.tsx`**
Add `'profile'` to `activeModal` state, pass props, and render `<ProfileModal>`.

- [ ] **Step 4: Verify build and lint**
Run `npm run lint` and `npm run build`.

- [ ] **Step 5: Commit**
```bash
git add components/modals/ProfileModal.tsx components/Header.tsx components/QuizLayout.tsx
git commit -m "feat(profile): add Web3 User Profile modal with NFT trophy showcase and player tier ranking"
```

---

### Task 4: Leaderboard Pagination & Controls

**Files:**
- Modify: `components/GlobalLeaderboard.tsx`
- Modify: `components/GroupLeaderboard.tsx`
- Modify: `lib/actions/leaderboard-actions.ts`

**Interfaces:**
- Consumes: `LeaderboardEntry[]`.
- Produces: Paginated leaderboard display (5 per page) with `< Prev`, `Next >`, and `Page X of Y` controls.

- [ ] **Step 1: Increase limit in `lib/actions/leaderboard-actions.ts`**
Update default limit from 10 to 50 so clients can paginate across top 50 players.

- [ ] **Step 2: Add pagination to `components/GlobalLeaderboard.tsx`**
Implement client-side pagination:
- 5 or 6 entries per page with fixed container height to prevent layout shift.
- Bottom pagination bar: `< Prev` button, `Page X of Y`, `Next >` button.
- Clean disabled states when on first or last page.

- [ ] **Step 3: Add pagination to `components/GroupLeaderboard.tsx`**
Apply identical pagination UX to group leaderboard.

- [ ] **Step 4: Verify build and lint**
Run `npm run lint` and `npm run build`.

- [ ] **Step 5: Commit**
```bash
git add lib/actions/leaderboard-actions.ts components/GlobalLeaderboard.tsx components/GroupLeaderboard.tsx
git commit -m "feat(leaderboard): add pagination controls and expand rank retrieval to top 50"
```

---

### Task 5: End-to-End Verification, Docker Rebuild & Dual Branch Push

**Files:**
- Any touched files across tasks.

- [ ] **Step 1: Comprehensive verification**
Run `npm run lint` and `npm run build` in `/mnt/second_drive/web_quiz`. Ensure 0 errors and 0 warnings.

- [ ] **Step 2: Rebuild and restart local Docker container**
Rebuild `docker-compose.yml` or container `quick-quiz-web`.
Verify with `curl -sI http://localhost:3000` returning `HTTP/1.1 200 OK`.

- [ ] **Step 3: Dual branch push to GitHub**
Push `main` to `origin/main`.
Merge or push `main` to `origin/preview`.
Verify git status is completely clean.
