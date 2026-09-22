# Quick Quiz — Phase 2: Full Quiz Experience Design

## 1. Overview

Build the complete interactive quiz experience on top of the existing Next.js + Supabase + Web3 foundation (Phase 1). This phase delivers: the 3D flip Quiz Card, Supabase schema and Server Actions data layer, Sidebar with live stats, Custom Question Form, Groups system, Global and Group Leaderboards, responsive Ad Zones, and modal dialogs. Smart contract integration is deferred to a future phase; all scoring and answer verification is handled server-side via Supabase.

## 2. Supabase Schema

### Tables

**`users`**
| Column | Type | Constraints |
|--------|------|-------------|
| `wallet_address` | text | PK |
| `display_name` | text | nullable |
| `created_at` | timestamptz | default `now()` |

**`questions`**
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `category` | text | not null, default `'General'` |
| `prompt` | text | not null |
| `options` | jsonb | not null (array of 4 strings) |
| `correct_index` | int | not null (0–3) |
| `explanation` | text | nullable |
| `created_by` | text | references `users.wallet_address` |
| `created_at` | timestamptz | default `now()` |

**`quiz_results`**
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `wallet_address` | text | references `users.wallet_address`, not null |
| `question_id` | uuid | references `questions.id`, not null |
| `answer_index` | int | not null (0–3) |
| `is_correct` | boolean | not null |
| `answered_at` | timestamptz | default `now()` |

**`groups`**
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `name` | text | not null, unique |
| `description` | text | nullable |
| `owner_wallet` | text | references `users.wallet_address`, not null |
| `created_at` | timestamptz | default `now()` |

**`group_members`**
| Column | Type | Constraints |
|--------|------|-------------|
| `group_id` | uuid | references `groups.id` on delete cascade, not null |
| `wallet_address` | text | references `users.wallet_address`, not null |
| `joined_at` | timestamptz | default `now()` |
| | | PK (`group_id`, `wallet_address`) |

### Indexes
- `quiz_results(wallet_address)` — fast user stats lookups
- `quiz_results(question_id)` — fast per-question aggregation
- `group_members(wallet_address)` — fast "my groups" lookup

## 3. Server Actions (`lib/actions/`)

All data access goes through Next.js Server Actions. The client never queries Supabase directly. `correct_index` is never sent to the client before answer submission.

### `user-actions.ts`
- `getOrCreateUser(walletAddress: string): Promise<User>` — Upsert: insert if not exists, return user row.

### `question-actions.ts`
- `createQuestion(data: {prompt, options, correctIndex, category?, explanation?, createdBy}): Promise<Question>` — Validate (4 non-empty options, correctIndex 0–3, prompt non-empty), insert into `questions`.
- `fetchRandomQuestion(walletAddress: string, excludeIds?: string[]): Promise<{id, category, prompt, options} | null>` — Select a random question not in `excludeIds`. Returns **without** `correct_index`. Returns `null` if no questions exist.
- `getQuestionCount(): Promise<number>` — Total question count for UI display.

### `quiz-actions.ts`
- `submitAnswer(data: {questionId, answerIndex, walletAddress}): Promise<{isCorrect, correctIndex, explanation}>` — Look up question's `correct_index`, compare, insert into `quiz_results`, return result.
- `getUserStats(walletAddress: string): Promise<{score, streak, bestStreak, accuracy, totalAnswered}>` — Aggregate from `quiz_results`: score = count of correct, streak = current consecutive correct (from most recent), bestStreak = max consecutive correct, accuracy = correct/total %.
- `getQuestionHistory(walletAddress: string, limit?: number): Promise<QuizResult[]>` — Recent answered questions with correct/wrong status.

### `leaderboard-actions.ts`
- `getGlobalLeaderboard(limit?: number): Promise<LeaderboardEntry[]>` — Top users by correct answer count, with accuracy %.
- `getGroupLeaderboard(groupId: string, limit?: number): Promise<LeaderboardEntry[]>` — Same but filtered to group members.

### `group-actions.ts`
- `createGroup(data: {name, description?, ownerWallet}): Promise<Group>` — Insert group + auto-add owner as member.
- `joinGroup(groupId: string, walletAddress: string): Promise<void>` — Insert into `group_members`.
- `leaveGroup(groupId: string, walletAddress: string): Promise<void>` — Delete from `group_members`.
- `getUserGroups(walletAddress: string): Promise<Group[]>` — Groups the user belongs to.

### TypeScript Types (`lib/types.ts`)
```typescript
export interface User {
  wallet_address: string;
  display_name: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  category: string;
  prompt: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  created_by: string;
  created_at: string;
}

// Question sent to client (no correct_index)
export interface ClientQuestion {
  id: string;
  category: string;
  prompt: string;
  options: string[];
}

export interface QuizResult {
  id: string;
  wallet_address: string;
  question_id: string;
  answer_index: number;
  is_correct: boolean;
  answered_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  owner_wallet: string;
  created_at: string;
}

export interface UserStats {
  score: number;
  streak: number;
  bestStreak: number;
  accuracy: number;
  totalAnswered: number;
}

export interface LeaderboardEntry {
  wallet_address: string;
  display_name: string | null;
  score: number;
  accuracy: number;
  rank: number;
}
```

## 4. Component Architecture

### Page Layout

Single-page responsive layout with 3 content columns + 2 ad skyscrapers (desktop), collapsing to stacked on smaller screens.

```
Desktop (≥1280px):
┌──────────────────────────────────────────────────────────────┐
│                          Header                               │
├──────┬────────────┬─────────────────────┬────────────┬───────┤
│ Ad   │  Sidebar   │    Quiz Card        │ Leaderboard│  Ad   │
│ Sky  │  (Stats)   │    (Center)         │ (Rankings) │  Sky  │
│ Left │            │                     │            │ Right │
│160px │            │                     │            │160px  │
├──────┴────────────┴─────────────────────┴────────────┴───────┤
│              [ Horizontal Ad Banner - Full Width ]             │
└──────────────────────────────────────────────────────────────┘

Tablet (768px–1279px):
┌──────────────────────────────────┐
│              Header               │
├──────────────────────────────────┤
│  [ Horizontal Ad Banner ]         │
├──────────┬───────────────────────┤
│ Sidebar  │    Quiz Card           │
├──────────┴───────────────────────┤
│      Leaderboard (full width)     │
├──────────────────────────────────┤
│  [ Horizontal Ad Banner ]         │
└──────────────────────────────────┘

Mobile (<768px):
┌────────────────────┐
│      Header         │
│ [Ad Banner]         │
│   Quiz Card         │
│   Question Form     │
│   Stats             │
│   Leaderboard       │
│ [Ad Banner]         │
└────────────────────┘
```

### Component Tree

```
app/page.tsx (Server Component — initial data fetch)
├── components/Header.tsx (client, existing)
├── components/AdZone.tsx (client — reusable ad placement)
├── components/QuizLayout.tsx (client — quiz state manager)
│   ├── components/Sidebar.tsx
│   │   ├── components/StatsPanel.tsx (score, streak, accuracy)
│   │   └── components/HistoryList.tsx (answered questions log)
│   ├── components/QuizCard.tsx (3D flip card)
│   │   ├── components/QuestionFront.tsx (prompt + options + timer + power-ups)
│   │   └── components/AnswerBack.tsx (feedback + explanation + next)
│   ├── components/QuestionForm.tsx (collapsible custom question creator)
│   └── components/LeaderboardPanel.tsx
│       ├── components/GlobalLeaderboard.tsx
│       └── components/GroupLeaderboard.tsx
└── components/modals/
    ├── IntroModal.tsx (3-step walkthrough)
    ├── TimerSettingsModal.tsx (timer mode + duration)
    ├── GroupModal.tsx (create/join group)
    └── ReviewModal.tsx (post-quiz answer breakdown)
```

### State Management

React `useReducer` in `QuizLayout.tsx`. No external state library.

```typescript
interface QuizState {
  // Connection
  walletAddress: string | null;
  user: User | null;

  // Current question
  currentQuestion: ClientQuestion | null;
  answeredIds: string[];       // exclude from future fetches
  selectedAnswer: number | null;
  answerResult: { isCorrect: boolean; correctIndex: number; explanation: string | null } | null;
  isFlipped: boolean;
  isSubmitting: boolean;

  // Session stats (updated after each answer)
  score: number;
  streak: number;
  bestStreak: number;
  totalAnswered: number;
  totalCorrect: number;
  history: Array<{ questionId: string; prompt: string; isCorrect: boolean }>;

  // Timer
  timerMode: 'per-question' | 'total' | 'stopwatch';
  timerDuration: number;       // seconds

  // Power-ups (per session)
  fiftyFiftyUsed: boolean;
  skipUsed: boolean;
  eliminatedOptions: number[]; // indices hidden by 50:50

  // UI
  questionFormOpen: boolean;
  activeModal: 'intro' | 'timer-settings' | 'group' | 'review' | null;
}
```

## 5. Quiz Card Detail

### Front Face (`QuestionFront.tsx`)
- **Meta bar**: category badge (left), timer badge (right), power-ups toolbar
- **Question text**: `<h2>` with the prompt
- **Options grid**: 2×2 grid of option buttons (A/B/C/D). Each button highlights on hover, shows selected state, disabled after selection.
- **Keyboard**: `1`/`2`/`3`/`4` or `A`/`B`/`C`/`D` to select, immediate submission on key press.
- **Timer**: Countdown display in the meta bar. Configurable via TimerSettingsModal. When expired → auto-submit as wrong.
- **50:50**: Eliminates 2 random wrong answers (greys them out). Once per session.
- **Skip**: Moves to next question without penalty. Once per session.

### Back Face (`AnswerBack.tsx`)
- **Result indicator**: ✅ "Correct!" (green) or ❌ "Wrong!" (red) with the correct answer shown
- **Explanation**: If available, shown below result
- **Stats delta**: "+1 Score" / "Streak broken" message
- **Next button**: "Next Question →" (Enter/Space)

### Flip Animation
- CSS `perspective: 1000px` on container, `transform-style: preserve-3d` on inner
- `transform: rotateY(180deg)` with `transition: transform 0.6s`
- `backface-visibility: hidden` on both faces
- Triggered by `isFlipped` state

### Confetti
- `canvas-confetti` fires on correct answer during flip transition
- No confetti on wrong answer

## 6. Ad Zones (`AdZone.tsx`)

A single reusable component for all ad placements.

```typescript
interface AdZoneProps {
  variant: 'skyscraper' | 'banner';
  slot: string;           // e.g. "left-sky", "right-sky", "top-banner", "bottom-banner"
  className?: string;
  children?: React.ReactNode; // ad code, iframe, affiliate link, etc.
}
```

**Behavior:**
- `variant="skyscraper"`: 160px wide, sticky positioning (`top: 80px`), hidden below 1280px viewport (`hidden xl:block`)
- `variant="banner"`: Full container width, auto-height, visible on all viewports
- Renders a styled container with "Sponsored" badge and a slot for any ad content (children)
- If no children, shows a subtle placeholder so layout doesn't collapse
- Uses Tailwind responsive classes — no JS for show/hide logic

## 7. Modals

All modals use a shared `Modal.tsx` base component:
- Portal rendered to `document.body`
- Overlay backdrop with click-to-close
- `framer-motion` `AnimatePresence` for enter/exit fade+scale
- Escape key to close
- Focus trap

### IntroModal
3-step wizard (same as legacy): Create Questions → Build Up → Play & Track. Step indicator dots, Back/Next navigation.

### TimerSettingsModal
- Timer mode select: per-question countdown / total quiz countdown / stopwatch
- Duration presets (15s, 30s, 60s, 2m) + custom input
- Save/Cancel

### GroupModal
- Tab: "Create Group" (name + description form) / "Join Group" (group ID/name search)
- Shows current groups list with Leave button

### ReviewModal
- Scrollable list of all answered questions in the session
- Each entry: question prompt, user's answer, correct answer, ✅/❌ icon
- "Back to Summary" close button

## 8. Quiz Flow

1. **App loads** → `page.tsx` renders QuizLayout
2. **User connects wallet** → `useAccount()` detects address → `getOrCreateUser()` Server Action → user state populated
3. **No questions?** → Welcome overlay: "No questions yet. Add your first question!"
4. **User opens QuestionForm** → fills prompt, 4 options, correct answer, category, explanation → `createQuestion()` Server Action
5. **User starts quiz** → `fetchRandomQuestion()` → QuizCard shows front face with timer running
6. **User selects answer** (click or keyboard) → `submitAnswer()` Server Action (shows loading spinner on submit) → receives `{isCorrect, correctIndex, explanation}`
7. **Card flips** → AnswerBack shows result + explanation. If correct: confetti. Stats update in Sidebar.
8. **"Next Question"** → `fetchRandomQuestion(excludeIds: answeredIds)` → new front face
9. **All questions answered** → "Quiz Complete!" state with summary stats + "Review Answers" button (opens ReviewModal)
10. **Leaderboard** updates after each answer (re-fetched or optimistically updated)

## 9. Error Handling

- **No wallet connected**: Quiz card shows "Connect your wallet to play" overlay instead of question
- **Supabase unreachable**: Server Actions return error objects, UI shows toast notification "Could not connect to database"
- **No questions available**: Welcome overlay with CTA to add questions
- **Submit while pending**: Disable option buttons during `isSubmitting` state
- **Timer expired**: Auto-submit with `answerIndex: -1` (treated as wrong)

## 10. File Structure

```
app/
  globals.css
  layout.tsx          (existing)
  page.tsx            (updated — renders QuizLayout with ad zones)

components/
  Header.tsx          (existing)
  Providers.tsx       (existing)
  AdZone.tsx          (new)
  QuizLayout.tsx      (new — main quiz state manager)
  QuizCard.tsx        (new)
  QuestionFront.tsx   (new)
  AnswerBack.tsx      (new)
  Sidebar.tsx         (new)
  StatsPanel.tsx      (new)
  HistoryList.tsx     (new)
  QuestionForm.tsx    (new)
  LeaderboardPanel.tsx(new)
  GlobalLeaderboard.tsx (new)
  GroupLeaderboard.tsx  (new)
  Modal.tsx           (new — base modal)
  modals/
    IntroModal.tsx    (new)
    TimerSettingsModal.tsx (new)
    GroupModal.tsx     (new)
    ReviewModal.tsx    (new)

lib/
  supabase.ts         (existing)
  types.ts            (new)
  actions/
    user-actions.ts   (new)
    question-actions.ts (new)
    quiz-actions.ts   (new)
    leaderboard-actions.ts (new)
    group-actions.ts  (new)
```

## 11. Testing Strategy

- **Build verification**: `npm run build` and `npm run lint` must pass after each task
- **Server Actions**: Manual testing via the UI (no automated test framework in scope for this phase)
- **Responsive layout**: Manual check at 3 breakpoints (mobile 375px, tablet 768px, desktop 1280px+)
- **Quiz flow**: End-to-end manual test: connect wallet → add question → play → verify stats → check leaderboard

## 12. Future Phase (Deferred)

- Smart contract integration (submitAnswer on-chain, token rewards/penalties)
- On-chain leaderboard verification
- Sound effects and theme toggles
- Question categories/filtering
- Question difficulty levels
