# docs/superpowers/plans/2026-09-15-web-quiz.md
lines:1197 exports:
---
# Web Quiz Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clean, responsive single-page Web Dev Quiz application with 3 visible components (Header/Timer, Question Card, Scoreboard) across 3 vanilla files (`index.html`, `style.css`, `script.js`).

**Architecture:** Vanilla HTML5, modern CSS Grid/Flexbox, and a central state machine in JavaScript with 3 component renderers (`renderHeader`, `renderQuestion`, `renderScoreboard`).

**Tech Stack:** Vanilla HTML5, CSS3, ES6 JavaScript, Node.js (for testing/verification).

**Spec:** `docs/superpowers/specs/2026-09-15-web-quiz-design.md`

## Global Constraints
- Exactly 3 source files in the project root: `index.html`, `style.css`, `script.js`.
- Zero runtime dependencies or build steps; must run directly in any browser.
- 3 visible UI components together on 1 page: Header/Timer, Active Question Card, Scoreboard/Stats.
- Question dataset contains at least 6 web development questions with 4 options each and a 0-indexed `correctIndex`.
- Correct answers award +100 points and increment streak; wrong answers reset streak to 0.

---

### Task 1: Core State Machine & Question Data

**Files:**
- Create: `script.js`
- Test: `test/test_core.js`

**Interfaces:**
- Produces:
  - `QUESTIONS`: Array of `{ id: number, question: string, options: string[], correctIndex: number, explanation: string }`
  - `state`: `{ currentIndex: number, score: number, streak: number, bestStreak: number, answers: Array<{ questionId: number, selectedIndex: number, isCorrect: boolean }>, isAnswered: boolean, elapsedSeconds: number, timerIntervalId: any, isFinished: boolean }`
  - `calcAccuracy(answers)`: returns number (0-100)
  - `formatTime(seconds)`: returns string (`MM:SS`)
  - `selectOption(index)`: mutates state on option selection
  - `nextQuestion()`: advances question or finishes quiz
  - `restartQuiz()`: resets state

- [ ] **Step 1: Write the failing test**

Create `test/test_core.js`:
